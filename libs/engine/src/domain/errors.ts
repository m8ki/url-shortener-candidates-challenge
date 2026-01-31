/**
 * Custom Error Classes for URL Shortener
 * Provides meaningful error types for different failure scenarios
 */

/**
 * Base error class for all application errors
 */
export abstract class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message, 'DATABASE_ERROR', 503);
  }
}

/**
 * Database connection errors (e.g., Prisma is down)
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string = 'Unable to connect to the database', originalError?: unknown) {
    super(message, originalError);
    // Override code in constructor before readonly is enforced
    Object.defineProperty(this, 'code', { value: 'DATABASE_CONNECTION_ERROR' });
  }
}

/**
 * Database timeout errors
 */
export class DatabaseTimeoutError extends DatabaseError {
  constructor(message: string = 'Database operation timed out', originalError?: unknown) {
    super(message, originalError);
    // Override code in constructor before readonly is enforced
    Object.defineProperty(this, 'code', { value: 'DATABASE_TIMEOUT_ERROR' });
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

/**
 * Short code generation errors
 */
export class ShortCodeGenerationError extends ApplicationError {
  constructor(message: string = 'Failed to generate unique short code') {
    super(message, 'SHORT_CODE_GENERATION_ERROR', 500);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

/**
 * Type guard to check if error is an ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Type guard to check if error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Extract user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApplicationError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Extract error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (isApplicationError(error)) {
    return error.code;
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Extract HTTP status code from any error
 */
export function getStatusCode(error: unknown): number {
  if (isApplicationError(error)) {
    return error.statusCode;
  }
  
  return 500;
}
