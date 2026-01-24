/**
 * SQLite migrations runner for Contextable MCP server.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
/**
 * Load all migration files from the migrations directory.
 */
function loadMigrations() {
    const migrationsDir = join(__dirname, 'migrations');
    // For now, we only have one migration
    const migrations = [
        {
            version: 1,
            name: '001_initial',
            sql: readFileSync(join(migrationsDir, '001_initial.sql'), 'utf-8'),
        },
    ];
    return migrations.sort((a, b) => a.version - b.version);
}
/**
 * Get the current schema version from the database.
 */
function getCurrentVersion(db) {
    try {
        const result = db
            .prepare('SELECT MAX(version) as version FROM schema_version')
            .get();
        return result?.version ?? 0;
    }
    catch {
        // Table doesn't exist yet
        return 0;
    }
}
/**
 * Run pending migrations on the database.
 */
export function runMigrations(db) {
    const currentVersion = getCurrentVersion(db);
    const migrations = loadMigrations();
    // Filter to only pending migrations
    const pendingMigrations = migrations.filter((m) => m.version > currentVersion);
    if (pendingMigrations.length === 0) {
        return; // No migrations to run
    }
    // Run each migration in a transaction
    for (const migration of pendingMigrations) {
        db.exec(migration.sql);
    }
}
/**
 * Initialize a new database with all migrations.
 */
export function initializeDatabase(db) {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    // Run all migrations
    runMigrations(db);
}
//# sourceMappingURL=migrations.js.map