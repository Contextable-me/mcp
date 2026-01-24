/**
 * Time utilities for Contextable MCP server.
 * All timestamps are ISO 8601 format in UTC.
 */
/**
 * Get current timestamp in ISO 8601 format.
 */
export declare function now(): string;
/**
 * Get current timestamp in SQLite datetime format (YYYY-MM-DD HH:MM:SS).
 */
export declare function nowSqlite(): string;
/**
 * Parse an ISO 8601 timestamp to a Date object.
 */
export declare function parseISO(timestamp: string): Date;
/**
 * Format a date to YYYY-MM-DD format.
 */
export declare function formatDate(date: Date): string;
/**
 * Get a date N days ago.
 */
export declare function daysAgo(days: number): Date;
/**
 * Check if a timestamp is within the last N days.
 */
export declare function isWithinDays(timestamp: string, days: number): boolean;
/**
 * Get relative time description (e.g., "2 days ago", "just now").
 */
export declare function relativeTime(timestamp: string): string;
//# sourceMappingURL=time.d.ts.map