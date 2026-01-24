/**
 * SQLite implementation of ArtifactStorage.
 */
import type Database from 'better-sqlite3';
import type { Artifact, ArtifactCreate, ArtifactUpdate, ArtifactListOptions, ArtifactSummary, ArtifactVersion, ArtifactVersionSummary, ArtifactStorage } from '../interface.js';
export declare class SQLiteArtifactStorage implements ArtifactStorage {
    private db;
    constructor(db: Database.Database);
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
     * Save current artifact state to version history.
     */
    private saveVersion;
}
//# sourceMappingURL=artifacts.d.ts.map