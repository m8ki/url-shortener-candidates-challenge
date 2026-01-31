import { describe, it, expect } from 'vitest';
import {
  ApplicationError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  ValidationError,
  NotFoundError,
  ShortCodeGenerationError,
  RateLimitError,
  isApplicationError,
  isDatabaseError,
  getErrorMessage,
  getErrorCode,
  getStatusCode,
} from '../domain/errors';

describe('Error Classes', () => {
  describe('ApplicationError', () => {
    it('should create error with correct properties', () => {
      class TestError extends ApplicationError {
        constructor() {
          super('Test message', 'TEST_ERROR', 400);
        }
      }

      const error = new TestError();

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('TestError');
    });

    it('should serialize to JSON correctly', () => {
      class TestError extends ApplicationError {
        constructor() {
          super('Test message', 'TEST_ERROR', 400);
        }
      }

      const error = new TestError();
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'TestError',
        code: 'TEST_ERROR',
        message: 'Test message',
        statusCode: 400,
      });
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with correct defaults', () => {
      const error = new DatabaseError('DB failed');

      expect(error.message).toBe('DB failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(503);
    });

    it('should store original error', () => {
      const originalError = new Error('Original');
      const error = new DatabaseError('DB failed', originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('DatabaseConnectionError', () => {
    it('should create connection error with default message', () => {
      const error = new DatabaseConnectionError();

      expect(error.message).toBe('Unable to connect to the database');
      expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
      expect(error.statusCode).toBe(503);
    });

    it('should create connection error with custom message', () => {
      const error = new DatabaseConnectionError('Custom message');

      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
    });
  });

  describe('DatabaseTimeoutError', () => {
    it('should create timeout error with default message', () => {
      const error = new DatabaseTimeoutError();

      expect(error.message).toBe('Database operation timed out');
      expect(error.code).toBe('DATABASE_TIMEOUT_ERROR');
      expect(error.statusCode).toBe(503);
    });

    it('should create timeout error with custom message', () => {
      const error = new DatabaseTimeoutError('Custom timeout');

      expect(error.message).toBe('Custom timeout');
      expect(error.code).toBe('DATABASE_TIMEOUT_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input', 'email');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('email');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should create not found error with custom message', () => {
      const error = new NotFoundError('URL not found');

      expect(error.message).toBe('URL not found');
    });
  });

  describe('ShortCodeGenerationError', () => {
    it('should create short code generation error', () => {
      const error = new ShortCodeGenerationError();

      expect(error.message).toBe('Failed to generate unique short code');
      expect(error.code).toBe('SHORT_CODE_GENERATION_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.statusCode).toBe(429);
    });
  });
});

describe('Error Type Guards', () => {
  describe('isApplicationError', () => {
    it('should return true for ApplicationError instances', () => {
      const error = new ValidationError('Test');

      expect(isApplicationError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Test');

      expect(isApplicationError(error)).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isApplicationError('string')).toBe(false);
      expect(isApplicationError(null)).toBe(false);
      expect(isApplicationError(undefined)).toBe(false);
    });
  });

  describe('isDatabaseError', () => {
    it('should return true for DatabaseError instances', () => {
      const error = new DatabaseError('Test');

      expect(isDatabaseError(error)).toBe(true);
    });

    it('should return true for DatabaseConnectionError', () => {
      const error = new DatabaseConnectionError();

      expect(isDatabaseError(error)).toBe(true);
    });

    it('should return true for DatabaseTimeoutError', () => {
      const error = new DatabaseTimeoutError();

      expect(isDatabaseError(error)).toBe(true);
    });

    it('should return false for other ApplicationErrors', () => {
      const error = new ValidationError('Test');

      expect(isDatabaseError(error)).toBe(false);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Test');

      expect(isDatabaseError(error)).toBe(false);
    });
  });
});

describe('Error Utility Functions', () => {
  describe('getErrorMessage', () => {
    it('should extract message from ApplicationError', () => {
      const error = new ValidationError('Invalid input');

      expect(getErrorMessage(error)).toBe('Invalid input');
    });

    it('should extract message from regular Error', () => {
      const error = new Error('Something went wrong');

      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('should return default message for unknown errors', () => {
      expect(getErrorMessage('string')).toBe('An unexpected error occurred');
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage({ foo: 'bar' })).toBe('An unexpected error occurred');
    });
  });

  describe('getErrorCode', () => {
    it('should extract code from ApplicationError', () => {
      const error = new ValidationError('Test');

      expect(getErrorCode(error)).toBe('VALIDATION_ERROR');
    });

    it('should return UNKNOWN_ERROR for regular Error', () => {
      const error = new Error('Test');

      expect(getErrorCode(error)).toBe('UNKNOWN_ERROR');
    });

    it('should return UNKNOWN_ERROR for non-errors', () => {
      expect(getErrorCode('string')).toBe('UNKNOWN_ERROR');
      expect(getErrorCode(null)).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getStatusCode', () => {
    it('should extract status code from ApplicationError', () => {
      const error = new ValidationError('Test');

      expect(getStatusCode(error)).toBe(400);
    });

    it('should return 500 for regular Error', () => {
      const error = new Error('Test');

      expect(getStatusCode(error)).toBe(500);
    });

    it('should return 500 for non-errors', () => {
      expect(getStatusCode('string')).toBe(500);
      expect(getStatusCode(null)).toBe(500);
    });
  });

  describe('Error code overrides', () => {
    it('should have correct error codes for subclasses', () => {
      const connectionError = new DatabaseConnectionError();
      const timeoutError = new DatabaseTimeoutError();

      expect(connectionError.code).toBe('DATABASE_CONNECTION_ERROR');
      expect(timeoutError.code).toBe('DATABASE_TIMEOUT_ERROR');
    });
  });
});
