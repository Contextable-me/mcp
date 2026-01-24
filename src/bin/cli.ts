#!/usr/bin/env node
/**
 * Contextable MCP Server CLI.
 *
 * Usage:
 *   npx @contextable/mcp
 *   node dist/bin/cli.js
 *
 * Environment variables:
 *   CONTEXTABLE_DATA_DIR   - Data directory (default: ~/.contextable)
 *   CONTEXTABLE_DB_PATH    - Database path (default: ~/.contextable/data.db)
 *   CONTEXTABLE_LOG_LEVEL  - Log level: debug, info, warn, error (default: info)
 */

import { runServer } from '../server/index.js';
import { loadConfig, logger } from '../config/index.js';

async function main(): Promise<void> {
  // Load configuration from environment
  loadConfig();

  // Check for --help
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Contextable MCP Server

Usage:
  npx @contextable/mcp [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version

Environment Variables:
  CONTEXTABLE_DATA_DIR   Data directory (default: ~/.contextable)
  CONTEXTABLE_DB_PATH    Database path (default: ~/.contextable/data.db)
  CONTEXTABLE_LOG_LEVEL  Log level: debug, info, warn, error (default: info)

For more information, visit: https://contextable.me
`);
    process.exit(0);
  }

  // Check for --version
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log('0.1.0');
    process.exit(0);
  }

  try {
    await runServer();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
