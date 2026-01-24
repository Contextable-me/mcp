/**
 * Custom error types for Contextable MCP server.
 */
export declare class ContextableError extends Error {
    readonly code: string;
    readonly suggestion?: string | undefined;
    constructor(message: string, code: string, suggestion?: string | undefined);
}
export declare class NotFoundError extends ContextableError {
    constructor(resource: string, id?: string);
}
export declare class ValidationError extends ContextableError {
    readonly field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class ConflictError extends ContextableError {
    constructor(message: string);
}
export declare class StorageError extends ContextableError {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * Format an error message for display.
 */
export declare function formatError(error: unknown): string;
/**
 * Format an error for MCP tool response.
 */
export declare function formatErrorResponse(error: unknown): {
    success: false;
    error: string;
    code: string;
    message: string;
    suggestion?: string;
};
//# sourceMappingURL=errors.d.ts.map