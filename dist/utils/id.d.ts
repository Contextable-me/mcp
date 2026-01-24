/**
 * Generate a unique identifier.
 * Uses crypto.randomUUID() for cryptographically secure UUIDs.
 */
export declare function generateId(): string;
/**
 * Generate a short hex ID (32 chars, lowercase).
 * Matches the format used in SQLite schema.
 */
export declare function generateHexId(): string;
/**
 * Validate that a string is a valid UUID format.
 */
export declare function isValidUUID(id: string): boolean;
/**
 * Validate that a string is a valid hex ID (32 chars).
 */
export declare function isValidHexId(id: string): boolean;
//# sourceMappingURL=id.d.ts.map