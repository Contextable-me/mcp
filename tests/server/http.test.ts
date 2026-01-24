/**
 * HTTP server tests.
 *
 * Tests the HTTP/SSE transport functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHttpMcpServer } from '../../src/server/http.js';
import { createTestStorage } from '../setup.js';
import type { SQLiteAdapter } from '../../src/storage/index.js';
import type { Config } from '../../src/config/index.js';

describe('HTTP MCP Server', () => {
  let storage: SQLiteAdapter;
  let config: Config;

  beforeEach(async () => {
    storage = await createTestStorage();
    config = {
      mode: 'local',
      dataDir: '/tmp',
      dbPath: ':memory:',
      logLevel: 'error',
      serverName: 'test-server',
      serverVersion: '0.1.0',
      supabaseUrl: 'https://test.supabase.co',
    };
  });

  afterEach(async () => {
    await storage.close();
  });

  it('should create HTTP server with correct options', async () => {
    const { start, close } = await createHttpMcpServer({
      port: 0, // Use random available port
      host: '127.0.0.1',
      storage,
      config,
    });

    expect(start).toBeTypeOf('function');
    expect(close).toBeTypeOf('function');
  });

  it('should start and stop HTTP server', async () => {
    const { start, close } = await createHttpMcpServer({
      port: 0,
      host: '127.0.0.1',
      storage,
      config,
    });

    // Start should not throw
    await start();

    // Close should not throw
    await close();
  });

  it('should respond to health check', async () => {
    const port = 13579; // Use a specific port for this test
    const { start, close } = await createHttpMcpServer({
      port,
      host: '127.0.0.1',
      storage,
      config,
    });

    await start();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.mode).toBe('local');
    } finally {
      await close();
    }
  });

  it('should return 404 for unknown paths', async () => {
    const port = 13580;
    const { start, close } = await createHttpMcpServer({
      port,
      host: '127.0.0.1',
      storage,
      config,
    });

    await start();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/unknown`);
      expect(response.status).toBe(404);
    } finally {
      await close();
    }
  });

  it('should handle CORS preflight requests', async () => {
    const port = 13581;
    const { start, close } = await createHttpMcpServer({
      port,
      host: '127.0.0.1',
      storage,
      config,
    });

    await start();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: 'OPTIONS',
      });
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    } finally {
      await close();
    }
  });
});
