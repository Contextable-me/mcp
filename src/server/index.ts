/**
 * MCP Server implementation.
 *
 * Supports two storage modes:
 * - local: SQLite database at ~/.contextable/data.db
 * - hosted: Supabase cloud storage with API key authentication
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SQLiteAdapter, SupabaseAdapter, type StorageAdapter } from '../storage/index.js';
import { getConfig, ensureDataDir, logger, type Config } from '../config/index.js';
import { registerTools } from './tools.js';

export { registerTools, TOOL_DEFINITIONS } from './tools.js';
export { createHttpMcpServer, type HttpServerOptions } from './http.js';

/**
 * Create storage adapter based on configuration mode.
 */
async function createStorage(config: Config): Promise<StorageAdapter> {
  if (config.mode === 'hosted') {
    // Hosted mode: use Supabase
    if (!config.apiKey) {
      throw new Error('API key is required for hosted mode. Set CONTEXTABLE_API_KEY.');
    }
    if (!config.supabaseServiceKey) {
      throw new Error('Supabase service key is required for hosted mode.');
    }

    logger.info(`Connecting to hosted storage at ${config.supabaseUrl}`);
    const storage = new SupabaseAdapter({
      supabaseUrl: config.supabaseUrl,
      supabaseServiceKey: config.supabaseServiceKey,
      apiKey: config.apiKey,
    });
    await storage.initialize();
    logger.info(`Authenticated as user ${storage.getUserId()}`);
    return storage;
  } else {
    // Local mode: use SQLite
    ensureDataDir(config);
    logger.info(`Initializing local storage at ${config.dbPath}`);
    const storage = new SQLiteAdapter({ path: config.dbPath });
    await storage.initialize();
    return storage;
  }
}

/**
 * Create and configure the MCP server.
 */
export async function createServer(config?: Partial<Config>): Promise<{
  server: Server;
  storage: StorageAdapter;
  start: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const cfg = getConfig();
  const finalConfig = { ...cfg, ...config };

  // Initialize storage based on mode
  const storage = await createStorage(finalConfig);

  // Create MCP server
  const server = new Server(
    {
      name: finalConfig.serverName,
      version: finalConfig.serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  registerTools(server, storage);

  // Create transport
  const transport = new StdioServerTransport();

  return {
    server,
    storage,
    start: async () => {
      logger.info(`Starting ${finalConfig.serverName} v${finalConfig.serverVersion} (${finalConfig.mode} mode)`);
      await server.connect(transport);
      logger.info('Server connected via stdio');
    },
    close: async () => {
      logger.info('Shutting down server');
      await server.close();
      await storage.close();
      logger.info('Server shut down');
    },
  };
}

/**
 * Run the server (main entry point).
 */
export async function runServer(): Promise<void> {
  const { start, close } = await createServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await close();
    process.exit(0);
  });

  await start();
}
