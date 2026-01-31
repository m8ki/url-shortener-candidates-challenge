import { describe, it, expect } from 'vitest';
import { validateUrlFormat, type ValidationError } from '../hooks/useUrlValidation';

describe('URL Validation', () => {
  describe('Empty URL validation', () => {
    it('should reject empty string', () => {
      const result = validateUrlFormat('');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatchObject({
        field: 'url',
        message: 'URL is required',
        type: 'empty',
      });
    });

    it('should reject whitespace-only string', () => {
      const result = validateUrlFormat('   ');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('empty');
    });

    it('should reject null-like values', () => {
      const result = validateUrlFormat('');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('empty');
    });
  });

  describe('URL format validation', () => {
    it('should accept valid HTTPS URL', () => {
      const result = validateUrlFormat('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept valid HTTP URL', () => {
      const result = validateUrlFormat('http://example.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept URL with path', () => {
      const result = validateUrlFormat('https://example.com/path/to/page');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept URL with query parameters', () => {
      const result = validateUrlFormat('https://example.com?foo=bar&baz=qux');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept URL with hash', () => {
      const result = validateUrlFormat('https://example.com#section');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept URL with port', () => {
      const result = validateUrlFormat('https://example.com:8080/path');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept URL with subdomain', () => {
      const result = validateUrlFormat('https://sub.example.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject invalid URL format', () => {
      const result = validateUrlFormat('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatchObject({
        field: 'url',
        type: 'format',
      });
      expect(result.error?.message).toContain('valid URL');
    });

    it('should reject URL without protocol', () => {
      const result = validateUrlFormat('example.com');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('format');
    });

    it('should reject malformed URL', () => {
      const result = validateUrlFormat('https://');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('hostname');
    });
  });

  describe('Protocol validation', () => {
    it('should reject FTP protocol', () => {
      const result = validateUrlFormat('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatchObject({
        field: 'url',
        type: 'protocol',
      });
      expect(result.error?.message).toContain('HTTP or HTTPS');
    });

    it('should reject file protocol', () => {
      const result = validateUrlFormat('file:///path/to/file');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('protocol');
    });

    it('should reject javascript protocol', () => {
      const result = validateUrlFormat('javascript:alert(1)');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('protocol');
    });

    it('should reject data protocol', () => {
      const result = validateUrlFormat('data:text/html,<h1>Hello</h1>');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('protocol');
    });
  });

  describe('Hostname validation', () => {
    it('should reject URL without hostname', () => {
      const result = validateUrlFormat('https://');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('hostname');
    });

    it('should accept valid domain names', () => {
      const validDomains = [
        'https://example.com',
        'https://sub.example.com',
        'https://deep.sub.example.com',
        'https://example.co.uk',
        'https://example-with-dash.com',
      ];

      validDomains.forEach(url => {
        const result = validateUrlFormat(url);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Private and local URL validation', () => {
    it('should reject localhost', () => {
      const result = validateUrlFormat('https://localhost:3000');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatchObject({
        field: 'url',
        type: 'private',
      });
      expect(result.error?.message).toContain('local or private');
    });

    it('should reject 127.0.0.1', () => {
      const result = validateUrlFormat('https://127.0.0.1:8080');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('private');
    });

    it('should reject 192.168.x.x addresses', () => {
      const result = validateUrlFormat('https://192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('private');
    });

    it('should reject 10.x.x.x addresses', () => {
      const result = validateUrlFormat('https://10.0.0.1');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('private');
    });

    it('should reject 172.16.x.x addresses', () => {
      const result = validateUrlFormat('https://172.16.0.1');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('private');
    });

    it('should reject any IP address format', () => {
      const result = validateUrlFormat('https://8.8.8.8');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('private');
    });
  });

  describe('URL length validation', () => {
    it('should accept URLs up to 2048 characters', () => {
      const longPath = 'a'.repeat(2000);
      const result = validateUrlFormat(`https://example.com/${longPath}`);
      expect(result.isValid).toBe(true);
    });

    it('should reject URLs longer than 2048 characters', () => {
      const longPath = 'a'.repeat(2100);
      const result = validateUrlFormat(`https://example.com/${longPath}`);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatchObject({
        field: 'url',
        type: 'length',
      });
      expect(result.error?.message).toContain('too long');
    });
  });

  describe('Whitespace handling', () => {
    it('should trim leading whitespace', () => {
      const result = validateUrlFormat('  https://example.com');
      expect(result.isValid).toBe(true);
    });

    it('should trim trailing whitespace', () => {
      const result = validateUrlFormat('https://example.com  ');
      expect(result.isValid).toBe(true);
    });

    it('should trim both leading and trailing whitespace', () => {
      const result = validateUrlFormat('  https://example.com  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Real-world URL examples', () => {
    it('should accept common website URLs', () => {
      const urls = [
        'https://www.google.com',
        'https://github.com/user/repo',
        'https://stackoverflow.com/questions/12345',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://twitter.com/user/status/123456789',
        'https://www.amazon.com/product/dp/B08N5WRWNW',
      ];

      urls.forEach(url => {
        const result = validateUrlFormat(url);
        expect(result.isValid).toBe(true);
      });
    });

    it('should provide helpful error messages for common mistakes', () => {
      const testCases: Array<{ url: string; expectedType: ValidationError['type'] }> = [
        { url: '', expectedType: 'empty' },
        { url: 'google.com', expectedType: 'format' },
        { url: 'ftp://files.example.com', expectedType: 'protocol' },
        { url: 'https://localhost', expectedType: 'private' },
        { url: 'https://', expectedType: 'hostname' },
      ];

      testCases.forEach(({ url, expectedType }) => {
        const result = validateUrlFormat(url);
        expect(result.isValid).toBe(false);
        expect(result.error?.type).toBe(expectedType);
        expect(result.error?.message).toBeTruthy();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle URLs with special characters in path', () => {
      const result = validateUrlFormat('https://example.com/path%20with%20spaces');
      expect(result.isValid).toBe(true);
    });

    it('should handle URLs with authentication', () => {
      const result = validateUrlFormat('https://user:pass@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should handle URLs with multiple query parameters', () => {
      const result = validateUrlFormat('https://example.com?a=1&b=2&c=3&d=4');
      expect(result.isValid).toBe(true);
    });

    it('should handle URLs with fragment identifiers', () => {
      const result = validateUrlFormat('https://example.com/page#section-1');
      expect(result.isValid).toBe(true);
    });

    it('should handle internationalized domain names', () => {
      const result = validateUrlFormat('https://münchen.de');
      expect(result.isValid).toBe(true);
    });
  });
});
