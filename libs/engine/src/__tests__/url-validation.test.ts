import { describe, it, expect } from 'vitest';
import { validateUrl, normalizeUrl, InvalidUrlError } from '../domain/url-validation';

describe('URL Validation', () => {
  describe('validateUrl', () => {
    describe('Valid HTTPS URLs', () => {
      it('should accept valid HTTPS URLs', () => {
        const validUrls = [
          'https://example.com',
          'https://www.example.com',
          'https://example.com/path',
          'https://example.com/path?query=value',
          'https://subdomain.example.com',
          'https://example.com:8080',
          'https://example.com/path#hash',
        ];

        validUrls.forEach(url => {
          expect(() => validateUrl(url)).not.toThrow();
        });
      });

      it('should accept URLs with complex paths and queries', () => {
        expect(() => validateUrl('https://example.com/path/to/resource?foo=bar&baz=qux#section')).not.toThrow();
      });
    });

    describe('Invalid URLs - Protocol', () => {
      it('should reject HTTP URLs', () => {
        expect(() => validateUrl('http://example.com'))
          .toThrow(InvalidUrlError);
        expect(() => validateUrl('http://example.com'))
          .toThrow('URL must use HTTPS protocol');
      });

      it('should reject FTP URLs', () => {
        expect(() => validateUrl('ftp://example.com'))
          .toThrow(InvalidUrlError);
      });

      it('should reject URLs without protocol', () => {
        expect(() => validateUrl('example.com'))
          .toThrow(InvalidUrlError);
      });
    });

    describe('Invalid URLs - Format', () => {
      it('should reject empty strings', () => {
        expect(() => validateUrl(''))
          .toThrow(InvalidUrlError);
        expect(() => validateUrl(''))
          .toThrow('URL cannot be empty or whitespace only');
      });

      it('should reject whitespace-only strings', () => {
        expect(() => validateUrl('   '))
          .toThrow(InvalidUrlError);
      });

      it('should reject malformed URLs', () => {
        expect(() => validateUrl('not a url'))
          .toThrow(InvalidUrlError);
        expect(() => validateUrl('https://'))
          .toThrow(InvalidUrlError);
      });

      it('should reject non-string inputs', () => {
        expect(() => validateUrl(null as any))
          .toThrow(InvalidUrlError);
        expect(() => validateUrl(undefined as any))
          .toThrow(InvalidUrlError);
        expect(() => validateUrl(123 as any))
          .toThrow(InvalidUrlError);
      });
    });

    describe('Invalid URLs - Security', () => {
      it('should reject localhost URLs', () => {
        expect(() => validateUrl('https://localhost'))
          .toThrow(InvalidUrlError);
        expect(() => validateUrl('https://localhost:3000'))
          .toThrow(InvalidUrlError);
      });

      it('should reject loopback IP addresses', () => {
        expect(() => validateUrl('https://127.0.0.1'))
          .toThrow(InvalidUrlError);
      });

      it('should reject private IP addresses', () => {
        const privateIps = [
          'https://192.168.1.1',
          'https://192.168.0.100',
          'https://10.0.0.1',
          'https://10.255.255.255',
        ];

        privateIps.forEach(url => {
          expect(() => validateUrl(url))
            .toThrow(InvalidUrlError);
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle URLs with trailing/leading whitespace', () => {
        expect(() => validateUrl('  https://example.com  ')).not.toThrow();
      });

      it('should reject URLs with invalid hostnames', () => {
        expect(() => validateUrl('https://'))
          .toThrow(InvalidUrlError);
      });
    });
  });

  describe('normalizeUrl', () => {
    it('should remove trailing slashes from paths', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });

    it('should preserve root slash', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
    });

    it('should preserve query parameters', () => {
      expect(normalizeUrl('https://example.com?foo=bar')).toBe('https://example.com?foo=bar');
    });

    it('should preserve hash fragments', () => {
      expect(normalizeUrl('https://example.com#section')).toBe('https://example.com#section');
    });

    it('should normalize consistently', () => {
      const url1 = normalizeUrl('https://example.com/path/');
      const url2 = normalizeUrl('https://example.com/path');
      expect(url1).toBe(url2);
    });
  });
});
