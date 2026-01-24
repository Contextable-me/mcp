/**
 * SQLite storage adapter tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestStorage, createTestProject, createTestArtifact } from '../setup.js';
import type { SQLiteAdapter } from '../../src/storage/index.js';

describe('SQLiteAdapter', () => {
  let storage: SQLiteAdapter;

  beforeEach(async () => {
    storage = await createTestStorage();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('Projects', () => {
    it('should create a project', async () => {
      const data = createTestProject({ name: 'My Project' });
      const project = await storage.projects.create(data);

      expect(project.id).toBeDefined();
      expect(project.name).toBe('My Project');
      expect(project.description).toBe('A test project');
      expect(project.status).toBe('active');
      expect(project.tags).toEqual(['test']);
    });

    it('should get a project by ID', async () => {
      const data = createTestProject();
      const created = await storage.projects.create(data);

      const found = await storage.projects.get(created.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe(created.name);
    });

    it('should get a project by name (case-insensitive)', async () => {
      const data = createTestProject({ name: 'My Special Project' });
      await storage.projects.create(data);

      const found = await storage.projects.getByName('my special project');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('My Special Project');
    });

    it('should return null for non-existent project', async () => {
      const found = await storage.projects.get('non-existent-id');
      expect(found).toBeNull();
    });

    it('should list projects', async () => {
      await storage.projects.create(createTestProject({ name: 'Project 1' }));
      await storage.projects.create(createTestProject({ name: 'Project 2' }));

      const projects = await storage.projects.list();
      expect(projects.length).toBe(2);
    });

    it('should list projects with status filter', async () => {
      const p1 = await storage.projects.create(createTestProject({ name: 'Active' }));
      await storage.projects.create(createTestProject({ name: 'Also Active' }));
      await storage.projects.update(p1.id, { status: 'archived' });

      const active = await storage.projects.list({ status: 'active' });
      expect(active.length).toBe(1);
      expect(active[0]?.name).toBe('Also Active');

      const archived = await storage.projects.list({ status: 'archived' });
      expect(archived.length).toBe(1);
      expect(archived[0]?.name).toBe('Active');
    });

    it('should update a project', async () => {
      const created = await storage.projects.create(createTestProject());

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = await storage.projects.update(created.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.updated_at).toBeDefined();
    });

    it('should delete a project', async () => {
      const created = await storage.projects.create(createTestProject());
      await storage.projects.delete(created.id);

      const found = await storage.projects.get(created.id);
      expect(found).toBeNull();
    });

    it('should throw NotFoundError when updating non-existent project', async () => {
      await expect(
        storage.projects.update('non-existent', { name: 'New' })
      ).rejects.toThrow('not found');
    });
  });

  describe('Artifacts', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await storage.projects.create(createTestProject());
      projectId = project.id;
    });

    it('should create an artifact', async () => {
      const data = createTestArtifact(projectId, { title: 'My Artifact' });
      const artifact = await storage.artifacts.create(data);

      expect(artifact.id).toBeDefined();
      expect(artifact.title).toBe('My Artifact');
      expect(artifact.artifact_type).toBe('document');
      expect(artifact.priority).toBe('normal');
      expect(artifact.version).toBe(1);
    });

    it('should get an artifact by ID', async () => {
      const created = await storage.artifacts.create(createTestArtifact(projectId));
      const found = await storage.artifacts.get(created.id);

      expect(found).not.toBeNull();
      expect(found?.title).toBe(created.title);
    });

    it('should get an artifact by title (case-insensitive)', async () => {
      await storage.artifacts.create(
        createTestArtifact(projectId, { title: 'Important Document' })
      );

      const found = await storage.artifacts.getByTitle(projectId, 'important document');
      expect(found).not.toBeNull();
      expect(found?.title).toBe('Important Document');
    });

    it('should list artifacts with size estimates', async () => {
      await storage.artifacts.create(
        createTestArtifact(projectId, { content: 'Short content' })
      );
      await storage.artifacts.create(
        createTestArtifact(projectId, {
          title: 'Long Artifact',
          content: 'A'.repeat(1000),
        })
      );

      const artifacts = await storage.artifacts.list(projectId);
      expect(artifacts.length).toBe(2);

      const longArtifact = artifacts.find((a) => a.title === 'Long Artifact');
      expect(longArtifact?.size_chars).toBe(1000);
      expect(longArtifact?.tokens_est).toBe(250);
    });

    it('should update an artifact and increment version', async () => {
      const created = await storage.artifacts.create(createTestArtifact(projectId));
      expect(created.version).toBe(1);

      const updated = await storage.artifacts.update(created.id, {
        content: 'Updated content',
      });

      expect(updated.version).toBe(2);
      expect(updated.content).toBe('Updated content');
    });

    it('should save version history on update', async () => {
      const created = await storage.artifacts.create(
        createTestArtifact(projectId, { content: 'Original content' })
      );

      await storage.artifacts.update(created.id, { content: 'Updated content' });

      const versions = await storage.artifacts.getVersions(created.id);
      expect(versions.length).toBe(1);
      expect(versions[0]?.version).toBe(1);
    });

    it('should archive and restore an artifact', async () => {
      const created = await storage.artifacts.create(createTestArtifact(projectId));

      // Archive
      const archived = await storage.artifacts.archive(created.id);
      expect(archived.archived_at).not.toBeNull();

      // Should not appear in normal list
      const list = await storage.artifacts.list(projectId);
      expect(list.length).toBe(0);

      // Should appear in archived list
      const archivedList = await storage.artifacts.listArchived(projectId);
      expect(archivedList.length).toBe(1);

      // Restore
      const restored = await storage.artifacts.restore(created.id);
      expect(restored.archived_at).toBeNull();
      expect(restored.version).toBe(created.version + 1);
    });

    it('should rollback to a previous version', async () => {
      const created = await storage.artifacts.create(
        createTestArtifact(projectId, { content: 'Version 1 content' })
      );

      await storage.artifacts.update(created.id, { content: 'Version 2 content' });
      await storage.artifacts.update(created.id, { content: 'Version 3 content' });

      // Get version 1
      const versions = await storage.artifacts.getVersions(created.id);
      const v1 = versions.find((v) => v.version === 1);
      expect(v1).toBeDefined();

      // Rollback to version 1
      const rolledBack = await storage.artifacts.rollback(created.id, v1!.id);
      expect(rolledBack.content).toBe('Version 1 content');
      expect(rolledBack.version).toBe(4); // Version incremented
    });

    it('should list artifacts by priority with core first', async () => {
      await storage.artifacts.create(
        createTestArtifact(projectId, { title: 'Normal', priority: 'normal' })
      );
      await storage.artifacts.create(
        createTestArtifact(projectId, { title: 'Core', priority: 'core' })
      );
      await storage.artifacts.create(
        createTestArtifact(projectId, { title: 'Reference', priority: 'reference' })
      );

      const artifacts = await storage.artifacts.list(projectId);
      expect(artifacts[0]?.title).toBe('Core');
    });
  });

  describe('Search', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await storage.projects.create(
        createTestProject({ name: 'Search Test Project' })
      );
      projectId = project.id;

      await storage.artifacts.create(
        createTestArtifact(projectId, {
          title: 'Authentication Guide',
          content: 'This document explains OAuth and JWT authentication.',
          summary: 'Guide to authentication methods',
        })
      );
      await storage.artifacts.create(
        createTestArtifact(projectId, {
          title: 'Database Schema',
          content: 'The database uses PostgreSQL with RLS policies.',
          summary: 'Database design documentation',
        })
      );
    });

    it('should search artifacts by content', async () => {
      const results = await storage.search('authentication');

      expect(results.length).toBe(1);
      expect(results[0]?.title).toBe('Authentication Guide');
      expect(results[0]?.project_name).toBe('Search Test Project');
    });

    it('should search artifacts by title', async () => {
      const results = await storage.search('Database');

      expect(results.length).toBe(1);
      expect(results[0]?.title).toBe('Database Schema');
    });

    it('should return snippets with matches', async () => {
      const results = await storage.search('OAuth');

      expect(results.length).toBe(1);
      expect(results[0]?.snippet).toContain('authentication');
    });

    it('should filter search by project', async () => {
      const otherProject = await storage.projects.create(
        createTestProject({ name: 'Other Project' })
      );
      await storage.artifacts.create(
        createTestArtifact(otherProject.id, {
          title: 'Other Auth',
          content: 'More authentication content',
        })
      );

      const allResults = await storage.search('authentication');
      expect(allResults.length).toBe(2);

      const filteredResults = await storage.search('authentication', {
        projectId,
      });
      expect(filteredResults.length).toBe(1);
      expect(filteredResults[0]?.project_id).toBe(projectId);
    });

    it('should not return archived artifacts in search', async () => {
      const artifact = await storage.artifacts.create(
        createTestArtifact(projectId, {
          title: 'Secret Document',
          content: 'This contains secret information',
        })
      );

      // Should find it
      let results = await storage.search('secret');
      expect(results.length).toBe(1);

      // Archive it
      await storage.artifacts.archive(artifact.id);

      // Should not find it
      results = await storage.search('secret');
      expect(results.length).toBe(0);
    });
  });
});
