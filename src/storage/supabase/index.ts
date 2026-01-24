/**
 * Supabase storage adapter for Contextable MCP server.
 *
 * Used in hosted mode with authenticated API connections.
 * Connects to Supabase cloud for persistent storage.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { StorageAdapter, SearchResult, SearchOptions } from '../interface.js';
import { SupabaseProjectStorage } from './projects.js';
import { SupabaseArtifactStorage } from './artifacts.js';
import { validateApiKey } from './auth.js';

export interface SupabaseAdapterOptions {
  /** Supabase URL */
  supabaseUrl: string;
  /** Supabase service role key (for API key validation) */
  supabaseServiceKey: string;
  /** User's API key for authentication */
  apiKey: string;
}

export class SupabaseAdapter implements StorageAdapter {
  private client: SupabaseClient;
  private userId: string | null = null;
  private apiKey: string;
  private supabaseUrl: string;
  private supabaseServiceKey: string;

  public projects!: SupabaseProjectStorage;
  public artifacts!: SupabaseArtifactStorage;

  constructor(options: SupabaseAdapterOptions) {
    this.supabaseUrl = options.supabaseUrl;
    this.supabaseServiceKey = options.supabaseServiceKey;
    this.apiKey = options.apiKey;

    // Create client with service role for API key validation
    this.client = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Initialize the adapter by validating the API key.
   * Must be called before any other operations.
   */
  async initialize(): Promise<void> {
    // Validate API key and get user ID
    this.userId = await validateApiKey(this.client, this.apiKey);

    // Initialize sub-storages with user ID
    this.projects = new SupabaseProjectStorage(this.client, this.userId);
    this.artifacts = new SupabaseArtifactStorage(this.client, this.userId);
  }

  async close(): Promise<void> {
    // Supabase client doesn't require explicit closing
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.userId) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    const limit = Math.min(options?.limit ?? 20, 50);

    // Escape special characters for LIKE pattern
    const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
    const searchPattern = `%${escapedQuery}%`;

    // Build base query - get user's project IDs first
    let projectIds: string[];

    if (options?.projectId) {
      // Verify ownership of specified project
      const { data: project } = await this.client
        .from('projects')
        .select('id')
        .eq('id', options.projectId)
        .eq('user_id', this.userId)
        .single();

      if (!project) {
        throw new Error(`Project not found: ${options.projectId}`);
      }
      projectIds = [options.projectId];
    } else {
      // Get all user's projects
      const { data: projects } = await this.client
        .from('projects')
        .select('id')
        .eq('user_id', this.userId);

      projectIds = (projects || []).map((p) => p.id);
    }

    if (projectIds.length === 0) {
      return [];
    }

    // Search artifacts using ilike
    const { data, error } = await this.client
      .from('artifacts')
      .select('*, projects!inner(id, name)')
      .in('project_id', projectIds)
      .is('archived_at', null)
      .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      artifact_id: row.id,
      project_id: row.project_id,
      project_name: row.projects?.name ?? 'Unknown',
      title: row.title,
      artifact_type: row.artifact_type as SearchResult['artifact_type'],
      summary: row.summary,
      priority: (row.priority ?? 'normal') as SearchResult['priority'],
      snippet: this.extractSnippet(row.content, query, row.summary),
      updated_at: row.updated_at,
      score: 1, // Simple search doesn't have ranking
    }));
  }

  /**
   * Get the authenticated user's ID.
   */
  getUserId(): string {
    if (!this.userId) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }
    return this.userId;
  }

  /**
   * Extract a snippet around the first match of the query.
   */
  private extractSnippet(
    content: string,
    query: string,
    summary: string | null
  ): string {
    // Prefer summary if available
    if (summary && summary.length > 0) {
      return summary.slice(0, 200);
    }

    // Find match in content
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);

    if (matchIndex === -1) {
      return content.slice(0, 200) + (content.length > 200 ? '...' : '');
    }

    // Extract around match
    const start = Math.max(0, matchIndex - 50);
    const end = Math.min(content.length, matchIndex + query.length + 150);

    let snippet = content.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }
}

export { SupabaseProjectStorage } from './projects.js';
export { SupabaseArtifactStorage } from './artifacts.js';
export { validateApiKey, hashApiKey } from './auth.js';
