/**
 * Configuration management.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ConfigSchema, type Config, type LogLevel, type StorageMode } from './schema.js';

export { ConfigSchema, type Config, type LogLevel, type StorageMode };
export {
  DEFAULT_DATA_DIR,
  DEFAULT_DB_PATH,
  DEFAULT_LOG_LEVEL,
  DEFAULT_SERVER_NAME,
  DEFAULT_SERVER_VERSION,
  DEFAULT_SUPABASE_URL,
} from './defaults.js';

/**
 * Current configuration.
 */
let currentConfig: Config | null = null;

/**
 * Load configuration from environment variables.
 */
export function loadConfig(overrides: Partial<Config> = {}): Config {
  // Determine mode from environment or presence of API key
  const apiKey = process.env.CONTEXTABLE_API_KEY;
  const defaultMode = apiKey ? 'hosted' : 'local';

  const envConfig = {
    mode: (process.env.CONTEXTABLE_MODE as StorageMode | undefined) ?? defaultMode,
    dataDir: process.env.CONTEXTABLE_DATA_DIR,
    dbPath: process.env.CONTEXTABLE_DB_PATH,
    logLevel: process.env.CONTEXTABLE_LOG_LEVEL as LogLevel | undefined,
    serverName: process.env.CONTEXTABLE_SERVER_NAME,
    serverVersion: process.env.CONTEXTABLE_SERVER_VERSION,
    supabaseUrl: process.env.CONTEXTABLE_API_URL || process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    apiKey: apiKey,
  };

  // Filter out undefined values
  const filtered = Object.fromEntries(
    Object.entries({ ...envConfig, ...overrides }).filter(([, v]) => v !== undefined)
  );

  currentConfig = ConfigSchema.parse(filtered);
  return currentConfig;
}

/**
 * Get current configuration.
 * Loads default config if not already loaded.
 */
export function getConfig(): Config {
  if (!currentConfig) {
    return loadConfig();
  }
  return currentConfig;
}

/**
 * Ensure the data directory exists.
 */
export function ensureDataDir(config?: Config): void {
  const cfg = config || getConfig();
  if (!existsSync(cfg.dataDir)) {
    mkdirSync(cfg.dataDir, { recursive: true });
  }
  // Also ensure parent directory of db file exists
  const dbDir = dirname(cfg.dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
}

/**
 * Simple logger that respects log level.
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    const cfg = getConfig();
    if (LOG_LEVELS[cfg.logLevel] <= LOG_LEVELS.debug) {
      console.error('[DEBUG]', message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    const cfg = getConfig();
    if (LOG_LEVELS[cfg.logLevel] <= LOG_LEVELS.info) {
      console.error('[INFO]', message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    const cfg = getConfig();
    if (LOG_LEVELS[cfg.logLevel] <= LOG_LEVELS.warn) {
      console.error('[WARN]', message, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    const cfg = getConfig();
    if (LOG_LEVELS[cfg.logLevel] <= LOG_LEVELS.error) {
      console.error('[ERROR]', message, ...args);
    }
  },
};
