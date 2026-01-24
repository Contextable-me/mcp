/**
 * Search tool tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestStorage } from '../setup.js';
import type { SQLiteAdapter } from '../../src/storage/index.js';
import { projectSave, type ToolContext } from '../../src/tools/projects.js';
import { artifactSave } from '../../src/tools/artifacts.js';
import { search } from '../../src/tools/search.js';

describe('Search Tool', () => {
  let storage: SQLiteAdapter;
  let ctx: ToolContext;
  let projectId: string;

  beforeEach(async () => {
    storage = await createTestStorage();
    ctx = { storage };

    // Create a project with artifacts
    const proj = await projectSave(ctx, { name: 'Search Test Project' });
    projectId = proj.project!.id;

    await artifactSave(ctx, {
      project_id: projectId,
      name: 'Authentication Guide',
      artifact_type: 'document',
      content: 'This document explains OAuth and JWT authentication.',
      summary: 'Guide to authentication methods',
    });

    await artifactSave(ctx, {
      project_id: projectId,
      name: 'Database Schema',
      artifact_type: 'document',
      content: 'The database uses PostgreSQL with RLS policies.',
      summary: 'Database design documentation',
    });
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('search', () => {
    it('should search artifacts by content', async () => {
      const result = await search(ctx, { query: 'authentication' });

      expect(result.success).toBe(true);
      expect(result.results?.length).toBe(1);
      expect(result.results?.[0].title).toBe('Authentication Guide');
      expect(result.results?.[0].project_name).toBe('Search Test Project');
    });

    it('should search artifacts by title', async () => {
      const result = await search(ctx, { query: 'Database' });

      expect(result.success).toBe(true);
      expect(result.results?.length).toBe(1);
      expect(result.results?.[0].title).toBe('Database Schema');
    });

    it('should return snippets with matches', async () => {
      const result = await search(ctx, { query: 'OAuth' });

      expect(result.success).toBe(true);
      expect(result.results?.[0].snippet).toContain('authentication');
    });

    it('should filter by project', async () => {
      // Create another project with matching content
      const proj2 = await projectSave(ctx, { name: 'Other Project' });
      await artifactSave(ctx, {
        project_id: proj2.project!.id,
        name: 'Other Auth Doc',
        artifact_type: 'document',
        content: 'More authentication content',
      });

      // Search all
      const allResult = await search(ctx, { query: 'authentication' });
      expect(allResult.results?.length).toBe(2);

      // Search filtered
      const filteredResult = await search(ctx, {
        query: 'authentication',
        project_id: projectId,
      });
      expect(filteredResult.results?.length).toBe(1);
      expect(filteredResult.results?.[0].project_id).toBe(projectId);
    });

    it('should not return archived artifacts', async () => {
      const saved = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Secret Document',
        artifact_type: 'document',
        content: 'This contains secret information',
      });

      // Should find it
      let result = await search(ctx, { query: 'secret' });
      expect(result.results?.length).toBe(1);

      // Archive it
      await storage.artifacts.archive(saved.artifact!.id);

      // Should not find it
      result = await search(ctx, { query: 'secret' });
      expect(result.results?.length).toBe(0);
    });

    it('should return empty results for no matches', async () => {
      const result = await search(ctx, { query: 'nonexistent' });

      expect(result.success).toBe(true);
      expect(result.results?.length).toBe(0);
      expect(result.message).toContain('No results found');
    });

    it('should reject empty query', async () => {
      const result = await search(ctx, { query: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
