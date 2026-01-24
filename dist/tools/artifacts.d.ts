/**
 * Artifact management MCP tools.
 *
 * Tools for managing artifacts within projects.
 * An artifact is a piece of content (document, code, decision, etc.).
 */
import type { StorageAdapter, Artifact, ArtifactSummary } from '../storage/interface.js';
/**
 * Context passed to tool functions.
 */
export interface ToolContext {
    storage: StorageAdapter;
}
/**
 * Save content to a project. Large content is automatically chunked.
 */
export declare function artifactSave(ctx: ToolContext, params: {
    project_id: string;
    name: string;
    artifact_type: string;
    content: string;
    summary?: string | null;
    priority?: string;
    description?: string | null;
    tags?: string[];
    metadata?: Record<string, unknown>;
    auto_chunk?: boolean;
}): Promise<{
    success: boolean;
    artifact?: Artifact;
    status?: 'created' | 'updated';
    chunked?: boolean;
    chunk_count?: number;
    total_size?: number;
    checksum?: string;
    message: string;
    error?: string;
}>;
/**
 * List artifacts in a project with size estimates.
 */
export declare function artifactList(ctx: ToolContext, params: {
    project_id: string;
    artifact_type?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    success: boolean;
    artifacts?: Array<{
        id: string;
        title: string;
        artifact_type: string;
        summary: string | null;
        priority: string;
        tags: string[];
        size_chars: number;
        tokens_est: number;
        version: number;
        updated_at: string;
    }>;
    count?: number;
    message: string;
    error?: string;
}>;
/**
 * Load a specific artifact's full content.
 */
export declare function artifactGet(ctx: ToolContext, params: {
    artifact_id: string;
    max_content_length?: number;
}): Promise<{
    success: boolean;
    artifact?: {
        id: string;
        project_id: string;
        title: string;
        artifact_type: string;
        content: string;
        summary: string | null;
        priority: string;
        tags: string[];
        version: number;
        size_chars: number;
        tokens_est: number;
        created_at: string;
        updated_at: string;
    };
    truncated?: boolean;
    message: string;
    error?: string;
}>;
/**
 * Delete (archive) an artifact.
 */
export declare function artifactDelete(ctx: ToolContext, params: {
    artifact_id: string;
}): Promise<{
    success: boolean;
    artifact?: Artifact;
    message: string;
    restore_hint?: string;
    error?: string;
}>;
/**
 * Restore an archived artifact.
 */
export declare function artifactRestore(ctx: ToolContext, params: {
    artifact_id: string;
}): Promise<{
    success: boolean;
    artifact?: Artifact;
    message: string;
    error?: string;
}>;
/**
 * List archived artifacts in a project.
 */
export declare function artifactArchived(ctx: ToolContext, params: {
    project_id: string;
    limit?: number;
}): Promise<{
    success: boolean;
    artifacts?: ArtifactSummary[];
    count?: number;
    message: string;
    error?: string;
}>;
/**
 * Get version history for an artifact.
 */
export declare function artifactVersions(ctx: ToolContext, params: {
    artifact_id: string;
    limit?: number;
}): Promise<{
    success: boolean;
    versions?: Array<{
        id: string;
        version: number;
        title: string;
        summary: string | null;
        priority: string | null;
        change_source: string;
        size_chars: number;
        tokens_est: number;
        created_at: string;
    }>;
    count?: number;
    message: string;
    error?: string;
}>;
/**
 * Rollback an artifact to a previous version.
 */
export declare function artifactRollback(ctx: ToolContext, params: {
    artifact_id: string;
    version_id: string;
}): Promise<{
    success: boolean;
    artifact?: Artifact;
    message: string;
    error?: string;
}>;
//# sourceMappingURL=artifacts.d.ts.map