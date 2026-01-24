/**
 * Test setup for Contextable MCP tests.
 *
 * Provides helper functions for creating in-memory SQLite databases.
 */

import { SQLiteAdapter } from '../src/storage/index.js';

/**
 * Create a fresh in-memory storage adapter for testing.
 */
export async function createTestStorage(): Promise<SQLiteAdapter> {
  const storage = new SQLiteAdapter({ inMemory: true });
  await storage.initialize();
  return storage;
}

/**
 * Create test project data.
 */
export function createTestProject(overrides: Partial<{
  name: string;
  description: string | null;
  tags: string[];
}> = {}) {
  return {
    name: overrides.name ?? 'Test Project',
    description: overrides.description ?? 'A test project',
    tags: overrides.tags ?? ['test'],
  };
}

/**
 * Create test artifact data.
 */
export function createTestArtifact(
  projectId: string,
  overrides: Partial<{
    title: string;
    artifact_type: 'document' | 'code' | 'decision' | 'conversation' | 'file';
    content: string;
    summary: string | null;
    priority: 'core' | 'normal' | 'reference';
    tags: string[];
  }> = {}
) {
  return {
    project_id: projectId,
    title: overrides.title ?? 'Test Artifact',
    artifact_type: overrides.artifact_type ?? 'document',
    content: overrides.content ?? 'Test content for the artifact.',
    summary: overrides.summary ?? 'A test artifact summary.',
    priority: overrides.priority ?? 'normal',
    tags: overrides.tags ?? [],
  };
}
