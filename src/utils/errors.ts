/**
 * Custom error types for Contextable MCP server.
 */

export class ContextableError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'ContextableError';
  }
}

export class NotFoundError extends ContextableError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} '${id}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', `Check that the ${resource.toLowerCase()} exists`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ContextableError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'VALIDATION_ERROR', 'Check the input format and try again');
    this.name = 'ValidationError';
  }
}

export class ConflictError extends ContextableError {
  constructor(message: string) {
    super(message, 'CONFLICT', 'A resource with this identifier already exists');
    this.name = 'ConflictError';
  }
}

export class StorageError extends ContextableError {
  constructor(message: string, public readonly cause?: Error) {
    super(message, 'STORAGE_ERROR', 'Check database connection and try again');
    this.name = 'StorageError';
  }
}

/**
 * Format an error message for display.
 */
export function formatError(error: unknown): string {
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
export function formatErrorResponse(error: unknown): {
  success: false;
  error: string;
  code: string;
  message: string;
  suggestion?: string;
} {
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
