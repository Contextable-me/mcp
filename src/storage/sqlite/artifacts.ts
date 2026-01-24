/**
 * SQLite implementation of ArtifactStorage.
 */

import type Database from 'better-sqlite3';
import type {
  Artifact,
  ArtifactCreate,
  ArtifactUpdate,
  ArtifactListOptions,
  ArtifactSummary,
  ArtifactVersion,
  ArtifactVersionSummary,
  ArtifactStorage,
  ChangeSource,
} from '../interface.js';
import { generateId, now } from '../../utils/index.js';
import { NotFoundError } from '../../utils/errors.js';

interface ArtifactRow {
  id: string;
  project_id: string;
  title: string;
  artifact_type: string;
  content: string;
  summary: string | null;
  priority: string;
  tags: string;
  version: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface VersionRow {
  id: string;
  artifact_id: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  priority: string | null;
  change_source: string;
  created_at: string;
}

function rowToArtifact(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    artifact_type: row.artifact_type as Artifact['artifact_type'],
    content: row.content,
    summary: row.summary,
    priority: row.priority as Artifact['priority'],
    tags: JSON.parse(row.tags) as string[],
    version: row.version,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToSummary(row: ArtifactRow): ArtifactSummary {
  const sizeChars = row.content.length;
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    artifact_type: row.artifact_type as Artifact['artifact_type'],
    summary: row.summary,
    priority: row.priority as Artifact['priority'],
    tags: JSON.parse(row.tags) as string[],
    version: row.version,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    size_chars: sizeChars,
    tokens_est: Math.floor(sizeChars / 4),
  };
}

function rowToVersion(row: VersionRow): ArtifactVersion {
  return {
    id: row.id,
    artifact_id: row.artifact_id,
    version: row.version,
    title: row.title,
    content: row.content,
    summary: row.summary,
    priority: row.priority as Artifact['priority'] | null,
    change_source: row.change_source as ChangeSource,
    created_at: row.created_at,
  };
}

function rowToVersionSummary(row: VersionRow): ArtifactVersionSummary {
  const sizeChars = row.content.length;
  return {
    id: row.id,
    artifact_id: row.artifact_id,
    version: row.version,
    title: row.title,
    summary: row.summary,
    priority: row.priority as Artifact['priority'] | null,
    change_source: row.change_source as ChangeSource,
    created_at: row.created_at,
    size_chars: sizeChars,
    tokens_est: Math.floor(sizeChars / 4),
  };
}

export class SQLiteArtifactStorage implements ArtifactStorage {
  constructor(private db: Database.Database) {}

  async create(data: ArtifactCreate): Promise<Artifact> {
    const id = generateId();
    const timestamp = now();

    const stmt = this.db.prepare(`
      INSERT INTO artifacts (id, project_id, title, artifact_type, content, summary, priority, tags, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.title,
      data.artifact_type,
      data.content,
      data.summary ?? null,
      data.priority ?? 'normal',
      JSON.stringify(data.tags ?? []),
      timestamp,
      timestamp
    );

    const artifact = await this.get(id);
    if (!artifact) {
      throw new Error('Failed to create artifact');
    }
    return artifact;
  }

  async get(id: string): Promise<Artifact | null> {
    const stmt = this.db.prepare('SELECT * FROM artifacts WHERE id = ?');
    const row = stmt.get(id) as ArtifactRow | undefined;
    return row ? rowToArtifact(row) : null;
  }

  async getByTitle(projectId: string, title: string): Promise<Artifact | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM artifacts WHERE project_id = ? AND title = ? COLLATE NOCASE'
    );
    const row = stmt.get(projectId, title) as ArtifactRow | undefined;
    return row ? rowToArtifact(row) : null;
  }

  async list(projectId: string, options?: ArtifactListOptions): Promise<ArtifactSummary[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const includeArchived = options?.includeArchived ?? false;

    let sql = 'SELECT * FROM artifacts WHERE project_id = ?';
    const params: (string | number)[] = [projectId];

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
    const rows = stmt.all(...params) as ArtifactRow[];
    return rows.map(rowToSummary);
  }

  async listArchived(projectId: string, limit = 20): Promise<ArtifactSummary[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM artifacts
      WHERE project_id = ? AND archived_at IS NOT NULL
      ORDER BY archived_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(projectId, limit) as ArtifactRow[];
    return rows.map(rowToSummary);
  }

  async update(id: string, data: ArtifactUpdate): Promise<Artifact> {
    const existing = await this.get(id);
    if (!existing) {
      throw new NotFoundError('Artifact', id);
    }

    // Save current version before updating (application-level versioning)
    this.saveVersion(existing, 'update');

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

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

  async archive(id: string): Promise<Artifact> {
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

  async restore(id: string): Promise<Artifact> {
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

  async getVersions(id: string, limit = 10): Promise<ArtifactVersionSummary[]> {
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
    const rows = stmt.all(id, limit) as VersionRow[];
    return rows.map(rowToVersionSummary);
  }

  async getVersion(versionId: string): Promise<ArtifactVersion | null> {
    const stmt = this.db.prepare('SELECT * FROM artifact_versions WHERE id = ?');
    const row = stmt.get(versionId) as VersionRow | undefined;
    return row ? rowToVersion(row) : null;
  }

  async rollback(id: string, versionId: string): Promise<Artifact> {
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
      .run(
        version.title,
        version.content,
        version.summary,
        version.priority ?? existing.priority,
        timestamp,
        id
      );

    const rolled = await this.get(id);
    if (!rolled) {
      throw new Error('Failed to rollback artifact');
    }
    return rolled;
  }

  /**
   * Save current artifact state to version history.
   */
  private saveVersion(artifact: Artifact, changeSource: ChangeSource): void {
    const versionId = generateId();

    this.db
      .prepare(`
        INSERT INTO artifact_versions (id, artifact_id, version, title, content, summary, priority, change_source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        versionId,
        artifact.id,
        artifact.version,
        artifact.title,
        artifact.content,
        artifact.summary,
        artifact.priority,
        changeSource,
        artifact.updated_at
      );
  }
}
