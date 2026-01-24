/**
 * Supabase artifact storage implementation.
 *
 * Artifacts are owned through their parent project.
 * All queries verify project ownership via user_id filtering.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Artifact, ArtifactCreate, ArtifactUpdate, ArtifactListOptions, ArtifactSummary, ArtifactVersion, ArtifactVersionSummary, ArtifactStorage } from '../interface.js';
export declare class SupabaseArtifactStorage implements ArtifactStorage {
    private client;
    private userId;
    constructor(client: SupabaseClient, userId: string);
    create(data: ArtifactCreate): Promise<Artifact>;
    get(id: string): Promise<Artifact | null>;
    getByTitle(projectId: string, title: string): Promise<Artifact | null>;
    list(projectId: string, options?: ArtifactListOptions): Promise<ArtifactSummary[]>;
    listArchived(projectId: string, limit?: number): Promise<ArtifactSummary[]>;
    update(id: string, data: ArtifactUpdate): Promise<Artifact>;
    archive(id: string): Promise<Artifact>;
    restore(id: string): Promise<Artifact>;
    getVersions(id: string, limit?: number): Promise<ArtifactVersionSummary[]>;
    getVersion(versionId: string): Promise<ArtifactVersion | null>;
    rollback(id: string, versionId: string): Promise<Artifact>;
    /**
     * Verify that a project belongs to the current user.
     */
    private verifyProjectOwnership;
    /**
     * Convert a database row to an Artifact object.
     */
    private rowToArtifact;
    /**
     * Convert a database row to an ArtifactSummary object.
     */
    private rowToSummary;
}
//# sourceMappingURL=artifacts.d.ts.map