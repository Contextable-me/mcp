/**
 * Configuration schema using Zod.
 */
import { z } from 'zod';
/**
 * Log level schema.
 */
export declare const LogLevelSchema: z.ZodEnum<["debug", "info", "warn", "error"]>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
/**
 * Storage mode schema.
 */
export declare const StorageModeSchema: z.ZodEnum<["local", "hosted"]>;
export type StorageMode = z.infer<typeof StorageModeSchema>;
/**
 * Configuration schema.
 */
export declare const ConfigSchema: z.ZodObject<{
    /**
     * Storage mode: 'local' for SQLite, 'hosted' for Supabase.
     */
    mode: z.ZodDefault<z.ZodEnum<["local", "hosted"]>>;
    /**
     * Data directory path (local mode only).
     */
    dataDir: z.ZodDefault<z.ZodString>;
    /**
     * Database file path (local mode only).
     */
    dbPath: z.ZodDefault<z.ZodString>;
    /**
     * Log level.
     */
    logLevel: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    /**
     * Server name for MCP.
     */
    serverName: z.ZodDefault<z.ZodString>;
    /**
     * Server version.
     */
    serverVersion: z.ZodDefault<z.ZodString>;
    /**
     * Supabase URL (hosted mode only).
     */
    supabaseUrl: z.ZodDefault<z.ZodString>;
    /**
     * Supabase service role key (hosted mode only).
     * Required for API key validation.
     */
    supabaseServiceKey: z.ZodOptional<z.ZodString>;
    /**
     * API key for authentication (hosted mode only).
     */
    apiKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mode: "local" | "hosted";
    dataDir: string;
    dbPath: string;
    logLevel: "error" | "info" | "debug" | "warn";
    serverName: string;
    serverVersion: string;
    supabaseUrl: string;
    supabaseServiceKey?: string | undefined;
    apiKey?: string | undefined;
}, {
    mode?: "local" | "hosted" | undefined;
    dataDir?: string | undefined;
    dbPath?: string | undefined;
    logLevel?: "error" | "info" | "debug" | "warn" | undefined;
    serverName?: string | undefined;
    serverVersion?: string | undefined;
    supabaseUrl?: string | undefined;
    supabaseServiceKey?: string | undefined;
    apiKey?: string | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
//# sourceMappingURL=schema.d.ts.map