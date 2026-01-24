/**
 * Token estimation tests.
 */

import { describe, it, expect } from 'vitest';
import { estimateTokens, estimateChars, formatTokens, exceedsTokenLimit } from '../../src/logic/tokens.js';

describe('Token Estimation', () => {
  describe('estimateTokens', () => {
    it('should estimate ~4 chars per token', () => {
      expect(estimateTokens(100)).toBe(25);
      expect(estimateTokens(400)).toBe(100);
      expect(estimateTokens(1000)).toBe(250);
    });

    it('should floor the result', () => {
      expect(estimateTokens(7)).toBe(1);
      expect(estimateTokens(15)).toBe(3);
    });

    it('should handle zero', () => {
      expect(estimateTokens(0)).toBe(0);
    });
  });

  describe('estimateChars', () => {
    it('should reverse estimateTokens', () => {
      expect(estimateChars(25)).toBe(100);
      expect(estimateChars(100)).toBe(400);
      expect(estimateChars(250)).toBe(1000);
    });
  });

  describe('formatTokens', () => {
    it('should format small numbers as is', () => {
      expect(formatTokens(100)).toBe('100');
      expect(formatTokens(999)).toBe('999');
    });

    it('should format thousands with k suffix', () => {
      expect(formatTokens(1000)).toBe('1.0k');
      expect(formatTokens(2500)).toBe('2.5k');
      expect(formatTokens(15000)).toBe('15.0k');
    });
  });

  describe('exceedsTokenLimit', () => {
    it('should return true when content exceeds limit', () => {
      const content = 'A'.repeat(1000); // 250 tokens
      expect(exceedsTokenLimit(content, 200)).toBe(true);
    });

    it('should return false when content is within limit', () => {
      const content = 'A'.repeat(100); // 25 tokens
      expect(exceedsTokenLimit(content, 50)).toBe(false);
    });
  });
});
