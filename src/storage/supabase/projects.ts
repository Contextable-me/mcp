/**
 * Supabase project storage implementation.
 *
 * All queries are filtered by user_id to enforce data isolation.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectListOptions,
  ProjectStorage,
} from '../interface.js';
import { generateId } from '../../utils/id.js';
import { now as isoNow } from '../../utils/time.js';

/**
 * Supabase row type for projects table.
 */
interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  status: string;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseProjectStorage implements ProjectStorage {
  constructor(
    private client: SupabaseClient,
    private userId: string
  ) {}

  async create(data: ProjectCreate): Promise<Project> {
    const now = isoNow();
    const row: Omit<ProjectRow, 'id'> & { id: string } = {
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

  async get(id: string): Promise<Project | null> {
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

  async getByName(name: string): Promise<Project | null> {
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

  async list(options?: ProjectListOptions): Promise<Project[]> {
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

  async update(id: string, data: ProjectUpdate): Promise<Project> {
    // First verify ownership
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    const updates: Partial<ProjectRow> = {
      updated_at: isoNow(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.status !== undefined) updates.status = data.status;
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

  async delete(id: string): Promise<void> {
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

  async countArtifacts(id: string): Promise<number> {
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
  private rowToProject(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      tags: row.tags ?? [],
      status: row.status as Project['status'],
      config: row.config ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
