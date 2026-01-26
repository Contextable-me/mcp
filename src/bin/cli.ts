#!/usr/bin/env node
/**
 * Contextable MCP Server CLI.
 *
 * Usage:
 *   npx @contextable/mcp                    # Stdio transport (default)
 *   npx @contextable/mcp --sse              # HTTP/SSE transport
 *   npx @contextable/mcp --hosted           # Hosted storage mode
 *   node dist/bin/cli.js
 *
 * Environment variables:
 *   CONTEXTABLE_DATA_DIR      - Data directory (default: ~/.contextable)
 *   CONTEXTABLE_DB_PATH       - Database path (default: ~/.contextable/data.db)
 *   CONTEXTABLE_LOG_LEVEL     - Log level: debug, info, warn, error (default: info)
 *   CONTEXTABLE_MODE          - Storage mode: local, hosted (default: local)
 *   CONTEXTABLE_API_KEY       - API key for hosted mode
 *   CONTEXTABLE_API_URL       - API URL for hosted mode
 *   CONTEXTABLE_PORT          - HTTP port for SSE mode (default: 3000)
 *   CONTEXTABLE_HOST          - HTTP host for SSE mode (default: 127.0.0.1)
 */

import { runServer, createHttpMcpServer } from '../server/index.js';
import { SQLiteAdapter, SupabaseAdapter, type StorageAdapter } from '../storage/index.js';
import { loadConfig, ensureDataDir, logger, type StorageMode, type Config } from '../config/index.js';

/**
 * Parse a CLI argument value (e.g., --port=3000 or --port 3000).
 */
function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
  if (idx === -1) return undefined;

  const arg = args[idx];
  if (arg && arg.includes('=')) {
    return arg.split('=')[1];
  }
  return args[idx + 1];
}

/**
 * Create storage adapter based on configuration.
 */
async function createStorage(config: Config): Promise<StorageAdapter> {
  if (config.mode === 'hosted') {
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
    ensureDataDir(config);
    logger.info(`Initializing local storage at ${config.dbPath}`);
    const storage = new SQLiteAdapter({ path: config.dbPath });
    await storage.initialize();
    return storage;
  }
}

async function main(): Promise<void> {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const isHosted = args.includes('--hosted') || args.includes('-H');
  const isLocal = args.includes('--local') || args.includes('-L');
  const isSse = args.includes('--sse') || args.includes('--http');

  // Parse optional values
  const portArg = getArgValue(args, '--port') || process.env.CONTEXTABLE_PORT;
  const hostArg = getArgValue(args, '--host') || process.env.CONTEXTABLE_HOST;

  // Determine storage mode from CLI flags or environment
  let mode: StorageMode | undefined;
  if (isHosted) {
    mode = 'hosted';
  } else if (isLocal) {
    mode = 'local';
  }

  // Load configuration from environment with CLI overrides
  const config = loadConfig(mode ? { mode } : {});

  // Check for --help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Contextable MCP Server

Usage:
  npx @contextable/mcp [options]

Transport Options:
  --sse, --http  Use HTTP/SSE transport instead of stdio
  --port=PORT    HTTP port for SSE mode (default: 3000)
  --host=HOST    HTTP host for SSE mode (default: 127.0.0.1)

Storage Options:
  -L, --local    Force local mode (SQLite storage)
  -H, --hosted   Force hosted mode (Supabase storage)

General Options:
  -h, --help     Show this help message
  -v, --version  Show version

Environment Variables:
  CONTEXTABLE_DATA_DIR      Data directory (default: ~/.contextable)
  CONTEXTABLE_DB_PATH       Database path (default: ~/.contextable/data.db)
  CONTEXTABLE_LOG_LEVEL     Log level: debug, info, warn, error (default: info)
  CONTEXTABLE_MODE          Storage mode: local, hosted (auto-detected)
  CONTEXTABLE_API_KEY       API key for hosted mode (required for hosted)
  CONTEXTABLE_API_URL       API URL for hosted mode
  CONTEXTABLE_PORT          HTTP port for SSE mode (default: 3000)
  CONTEXTABLE_HOST          HTTP host for SSE mode (default: 127.0.0.1)

Transports:
  stdio  - Standard input/output (default, for Claude Desktop)
  sse    - HTTP with Server-Sent Events (for web clients)

Storage Modes:
  local   - Uses local SQLite database (~/.contextable/data.db)
  hosted  - Connects to Contextable cloud service

For more information, visit: https://contextable.me
`);
    process.exit(0);
  }

  // Check for --version
  if (args.includes('--version') || args.includes('-v')) {
    console.log('0.1.0');
    process.exit(0);
  }

  // Validate hosted mode configuration
  if (config.mode === 'hosted') {
    if (!config.apiKey) {
      console.error('Error: CONTEXTABLE_API_KEY is required for hosted mode');
      console.error('Get your API key at: https://contextable.me/settings');
      process.exit(1);
    }
    if (!config.supabaseServiceKey) {
      console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required for hosted mode');
      process.exit(1);
    }
  }

  try {
    const transport = isSse ? 'sse' : 'stdio';
    logger.info(`Starting Contextable MCP Server (${config.mode} mode, ${transport} transport)...`);

    if (isSse) {
      // HTTP/SSE mode
      const storage = await createStorage(config);
      const port = portArg ? parseInt(portArg, 10) : 3000;
      const host = hostArg || '0.0.0.0';

      const { start, close } = await createHttpMcpServer({
        port,
        host,
        storage,
        config,
      });

      // Handle graceful shutdown
      const shutdown = async () => {
        logger.info('Shutting down...');
        await close();
        await storage.close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      await start();
    } else {
      // Stdio mode (default)
      await runServer();
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
