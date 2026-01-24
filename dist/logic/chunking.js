/**
 * Content chunking utilities for handling large content.
 *
 * Auto-splits content that exceeds safe limits for MCP transmission.
 * Tries to split at natural boundaries (paragraphs, lines, sentences).
 */
import { createHash } from 'node:crypto';
/** Safe limit for MCP content (conservative) */
export const MCP_SAFE_SIZE = 3500;
/** Size for individual chunks */
export const MCP_CHUNK_SIZE = 3000;
/**
 * Estimate JSON-serialized size of content.
 * JSON escaping can increase size (backslashes, quotes, etc.)
 */
export function estimateJsonSize(content) {
    try {
        return JSON.stringify(content).length;
    }
    catch {
        // Fallback: assume 1.2x for escaping overhead
        return Math.floor(content.length * 1.2);
    }
}
/**
 * Check if content needs to be chunked.
 */
export function needsChunking(content, safeSize = MCP_SAFE_SIZE) {
    return estimateJsonSize(content) > safeSize;
}
/**
 * Calculate MD5 checksum of content.
 */
function md5(content) {
    return createHash('md5').update(content).digest('hex');
}
/**
 * Split content into safe-sized chunks.
 * Tries to split at paragraph or line boundaries when possible.
 */
export function chunkContent(content, chunkSize = MCP_CHUNK_SIZE) {
    if (!needsChunking(content)) {
        return {
            chunks: [content],
            totalSize: content.length,
            chunkCount: 1,
            checksum: md5(content),
        };
    }
    const chunks = [];
    let remaining = content;
    while (remaining) {
        if (remaining.length <= chunkSize) {
            chunks.push(remaining);
            break;
        }
        // Try to find a good split point
        let splitPoint = chunkSize;
        // Look for paragraph break (double newline)
        const paraBreak = remaining.lastIndexOf('\n\n', chunkSize);
        if (paraBreak > chunkSize / 2) {
            splitPoint = paraBreak + 2;
        }
        else {
            // Look for single line break
            const lineBreak = remaining.lastIndexOf('\n', chunkSize);
            if (lineBreak > chunkSize / 2) {
                splitPoint = lineBreak + 1;
            }
            else {
                // Look for sentence end
                const sentenceEnd = Math.max(remaining.lastIndexOf('. ', chunkSize), remaining.lastIndexOf('! ', chunkSize), remaining.lastIndexOf('? ', chunkSize));
                if (sentenceEnd > chunkSize / 2) {
                    splitPoint = sentenceEnd + 2;
                }
            }
        }
        chunks.push(remaining.slice(0, splitPoint));
        remaining = remaining.slice(splitPoint);
    }
    return {
        chunks,
        totalSize: content.length,
        chunkCount: chunks.length,
        checksum: md5(content),
    };
}
/**
 * Reassemble chunked content.
 */
export function reassembleChunks(chunks, checksum) {
    const content = chunks.join('');
    if (checksum) {
        const actualChecksum = md5(content);
        if (actualChecksum !== checksum) {
            throw new Error(`Checksum mismatch: expected ${checksum}, got ${actualChecksum}`);
        }
    }
    return content;
}
/**
 * Check if content contains code blocks (triple backticks).
 */
export function hasCodeBlocks(content) {
    return content.includes('```');
}
/**
 * Base64 encode content for safe transmission.
 */
export function encodeContent(content) {
    const encoded = Buffer.from(content, 'utf-8').toString('base64');
    return JSON.stringify({
        type: 'base64',
        encoding: 'utf-8',
        data: encoded,
        originalSize: content.length,
    });
}
/**
 * Decode base64-encoded content.
 */
export function decodeContent(encodedWrapper) {
    const wrapper = JSON.parse(encodedWrapper);
    if (wrapper.type !== 'base64') {
        throw new Error('Not a base64-encoded wrapper');
    }
    return Buffer.from(wrapper.data, 'base64').toString(wrapper.encoding || 'utf-8');
}
/**
 * Sanitize content for safe MCP transmission.
 */
export function sanitizeForMcp(content) {
    const metadata = {
        originalSize: content.length,
        modified: false,
        encoding: null,
    };
    // Check if content has code blocks that might cause issues
    if (hasCodeBlocks(content) && estimateJsonSize(content) > 1000) {
        const sanitized = encodeContent(content);
        metadata.modified = true;
        metadata.encoding = 'base64';
        return [sanitized, metadata];
    }
    return [content, metadata];
}
/**
 * Create an index document for chunked content.
 */
export function createChunkIndex(name, chunked, artifactNames) {
    let index = `# ${name} (Chunked Document)

This document has been split into ${chunked.chunkCount} parts due to size constraints.

## Metadata
- **Total Size**: ${chunked.totalSize.toLocaleString()} characters
- **Checksum**: ${chunked.checksum}
- **Parts**: ${chunked.chunkCount}

## Parts
`;
    for (let i = 0; i < artifactNames.length; i++) {
        index += `${i + 1}. ${artifactNames[i]}\n`;
    }
    index += `\n## Reassembly\nTo read this document, load all parts in order and concatenate them.`;
    return index;
}
//# sourceMappingURL=chunking.js.map