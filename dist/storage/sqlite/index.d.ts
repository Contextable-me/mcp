/**
 * SQLite storage adapter for Contextable MCP server.
 *
 * Used in local mode with stdio transport.
 * Data stored in ~/.contextable/data.db
 */
import type { StorageAdapter, SearchResult, SearchOptions } from '../interface.js';
import { SQLiteProjectStorage } from './projects.js';
import { SQLiteArtifactStorage } from './artifacts.js';
export interface SQLiteAdapterOptions {
    /** Path to database file. Defaults to ~/.contextable/data.db */
    dbPath?: string;
    /** Alias for dbPath */
    path?: string;
    /** Use in-memory database (for testing) */
    inMemory?: boolean;
}
export declare class SQLiteAdapter implements StorageAdapter {
    private db;
    readonly projects: SQLiteProjectStorage;
    readonly artifacts: SQLiteArtifactStorage;
    constructor(options?: SQLiteAdapterOptions);
    initialize(): Promise<void>;
    close(): Promise<void>;
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Fallback search using LIKE when FTS query fails.
     */
    private fallbackSearch;
}
export { SQLiteProjectStorage } from './projects.js';
export { SQLiteArtifactStorage } from './artifacts.js';
//# sourceMappingURL=index.d.ts.map