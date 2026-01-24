/**
 * Project management MCP tools.
 *
 * Tools for managing the user's projects in Contextable.
 * A project is a container for related artifacts.
 */
import type { StorageAdapter, Project } from '../storage/interface.js';
import { generateLivingSummary } from '../logic/living-summary.js';
/**
 * Context passed to tool functions.
 */
export interface ToolContext {
    storage: StorageAdapter;
}
/**
 * Create or update a project.
 */
export declare function projectSave(ctx: ToolContext, params: {
    name: string;
    description?: string | null;
    tags?: string[];
    config?: Record<string, unknown>;
}): Promise<{
    success: boolean;
    project?: Project;
    status?: 'created' | 'updated';
    message: string;
    similar_projects?: Array<{
        id: string;
        name: string;
        description: string | null;
    }>;
    warning?: string;
    error?: string;
}>;
/**
 * List all user's projects.
 */
export declare function projectList(ctx: ToolContext, params?: {
    status?: 'active' | 'archived';
    limit?: number;
    offset?: number;
}): Promise<{
    success: boolean;
    projects?: Array<{
        id: string;
        name: string;
        description: string | null;
        status: string;
        tags: string[];
        created_at: string;
        updated_at: string;
    }>;
    count?: number;
    limit?: number;
    offset?: number;
    message: string;
    error?: string;
}>;
/**
 * Load a project with artifact summaries for resuming work.
 */
export declare function projectResume(ctx: ToolContext, params: {
    project_id?: string;
    project_name?: string;
    load_content?: boolean;
    max_tokens?: number;
    priority_filter?: string[];
    topic_cluster?: string;
}): Promise<{
    success: boolean;
    project?: {
        id: string;
        name: string;
        description: string | null;
        tags: string[];
        updated_at: string;
    };
    living_summary?: ReturnType<typeof generateLivingSummary>;
    artifact_index?: Array<{
        id: string;
        name: string;
        summary: string;
        topics: string[];
        priority: string;
        size_tokens: number;
        updated_at: string;
        content_loaded: boolean;
    }>;
    artifacts?: Array<{
        id: string;
        title: string;
        artifact_type: string;
        content: string;
        summary: string | null;
        priority: string;
        tags: string[];
        version: number;
        updated_at: string;
    }>;
    artifact_count?: number;
    topic_clusters?: Record<string, string[]>;
    content_loaded_count?: number;
    loaded_tokens?: number;
    available_tokens?: number;
    message: string;
    hint?: string;
    error?: string;
}>;
/**
 * Get cached AI analysis results for a project.
 */
export declare function projectAnalysisGet(ctx: ToolContext, params: {
    project_id?: string;
    project_name?: string;
    analysis_type?: string;
}): Promise<{
    success: boolean;
    project_id?: string;
    project_name?: string;
    analysis_type?: string;
    analysis?: unknown;
    available_types?: string[];
    stale?: boolean;
    message: string;
    error?: string;
}>;
//# sourceMappingURL=projects.d.ts.map