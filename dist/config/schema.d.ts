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
 * Configuration schema.
 */
export declare const ConfigSchema: z.ZodObject<{
    /**
     * Data directory path.
     */
    dataDir: z.ZodDefault<z.ZodString>;
    /**
     * Database file path.
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
}, "strip", z.ZodTypeAny, {
    dataDir: string;
    dbPath: string;
    logLevel: "error" | "info" | "debug" | "warn";
    serverName: string;
    serverVersion: string;
}, {
    dataDir?: string | undefined;
    dbPath?: string | undefined;
    logLevel?: "error" | "info" | "debug" | "warn" | undefined;
    serverName?: string | undefined;
    serverVersion?: string | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
//# sourceMappingURL=schema.d.ts.map