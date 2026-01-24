/**
 * Configuration schema using Zod.
 */
import { z } from 'zod';
import { DEFAULT_DATA_DIR, DEFAULT_DB_PATH, DEFAULT_LOG_LEVEL, DEFAULT_SERVER_NAME, DEFAULT_SERVER_VERSION, } from './defaults.js';
/**
 * Log level schema.
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
/**
 * Configuration schema.
 */
export const ConfigSchema = z.object({
    /**
     * Data directory path.
     */
    dataDir: z.string().default(DEFAULT_DATA_DIR),
    /**
     * Database file path.
     */
    dbPath: z.string().default(DEFAULT_DB_PATH),
    /**
     * Log level.
     */
    logLevel: LogLevelSchema.default(DEFAULT_LOG_LEVEL),
    /**
     * Server name for MCP.
     */
    serverName: z.string().default(DEFAULT_SERVER_NAME),
    /**
     * Server version.
     */
    serverVersion: z.string().default(DEFAULT_SERVER_VERSION),
});
//# sourceMappingURL=schema.js.map