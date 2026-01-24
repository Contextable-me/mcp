/**
 * SQLite implementation of ProjectStorage.
 */
import { generateId, now } from '../../utils/index.js';
import { NotFoundError } from '../../utils/errors.js';
function rowToProject(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        tags: JSON.parse(row.tags),
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
export class SQLiteProjectStorage {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const id = generateId();
        const timestamp = now();
        const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, tags, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, data.name, data.description ?? null, JSON.stringify(data.tags ?? []), data.status ?? 'active', timestamp, timestamp);
        const project = await this.get(id);
        if (!project) {
            throw new Error('Failed to create project');
        }
        return project;
    }
    async get(id) {
        const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
        const row = stmt.get(id);
        return row ? rowToProject(row) : null;
    }
    async getByName(name) {
        const stmt = this.db.prepare('SELECT * FROM projects WHERE name = ? COLLATE NOCASE');
        const row = stmt.get(name);
        return row ? rowToProject(row) : null;
    }
    async list(options) {
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;
        let sql = 'SELECT * FROM projects';
        const params = [];
        if (options?.status) {
            sql += ' WHERE status = ?';
            params.push(options.status);
        }
        sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map(rowToProject);
    }
    async update(id, data) {
        // Check project exists
        const existing = await this.get(id);
        if (!existing) {
            throw new NotFoundError('Project', id);
        }
        const updates = [];
        const params = [];
        if (data.name !== undefined) {
            updates.push('name = ?');
            params.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            params.push(data.description);
        }
        if (data.tags !== undefined) {
            updates.push('tags = ?');
            params.push(JSON.stringify(data.tags));
        }
        if (data.status !== undefined) {
            updates.push('status = ?');
            params.push(data.status);
        }
        if (updates.length === 0) {
            return existing;
        }
        updates.push('updated_at = ?');
        params.push(now());
        params.push(id);
        const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;
        this.db.prepare(sql).run(...params);
        const updated = await this.get(id);
        if (!updated) {
            throw new Error('Failed to update project');
        }
        return updated;
    }
    async delete(id) {
        const existing = await this.get(id);
        if (!existing) {
            throw new NotFoundError('Project', id);
        }
        // CASCADE will delete artifacts
        this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    }
    async countArtifacts(id) {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM artifacts WHERE project_id = ? AND archived_at IS NULL');
        const result = stmt.get(id);
        return result?.count ?? 0;
    }
}
//# sourceMappingURL=projects.js.map