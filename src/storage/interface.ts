/**
 * Storage interface for Contextable MCP server.
 *
 * Defines the contract for storage adapters (SQLite for local, Supabase for hosted).
 * All adapters must implement this interface to ensure consistent behavior.
 */

// =============================================================================
// Core Types
// =============================================================================

export type ProjectStatus = 'active' | 'archived';
export type ArtifactType = 'document' | 'code' | 'decision' | 'conversation' | 'file';
export type Priority = 'core' | 'normal' | 'reference';
export type ChangeSource = 'update' | 'archive' | 'restore' | 'rollback';

// =============================================================================
// Project Types
// =============================================================================

export interface Project {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  status: ProjectStatus;
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
  tags?: string[];
  status?: ProjectStatus;
  config?: Record<string, unknown>;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  tags?: string[];
  status?: ProjectStatus;
  config?: Record<string, unknown>;
}

export interface ProjectListOptions {
  status?: ProjectStatus;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Artifact Types
// =============================================================================

export interface Artifact {
  id: string;
  project_id: string;
  title: string;
  artifact_type: ArtifactType;
  content: string;
  summary: string | null;
  priority: Priority;
  tags: string[];
  version: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Artifact summary for listing (without full content).
 */
export interface ArtifactSummary {
  id: string;
  project_id: string;
  title: string;
  artifact_type: ArtifactType;
  summary: string | null;
  priority: Priority;
  tags: string[];
  version: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  /** Character count of content */
  size_chars: number;
  /** Estimated token count (chars / 4) */
  tokens_est: number;
}

export interface ArtifactCreate {
  project_id: string;
  title: string;
  artifact_type: ArtifactType;
  content: string;
  summary?: string | null;
  priority?: Priority;
  tags?: string[];
}

export interface ArtifactUpdate {
  title?: string;
  content?: string;
  summary?: string | null;
  priority?: Priority;
  tags?: string[];
}

export interface ArtifactListOptions {
  type?: ArtifactType;
  priority?: Priority;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}

// =============================================================================
// Version History Types
// =============================================================================

export interface ArtifactVersion {
  id: string;
  artifact_id: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  priority: Priority | null;
  change_source: ChangeSource;
  created_at: string;
}

export interface ArtifactVersionSummary {
  id: string;
  artifact_id: string;
  version: number;
  title: string;
  summary: string | null;
  priority: Priority | null;
  change_source: ChangeSource;
  created_at: string;
  size_chars: number;
  tokens_est: number;
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchResult {
  id: string;
  artifact_id: string;
  project_id: string;
  project_name: string;
  title: string;
  artifact_type: ArtifactType;
  summary: string | null;
  priority: Priority;
  /** Text snippet with search match highlighted */
  snippet: string;
  updated_at: string;
  /** Relevance score (higher is better) */
  score: number;
}

export interface SearchOptions {
  projectId?: string;
  limit?: number;
}

// =============================================================================
// Storage Interfaces
// =============================================================================

export interface ProjectStorage {
  /**
   * Create a new project.
   */
  create(data: ProjectCreate): Promise<Project>;

  /**
   * Get a project by ID.
   */
  get(id: string): Promise<Project | null>;

  /**
   * Get a project by name (case-insensitive).
   */
  getByName(name: string): Promise<Project | null>;

  /**
   * List all projects.
   */
  list(options?: ProjectListOptions): Promise<Project[]>;

  /**
   * Update a project.
   */
  update(id: string, data: ProjectUpdate): Promise<Project>;

  /**
   * Delete a project and all its artifacts.
   */
  delete(id: string): Promise<void>;

  /**
   * Count artifacts in a project.
   */
  countArtifacts(id: string): Promise<number>;
}

export interface ArtifactStorage {
  /**
   * Create a new artifact.
   */
  create(data: ArtifactCreate): Promise<Artifact>;

  /**
   * Get an artifact by ID.
   */
  get(id: string): Promise<Artifact | null>;

  /**
   * Get an artifact by title within a project (case-insensitive).
   */
  getByTitle(projectId: string, title: string): Promise<Artifact | null>;

  /**
   * List artifacts in a project (without full content).
   */
  list(projectId: string, options?: ArtifactListOptions): Promise<ArtifactSummary[]>;

  /**
   * List archived artifacts in a project.
   */
  listArchived(projectId: string, limit?: number): Promise<ArtifactSummary[]>;

  /**
   * Update an artifact. Creates a version snapshot before updating.
   */
  update(id: string, data: ArtifactUpdate): Promise<Artifact>;

  /**
   * Archive (soft-delete) an artifact.
   */
  archive(id: string): Promise<Artifact>;

  /**
   * Restore an archived artifact.
   */
  restore(id: string): Promise<Artifact>;

  /**
   * Get version history for an artifact.
   */
  getVersions(id: string, limit?: number): Promise<ArtifactVersionSummary[]>;

  /**
   * Get a specific version's full content.
   */
  getVersion(versionId: string): Promise<ArtifactVersion | null>;

  /**
   * Rollback an artifact to a previous version.
   */
  rollback(id: string, versionId: string): Promise<Artifact>;
}

// =============================================================================
// Main Storage Adapter Interface
// =============================================================================

export interface StorageAdapter {
  /** Project storage operations */
  projects: ProjectStorage;

  /** Artifact storage operations */
  artifacts: ArtifactStorage;

  /**
   * Full-text search across artifacts.
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Initialize the storage (run migrations, create tables, etc.).
   */
  initialize(): Promise<void>;

  /**
   * Close the storage connection.
   */
  close(): Promise<void>;
}
