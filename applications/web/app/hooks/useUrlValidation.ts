import { useState, useCallback } from 'react';

export interface ValidationError {
  field: string;
  message: string;
  type: 'empty' | 'format' | 'protocol' | 'hostname' | 'private' | 'length';
}

export interface ValidationResult {
  isValid: boolean;
  error: ValidationError | null;
}

const MAX_URL_LENGTH = 2048; // Standard max URL length

/**
 * Validates URL format and returns detailed error information
 */
export function validateUrlFormat(url: string): ValidationResult {
  // Check if empty
  if (!url || url.trim().length === 0) {
    return {
      isValid: false,
      error: {
        field: 'url',
        message: 'URL is required',
        type: 'empty',
      },
    };
  }

  const trimmedUrl = url.trim();

  // Check for protocol-only strings (e.g., "https://")
  if (trimmedUrl.match(/^[a-z]+:\/\/$/i)) {
    return {
      isValid: false,
      error: {
        field: 'url',
        message: 'URL must have a valid domain name',
        type: 'hostname',
      },
    };
  }

  // Check length
  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      error: {
        field: 'url',
        message: `URL is too long (max ${MAX_URL_LENGTH} characters)`,
        type: 'length',
      },
    };
  }

  // Try to parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return {
      isValid: false,
      error: {
        field: 'url',
        message: 'Please enter a valid URL (e.g., https://example.com)',
        type: 'format',
      },
    };
  }

  // Check protocol
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return {
      isValid: false,
      error: {
        field: 'url',
        message: 'URL must use HTTP or HTTPS protocol',
        type: 'protocol',
      },
    };
  }

  // Warn about HTTP (but allow it for testing)
  if (parsedUrl.protocol === 'http:') {
    // We'll allow HTTP but could show a warning in the UI
    // For now, we'll just validate it
  }

  // Check hostname
  if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
    return {
      isValid: false,
      error: {
        field: 'url',
        message: 'URL must have a valid domain name',
        type: 'hostname',
      },
    };
  }

  // Check for localhost and private IPs (optional - can be disabled for dev)
  const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
  const isPrivateIP = 
    parsedUrl.hostname.startsWith('192.168.') ||
    parsedUrl.hostname.startsWith('10.') ||
    parsedUrl.hostname.startsWith('172.16.') ||
    parsedUrl.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);

  if (isLocalhost || isPrivateIP) {
    return {
      isValid: false,
      error: {
        field: 'url',
        message: 'Cannot shorten local or private network URLs',
        type: 'private',
      },
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Hook for managing URL validation state
 */
export function useUrlValidation() {
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback((url: string): boolean => {
    const result = validateUrlFormat(url);
    setValidationError(result.error);
    return result.isValid;
  }, []);

  const clearError = useCallback(() => {
    setValidationError(null);
  }, []);

  const markAsTouched = useCallback(() => {
    setTouched(true);
  }, []);

  const reset = useCallback(() => {
    setValidationError(null);
    setTouched(false);
  }, []);

  return {
    validationError,
    touched,
    validate,
    clearError,
    markAsTouched,
    reset,
    shouldShowError: touched && validationError !== null,
  };
}
