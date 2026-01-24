/**
 * Default configuration values.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
/**
 * Default data directory.
 */
export const DEFAULT_DATA_DIR = join(homedir(), '.contextable');
/**
 * Default database path.
 */
export const DEFAULT_DB_PATH = join(DEFAULT_DATA_DIR, 'data.db');
/**
 * Default log level.
 */
export const DEFAULT_LOG_LEVEL = 'info';
/**
 * Default server name.
 */
export const DEFAULT_SERVER_NAME = 'contextable-mcp';
/**
 * Default server version.
 */
export const DEFAULT_SERVER_VERSION = '0.1.0';
/**
 * Default Supabase URL for hosted mode.
 */
export const DEFAULT_SUPABASE_URL = 'https://api.contextable.me';
//# sourceMappingURL=defaults.js.map