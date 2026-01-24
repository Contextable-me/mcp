/**
 * MCP Server implementation.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SQLiteAdapter } from '../storage/index.js';
import { getConfig, ensureDataDir, logger, type Config } from '../config/index.js';
import { registerTools } from './tools.js';

export { registerTools, TOOL_DEFINITIONS } from './tools.js';

/**
 * Create and configure the MCP server.
 */
export async function createServer(config?: Partial<Config>): Promise<{
  server: Server;
  storage: SQLiteAdapter;
  start: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const cfg = getConfig();
  const finalConfig = { ...cfg, ...config };

  // Ensure data directory exists
  ensureDataDir(finalConfig);

  // Initialize storage
  logger.info(`Initializing storage at ${finalConfig.dbPath}`);
  const storage = new SQLiteAdapter({ path: finalConfig.dbPath });
  await storage.initialize();

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
      logger.info(`Starting ${finalConfig.serverName} v${finalConfig.serverVersion}`);
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
