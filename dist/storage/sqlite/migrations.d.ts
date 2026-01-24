/**
 * SQLite migrations runner for Contextable MCP server.
 */
import type Database from 'better-sqlite3';
/**
 * Run pending migrations on the database.
 */
export declare function runMigrations(db: Database.Database): void;
/**
 * Initialize a new database with all migrations.
 */
export declare function initializeDatabase(db: Database.Database): void;
//# sourceMappingURL=migrations.d.ts.map