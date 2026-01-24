import { randomUUID } from 'node:crypto';
/**
 * Generate a unique identifier.
 * Uses crypto.randomUUID() for cryptographically secure UUIDs.
 */
export function generateId() {
    return randomUUID();
}
/**
 * Generate a short hex ID (32 chars, lowercase).
 * Matches the format used in SQLite schema.
 */
export function generateHexId() {
    return randomUUID().replace(/-/g, '');
}
/**
 * Validate that a string is a valid UUID format.
 */
export function isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}
/**
 * Validate that a string is a valid hex ID (32 chars).
 */
export function isValidHexId(id) {
    const hexRegex = /^[0-9a-f]{32}$/i;
    return hexRegex.test(id);
}
//# sourceMappingURL=id.js.map