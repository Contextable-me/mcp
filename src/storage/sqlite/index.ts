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
import type { StorageAdapter, SearchResult, SearchOptions } from '../interface.js';
import { SQLiteProjectStorage } from './projects.js';
import { SQLiteArtifactStorage } from './artifacts.js';
import { initializeDatabase } from './migrations.js';

interface SearchRow {
  artifact_id: string;
  project_id: string;
  project_name: string;
  title: string;
  artifact_type: string;
  content: string;
  summary: string | null;
  priority: string;
  updated_at: string;
  rank: number;
}

export interface SQLiteAdapterOptions {
  /** Path to database file. Defaults to ~/.contextable/data.db */
  dbPath?: string;
  /** Alias for dbPath */
  path?: string;
  /** Use in-memory database (for testing) */
  inMemory?: boolean;
}

export class SQLiteAdapter implements StorageAdapter {
  private db: Database.Database;
  public readonly projects: SQLiteProjectStorage;
  public readonly artifacts: SQLiteArtifactStorage;

  constructor(options: SQLiteAdapterOptions = {}) {
    if (options.inMemory) {
      this.db = new Database(':memory:');
    } else {
      const dbPath = options.dbPath ?? options.path ?? getDefaultDbPath();
      ensureDirectoryExists(dbPath);
      this.db = new Database(dbPath);
    }

    this.projects = new SQLiteProjectStorage(this.db);
    this.artifacts = new SQLiteArtifactStorage(this.db);
  }

  async initialize(): Promise<void> {
    initializeDatabase(this.db);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
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
    const params: (string | number)[] = [ftsQuery];

    if (options?.projectId) {
      sql += ' AND a.project_id = ?';
      params.push(options.projectId);
    }

    sql += ' ORDER BY rank LIMIT ?';
    params.push(limit);

    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as SearchRow[];

      return rows.map((row) => ({
        id: row.artifact_id,
        artifact_id: row.artifact_id,
        project_id: row.project_id,
        project_name: row.project_name,
        title: row.title,
        artifact_type: row.artifact_type as SearchResult['artifact_type'],
        summary: row.summary,
        priority: row.priority as SearchResult['priority'],
        snippet: extractSnippet(row.content, query, row.summary),
        updated_at: row.updated_at,
        score: -row.rank, // bm25 returns negative scores, lower is better
      }));
    } catch (error) {
      // If FTS query fails (bad syntax), fall back to LIKE search
      return this.fallbackSearch(query, options);
    }
  }

  /**
   * Fallback search using LIKE when FTS query fails.
   */
  private async fallbackSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
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
    const params: (string | number)[] = [likePattern, likePattern, likePattern];

    if (options?.projectId) {
      sql += ' AND a.project_id = ?';
      params.push(options.projectId);
    }

    sql += ' ORDER BY a.updated_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as SearchRow[];

    return rows.map((row) => ({
      id: row.artifact_id,
      artifact_id: row.artifact_id,
      project_id: row.project_id,
      project_name: row.project_name,
      title: row.title,
      artifact_type: row.artifact_type as SearchResult['artifact_type'],
      summary: row.summary,
      priority: row.priority as SearchResult['priority'],
      snippet: extractSnippet(row.content, query, row.summary),
      updated_at: row.updated_at,
      score: 1, // All results have same score in fallback
    }));
  }
}

/**
 * Get the default database path.
 */
function getDefaultDbPath(): string {
  return join(homedir(), '.contextable', 'data.db');
}

/**
 * Ensure the directory for the database file exists.
 */
function ensureDirectoryExists(dbPath: string): void {
  const dir = join(dbPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Prepare a query string for FTS5.
 * Escapes special characters and handles multi-word queries.
 */
function prepareFtsQuery(query: string): string {
  // Remove FTS5 special characters
  const escaped = query
    .replace(/[":*^~(){}[\]\\]/g, ' ')
    .trim();

  // Split into words and join with OR for partial matching
  const words = escaped.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '""';

  // Use prefix matching for each word
  return words.map((w) => `"${w}"*`).join(' OR ');
}

/**
 * Extract a snippet around the first match of the query.
 */
function extractSnippet(
  content: string,
  query: string,
  summary: string | null
): string {
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

  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetEnd < content.length) snippet = snippet + '...';

  return snippet;
}

export { SQLiteProjectStorage } from './projects.js';
export { SQLiteArtifactStorage } from './artifacts.js';
