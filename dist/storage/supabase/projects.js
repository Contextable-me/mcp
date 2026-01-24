/**
 * Supabase project storage implementation.
 *
 * All queries are filtered by user_id to enforce data isolation.
 */
import { generateId } from '../../utils/id.js';
import { now as isoNow } from '../../utils/time.js';
export class SupabaseProjectStorage {
    client;
    userId;
    constructor(client, userId) {
        this.client = client;
        this.userId = userId;
    }
    async create(data) {
        const now = isoNow();
        const row = {
            id: generateId(),
            user_id: this.userId,
            name: data.name,
            description: data.description ?? null,
            tags: data.tags ?? [],
            status: data.status ?? 'active',
            config: data.config ?? {},
            created_at: now,
            updated_at: now,
        };
        const { data: result, error } = await this.client
            .from('projects')
            .insert(row)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create project: ${error.message}`);
        }
        return this.rowToProject(result);
    }
    async get(id) {
        const { data, error } = await this.client
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('user_id', this.userId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to get project: ${error.message}`);
        }
        return this.rowToProject(data);
    }
    async getByName(name) {
        const { data, error } = await this.client
            .from('projects')
            .select('*')
            .eq('user_id', this.userId)
            .ilike('name', name)
            .limit(1);
        if (error) {
            throw new Error(`Failed to get project by name: ${error.message}`);
        }
        if (!data || data.length === 0) {
            return null;
        }
        return this.rowToProject(data[0]);
    }
    async list(options) {
        const limit = Math.min(options?.limit ?? 20, 50);
        const offset = options?.offset ?? 0;
        let query = this.client
            .from('projects')
            .select('*')
            .eq('user_id', this.userId)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (options?.status) {
            query = query.eq('status', options.status);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to list projects: ${error.message}`);
        }
        return (data || []).map((row) => this.rowToProject(row));
    }
    async update(id, data) {
        // First verify ownership
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Project not found: ${id}`);
        }
        const updates = {
            updated_at: isoNow(),
        };
        if (data.name !== undefined)
            updates.name = data.name;
        if (data.description !== undefined)
            updates.description = data.description;
        if (data.tags !== undefined)
            updates.tags = data.tags;
        if (data.status !== undefined)
            updates.status = data.status;
        if (data.config !== undefined) {
            // Deep merge config
            updates.config = {
                ...(existing.config || {}),
                ...data.config,
            };
        }
        const { data: result, error } = await this.client
            .from('projects')
            .update(updates)
            .eq('id', id)
            .eq('user_id', this.userId)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update project: ${error.message}`);
        }
        return this.rowToProject(result);
    }
    async delete(id) {
        // First verify ownership
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Project not found: ${id}`);
        }
        const { error } = await this.client
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', this.userId);
        if (error) {
            throw new Error(`Failed to delete project: ${error.message}`);
        }
    }
    async countArtifacts(id) {
        // First verify ownership
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Project not found: ${id}`);
        }
        const { count, error } = await this.client
            .from('artifacts')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', id)
            .is('archived_at', null);
        if (error) {
            throw new Error(`Failed to count artifacts: ${error.message}`);
        }
        return count ?? 0;
    }
    /**
     * Convert a database row to a Project object.
     */
    rowToProject(row) {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            tags: row.tags ?? [],
            status: row.status,
            config: row.config ?? undefined,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}
//# sourceMappingURL=projects.js.map