/**
 * SQLite storage adapter for Contextable MCP server.
 *
 * Used in local mode with stdio transport.
 * Data stored in ~/.contextable/data.db
 */
import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { SQLiteProjectStorage } from './projects.js';
import { SQLiteArtifactStorage } from './artifacts.js';
import { initializeDatabase } from './migrations.js';
export class SQLiteAdapter {
    db;
    projects;
    artifacts;
    constructor(options = {}) {
        if (options.inMemory) {
            this.db = new Database(':memory:');
        }
        else {
            const dbPath = options.dbPath ?? options.path ?? getDefaultDbPath();
            ensureDirectoryExists(dbPath);
            this.db = new Database(dbPath);
        }
        this.projects = new SQLiteProjectStorage(this.db);
        this.artifacts = new SQLiteArtifactStorage(this.db);
    }
    async initialize() {
        initializeDatabase(this.db);
    }
    async close() {
        this.db.close();
    }
    async search(query, options) {
        const limit = options?.limit ?? 20;
        // Prepare FTS5 query (escape special characters)
        const ftsQuery = prepareFtsQuery(query);
        let sql = `
      SELECT
        a.id as artifact_id,
        a.project_id,
        p.name as project_name,
        a.title,
        a.artifact_type,
        a.content,
        a.summary,
        a.priority,
        a.updated_at,
        bm25(artifacts_fts) as rank
      FROM artifacts_fts
      JOIN artifacts a ON a.rowid = artifacts_fts.rowid
      JOIN projects p ON p.id = a.project_id
      WHERE artifacts_fts MATCH ?
        AND a.archived_at IS NULL
    `;
        const params = [ftsQuery];
        if (options?.projectId) {
            sql += ' AND a.project_id = ?';
            params.push(options.projectId);
        }
        sql += ' ORDER BY rank LIMIT ?';
        params.push(limit);
        try {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(...params);
            return rows.map((row) => ({
                id: row.artifact_id,
                artifact_id: row.artifact_id,
                project_id: row.project_id,
                project_name: row.project_name,
                title: row.title,
                artifact_type: row.artifact_type,
                summary: row.summary,
                priority: row.priority,
                snippet: extractSnippet(row.content, query, row.summary),
                updated_at: row.updated_at,
                score: -row.rank, // bm25 returns negative scores, lower is better
            }));
        }
        catch (error) {
            // If FTS query fails (bad syntax), fall back to LIKE search
            return this.fallbackSearch(query, options);
        }
    }
    /**
     * Fallback search using LIKE when FTS query fails.
     */
    async fallbackSearch(query, options) {
        const limit = options?.limit ?? 20;
        const likePattern = `%${query}%`;
        let sql = `
      SELECT
        a.id as artifact_id,
        a.project_id,
        p.name as project_name,
        a.title,
        a.artifact_type,
        a.content,
        a.summary,
        a.priority,
        a.updated_at
      FROM artifacts a
      JOIN projects p ON p.id = a.project_id
      WHERE a.archived_at IS NULL
        AND (a.title LIKE ? OR a.content LIKE ? OR a.summary LIKE ?)
    `;
        const params = [likePattern, likePattern, likePattern];
        if (options?.projectId) {
            sql += ' AND a.project_id = ?';
            params.push(options.projectId);
        }
        sql += ' ORDER BY a.updated_at DESC LIMIT ?';
        params.push(limit);
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((row) => ({
            id: row.artifact_id,
            artifact_id: row.artifact_id,
            project_id: row.project_id,
            project_name: row.project_name,
            title: row.title,
            artifact_type: row.artifact_type,
            summary: row.summary,
            priority: row.priority,
            snippet: extractSnippet(row.content, query, row.summary),
            updated_at: row.updated_at,
            score: 1, // All results have same score in fallback
        }));
    }
}
/**
 * Get the default database path.
 */
function getDefaultDbPath() {
    return join(homedir(), '.contextable', 'data.db');
}
/**
 * Ensure the directory for the database file exists.
 */
function ensureDirectoryExists(dbPath) {
    const dir = join(dbPath, '..');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}
/**
 * Prepare a query string for FTS5.
 * Escapes special characters and handles multi-word queries.
 */
function prepareFtsQuery(query) {
    // Remove FTS5 special characters
    const escaped = query
        .replace(/[":*^~(){}[\]\\]/g, ' ')
        .trim();
    // Split into words and join with OR for partial matching
    const words = escaped.split(/\s+/).filter(Boolean);
    if (words.length === 0)
        return '""';
    // Use prefix matching for each word
    return words.map((w) => `"${w}"*`).join(' OR ');
}
/**
 * Extract a snippet around the first match of the query.
 */
function extractSnippet(content, query, summary) {
    // If we have a summary, prefer it
    if (summary && summary.length > 0) {
        return summary.slice(0, 200);
    }
    // Otherwise, extract from content around the match
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);
    if (matchIndex === -1) {
        // No match found, return start of content
        return content.slice(0, 200) + (content.length > 200 ? '...' : '');
    }
    // Extract snippet around match
    const snippetStart = Math.max(0, matchIndex - 50);
    const snippetEnd = Math.min(content.length, matchIndex + query.length + 150);
    let snippet = content.slice(snippetStart, snippetEnd);
    if (snippetStart > 0)
        snippet = '...' + snippet;
    if (snippetEnd < content.length)
        snippet = snippet + '...';
    return snippet;
}
export { SQLiteProjectStorage } from './projects.js';
export { SQLiteArtifactStorage } from './artifacts.js';
//# sourceMappingURL=index.js.map