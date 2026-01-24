/**
 * Configuration management.
 */
import { ConfigSchema, type Config, type LogLevel } from './schema.js';
export { ConfigSchema, type Config, type LogLevel };
export { DEFAULT_DATA_DIR, DEFAULT_DB_PATH, DEFAULT_LOG_LEVEL, DEFAULT_SERVER_NAME, DEFAULT_SERVER_VERSION, } from './defaults.js';
/**
 * Load configuration from environment variables.
 */
export declare function loadConfig(overrides?: Partial<Config>): Config;
/**
 * Get current configuration.
 * Loads default config if not already loaded.
 */
export declare function getConfig(): Config;
/**
 * Ensure the data directory exists.
 */
export declare function ensureDataDir(config?: Config): void;
export declare const logger: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
};
//# sourceMappingURL=index.d.ts.map