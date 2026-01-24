/**
 * Supabase storage adapter for Contextable MCP server.
 *
 * Used in hosted mode with authenticated API connections.
 * Connects to Supabase cloud for persistent storage.
 */
import type { StorageAdapter, SearchResult, SearchOptions } from '../interface.js';
import { SupabaseProjectStorage } from './projects.js';
import { SupabaseArtifactStorage } from './artifacts.js';
export interface SupabaseAdapterOptions {
    /** Supabase URL */
    supabaseUrl: string;
    /** Supabase service role key (for API key validation) */
    supabaseServiceKey: string;
    /** User's API key for authentication */
    apiKey: string;
}
export declare class SupabaseAdapter implements StorageAdapter {
    private client;
    private userId;
    private apiKey;
    private supabaseUrl;
    private supabaseServiceKey;
    projects: SupabaseProjectStorage;
    artifacts: SupabaseArtifactStorage;
    constructor(options: SupabaseAdapterOptions);
    /**
     * Initialize the adapter by validating the API key.
     * Must be called before any other operations.
     */
    initialize(): Promise<void>;
    close(): Promise<void>;
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Get the authenticated user's ID.
     */
    getUserId(): string;
    /**
     * Extract a snippet around the first match of the query.
     */
    private extractSnippet;
}
export { SupabaseProjectStorage } from './projects.js';
export { SupabaseArtifactStorage } from './artifacts.js';
export { validateApiKey, hashApiKey } from './auth.js';
//# sourceMappingURL=index.d.ts.map