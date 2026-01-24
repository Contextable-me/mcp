/**
 * MCP Server implementation.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SQLiteAdapter } from '../storage/index.js';
import { type Config } from '../config/index.js';
export { registerTools, TOOL_DEFINITIONS } from './tools.js';
/**
 * Create and configure the MCP server.
 */
export declare function createServer(config?: Partial<Config>): Promise<{
    server: Server;
    storage: SQLiteAdapter;
    start: () => Promise<void>;
    close: () => Promise<void>;
}>;
/**
 * Run the server (main entry point).
 */
export declare function runServer(): Promise<void>;
//# sourceMappingURL=index.d.ts.map