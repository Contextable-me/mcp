/**
 * Custom error types for Contextable MCP server.
 */
export class ContextableError extends Error {
    code;
    suggestion;
    constructor(message, code, suggestion) {
        super(message);
        this.code = code;
        this.suggestion = suggestion;
        this.name = 'ContextableError';
    }
}
export class NotFoundError extends ContextableError {
    constructor(resource, id) {
        const message = id
            ? `${resource} '${id}' not found`
            : `${resource} not found`;
        super(message, 'NOT_FOUND', `Check that the ${resource.toLowerCase()} exists`);
        this.name = 'NotFoundError';
    }
}
export class ValidationError extends ContextableError {
    field;
    constructor(message, field) {
        super(message, 'VALIDATION_ERROR', 'Check the input format and try again');
        this.field = field;
        this.name = 'ValidationError';
    }
}
export class ConflictError extends ContextableError {
    constructor(message) {
        super(message, 'CONFLICT', 'A resource with this identifier already exists');
        this.name = 'ConflictError';
    }
}
export class StorageError extends ContextableError {
    cause;
    constructor(message, cause) {
        super(message, 'STORAGE_ERROR', 'Check database connection and try again');
        this.cause = cause;
        this.name = 'StorageError';
    }
}
/**
 * Format an error message for display.
 */
export function formatError(error) {
    if (error instanceof ContextableError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
/**
 * Format an error for MCP tool response.
 */
export function formatErrorResponse(error) {
    if (error instanceof ContextableError) {
        return {
            success: false,
            error: error.code,
            code: error.code,
            message: error.message,
            suggestion: error.suggestion,
        };
    }
    if (error instanceof Error) {
        return {
            success: false,
            error: 'INTERNAL_ERROR',
            code: 'INTERNAL_ERROR',
            message: error.message,
        };
    }
    return {
        success: false,
        error: 'UNKNOWN_ERROR',
        code: 'UNKNOWN_ERROR',
        message: String(error),
    };
}
//# sourceMappingURL=errors.js.map