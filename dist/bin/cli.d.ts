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
export {};
//# sourceMappingURL=cli.d.ts.map