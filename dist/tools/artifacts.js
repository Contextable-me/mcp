/**
 * Artifact management MCP tools.
 *
 * Tools for managing artifacts within projects.
 * An artifact is a piece of content (document, code, decision, etc.).
 */
import { formatError } from '../utils/errors.js';
import { needsChunking, chunkContent, createChunkIndex } from '../logic/chunking.js';
import { estimateTokens } from '../logic/tokens.js';
/**
 * Valid artifact types.
 */
const VALID_TYPES = ['document', 'code', 'decision', 'conversation', 'file'];
/**
 * Valid priority levels.
 */
const VALID_PRIORITIES = ['core', 'normal', 'reference'];
/**
 * Save content to a project. Large content is automatically chunked.
 */
export async function artifactSave(ctx, params) {
    try {
        const { project_id, name, artifact_type, content, summary, priority, tags, auto_chunk = true, } = params;
        // Determine effective priority (use provided or default to 'normal' for new artifacts)
        const effectivePriority = priority || 'normal';
        // Validate artifact type
        if (!VALID_TYPES.includes(artifact_type)) {
            return {
                success: false,
                message: `Invalid artifact_type '${artifact_type}'. Valid types: ${VALID_TYPES.join(', ')}`,
                error: 'Invalid artifact_type',
            };
        }
        // Validate priority if provided
        if (priority && !VALID_PRIORITIES.includes(priority)) {
            return {
                success: false,
                message: `Invalid priority '${priority}'. Valid priorities: ${VALID_PRIORITIES.join(', ')}`,
                error: 'Invalid priority',
            };
        }
        // Check if artifact with this name exists (for upsert)
        const existing = await ctx.storage.artifacts.getByTitle(project_id, name);
        // Check if content needs chunking
        if (auto_chunk && needsChunking(content)) {
            const chunked = chunkContent(content);
            // Save each chunk as a separate artifact
            const artifactNames = [];
            const artifactIds = [];
            for (let i = 0; i < chunked.chunks.length; i++) {
                const chunkContent = chunked.chunks[i];
                if (!chunkContent)
                    continue;
                const chunkName = `${name}_part_${i + 1}`;
                artifactNames.push(chunkName);
                const chunkArtifact = await ctx.storage.artifacts.create({
                    project_id,
                    title: chunkName,
                    artifact_type: artifact_type,
                    content: chunkContent,
                    summary: `Part ${i + 1} of ${chunked.chunkCount} - ${summary || name}`,
                    priority: effectivePriority,
                    tags: [...(tags || []), 'chunked-part'],
                });
                artifactIds.push(chunkArtifact.id);
            }
            // Create index artifact
            const indexContent = createChunkIndex(name, chunked, artifactNames);
            const indexArtifact = await ctx.storage.artifacts.create({
                project_id,
                title: `${name}_index`,
                artifact_type: 'document',
                content: indexContent,
                summary: `Index for chunked document: ${name} (${chunked.chunkCount} parts)`,
                priority: 'core',
                tags: [...(tags || []), 'chunked-index'],
            });
            return {
                success: true,
                artifact: indexArtifact,
                status: 'created',
                chunked: true,
                chunk_count: chunked.chunkCount,
                total_size: chunked.totalSize,
                checksum: chunked.checksum,
                message: `Saved '${name}' in ${chunked.chunkCount} chunks (${chunked.totalSize.toLocaleString()} chars)`,
            };
        }
        // Regular save (no chunking needed)
        let artifact;
        let status;
        if (existing) {
            artifact = await ctx.storage.artifacts.update(existing.id, {
                content,
                summary: summary ?? undefined,
                // Only update priority if explicitly provided
                priority: priority ? priority : undefined,
                tags,
            });
            status = 'updated';
        }
        else {
            artifact = await ctx.storage.artifacts.create({
                project_id,
                title: name,
                artifact_type: artifact_type,
                content,
                summary: summary ?? null,
                priority: effectivePriority,
                tags: tags ?? [],
            });
            status = 'created';
        }
        return {
            success: true,
            artifact,
            status,
            chunked: false,
            message: `Artifact '${name}' ${status} successfully`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: formatError(error),
            error: formatError(error),
        };
    }
}
/**
 * List artifacts in a project with size estimates.
 */
