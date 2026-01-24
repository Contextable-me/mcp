/**
 * Supabase artifact storage implementation.
 *
 * Artifacts are owned through their parent project.
 * All queries verify project ownership via user_id filtering.
 */
import { generateId } from '../../utils/id.js';
import { now as isoNow } from '../../utils/time.js';
import { estimateTokens } from '../../logic/tokens.js';
export class SupabaseArtifactStorage {
    client;
    userId;
    constructor(client, userId) {
        this.client = client;
        this.userId = userId;
    }
    async create(data) {
        // Verify project ownership
        await this.verifyProjectOwnership(data.project_id);
        const now = isoNow();
        const row = {
            id: generateId(),
            project_id: data.project_id,
            title: data.title,
            artifact_type: data.artifact_type,
            content: data.content,
            summary: data.summary ?? null,
            priority: data.priority ?? 'normal',
            tags: data.tags ?? [],
            version: 1,
            archived_at: null,
            created_at: now,
            updated_at: now,
        };
        const { data: result, error } = await this.client
            .from('artifacts')
            .insert(row)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create artifact: ${error.message}`);
        }
        return this.rowToArtifact(result);
    }
    async get(id) {
        // Get artifact with project join to verify ownership
        const { data, error } = await this.client
            .from('artifacts')
            .select('*, projects!inner(user_id)')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get artifact: ${error.message}`);
        }
        // Verify ownership
        if (data.projects.user_id !== this.userId) {
            return null;
        }
        // Remove join data
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { projects, ...artifactData } = data;
        return this.rowToArtifact(artifactData);
    }
    async getByTitle(projectId, title) {
        // Verify project ownership first
        await this.verifyProjectOwnership(projectId);
        const { data, error } = await this.client
            .from('artifacts')
            .select('*')
            .eq('project_id', projectId)
            .ilike('title', title)
            .is('archived_at', null)
            .limit(1);
        if (error) {
            throw new Error(`Failed to get artifact by title: ${error.message}`);
        }
        if (!data || data.length === 0) {
            return null;
        }
        return this.rowToArtifact(data[0]);
    }
    async list(projectId, options) {
        // Verify project ownership
        await this.verifyProjectOwnership(projectId);
        const limit = Math.min(options?.limit ?? 20, 50);
        const offset = options?.offset ?? 0;
        let query = this.client
            .from('artifacts')
            .select('*')
            .eq('project_id', projectId)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);
        // Filter archived unless explicitly requested
        if (!options?.includeArchived) {
            query = query.is('archived_at', null);
        }
        if (options?.type) {
            query = query.eq('artifact_type', options.type);
        }
        if (options?.priority) {
            query = query.eq('priority', options.priority);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to list artifacts: ${error.message}`);
        }
        return (data || []).map((row) => this.rowToSummary(row));
    }
    async listArchived(projectId, limit) {
        // Verify project ownership
        await this.verifyProjectOwnership(projectId);
        const actualLimit = Math.min(limit ?? 20, 50);
        const { data, error } = await this.client
            .from('artifacts')
            .select('*')
            .eq('project_id', projectId)
            .not('archived_at', 'is', null)
            .order('archived_at', { ascending: false })
            .limit(actualLimit);
        if (error) {
            throw new Error(`Failed to list archived artifacts: ${error.message}`);
        }
        return (data || []).map((row) => this.rowToSummary(row));
    }
    async update(id, data) {
        // Get existing artifact (verifies ownership)
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Artifact not found: ${id}`);
        }
        const updates = {
            version: existing.version + 1,
            updated_at: isoNow(),
        };
        if (data.title !== undefined)
            updates.title = data.title;
        if (data.content !== undefined)
            updates.content = data.content;
        if (data.summary !== undefined)
            updates.summary = data.summary;
        if (data.priority !== undefined)
            updates.priority = data.priority;
        if (data.tags !== undefined)
            updates.tags = data.tags;
        const { data: result, error } = await this.client
            .from('artifacts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update artifact: ${error.message}`);
        }
        return this.rowToArtifact(result);
    }
    async archive(id) {
        // Get existing artifact (verifies ownership)
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Artifact not found: ${id}`);
        }
        if (existing.archived_at) {
            return existing; // Already archived
        }
        const { data: result, error } = await this.client
            .from('artifacts')
            .update({ archived_at: isoNow() })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to archive artifact: ${error.message}`);
        }
        return this.rowToArtifact(result);
    }
    async restore(id) {
        // Get artifact (including archived) with project join
        const { data, error: getError } = await this.client
            .from('artifacts')
            .select('*, projects!inner(user_id)')
            .eq('id', id)
            .single();
        if (getError || !data) {
            throw new Error(`Artifact not found: ${id}`);
        }
        // Verify ownership
        if (data.projects.user_id !== this.userId) {
            throw new Error(`Artifact not found: ${id}`);
        }
        if (!data.archived_at) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { projects, ...artifactData } = data;
            return this.rowToArtifact(artifactData);
        }
        const { data: result, error } = await this.client
            .from('artifacts')
            .update({ archived_at: null })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to restore artifact: ${error.message}`);
        }
        return this.rowToArtifact(result);
    }
    async getVersions(id, limit) {
        // Verify artifact ownership
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Artifact not found: ${id}`);
        }
        const actualLimit = Math.min(limit ?? 10, 50);
        const { data, error } = await this.client
            .from('artifact_versions')
            .select('*')
            .eq('artifact_id', id)
            .order('version', { ascending: false })
            .limit(actualLimit);
        if (error) {
            throw new Error(`Failed to get versions: ${error.message}`);
        }
        return (data || []).map((row) => ({
            id: row.id,
            artifact_id: row.artifact_id,
            version: row.version,
            title: row.title,
            summary: row.summary,
            priority: row.priority,
            change_source: row.change_source,
            created_at: row.created_at,
            size_chars: row.content?.length ?? 0,
            tokens_est: estimateTokens(row.content?.length ?? 0),
        }));
    }
    async getVersion(versionId) {
        const { data, error } = await this.client
            .from('artifact_versions')
            .select('*, artifacts!inner(project_id, projects!inner(user_id))')
            .eq('id', versionId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get version: ${error.message}`);
        }
        // Verify ownership through artifacts -> projects -> user_id
        if (data.artifacts.projects.user_id !== this.userId) {
            return null;
        }
        return {
            id: data.id,
            artifact_id: data.artifact_id,
            version: data.version,
            title: data.title,
            content: data.content ?? '',
            summary: data.summary,
            priority: data.priority,
            change_source: data.change_source,
            created_at: data.created_at,
        };
    }
    async rollback(id, versionId) {
        // Get the version
        const version = await this.getVersion(versionId);
        if (!version) {
            throw new Error(`Version not found: ${versionId}`);
        }
        // Verify it belongs to the right artifact
        if (version.artifact_id !== id) {
            throw new Error(`Version ${versionId} does not belong to artifact ${id}`);
        }
        // Get existing artifact (verifies ownership)
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Artifact not found: ${id}`);
        }
        // Update artifact with version content (trigger will capture current state)
        const updates = {
            title: version.title,
            content: version.content,
            summary: version.summary,
            priority: version.priority ?? existing.priority,
            version: existing.version + 1,
            updated_at: isoNow(),
        };
        const { data: result, error } = await this.client
            .from('artifacts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to rollback artifact: ${error.message}`);
        }
        return this.rowToArtifact(result);
    }
    /**
     * Verify that a project belongs to the current user.
     */
    async verifyProjectOwnership(projectId) {
        const { data, error } = await this.client
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', this.userId)
            .single();
        if (error || !data) {
            throw new Error(`Project not found: ${projectId}`);
        }
    }
    /**
     * Convert a database row to an Artifact object.
     */
    rowToArtifact(row) {
        return {
            id: row.id,
            project_id: row.project_id,
            title: row.title,
            artifact_type: row.artifact_type,
            content: row.content,
            summary: row.summary,
            priority: (row.priority ?? 'normal'),
            tags: row.tags ?? [],
            version: row.version,
            archived_at: row.archived_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
    /**
     * Convert a database row to an ArtifactSummary object.
     */
    rowToSummary(row) {
        const sizeChars = row.content?.length ?? 0;
        return {
            id: row.id,
            project_id: row.project_id,
            title: row.title,
            artifact_type: row.artifact_type,
            summary: row.summary,
            priority: (row.priority ?? 'normal'),
            tags: row.tags ?? [],
            version: row.version,
            archived_at: row.archived_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            size_chars: sizeChars,
            tokens_est: estimateTokens(sizeChars),
        };
    }
}
//# sourceMappingURL=artifacts.js.map