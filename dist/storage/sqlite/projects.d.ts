/**
 * SQLite implementation of ProjectStorage.
 */
import type Database from 'better-sqlite3';
import type { Project, ProjectCreate, ProjectUpdate, ProjectListOptions, ProjectStorage } from '../interface.js';
export declare class SQLiteProjectStorage implements ProjectStorage {
    private db;
    constructor(db: Database.Database);
    create(data: ProjectCreate): Promise<Project>;
    get(id: string): Promise<Project | null>;
    getByName(name: string): Promise<Project | null>;
    list(options?: ProjectListOptions): Promise<Project[]>;
    update(id: string, data: ProjectUpdate): Promise<Project>;
    delete(id: string): Promise<void>;
    countArtifacts(id: string): Promise<number>;
}
//# sourceMappingURL=projects.d.ts.map