export async function artifactList(ctx, params) {
    try {
        const { project_id, artifact_type, limit = 20, offset = 0 } = params;
        const artifacts = await ctx.storage.artifacts.list(project_id, {
            type: artifact_type,
            limit,
            offset,
        });
        return {
            success: true,
            artifacts: artifacts.map((a) => ({
                id: a.id,
                title: a.title,
                artifact_type: a.artifact_type,
                summary: a.summary,
                priority: a.priority,
                tags: a.tags,
                size_chars: a.size_chars,
                tokens_est: a.tokens_est,
                version: a.version,
                updated_at: a.updated_at,
            })),
            count: artifacts.length,
            message: `Found ${artifacts.length} artifact(s)`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: formatError(error),
            error: formatError(error),
        };
    }
}
/**
 * Load a specific artifact's full content.
 */
export async function artifactGet(ctx, params) {
    try {
        const { artifact_id, max_content_length = 50000 } = params;
        const artifact = await ctx.storage.artifacts.get(artifact_id);
        if (!artifact) {
            return {
                success: false,
                message: `Artifact not found: ${artifact_id}`,
                error: 'Artifact not found',
            };
        }
        let content = artifact.content;
        let truncated = false;
        if (content.length > max_content_length) {
            content = content.slice(0, max_content_length);
            truncated = true;
        }
        return {
            success: true,
            artifact: {
                id: artifact.id,
                project_id: artifact.project_id,
                title: artifact.title,
                artifact_type: artifact.artifact_type,
                content,
                summary: artifact.summary,
                priority: artifact.priority,
                tags: artifact.tags,
                version: artifact.version,
                size_chars: artifact.content.length,
                tokens_est: estimateTokens(artifact.content.length),
                created_at: artifact.created_at,
                updated_at: artifact.updated_at,
            },
            truncated,
            message: truncated
                ? `Loaded '${artifact.title}' (truncated to ${max_content_length} chars)`
                : `Loaded '${artifact.title}'`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: formatError(error),
            error: formatError(error),
        };
    }
}
/**
 * Delete (archive) an artifact.
 */
export async function artifactDelete(ctx, params) {
    try {
        const { artifact_id } = params;
        const artifact = await ctx.storage.artifacts.archive(artifact_id);
        return {
            success: true,
            artifact,
            message: `Archived '${artifact.title}'. It can be restored with artifact_restore.`,
            restore_hint: `To restore: artifact_restore(artifact_id='${artifact_id}')`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: formatError(error),
            error: formatError(error),
        };
    }
}
/**
 * Restore an archived artifact.
 */
export async function artifactRestore(ctx, params) {
    try {
        const { artifact_id } = params;
        const artifact = await ctx.storage.artifacts.restore(artifact_id);
        return {
            success: true,
            artifact,
            message: `Restored '${artifact.title}'`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: formatError(error),
            error: formatError(error),
        };
    }
}
/**
 * List archived artifacts in a project.
 */
export async function artifactArchived(ctx, params) {
    try {
        const { project_id, limit = 20 } = params;
        const artifacts = await ctx.storage.artifacts.listArchived(project_id, limit);
        return {
            success: true,
            artifacts,
            count: artifacts.length,
            message: `Found ${artifacts.length} archived artifact(s)`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: formatError(error),
            error: formatError(error),
        };
    }
}
/**
 * Get version history for an artifact.
 */
export async function artifactVersions(ctx, params) {
    try {
        const { artifact_id, limit = 10 } = params;
        const versions = await ctx.storage.artifacts.getVersions(artifact_id, limit);
        return {
            success: true,
            versions: versions.map((v) => ({
                id: v.id,
                version: v.version,
                title: v.title,
                summary: v.summary,
                priority: v.priority,
                change_source: v.change_source,
                size_chars: v.size_chars,
                tokens_est: v.tokens_est,
                created_at: v.created_at,
            })),
            count: versions.length,
            message: `Found ${versions.length} version(s) for artifact`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: formatError(error),
            error: formatError(error),
        };
    }
}
/**
 * Rollback an artifact to a previous version.
 */
export async function artifactRollback(ctx, params) {
    try {
        const { artifact_id, version_id } = params;
        const artifact = await ctx.storage.artifacts.rollback(artifact_id, version_id);
        return {
            success: true,
            artifact,
            message: `Rolled back '${artifact.title}' to previous version (now v${artifact.version})`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: formatError(error),
            error: formatError(error),
        };
    }
}
//# sourceMappingURL=artifacts.js.map