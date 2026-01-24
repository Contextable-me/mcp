/**
 * Content chunking utilities for handling large content.
 *
 * Auto-splits content that exceeds safe limits for MCP transmission.
 * Tries to split at natural boundaries (paragraphs, lines, sentences).
 */
/** Safe limit for MCP content (conservative) */
export declare const MCP_SAFE_SIZE = 3500;
/** Size for individual chunks */
export declare const MCP_CHUNK_SIZE = 3000;
export interface ChunkedContent {
    chunks: string[];
    totalSize: number;
    chunkCount: number;
    checksum: string;
}
export interface ChunkMetadata {
    originalSize: number;
    modified: boolean;
    encoding: 'base64' | null;
}
/**
 * Estimate JSON-serialized size of content.
 * JSON escaping can increase size (backslashes, quotes, etc.)
 */
export declare function estimateJsonSize(content: string): number;
/**
 * Check if content needs to be chunked.
 */
export declare function needsChunking(content: string, safeSize?: number): boolean;
/**
 * Split content into safe-sized chunks.
 * Tries to split at paragraph or line boundaries when possible.
 */
export declare function chunkContent(content: string, chunkSize?: number): ChunkedContent;
/**
 * Reassemble chunked content.
 */
export declare function reassembleChunks(chunks: string[], checksum?: string): string;
/**
 * Check if content contains code blocks (triple backticks).
 */
export declare function hasCodeBlocks(content: string): boolean;
/**
 * Base64 encode content for safe transmission.
 */
export declare function encodeContent(content: string): string;
/**
 * Decode base64-encoded content.
 */
export declare function decodeContent(encodedWrapper: string): string;
/**
 * Sanitize content for safe MCP transmission.
 */
export declare function sanitizeForMcp(content: string): [string, ChunkMetadata];
/**
 * Create an index document for chunked content.
 */
export declare function createChunkIndex(name: string, chunked: ChunkedContent, artifactNames: string[]): string;
//# sourceMappingURL=chunking.d.ts.map