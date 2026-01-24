/**
 * HTTP server for MCP with SSE/Streamable HTTP transport.
 *
 * This enables web-based clients to connect to the MCP server
 * via HTTP instead of stdio.
 */

import { createServer as createHttpServer, type IncomingMessage } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { StorageAdapter } from '../storage/index.js';
import { logger, type Config } from '../config/index.js';
import { registerTools } from './tools.js';

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
 * Parse JSON body from request.
 */
async function parseBody(req: IncomingMessage): Promise<unknown> {
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
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Create and start an HTTP server for MCP.
 */
export async function createHttpMcpServer(options: HttpServerOptions): Promise<{
  start: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const port = options.port ?? 3000;
  const host = options.host ?? '127.0.0.1';

  // Create HTTP server
  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);
    console.log(`[HTTP] ${req.method} ${url.pathname} from ${req.headers.origin || 'unknown origin'}`);

    // Handle CORS preflight for all routes
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, mcp-session-id',
        'Access-Control-Expose-Headers': 'mcp-session-id',
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      return;
    }

    // Add CORS headers to all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

    // Health check endpoint
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mode: options.config.mode }));
      return;
    }

    // MCP endpoint
    if (url.pathname === '/mcp') {
      console.log(`[MCP] ${req.method} request`);

      // Handle all POST and GET requests (stateless mode)
      if (req.method === 'POST' || req.method === 'GET') {
        try {
          // Create MCP server for this session
          const server = new Server(
            {
              name: options.config.serverName,
              version: options.config.serverVersion,
            },
            {
              capabilities: {
                tools: {
                  listChanged: true,
                },
              },
            }
          );

          // Register tools
          registerTools(server, options.storage);

          // Create new transport
          // enableJsonResponse allows browser fetch() clients to receive JSON instead of SSE
          // Stateless mode (no sessionIdGenerator) - each request is independent
          const transport = new StreamableHTTPServerTransport({
            enableJsonResponse: true,
          });

          // Connect server to transport
          await server.connect(transport);

          // Handle the request
          const body = req.method === 'POST' ? await parseBody(req) : undefined;
          await transport.handleRequest(req, res, body);
        } catch (error) {
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
      // Close HTTP server
      return new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
