/**
 * MCP Server implementation.
 *
 * Supports two storage modes:
 * - local: SQLite database at ~/.contextable/data.db
 * - hosted: Supabase cloud storage with API key authentication
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { type StorageAdapter } from '../storage/index.js';
import { type Config } from '../config/index.js';
export { registerTools, TOOL_DEFINITIONS } from './tools.js';
export { createHttpMcpServer, type HttpServerOptions } from './http.js';
/**
 * Create and configure the MCP server.
 */
export declare function createServer(config?: Partial<Config>): Promise<{
    server: Server;
    storage: StorageAdapter;
    start: () => Promise<void>;
    close: () => Promise<void>;
}>;
/**
 * Run the server (main entry point).
 */
export declare function runServer(): Promise<void>;
//# sourceMappingURL=index.d.ts.map