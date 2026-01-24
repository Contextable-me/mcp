/**
 * Search MCP tool.
 *
 * Searches artifact content across all projects.
 */
import type { StorageAdapter } from '../storage/interface.js';
/**
 * Context passed to tool functions.
 */
export interface ToolContext {
    storage: StorageAdapter;
}
/**
 * Search for content across all projects.
 */
export declare function search(ctx: ToolContext, params: {
    query: string;
    project_id?: string;
    limit?: number;
}): Promise<{
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
}>;
//# sourceMappingURL=search.d.ts.map