/**
 * Living summary generation tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateLivingSummary } from '../../src/logic/living-summary.js';

describe('Living Summary', () => {
  // Helper to create ISO date strings
  function daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  describe('generateLivingSummary', () => {
    it('should generate summary with basic info', () => {
      const project = { name: 'Test Project', description: 'A test project' };
      const artifacts = [
        { title: 'Doc 1', priority: 'core', updated_at: daysAgo(1), size_chars: 1000 },
        { title: 'Doc 2', priority: 'normal', updated_at: daysAgo(5), size_chars: 500 },
      ];
      const topicClusters = { api: ['Doc 1'], database: ['Doc 2'] };

      const summary = generateLivingSummary(project, artifacts, topicClusters);

      expect(summary.generated).toBeDefined();
      expect(summary.currentState).toContain('2 artifacts');
      expect(summary.projectDescription).toBe('A test project');
    });

    it('should identify recent changes (last 7 days)', () => {
      const project = { name: 'Test' };
      const artifacts = [
        { title: 'Recent Doc', updated_at: daysAgo(2), summary: 'Updated recently' },
        { title: 'Old Doc', updated_at: daysAgo(20) },
      ];

      const summary = generateLivingSummary(project, artifacts, {});

      expect(summary.recentChanges).toHaveLength(1);
      expect(summary.recentChanges[0].name).toBe('Recent Doc');
      expect(summary.stats.changesLast7Days).toBe(1);
    });

    it('should track 30-day activity', () => {
      const project = { name: 'Test' };
      const artifacts = [
        { title: 'Week Old', updated_at: daysAgo(5) },
        { title: 'Month Old', updated_at: daysAgo(20) },
        { title: 'Ancient', updated_at: daysAgo(60) },
      ];

      const summary = generateLivingSummary(project, artifacts, {});

      expect(summary.stats.changesLast7Days).toBe(1);
      expect(summary.stats.changesLast30Days).toBe(2); // Week + Month
    });

    it('should identify key (core) artifacts', () => {
      const project = { name: 'Test' };
      const artifacts = [
        { title: 'Important', priority: 'core' },
        { title: 'Regular', priority: 'normal' },
        { title: 'Also Important', priority: 'core' },
      ];

      const summary = generateLivingSummary(project, artifacts, {});

      expect(summary.keyArtifacts).toContain('Important');
      expect(summary.keyArtifacts).toContain('Also Important');
      expect(summary.keyArtifacts).not.toContain('Regular');
      expect(summary.stats.coreArtifacts).toBe(2);
    });

    it('should include active topics', () => {
      const project = { name: 'Test' };
      const artifacts = [{ title: 'Doc' }];
      const topicClusters = {
        security: ['Doc 1', 'Doc 2'],
        api: ['Doc 1'],
        database: ['Doc 3'],
      };

      const summary = generateLivingSummary(project, artifacts, topicClusters);

      expect(summary.activeTopics).toHaveLength(3);
      expect(summary.activeTopics).toContain('security');
    });

    it('should limit active topics to 5', () => {
      const project = { name: 'Test' };
      const artifacts = [];
      const topicClusters = {
        topic1: [],
        topic2: [],
        topic3: [],
        topic4: [],
        topic5: [],
        topic6: [],
        topic7: [],
      };

      const summary = generateLivingSummary(project, artifacts, topicClusters);

      expect(summary.activeTopics).toHaveLength(5);
    });

    it('should calculate total tokens from size_chars', () => {
      const project = { name: 'Test' };
      const artifacts = [
        { title: 'Doc 1', size_chars: 1000 },
        { title: 'Doc 2', size_chars: 2000 },
      ];

      const summary = generateLivingSummary(project, artifacts, {});

      expect(summary.stats.totalTokens).toBe(750); // 3000 / 4
    });

    it('should describe activity status correctly', () => {
      const project = { name: 'Test' };

      // Active - updated in last 7 days
      const activeArtifacts = [{ title: 'Doc', updated_at: daysAgo(2) }];
      const activeSummary = generateLivingSummary(project, activeArtifacts, {});
      expect(activeSummary.currentState).toContain('actively updated');

      // Recently active - updated in last 30 days but not 7
      const recentArtifacts = [{ title: 'Doc', updated_at: daysAgo(15) }];
      const recentSummary = generateLivingSummary(project, recentArtifacts, {});
      expect(recentSummary.currentState).toContain('recently active');

      // Stable - no recent updates
      const stableArtifacts = [{ title: 'Doc', updated_at: daysAgo(60) }];
      const stableSummary = generateLivingSummary(project, stableArtifacts, {});
      expect(stableSummary.currentState).toContain('stable');
    });

    it('should truncate long descriptions', () => {
      const project = { name: 'Test', description: 'A'.repeat(500) };
      const summary = generateLivingSummary(project, [], {});

      expect(summary.projectDescription?.length).toBeLessThanOrEqual(200);
    });

    it('should handle missing/null values gracefully', () => {
      const project = { name: 'Test' };
      const artifacts = [
        { title: 'Doc 1' }, // No updated_at, priority, size_chars
        { name: 'Doc 2' }, // Using name instead of title
        {}, // Empty artifact
      ];

      expect(() => generateLivingSummary(project, artifacts, {})).not.toThrow();
    });

    it('should limit recent changes to 5', () => {
      const project = { name: 'Test' };
      const artifacts = Array.from({ length: 10 }, (_, i) => ({
        title: `Doc ${i + 1}`,
        updated_at: daysAgo(i % 7), // All within last 7 days
      }));

      const summary = generateLivingSummary(project, artifacts, {});

      expect(summary.recentChanges.length).toBeLessThanOrEqual(5);
    });

    it('should limit key artifacts to 8', () => {
      const project = { name: 'Test' };
      const artifacts = Array.from({ length: 15 }, (_, i) => ({
        title: `Core Doc ${i + 1}`,
        priority: 'core',
      }));

      const summary = generateLivingSummary(project, artifacts, {});

      expect(summary.keyArtifacts.length).toBeLessThanOrEqual(8);
    });
  });
});
