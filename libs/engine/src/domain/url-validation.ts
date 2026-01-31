/**
 * URL Validation Module
 * Validates that URLs are proper HTTPS web URLs
 */

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

/**
 * Validates that a URL is a valid HTTPS web URL
 * @param url - The URL to validate
 * @throws {InvalidUrlError} If the URL is invalid
 */
export function validateUrl(url: string): void {
  // Check type first
  if (typeof url !== 'string') {
    throw new InvalidUrlError('URL must be a non-empty string');
  }

  // Trim whitespace
  const trimmedUrl = url.trim();
  
  // Check if empty or whitespace only
  if (trimmedUrl.length === 0) {
    throw new InvalidUrlError('URL cannot be empty or whitespace only');
  }

  // Check if it's a valid URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new InvalidUrlError('Invalid URL format');
  }

  // Must be HTTPS
  if (parsedUrl.protocol !== 'https:') {
    throw new InvalidUrlError('URL must use HTTPS protocol');
  }

  // Must have a valid hostname
  if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
    throw new InvalidUrlError('URL must have a valid hostname');
  }

  // Hostname should not be localhost or IP addresses (optional security measure)
  if (parsedUrl.hostname === 'localhost' || 
      parsedUrl.hostname === '127.0.0.1' ||
      parsedUrl.hostname.startsWith('192.168.') ||
      parsedUrl.hostname.startsWith('10.') ||
      parsedUrl.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    throw new InvalidUrlError('URL cannot be a local or private IP address');
  }
}

/**
 * Normalizes a URL to ensure consistency
 * @param url - The URL to normalize
 * @returns The normalized URL
 */
export function normalizeUrl(url: string): string {
  const trimmedUrl = url.trim();
  const parsedUrl = new URL(trimmedUrl);
  
  // Build the normalized URL
  let normalized = `${parsedUrl.protocol}//${parsedUrl.host}`;
  
  // Handle pathname - remove trailing slash unless it's the root
  let pathname = parsedUrl.pathname;
  if (pathname === '/' || pathname === '') {
    // Don't add anything for root path
  } else {
    // Remove trailing slash from non-root paths
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    normalized += pathname;
  }
  
  // Add search and hash if present
  if (parsedUrl.search) {
    normalized += parsedUrl.search;
  }
  if (parsedUrl.hash) {
    normalized += parsedUrl.hash;
  }
  
  return normalized;
}
