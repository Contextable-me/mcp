/**
 * Topic extraction tests.
 */

import { describe, it, expect } from 'vitest';
import {
  TOPIC_KEYWORDS,
  extractTopicsFromText,
  buildTopicClusters,
  filterByTopic,
} from '../../src/logic/topics.js';

describe('Topic Extraction', () => {
  describe('TOPIC_KEYWORDS', () => {
    it('should have expected topic categories', () => {
      expect(TOPIC_KEYWORDS).toHaveProperty('security');
      expect(TOPIC_KEYWORDS).toHaveProperty('api');
      expect(TOPIC_KEYWORDS).toHaveProperty('database');
      expect(TOPIC_KEYWORDS).toHaveProperty('architecture');
      expect(TOPIC_KEYWORDS).toHaveProperty('ui');
      expect(TOPIC_KEYWORDS).toHaveProperty('testing');
    });
  });

  describe('extractTopicsFromText', () => {
    it('should extract security topics', () => {
      const text = 'We need to implement JWT authentication for the API';
      const topics = extractTopicsFromText(text);

      expect(topics).toContain('security');
      expect(topics).toContain('api');
    });

    it('should extract database topics', () => {
      const text = 'Database schema migration for PostgreSQL';
      const topics = extractTopicsFromText(text);

      expect(topics).toContain('database');
    });

    it('should match whole words only', () => {
      const text = 'artistic design'; // 'art' should not match 'api'
      const topics = extractTopicsFromText(text);

      expect(topics).not.toContain('api');
    });

    it('should be case insensitive', () => {
      const text = 'API AUTHENTICATION with JWT';
      const topics = extractTopicsFromText(text);

      expect(topics).toContain('api');
      expect(topics).toContain('security');
    });

    it('should return empty array for empty text', () => {
      expect(extractTopicsFromText('')).toEqual([]);
      expect(extractTopicsFromText(null as unknown as string)).toEqual([]);
    });

    it('should not duplicate topics', () => {
      const text = 'auth authentication authorization'; // All security keywords
      const topics = extractTopicsFromText(text);

      const securityCount = topics.filter((t) => t === 'security').length;
      expect(securityCount).toBe(1);
    });
  });

  describe('buildTopicClusters', () => {
    it('should cluster artifacts by detected topics', () => {
      const artifacts = [
        { title: 'API Security Guide', tags: ['security'] },
        { title: 'Database Schema', summary: 'PostgreSQL tables' },
        { title: 'Auth Flow', content: 'JWT authentication flow' },
      ];

      const clusters = buildTopicClusters(artifacts);

      expect(clusters.security).toContain('API Security Guide');
      expect(clusters.security).toContain('Auth Flow');
      expect(clusters.database).toContain('Database Schema');
    });

    it('should include explicit tags', () => {
      const artifacts = [{ title: 'My Doc', tags: ['custom-tag', 'another'] }];

      const clusters = buildTopicClusters(artifacts);

      expect(clusters['custom-tag']).toContain('My Doc');
      expect(clusters['another']).toContain('My Doc');
    });

    it('should sort clusters by size (most populated first)', () => {
      const artifacts = [
        { title: 'API 1', summary: 'api endpoint' },
        { title: 'API 2', summary: 'api route' },
        { title: 'API 3', summary: 'api call' },
        { title: 'DB Doc', summary: 'database schema' },
      ];

      const clusters = buildTopicClusters(artifacts);
      const keys = Object.keys(clusters);

      expect(keys[0]).toBe('api'); // 3 artifacts
      // Second should be database (1 artifact)
      expect(clusters.database).toBeDefined();
      expect(clusters.database).toContain('DB Doc');
    });

    it('should handle artifacts without titles', () => {
      const artifacts = [{ name: 'Fallback Name', summary: 'api doc' }];

      const clusters = buildTopicClusters(artifacts);

      expect(clusters.api).toContain('Fallback Name');
    });
  });

  describe('filterByTopic', () => {
    const artifacts = [
      { title: 'API Security', tags: ['security', 'api'] },
      { title: 'Database Guide', tags: ['database'] },
      { title: 'Auth Implementation', summary: 'JWT authentication' },
    ];

    it('should filter by explicit tag', () => {
      const filtered = filterByTopic(artifacts, 'database');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Database Guide');
    });

    it('should filter by auto-detected topic', () => {
      const filtered = filterByTopic(artifacts, 'security');

      expect(filtered).toHaveLength(2);
      expect(filtered.map((a) => a.title)).toContain('API Security');
      expect(filtered.map((a) => a.title)).toContain('Auth Implementation');
    });

    it('should be case insensitive', () => {
      const filtered = filterByTopic(artifacts, 'DATABASE');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Database Guide');
    });

    it('should return empty array if no matches', () => {
      const filtered = filterByTopic(artifacts, 'nonexistent');

      expect(filtered).toHaveLength(0);
    });
  });
});
