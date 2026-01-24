/**
 * Contextable MCP - Local-first MCP server for AI memory.
 *
 * @packageDocumentation
 */
export { SQLiteAdapter, type SQLiteAdapterOptions } from './storage/index.js';
export { SupabaseAdapter, type SupabaseAdapterOptions, validateApiKey, hashApiKey, } from './storage/index.js';
export type { StorageAdapter, ProjectStorage, ArtifactStorage, Project, ProjectCreate, ProjectUpdate, ProjectListOptions, Artifact, ArtifactCreate, ArtifactUpdate, ArtifactListOptions, ArtifactSummary, ArtifactVersion, ArtifactVersionSummary, SearchResult, SearchOptions, ChangeSource, } from './storage/interface.js';
export { estimateTokens, estimateChars, formatTokens, exceedsTokenLimit, MCP_SAFE_SIZE, MCP_CHUNK_SIZE, type ChunkedContent, type ChunkMetadata, estimateJsonSize, needsChunking, chunkContent, reassembleChunks, hasCodeBlocks, encodeContent, decodeContent, sanitizeForMcp, createChunkIndex, TOPIC_KEYWORDS, extractTopicsFromText, buildTopicClusters, filterByTopic, generateLivingSummary, type ProjectInfo, type RecentChange, type ProjectStats, type LivingSummary, } from './logic/index.js';
export type { ToolContext } from './tools/index.js';
export { projectSave, projectList, projectResume, projectAnalysisGet, artifactSave, artifactList, artifactGet, artifactDelete, artifactRestore, artifactArchived, artifactVersions, artifactRollback, search, } from './tools/index.js';
export { createServer, runServer, registerTools, TOOL_DEFINITIONS, createHttpMcpServer, type HttpServerOptions, } from './server/index.js';
export { loadConfig, getConfig, ensureDataDir, logger, type Config, type LogLevel, type StorageMode, DEFAULT_DATA_DIR, DEFAULT_DB_PATH, DEFAULT_LOG_LEVEL, DEFAULT_SERVER_NAME, DEFAULT_SERVER_VERSION, DEFAULT_SUPABASE_URL, } from './config/index.js';
export { ContextableError, NotFoundError, ValidationError, ConflictError, StorageError, formatError, } from './utils/errors.js';
export { generateId, isValidUUID, isValidHexId } from './utils/id.js';
export { now, nowSqlite, parseISO, formatDate, daysAgo, isWithinDays, relativeTime } from './utils/time.js';
//# sourceMappingURL=index.d.ts.map