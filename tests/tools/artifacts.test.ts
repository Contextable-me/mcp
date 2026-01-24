/**
 * Artifact tools tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestStorage } from '../setup.js';
import type { SQLiteAdapter } from '../../src/storage/index.js';
import { projectSave, type ToolContext } from '../../src/tools/projects.js';
import {
  artifactSave,
  artifactList,
  artifactGet,
  artifactDelete,
  artifactRestore,
  artifactArchived,
  artifactVersions,
  artifactRollback,
} from '../../src/tools/artifacts.js';

describe('Artifact Tools', () => {
  let storage: SQLiteAdapter;
  let ctx: ToolContext;
  let projectId: string;

  beforeEach(async () => {
    storage = await createTestStorage();
    ctx = { storage };

    // Create a project for artifacts
    const proj = await projectSave(ctx, { name: 'Test Project' });
    projectId = proj.project!.id;
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('artifactSave', () => {
    it('should create a new artifact', async () => {
      const result = await artifactSave(ctx, {
        project_id: projectId,
        name: 'My Doc',
        artifact_type: 'document',
        content: 'Document content here',
        summary: 'A test document',
        priority: 'core',
        tags: ['test'],
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('created');
      expect(result.artifact?.title).toBe('My Doc');
      expect(result.artifact?.priority).toBe('core');
      expect(result.chunked).toBe(false);
    });

    it('should update an existing artifact by name', async () => {
      await artifactSave(ctx, {
        project_id: projectId,
        name: 'My Doc',
        artifact_type: 'document',
        content: 'Original content',
      });

      const result = await artifactSave(ctx, {
        project_id: projectId,
        name: 'My Doc',
        artifact_type: 'document',
        content: 'Updated content',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('updated');
      expect(result.artifact?.content).toBe('Updated content');
      expect(result.artifact?.version).toBe(2);
    });

    it('should auto-chunk large content', async () => {
      const largeContent = 'Lorem ipsum. '.repeat(500); // ~6500 chars

      const result = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Large Doc',
        artifact_type: 'document',
        content: largeContent,
      });

      expect(result.success).toBe(true);
      expect(result.chunked).toBe(true);
      expect(result.chunk_count).toBeGreaterThan(1);
      expect(result.checksum).toBeDefined();
    });

    it('should validate artifact type', async () => {
      const result = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Bad Type',
        artifact_type: 'invalid',
        content: 'Content',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid artifact_type');
    });

    it('should validate priority', async () => {
      const result = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Bad Priority',
        artifact_type: 'document',
        content: 'Content',
        priority: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid priority');
    });
  });

  describe('artifactList', () => {
    it('should list artifacts with size info', async () => {
      await artifactSave(ctx, {
        project_id: projectId,
        name: 'Doc 1',
        artifact_type: 'document',
        content: 'Short content',
      });
      await artifactSave(ctx, {
        project_id: projectId,
        name: 'Doc 2',
        artifact_type: 'code',
        content: 'A'.repeat(1000),
      });

      const result = await artifactList(ctx, { project_id: projectId });

      expect(result.success).toBe(true);
      expect(result.artifacts?.length).toBe(2);
      expect(result.artifacts?.[0].size_chars).toBeDefined();
      expect(result.artifacts?.[0].tokens_est).toBeDefined();
    });

    it('should filter by artifact type', async () => {
      await artifactSave(ctx, {
        project_id: projectId,
        name: 'Doc',
        artifact_type: 'document',
        content: 'Content',
      });
      await artifactSave(ctx, {
        project_id: projectId,
        name: 'Code',
        artifact_type: 'code',
        content: 'Code',
      });

      const result = await artifactList(ctx, {
        project_id: projectId,
        artifact_type: 'code',
      });

      expect(result.success).toBe(true);
      expect(result.artifacts?.length).toBe(1);
      expect(result.artifacts?.[0].title).toBe('Code');
    });
  });

  describe('artifactGet', () => {
    it('should get full artifact content', async () => {
      const saved = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Get Test',
        artifact_type: 'document',
        content: 'Full content to retrieve',
        summary: 'Test summary',
      });

      const result = await artifactGet(ctx, { artifact_id: saved.artifact!.id });

      expect(result.success).toBe(true);
      expect(result.artifact?.content).toBe('Full content to retrieve');
      expect(result.artifact?.summary).toBe('Test summary');
      expect(result.truncated).toBe(false);
    });

    it('should truncate large content', async () => {
      const saved = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Large Get',
        artifact_type: 'document',
        content: 'A'.repeat(1000),
        auto_chunk: false, // Don't chunk for this test
      });

      const result = await artifactGet(ctx, {
        artifact_id: saved.artifact!.id,
        max_content_length: 100,
      });

      expect(result.success).toBe(true);
      expect(result.artifact?.content.length).toBe(100);
      expect(result.truncated).toBe(true);
    });

    it('should return error for non-existent artifact', async () => {
      const result = await artifactGet(ctx, { artifact_id: 'non-existent' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('artifactDelete / artifactRestore', () => {
    it('should archive and restore an artifact', async () => {
      const saved = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Delete Test',
        artifact_type: 'document',
        content: 'To be deleted',
      });

      // Delete (archive)
      const deleteResult = await artifactDelete(ctx, { artifact_id: saved.artifact!.id });
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.restore_hint).toContain('artifact_restore');

      // Should not appear in normal list
      const listResult = await artifactList(ctx, { project_id: projectId });
      expect(listResult.artifacts?.length).toBe(0);

      // Restore
      const restoreResult = await artifactRestore(ctx, { artifact_id: saved.artifact!.id });
      expect(restoreResult.success).toBe(true);

      // Should appear again
      const afterRestore = await artifactList(ctx, { project_id: projectId });
      expect(afterRestore.artifacts?.length).toBe(1);
    });
  });

  describe('artifactArchived', () => {
    it('should list archived artifacts', async () => {
      const saved = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Archived Doc',
        artifact_type: 'document',
        content: 'Content',
      });

      await artifactDelete(ctx, { artifact_id: saved.artifact!.id });

      const result = await artifactArchived(ctx, { project_id: projectId });

      expect(result.success).toBe(true);
      expect(result.artifacts?.length).toBe(1);
      expect(result.artifacts?.[0].title).toBe('Archived Doc');
    });
  });

  describe('artifactVersions / artifactRollback', () => {
    it('should list version history', async () => {
      const saved = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Version Test',
        artifact_type: 'document',
        content: 'Version 1',
      });

      // Update to create versions
      await artifactSave(ctx, {
        project_id: projectId,
        name: 'Version Test',
        artifact_type: 'document',
        content: 'Version 2',
      });

      const result = await artifactVersions(ctx, { artifact_id: saved.artifact!.id });

      expect(result.success).toBe(true);
      expect(result.versions?.length).toBe(1); // Original version saved before update
      expect(result.versions?.[0].version).toBe(1);
    });

    it('should rollback to a previous version', async () => {
      const saved = await artifactSave(ctx, {
        project_id: projectId,
        name: 'Rollback Test',
        artifact_type: 'document',
        content: 'Original content',
      });

      await artifactSave(ctx, {
        project_id: projectId,
        name: 'Rollback Test',
        artifact_type: 'document',
        content: 'Updated content',
      });

      // Get versions
      const versions = await artifactVersions(ctx, { artifact_id: saved.artifact!.id });
      const v1 = versions.versions?.find((v) => v.version === 1);

      // Rollback
      const result = await artifactRollback(ctx, {
        artifact_id: saved.artifact!.id,
        version_id: v1!.id,
      });

      expect(result.success).toBe(true);
      expect(result.artifact?.content).toBe('Original content');
      expect(result.artifact?.version).toBe(3); // Version incremented
    });
  });
});
