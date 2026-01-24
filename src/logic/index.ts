/**
 * Business logic exports.
 */

// Token estimation
export { estimateTokens, estimateChars, formatTokens, exceedsTokenLimit } from './tokens.js';

// Content chunking
export {
  MCP_SAFE_SIZE,
  MCP_CHUNK_SIZE,
  type ChunkedContent,
  type ChunkMetadata,
  estimateJsonSize,
  needsChunking,
  chunkContent,
  reassembleChunks,
  hasCodeBlocks,
  encodeContent,
  decodeContent,
  sanitizeForMcp,
  createChunkIndex,
} from './chunking.js';

// Topic extraction
export {
  TOPIC_KEYWORDS,
  extractTopicsFromText,
  buildTopicClusters,
  filterByTopic,
  type ArtifactInfo as TopicArtifactInfo,
} from './topics.js';

// Living summary
export {
  generateLivingSummary,
  type ProjectInfo,
  type ArtifactInfo as SummaryArtifactInfo,
  type RecentChange,
  type ProjectStats,
  type LivingSummary,
} from './living-summary.js';
