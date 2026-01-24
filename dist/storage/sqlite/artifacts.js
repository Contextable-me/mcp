/**
 * SQLite implementation of ArtifactStorage.
 */
import { generateId, now } from '../../utils/index.js';
import { NotFoundError } from '../../utils/errors.js';
function rowToArtifact(row) {
    return {
        id: row.id,
        project_id: row.project_id,
        title: row.title,
        artifact_type: row.artifact_type,
        content: row.content,
        summary: row.summary,
        priority: row.priority,
        tags: JSON.parse(row.tags),
        version: row.version,
        archived_at: row.archived_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
function rowToSummary(row) {
    const sizeChars = row.content.length;
    return {
        id: row.id,
        project_id: row.project_id,
        title: row.title,
        artifact_type: row.artifact_type,
        summary: row.summary,
        priority: row.priority,
        tags: JSON.parse(row.tags),
        version: row.version,
        archived_at: row.archived_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        size_chars: sizeChars,
        tokens_est: Math.floor(sizeChars / 4),
    };
}
function rowToVersion(row) {
    return {
        id: row.id,
        artifact_id: row.artifact_id,
        version: row.version,
        title: row.title,
        content: row.content,
        summary: row.summary,
        priority: row.priority,
        change_source: row.change_source,
        created_at: row.created_at,
    };
}
function rowToVersionSummary(row) {
    const sizeChars = row.content.length;
    return {
        id: row.id,
        artifact_id: row.artifact_id,
        version: row.version,
        title: row.title,
        summary: row.summary,
        priority: row.priority,
        change_source: row.change_source,
        created_at: row.created_at,
        size_chars: sizeChars,
        tokens_est: Math.floor(sizeChars / 4),
    };
}
export class SQLiteArtifactStorage {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const id = generateId();
        const timestamp = now();
        const stmt = this.db.prepare(`
      INSERT INTO artifacts (id, project_id, title, artifact_type, content, summary, priority, tags, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
        stmt.run(id, data.project_id, data.title, data.artifact_type, data.content, data.summary ?? null, data.priority ?? 'normal', JSON.stringify(data.tags ?? []), timestamp, timestamp);
        const artifact = await this.get(id);
        if (!artifact) {
            throw new Error('Failed to create artifact');
        }
        return artifact;
    }
    async get(id) {
        const stmt = this.db.prepare('SELECT * FROM artifacts WHERE id = ?');
        const row = stmt.get(id);
        return row ? rowToArtifact(row) : null;
    }
    async getByTitle(projectId, title) {
        const stmt = this.db.prepare('SELECT * FROM artifacts WHERE project_id = ? AND title = ? COLLATE NOCASE');
        const row = stmt.get(projectId, title);
        return row ? rowToArtifact(row) : null;
    }
    async list(projectId, options) {
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;
        const includeArchived = options?.includeArchived ?? false;
        let sql = 'SELECT * FROM artifacts WHERE project_id = ?';
        const params = [projectId];
        if (!includeArchived) {
            sql += ' AND archived_at IS NULL';
        }
        if (options?.type) {
            sql += ' AND artifact_type = ?';
            params.push(options.type);
        }
        if (options?.priority) {
            sql += ' AND priority = ?';
            params.push(options.priority);
        }
        sql += " ORDER BY priority = 'core' DESC, updated_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map(rowToSummary);
    }
    async listArchived(projectId, limit = 20) {
        const stmt = this.db.prepare(`
      SELECT * FROM artifacts
      WHERE project_id = ? AND archived_at IS NOT NULL
      ORDER BY archived_at DESC
      LIMIT ?
    `);
        const rows = stmt.all(projectId, limit);
        return rows.map(rowToSummary);
    }
    async update(id, data) {
        const existing = await this.get(id);
        if (!existing) {
            throw new NotFoundError('Artifact', id);
        }
        // Save current version before updating (application-level versioning)
        this.saveVersion(existing, 'update');
        const updates = [];
        const params = [];
        if (data.title !== undefined) {
            updates.push('title = ?');
            params.push(data.title);
        }
        if (data.content !== undefined) {
            updates.push('content = ?');
            params.push(data.content);
        }
        if (data.summary !== undefined) {
            updates.push('summary = ?');
            params.push(data.summary);
        }
        if (data.priority !== undefined) {
            updates.push('priority = ?');
            params.push(data.priority);
        }
        if (data.tags !== undefined) {
            updates.push('tags = ?');
            params.push(JSON.stringify(data.tags));
        }
        if (updates.length === 0) {
            return existing;
        }
        // Increment version and update timestamp
        updates.push('version = version + 1');
        updates.push('updated_at = ?');
        params.push(now());
        params.push(id);
        const sql = `UPDATE artifacts SET ${updates.join(', ')} WHERE id = ?`;
        this.db.prepare(sql).run(...params);
        const updated = await this.get(id);
        if (!updated) {
            throw new Error('Failed to update artifact');
        }
        return updated;
    }
    async archive(id) {
        const existing = await this.get(id);
        if (!existing) {
            throw new NotFoundError('Artifact', id);
        }
        if (existing.archived_at) {
            // Already archived
            return existing;
        }
        // Save version before archiving
        this.saveVersion(existing, 'archive');
        const timestamp = now();
        this.db
            .prepare('UPDATE artifacts SET archived_at = ?, updated_at = ? WHERE id = ?')
            .run(timestamp, timestamp, id);
        const archived = await this.get(id);
        if (!archived) {
            throw new Error('Failed to archive artifact');
        }
        return archived;
    }
    async restore(id) {
        const existing = await this.get(id);
        if (!existing) {
            throw new NotFoundError('Artifact', id);
        }
        if (!existing.archived_at) {
            // Not archived
            return existing;
        }
        // Save version before restoring
        this.saveVersion(existing, 'restore');
        const timestamp = now();
        this.db
            .prepare('UPDATE artifacts SET archived_at = NULL, updated_at = ?, version = version + 1 WHERE id = ?')
            .run(timestamp, id);
        const restored = await this.get(id);
        if (!restored) {
            throw new Error('Failed to restore artifact');
        }
        return restored;
    }
    async getVersions(id, limit = 10) {
        // Verify artifact exists
        const artifact = await this.get(id);
        if (!artifact) {
            throw new NotFoundError('Artifact', id);
        }
        const stmt = this.db.prepare(`
      SELECT * FROM artifact_versions
      WHERE artifact_id = ?
      ORDER BY version DESC
      LIMIT ?
    `);
        const rows = stmt.all(id, limit);
        return rows.map(rowToVersionSummary);
    }
    async getVersion(versionId) {
        const stmt = this.db.prepare('SELECT * FROM artifact_versions WHERE id = ?');
        const row = stmt.get(versionId);
        return row ? rowToVersion(row) : null;
    }
    async rollback(id, versionId) {
        const existing = await this.get(id);
        if (!existing) {
            throw new NotFoundError('Artifact', id);
        }
        const version = await this.getVersion(versionId);
        if (!version || version.artifact_id !== id) {
            throw new NotFoundError('Version', versionId);
        }
        // Save current state before rollback
        this.saveVersion(existing, 'rollback');
        const timestamp = now();
        this.db
            .prepare(`
        UPDATE artifacts
        SET title = ?, content = ?, summary = ?, priority = ?,
            version = version + 1, updated_at = ?
        WHERE id = ?
      `)
            .run(version.title, version.content, version.summary, version.priority ?? existing.priority, timestamp, id);
        const rolled = await this.get(id);
        if (!rolled) {
            throw new Error('Failed to rollback artifact');
        }
        return rolled;
    }
    /**
     * Save current artifact state to version history.
     */
    saveVersion(artifact, changeSource) {
        const versionId = generateId();
        this.db
            .prepare(`
        INSERT INTO artifact_versions (id, artifact_id, version, title, content, summary, priority, change_source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .run(versionId, artifact.id, artifact.version, artifact.title, artifact.content, artifact.summary, artifact.priority, changeSource, artifact.updated_at);
    }
}
//# sourceMappingURL=artifacts.js.map