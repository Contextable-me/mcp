/**
 * End-to-end workflow test.
 *
 * Tests the complete workflow: create → save → search → resume → rollback
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestStorage } from '../setup.js';
import type { SQLiteAdapter } from '../../src/storage/index.js';
import type { ToolContext } from '../../src/tools/index.js';
import {
  projectSave,
  projectList,
  projectResume,
  artifactSave,
  artifactGet,
  artifactVersions,
  artifactRollback,
  search,
} from '../../src/tools/index.js';

describe('E2E Workflow', () => {
  let storage: SQLiteAdapter;
  let ctx: ToolContext;

  beforeEach(async () => {
    storage = await createTestStorage();
    ctx = { storage };
  });

  afterEach(async () => {
    await storage.close();
  });

  it('should complete full workflow: create → save → search → resume → rollback', async () => {
    // 1. Create a project
    const createResult = await projectSave(ctx, {
      name: 'My Feature Project',
      description: 'Building a new authentication system',
      tags: ['security', 'api'],
    });

    expect(createResult.success).toBe(true);
    expect(createResult.status).toBe('created');
    const projectId = createResult.project!.id;

    // 2. List projects
    const listResult = await projectList(ctx, {});
    expect(listResult.success).toBe(true);
    expect(listResult.projects?.length).toBe(1);

    // 3. Save multiple artifacts
    const doc1 = await artifactSave(ctx, {
      project_id: projectId,
      name: 'Auth Design Doc',
      artifact_type: 'document',
      content: 'We will use JWT tokens for authentication. The tokens will be signed with RS256.',
      summary: 'Design document for the authentication system',
      priority: 'core',
      tags: ['security', 'design'],
    });
    expect(doc1.success).toBe(true);
    expect(doc1.status).toBe('created');

    const doc2 = await artifactSave(ctx, {
      project_id: projectId,
      name: 'API Endpoints',
      artifact_type: 'code',
      content: `
POST /auth/login - Authenticate user
POST /auth/refresh - Refresh token
DELETE /auth/logout - Invalidate token
      `.trim(),
      summary: 'API endpoint specifications',
      priority: 'normal',
      tags: ['api'],
    });
    expect(doc2.success).toBe(true);

    // 4. Update an artifact (creates version history)
    const update1 = await artifactSave(ctx, {
      project_id: projectId,
      name: 'Auth Design Doc',
      artifact_type: 'document',
      content: 'We will use JWT tokens for authentication. The tokens will be signed with RS256. Added: Token expiry set to 15 minutes.',
      summary: 'Design document for the authentication system (updated)',
    });
    expect(update1.success).toBe(true);
    expect(update1.status).toBe('updated');
    expect(update1.artifact?.version).toBe(2);

    // 5. Search for content
    const searchResult = await search(ctx, { query: 'JWT' });
    expect(searchResult.success).toBe(true);
    expect(searchResult.results?.length).toBe(1);
    expect(searchResult.results?.[0].title).toBe('Auth Design Doc');

    // 6. Resume project with summaries
    const resumeResult = await projectResume(ctx, {
      project_name: 'My Feature Project',
      load_content: false,
    });
    expect(resumeResult.success).toBe(true);
    expect(resumeResult.artifact_count).toBe(2);
    expect(resumeResult.living_summary).toBeDefined();
    expect(resumeResult.topic_clusters).toBeDefined();
    expect(resumeResult.artifact_index?.length).toBe(2);

    // Check that core artifacts are present
    const coreArtifact = resumeResult.artifact_index?.find((a) => a.priority === 'core');
    expect(coreArtifact).toBeDefined();
    expect(coreArtifact?.name).toBe('Auth Design Doc');

    // 7. Resume with full content
    const resumeWithContent = await projectResume(ctx, {
      project_name: 'My Feature Project',
      load_content: true,
    });
    expect(resumeWithContent.success).toBe(true);
    expect(resumeWithContent.artifacts).toBeDefined();
    expect(resumeWithContent.artifacts?.length).toBeGreaterThan(0);
    expect(resumeWithContent.loaded_tokens).toBeGreaterThan(0);

    // 8. Get artifact versions
    const artifactId = doc1.artifact!.id;
    const versionsResult = await artifactVersions(ctx, { artifact_id: artifactId });
    expect(versionsResult.success).toBe(true);
    expect(versionsResult.versions?.length).toBe(1); // One version saved before update

    // 9. Rollback to original version
    const versionId = versionsResult.versions![0].id;
    const rollbackResult = await artifactRollback(ctx, {
      artifact_id: artifactId,
      version_id: versionId,
    });
    expect(rollbackResult.success).toBe(true);
    expect(rollbackResult.artifact?.version).toBe(3); // Version incremented after rollback

    // 10. Verify rollback content
    const afterRollback = await artifactGet(ctx, { artifact_id: artifactId });
    expect(afterRollback.success).toBe(true);
    expect(afterRollback.artifact?.content).toContain('JWT tokens');
    expect(afterRollback.artifact?.content).not.toContain('Token expiry');

    // 11. Filter by topic
    const topicFilter = await projectResume(ctx, {
      project_name: 'My Feature Project',
      topic_cluster: 'security',
    });
    expect(topicFilter.success).toBe(true);
    expect(topicFilter.artifact_count).toBe(1);
    expect(topicFilter.artifact_index?.[0].name).toBe('Auth Design Doc');
  });

  it('should handle large content with auto-chunking', async () => {
    const proj = await projectSave(ctx, { name: 'Large Content Test' });

    // Create content larger than chunk size
    const largeContent = 'This is a paragraph of important content.\n\n'.repeat(200);

    const result = await artifactSave(ctx, {
      project_id: proj.project!.id,
      name: 'Large Document',
      artifact_type: 'document',
      content: largeContent,
      auto_chunk: true,
    });

    expect(result.success).toBe(true);
    expect(result.chunked).toBe(true);
    expect(result.chunk_count).toBeGreaterThan(1);
    expect(result.checksum).toBeDefined();
  });

  it('should handle concurrent project creation without conflicts', async () => {
    // Create multiple projects in parallel
    const results = await Promise.all([
      projectSave(ctx, { name: 'Project A' }),
      projectSave(ctx, { name: 'Project B' }),
      projectSave(ctx, { name: 'Project C' }),
    ]);

    // All should succeed
    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.status).toBe('created');
    }

    // All should have unique IDs
    const ids = new Set(results.map((r) => r.project!.id));
    expect(ids.size).toBe(3);
  });

  it('should generate living summary with correct activity status', async () => {
    const proj = await projectSave(ctx, {
      name: 'Activity Test',
      description: 'Testing activity tracking',
    });

    // Add artifacts
    await artifactSave(ctx, {
      project_id: proj.project!.id,
      name: 'Core Document',
      artifact_type: 'document',
      content: 'Core content',
      priority: 'core',
    });

    await artifactSave(ctx, {
      project_id: proj.project!.id,
      name: 'Reference Material',
      artifact_type: 'document',
      content: 'Reference content',
      priority: 'reference',
    });

    const resume = await projectResume(ctx, { project_name: 'Activity Test' });

    expect(resume.success).toBe(true);
    expect(resume.living_summary?.currentState).toContain('2 artifacts');
    expect(resume.living_summary?.currentState).toContain('actively updated');
    expect(resume.living_summary?.keyArtifacts).toContain('Core Document');
    expect(resume.living_summary?.stats?.coreArtifacts).toBe(1);
  });
});
