/**
 * Search MCP tool.
 *
 * Searches artifact content across all projects.
 */

import type { StorageAdapter } from '../storage/interface.js';
import { formatError } from '../utils/errors.js';

/**
 * Context passed to tool functions.
 */
export interface ToolContext {
  storage: StorageAdapter;
}

/**
 * Search for content across all projects.
 */
export async function search(
  ctx: ToolContext,
  params: {
    query: string;
    project_id?: string;
    limit?: number;
  }
): Promise<{
  success: boolean;
  results?: Array<{
    id: string;
    project_id: string;
    project_name: string;
    title: string;
    artifact_type: string;
    summary: string | null;
    snippet: string;
    priority: string;
    updated_at: string;
  }>;
  count?: number;
  message: string;
  error?: string;
}> {
  try {
    const { query, project_id, limit = 20 } = params;

    if (!query || query.trim().length === 0) {
      return {
        success: false,
        message: 'Search query cannot be empty',
        error: 'Empty query',
      };
    }

    const results = await ctx.storage.search(query, { projectId: project_id, limit });

    return {
      success: true,
      results: results.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        project_name: r.project_name,
        title: r.title,
        artifact_type: r.artifact_type,
        summary: r.summary,
        snippet: r.snippet,
        priority: r.priority,
        updated_at: r.updated_at,
      })),
      count: results.length,
      message:
        results.length > 0
          ? `Found ${results.length} result(s) for "${query}"`
          : `No results found for "${query}"`,
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
      error: formatError(error),
    };
  }
}
