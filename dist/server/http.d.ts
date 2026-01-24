/**
 * HTTP server for MCP with SSE/Streamable HTTP transport.
 *
 * This enables web-based clients to connect to the MCP server
 * via HTTP instead of stdio.
 */
import type { StorageAdapter } from '../storage/index.js';
import { type Config } from '../config/index.js';
export interface HttpServerOptions {
    /** Port to listen on */
    port?: number;
    /** Host to bind to */
    host?: string;
    /** Storage adapter */
    storage: StorageAdapter;
    /** Server configuration */
    config: Config;
}
/**
 * Create and start an HTTP server for MCP.
 */
export declare function createHttpMcpServer(options: HttpServerOptions): Promise<{
    start: () => Promise<void>;
    close: () => Promise<void>;
}>;
//# sourceMappingURL=http.d.ts.map