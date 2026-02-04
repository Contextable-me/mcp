import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import JSZip from 'jszip';
import { writeFile } from 'fs/promises';
import { SQLiteAdapter } from '../../src/storage/sqlite/index.js';
import { importAnalyze, importSeed } from '../../src/tools/import.js';
import type { ToolContext } from '../../src/tools/projects.js';

describe('Import Tools', () => {
  let tmpDir: string;
  let storage: SQLiteAdapter;
  let ctx: ToolContext;
  let testZipPath: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'import-test-'));
    storage = new SQLiteAdapter({ path: join(tmpDir, 'test.db') });
    await storage.initialize();
    ctx = { storage };

    // Create a test ChatGPT export ZIP
    const conversations = [
      {
        id: 'conv-1',
        title: 'React Development',
        create_time: 1704067200,
        mapping: {
          root: { id: 'root', message: null, parent: null, children: ['m1'] },
          m1: {
            id: 'm1',
            message: {
              author: { role: 'user' },
              content: { parts: ['How do I use React hooks? I decided to use functional components.'] },
              create_time: 1704067200,
            },
            parent: 'root',
            children: ['m2'],
          },
          m2: {
            id: 'm2',
            message: {
              author: { role: 'assistant' },
              content: { parts: ['React hooks like useState and useEffect are great for functional components.'] },
              create_time: 1704067260,
            },
            parent: 'm1',
            children: [],
          },
        },
        current_node: 'm2',
      },
    ];

    const zip = new JSZip();
    zip.file('conversations.json', JSON.stringify(conversations));
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    testZipPath = join(tmpDir, 'test-export.zip');
    await writeFile(testZipPath, zipBuffer);
  });

  afterEach(async () => {
    await storage.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('importAnalyze', () => {
    it('should analyze a ChatGPT export', async () => {
      const result = await importAnalyze(ctx, { file_path: testZipPath });

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis!.source).toBe('chatgpt');
      expect(result.analysis!.totalConversations).toBe(1);
      expect(result.analysis!.totalMessages).toBe(2);
    });

    it('should detect decisions in conversations', async () => {
      const result = await importAnalyze(ctx, { file_path: testZipPath });

      expect(result.success).toBe(true);
      expect(result.analysis!.decisions.length).toBeGreaterThan(0);
      expect(result.analysis!.decisions[0].decision).toContain('functional components');
    });

    it('should fail gracefully for non-existent file', async () => {
      const result = await importAnalyze(ctx, { file_path: '/nonexistent/file.zip' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to analyze');
    });
  });

  describe('importSeed', () => {
    it('should create projects from analysis', async () => {
      // First analyze
      const analyzeResult = await importAnalyze(ctx, { file_path: testZipPath });
      expect(analyzeResult.success).toBe(true);

      // Get suggested project names
      const projectNames = analyzeResult.analysis!.detectedProjects.map((p) => p.suggestedName);

      if (projectNames.length > 0) {
        // Then seed
        const seedResult = await importSeed(ctx, {
          file_path: testZipPath,
          project_names: projectNames,
        });

        expect(seedResult.success).toBe(true);
        expect(seedResult.projects_created).toBeGreaterThan(0);

        // Verify project was created
        const projects = await storage.projects.list();
        expect(projects.length).toBeGreaterThan(0);
      }
    });

    it('should fail if no project names provided', async () => {
      const result = await importSeed(ctx, {
        file_path: testZipPath,
        project_names: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No projects specified');
    });

    it('should fail if project names not found in analysis', async () => {
      const result = await importSeed(ctx, {
        file_path: testZipPath,
        project_names: ['Nonexistent Project'],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('None of the specified projects');
    });
  });
});
