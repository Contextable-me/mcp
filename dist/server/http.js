/**
 * HTTP server for MCP with SSE/Streamable HTTP transport.
 *
 * This enables web-based clients to connect to the MCP server
 * via HTTP instead of stdio.
 */
import { createServer as createHttpServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { logger } from '../config/index.js';
import { registerTools } from './tools.js';
/**
 * Parse JSON body from request.
 */
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            if (!body) {
                resolve(undefined);
                return;
            }
            try {
                resolve(JSON.parse(body));
            }
            catch (e) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}
/**
 * Create and start an HTTP server for MCP.
 */
export async function createHttpMcpServer(options) {
    const port = options.port ?? 3000;
    const host = options.host ?? '127.0.0.1';
    // Track active transports by session ID
    const transports = new Map();
    // Create HTTP server
    const httpServer = createHttpServer(async (req, res) => {
        const url = new URL(req.url ?? '/', `http://${host}:${port}`);
        // Handle CORS preflight for all routes
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
                'Access-Control-Max-Age': '86400',
            });
            res.end();
            return;
        }
        // Add CORS headers to all responses
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
        // Health check endpoint
        if (url.pathname === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', mode: options.config.mode }));
            return;
        }
        // MCP endpoint
        if (url.pathname === '/mcp') {
            // Check for existing session
            const sessionId = req.headers['mcp-session-id'];
            if (sessionId && transports.has(sessionId)) {
                // Use existing transport
                const transport = transports.get(sessionId);
                try {
                    const body = req.method === 'POST' ? await parseBody(req) : undefined;
                    await transport.handleRequest(req, res, body);
                }
                catch (error) {
                    logger.error('Error handling MCP request:', error);
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal server error' }));
                    }
                }
                return;
            }
            // Create new session for initialization requests
            if (req.method === 'POST' || req.method === 'GET') {
                try {
                    // Create new transport with session ID generator
                    const transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => randomUUID(),
                    });
                    // Create MCP server for this session
                    const server = new Server({
                        name: options.config.serverName,
                        version: options.config.serverVersion,
                    }, {
                        capabilities: {
                            tools: {},
                        },
                    });
                    // Register tools
                    registerTools(server, options.storage);
                    // Connect server to transport
                    await server.connect(transport);
                    // Track transport by session ID once we have it
                    transport.onclose = () => {
                        if (transport.sessionId) {
                            transports.delete(transport.sessionId);
                            logger.debug(`Session ${transport.sessionId} closed`);
                        }
                    };
                    // Handle the request
                    const body = req.method === 'POST' ? await parseBody(req) : undefined;
                    await transport.handleRequest(req, res, body);
                    // Store transport after successful initialization
                    if (transport.sessionId) {
                        transports.set(transport.sessionId, transport);
                        logger.info(`New session created: ${transport.sessionId}`);
                    }
                }
                catch (error) {
                    logger.error('Error creating MCP session:', error);
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to create session' }));
                    }
                }
                return;
            }
            // Method not allowed
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }
        // 404 for other paths
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });
    return {
        start: async () => {
            return new Promise((resolve, reject) => {
                httpServer.listen(port, host, () => {
                    logger.info(`HTTP MCP server listening on http://${host}:${port}/mcp`);
                    resolve();
                });
                httpServer.on('error', reject);
            });
        },
        close: async () => {
            // Close all active transports
            for (const [sessionId, transport] of transports) {
                logger.debug(`Closing session ${sessionId}`);
                await transport.close();
            }
            transports.clear();
            // Close HTTP server
            return new Promise((resolve, reject) => {
                httpServer.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        },
    };
}
//# sourceMappingURL=http.js.map