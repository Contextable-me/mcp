/**
 * Supabase project storage implementation.
 *
 * All queries are filtered by user_id to enforce data isolation.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project, ProjectCreate, ProjectUpdate, ProjectListOptions, ProjectStorage } from '../interface.js';
export declare class SupabaseProjectStorage implements ProjectStorage {
    private client;
    private userId;
    constructor(client: SupabaseClient, userId: string);
    create(data: ProjectCreate): Promise<Project>;
    get(id: string): Promise<Project | null>;
    getByName(name: string): Promise<Project | null>;
    list(options?: ProjectListOptions): Promise<Project[]>;
    update(id: string, data: ProjectUpdate): Promise<Project>;
    delete(id: string): Promise<void>;
    countArtifacts(id: string): Promise<number>;
    /**
     * Convert a database row to a Project object.
     */
    private rowToProject;
}
//# sourceMappingURL=projects.d.ts.map