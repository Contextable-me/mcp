/**
 * Configuration schema using Zod.
 */

import { z } from 'zod';
import {
  DEFAULT_DATA_DIR,
  DEFAULT_DB_PATH,
  DEFAULT_LOG_LEVEL,
  DEFAULT_SERVER_NAME,
  DEFAULT_SERVER_VERSION,
  DEFAULT_SUPABASE_URL,
} from './defaults.js';

/**
 * Log level schema.
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/**
 * Storage mode schema.
 */
export const StorageModeSchema = z.enum(['local', 'hosted']);
export type StorageMode = z.infer<typeof StorageModeSchema>;

/**
 * Configuration schema.
 */
export const ConfigSchema = z.object({
  /**
   * Storage mode: 'local' for SQLite, 'hosted' for Supabase.
   */
  mode: StorageModeSchema.default('local'),

  /**
   * Data directory path (local mode only).
   */
  dataDir: z.string().default(DEFAULT_DATA_DIR),

  /**
   * Database file path (local mode only).
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

  /**
   * Supabase URL (hosted mode only).
   */
  supabaseUrl: z.string().default(DEFAULT_SUPABASE_URL),

  /**
   * Supabase service role key (hosted mode only).
   * Required for API key validation.
   */
  supabaseServiceKey: z.string().optional(),

  /**
   * API key for authentication (hosted mode only).
   */
  apiKey: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
