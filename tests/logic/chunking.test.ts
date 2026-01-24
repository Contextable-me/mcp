/**
 * Content chunking tests.
 */

import { describe, it, expect } from 'vitest';
import {
  MCP_SAFE_SIZE,
  MCP_CHUNK_SIZE,
  estimateJsonSize,
  needsChunking,
  chunkContent,
  reassembleChunks,
  hasCodeBlocks,
  encodeContent,
  decodeContent,
  createChunkIndex,
} from '../../src/logic/chunking.js';

describe('Content Chunking', () => {
  describe('estimateJsonSize', () => {
    it('should return actual JSON string length', () => {
      const content = 'Hello, World!';
      const expected = JSON.stringify(content).length;
      expect(estimateJsonSize(content)).toBe(expected);
    });

    it('should account for escaped characters', () => {
      const content = 'Line 1\nLine 2\tTabbed';
      // JSON escapes \n and \t
      expect(estimateJsonSize(content)).toBeGreaterThan(content.length);
    });
  });

  describe('needsChunking', () => {
    it('should return false for small content', () => {
      const small = 'This is small content.';
      expect(needsChunking(small)).toBe(false);
    });

    it('should return true for large content', () => {
      const large = 'A'.repeat(MCP_SAFE_SIZE + 100);
      expect(needsChunking(large)).toBe(true);
    });

    it('should respect custom safe size', () => {
      const content = 'A'.repeat(500);
      expect(needsChunking(content, 100)).toBe(true);
      expect(needsChunking(content, 1000)).toBe(false);
    });
  });

  describe('chunkContent', () => {
    it('should return single chunk for small content', () => {
      const small = 'This is small content.';
      const result = chunkContent(small);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toBe(small);
      expect(result.totalSize).toBe(small.length);
      expect(result.chunkCount).toBe(1);
      expect(result.checksum).toBeDefined();
    });

    it('should split large content into multiple chunks', () => {
      const large = 'Lorem ipsum. '.repeat(500); // ~6500 chars
      const result = chunkContent(large);

      expect(result.chunks.length).toBeGreaterThan(1);
      expect(result.chunkCount).toBe(result.chunks.length);
      expect(result.totalSize).toBe(large.length);
    });

    it('should try to split at paragraph boundaries', () => {
      const content = 'Paragraph one.\n\nParagraph two.\n\n' + 'A'.repeat(MCP_CHUNK_SIZE);
      const result = chunkContent(content);

      // First chunk should end at paragraph break
      expect(result.chunks[0]).toContain('Paragraph one.');
    });

    it('should try to split at line boundaries', () => {
      const content = 'Line one.\nLine two.\n' + 'A'.repeat(MCP_CHUNK_SIZE);
      const result = chunkContent(content);

      // First chunk should end at line break
      expect(result.chunks[0]).toContain('Line one.');
    });

    it('should maintain checksum consistency', () => {
      const content = 'Test content for checksum';
      const result1 = chunkContent(content);
      const result2 = chunkContent(content);

      expect(result1.checksum).toBe(result2.checksum);
    });
  });

  describe('reassembleChunks', () => {
    it('should reassemble chunks into original content', () => {
      const original = 'Lorem ipsum. '.repeat(500);
      const chunked = chunkContent(original);
      const reassembled = reassembleChunks(chunked.chunks);

      expect(reassembled).toBe(original);
    });

    it('should verify checksum when provided', () => {
      const original = 'Test content';
      const chunked = chunkContent(original);

      // Valid checksum should work
      expect(() => reassembleChunks(chunked.chunks, chunked.checksum)).not.toThrow();

      // Invalid checksum should throw
      expect(() => reassembleChunks(chunked.chunks, 'invalid')).toThrow('Checksum mismatch');
    });
  });

  describe('hasCodeBlocks', () => {
    it('should detect triple backticks', () => {
      expect(hasCodeBlocks('```js\ncode\n```')).toBe(true);
      expect(hasCodeBlocks('Regular text')).toBe(false);
    });
  });

  describe('encodeContent / decodeContent', () => {
    it('should round-trip content through base64', () => {
      const original = '```python\nprint("Hello")\n```';
      const encoded = encodeContent(original);
      const decoded = decodeContent(encoded);

      expect(decoded).toBe(original);
    });

    it('should handle unicode content', () => {
      const original = 'Hello 世界 🎉';
      const encoded = encodeContent(original);
      const decoded = decodeContent(encoded);

      expect(decoded).toBe(original);
    });

    it('should throw for invalid wrapper', () => {
      expect(() => decodeContent('{"type":"plain"}')).toThrow('Not a base64-encoded wrapper');
    });
  });

  describe('createChunkIndex', () => {
    it('should create markdown index document', () => {
      const chunked = {
        chunks: ['chunk1', 'chunk2'],
        totalSize: 6000,
        chunkCount: 2,
        checksum: 'abc123',
      };
      const artifactNames = ['doc_part_1', 'doc_part_2'];

      const index = createChunkIndex('My Document', chunked, artifactNames);

      expect(index).toContain('# My Document (Chunked Document)');
      expect(index).toContain('**Total Size**: 6,000 characters');
      expect(index).toContain('**Checksum**: abc123');
      expect(index).toContain('**Parts**: 2');
      expect(index).toContain('1. doc_part_1');
      expect(index).toContain('2. doc_part_2');
    });
  });
});
