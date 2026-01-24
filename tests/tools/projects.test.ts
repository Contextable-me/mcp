/**
 * Project tools tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestStorage } from '../setup.js';
import type { SQLiteAdapter } from '../../src/storage/index.js';
import { projectSave, projectList, projectResume, type ToolContext } from '../../src/tools/projects.js';

describe('Project Tools', () => {
  let storage: SQLiteAdapter;
  let ctx: ToolContext;

  beforeEach(async () => {
    storage = await createTestStorage();
    ctx = { storage };
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('projectSave', () => {
    it('should create a new project', async () => {
      const result = await projectSave(ctx, {
        name: 'My Project',
        description: 'A test project',
        tags: ['test', 'demo'],
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('created');
      expect(result.project?.name).toBe('My Project');
      expect(result.project?.description).toBe('A test project');
      expect(result.project?.tags).toEqual(['test', 'demo']);
    });

    it('should update an existing project by name', async () => {
      // Create first
      await projectSave(ctx, { name: 'My Project', description: 'Original' });

      // Update
      const result = await projectSave(ctx, {
        name: 'My Project',
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('updated');
      expect(result.project?.description).toBe('Updated description');
    });

    it('should warn about similar projects', async () => {
      // Create first project
      await projectSave(ctx, { name: 'API Design' });

      // Create similar project
      const result = await projectSave(ctx, { name: 'API Design v2' });

      expect(result.success).toBe(true);
      expect(result.status).toBe('created');
      expect(result.similar_projects).toBeDefined();
      expect(result.similar_projects?.length).toBeGreaterThan(0);
      expect(result.warning).toContain('Similar project');
    });
  });

  describe('projectList', () => {
    it('should list all projects', async () => {
      await projectSave(ctx, { name: 'Project 1' });
      await projectSave(ctx, { name: 'Project 2' });

      const result = await projectList(ctx, {});

      expect(result.success).toBe(true);
      expect(result.projects?.length).toBe(2);
      expect(result.count).toBe(2);
    });

    it('should filter by status', async () => {
      await projectSave(ctx, { name: 'Active Project' });
      const archived = await projectSave(ctx, { name: 'Archived Project' });

      // Archive the second project
      await storage.projects.update(archived.project!.id, { status: 'archived' });

      const activeResult = await projectList(ctx, { status: 'active' });
      expect(activeResult.projects?.length).toBe(1);
      expect(activeResult.projects?.[0].name).toBe('Active Project');

      const archivedResult = await projectList(ctx, { status: 'archived' });
      expect(archivedResult.projects?.length).toBe(1);
      expect(archivedResult.projects?.[0].name).toBe('Archived Project');
    });

    it('should support pagination', async () => {
      await projectSave(ctx, { name: 'Project 1' });
      await projectSave(ctx, { name: 'Project 2' });
      await projectSave(ctx, { name: 'Project 3' });

      const result = await projectList(ctx, { limit: 2, offset: 1 });

      expect(result.success).toBe(true);
      expect(result.projects?.length).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
    });
  });

  describe('projectResume', () => {
    it('should load project with artifact summaries', async () => {
      const proj = await projectSave(ctx, { name: 'Test Project' });

      // Add some artifacts
      await storage.artifacts.create({
        project_id: proj.project!.id,
        title: 'Doc 1',
        artifact_type: 'document',
        content: 'Content for doc 1',
        priority: 'core',
      });
      await storage.artifacts.create({
        project_id: proj.project!.id,
        title: 'Doc 2',
        artifact_type: 'code',
        content: 'Code content',
        priority: 'normal',
        tags: ['api'],
      });

      const result = await projectResume(ctx, { project_name: 'Test Project' });

      expect(result.success).toBe(true);
      expect(result.project?.name).toBe('Test Project');
      expect(result.artifact_count).toBe(2);
      expect(result.artifact_index?.length).toBe(2);
      expect(result.living_summary).toBeDefined();
      expect(result.topic_clusters).toBeDefined();
    });

    it('should load by project_id', async () => {
      const proj = await projectSave(ctx, { name: 'ID Test' });

      const result = await projectResume(ctx, { project_id: proj.project!.id });

      expect(result.success).toBe(true);
      expect(result.project?.name).toBe('ID Test');
    });

    it('should filter by topic cluster', async () => {
      const proj = await projectSave(ctx, { name: 'Topic Test' });

      await storage.artifacts.create({
        project_id: proj.project!.id,
        title: 'Security Doc',
        artifact_type: 'document',
        content: 'JWT authentication',
        tags: ['security'],
      });
      await storage.artifacts.create({
        project_id: proj.project!.id,
        title: 'API Doc',
        artifact_type: 'document',
        content: 'REST endpoints',
        tags: ['api'],
      });

      const result = await projectResume(ctx, {
        project_name: 'Topic Test',
        topic_cluster: 'security',
      });

      expect(result.success).toBe(true);
      expect(result.artifact_count).toBe(1);
      expect(result.artifact_index?.[0].name).toBe('Security Doc');
    });

    it('should load full content when requested', async () => {
      const proj = await projectSave(ctx, { name: 'Content Test' });

      await storage.artifacts.create({
        project_id: proj.project!.id,
        title: 'Full Doc',
        artifact_type: 'document',
        content: 'Full content here',
      });

      const result = await projectResume(ctx, {
        project_name: 'Content Test',
        load_content: true,
      });

      expect(result.success).toBe(true);
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts?.length).toBe(1);
      expect(result.artifacts?.[0].content).toBe('Full content here');
      expect(result.loaded_tokens).toBeGreaterThan(0);
    });

    it('should return error for non-existent project', async () => {
      const result = await projectResume(ctx, { project_name: 'Does Not Exist' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
