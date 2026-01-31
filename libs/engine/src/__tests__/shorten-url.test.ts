import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShortenUrlUseCase } from '../use-cases/shorten-url';
import type { UrlRepository } from '../ports/repository';
import type { Url } from '../domain/url';

/**
 * In-memory repository implementation for testing
 */
class InMemoryUrlRepository implements UrlRepository {
  private urls: Map<string, Url> = new Map();
  private visitCounts: Map<string, number> = new Map();

  async save(url: Url): Promise<Url> {
    this.urls.set(url.shortCode, url);
    return url;
  }

  async findByShortCode(shortCode: string): Promise<Url | null> {
    return this.urls.get(shortCode) || null;
  }

  async findAll(): Promise<Url[]> {
    return Array.from(this.urls.values());
  }

  async findAllWithStats(): Promise<(Url & { visitCount: number })[]> {
    return Array.from(this.urls.values()).map(url => ({
      ...url,
      visitCount: this.visitCounts.get(url.shortCode) || 0,
    }));
  }

  // Helper methods for testing
  clear(): void {
    this.urls.clear();
    this.visitCounts.clear();
  }

  size(): number {
    return this.urls.size;
  }

  has(shortCode: string): boolean {
    return this.urls.has(shortCode);
  }
}

describe('ShortenUrlUseCase', () => {
  let repository: InMemoryUrlRepository;
  let useCase: ShortenUrlUseCase;

  beforeEach(() => {
    repository = new InMemoryUrlRepository();
    useCase = new ShortenUrlUseCase(repository);
  });

  describe('Basic Functionality', () => {
    it('should shorten a valid URL', async () => {
      const originalUrl = 'https://example.com';
      const result = await useCase.execute(originalUrl);

      expect(result).toBeDefined();
      expect(result.originalUrl).toBe(originalUrl);
      expect(result.shortCode).toBeTruthy();
      expect(result.shortCode.length).toBeGreaterThanOrEqual(6);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should save the URL to the repository', async () => {
      const originalUrl = 'https://example.com';
      await useCase.execute(originalUrl);

      expect(repository.size()).toBe(1);
    });

    it('should generate URL-safe short codes', async () => {
      const result = await useCase.execute('https://example.com');
      
      // Should only contain alphanumeric characters
      expect(result.shortCode).toMatch(/^[0-9A-Za-z]+$/);
    });
  });

  describe('Same URL Generates Same Short Code', () => {
    it('should return the same short code for identical URLs', async () => {
      const originalUrl = 'https://example.com/path';
      
      const result1 = await useCase.execute(originalUrl);
      const result2 = await useCase.execute(originalUrl);

      expect(result1.shortCode).toBe(result2.shortCode);
      expect(repository.size()).toBe(1); // Should not create duplicate
    });

    it('should handle URLs with query parameters consistently', async () => {
      const originalUrl = 'https://example.com?foo=bar&baz=qux';
      
      const result1 = await useCase.execute(originalUrl);
      const result2 = await useCase.execute(originalUrl);

      expect(result1.shortCode).toBe(result2.shortCode);
    });

    it('should handle URLs with hash fragments consistently', async () => {
      const originalUrl = 'https://example.com#section';
      
      const result1 = await useCase.execute(originalUrl);
      const result2 = await useCase.execute(originalUrl);

      expect(result1.shortCode).toBe(result2.shortCode);
    });

    it('should normalize URLs before checking for duplicates', async () => {
      // These should be treated as the same URL
      const url1 = 'https://example.com/path/';
      const url2 = 'https://example.com/path';
      
      const result1 = await useCase.execute(url1);
      const result2 = await useCase.execute(url2);

      expect(result1.shortCode).toBe(result2.shortCode);
      expect(repository.size()).toBe(1);
    });
  });

  describe('No URL Collision', () => {
    it('should generate unique short codes for different URLs', async () => {
      const urls = [
        'https://example.com',
        'https://google.com',
        'https://github.com',
        'https://stackoverflow.com',
        'https://reddit.com',
      ];

      const results = await Promise.all(urls.map(url => useCase.execute(url)));
      const shortCodes = results.map(r => r.shortCode);

      // All short codes should be unique
      const uniqueCodes = new Set(shortCodes);
      expect(uniqueCodes.size).toBe(urls.length);
    });

    it('should handle collision by generating a new code', async () => {
      // This test verifies the collision detection mechanism
      const url1 = 'https://example.com';
      const url2 = 'https://different.com';

      const result1 = await useCase.execute(url1);
      const result2 = await useCase.execute(url2);

      expect(result1.shortCode).not.toBe(result2.shortCode);
    });

    it('should generate unique codes for many URLs', async () => {
      const results: Url[] = [];
      
      // Generate 100 different URLs
      for (let i = 0; i < 100; i++) {
        const result = await useCase.execute(`https://example${i}.com`);
        results.push(result);
      }

      const shortCodes = results.map(r => r.shortCode);
      const uniqueCodes = new Set(shortCodes);

      expect(uniqueCodes.size).toBe(100);
      expect(repository.size()).toBe(100);
    });
  });

  describe('Check Before Creating - No Override', () => {
    it('should not override existing URLs with different original URLs', async () => {
      const url1 = 'https://example.com';
      const url2 = 'https://different.com';

      const result1 = await useCase.execute(url1);
      const result2 = await useCase.execute(url2);

      // Verify both URLs are stored
      const stored1 = await repository.findByShortCode(result1.shortCode);
      const stored2 = await repository.findByShortCode(result2.shortCode);

      expect(stored1?.originalUrl).toBe(url1);
      expect(stored2?.originalUrl).toBe(url2);
      expect(repository.size()).toBe(2);
    });

    it('should check repository before generating new short code', async () => {
      const spy = vi.spyOn(repository, 'findByShortCode');
      
      await useCase.execute('https://example.com');

      // Should have checked if the code exists
      expect(spy).toHaveBeenCalled();
    });

    it('should not create duplicate entries for same URL', async () => {
      const url = 'https://example.com';
      
      await useCase.execute(url);
      await useCase.execute(url);
      await useCase.execute(url);

      expect(repository.size()).toBe(1);
    });

    it('should preserve original URL data when returning existing short code', async () => {
      const url = 'https://example.com';
      
      const result1 = await useCase.execute(url);
      const result2 = await useCase.execute(url);

      expect(result1.originalUrl).toBe(result2.originalUrl);
      expect(result1.createdAt).toEqual(result2.createdAt);
    });
  });

  describe('Collision Retry Mechanism', () => {
    it('should retry when collision is detected', async () => {
      // Create a mock repository that simulates collision on first attempt
      let callCount = 0;
      const mockRepo: UrlRepository = {
        async save(url: Url) {
          return url;
        },
        async findByShortCode(shortCode: string) {
          callCount++;
          // Simulate collision on first call, then no collision
          if (callCount === 1) {
            return {
              originalUrl: 'https://existing.com',
              shortCode,
              createdAt: new Date(),
            };
          }
          return null;
        },
        async findAll() {
          return [];
        },
        async findAllWithStats() {
          return [];
        },
      };

      const useCaseWithMock = new ShortenUrlUseCase(mockRepo);
      const result = await useCaseWithMock.execute('https://new.com');

      expect(result).toBeDefined();
      expect(callCount).toBeGreaterThan(1); // Should have retried
    });

    it('should throw error after max retries', async () => {
      // Create a mock that always returns collision
      const alwaysCollisionRepo: UrlRepository = {
        async save(url: Url) {
          return url;
        },
        async findByShortCode() {
          return {
            originalUrl: 'https://existing.com',
            shortCode: 'collision',
            createdAt: new Date(),
          };
        },
        async findAll() {
          return [];
        },
        async findAllWithStats() {
          return [];
        },
      };

      const useCaseWithMock = new ShortenUrlUseCase(alwaysCollisionRepo);
      
      await expect(useCaseWithMock.execute('https://new.com'))
        .rejects
        .toThrow('Failed to generate unique short code');
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        '',
        'not a url',
        'http://example.com', // HTTP not HTTPS
        'ftp://example.com',
      ];

      for (const url of invalidUrls) {
        await expect(useCase.execute(url)).rejects.toThrow();
      }
    });

    it('should reject localhost URLs', async () => {
      await expect(useCase.execute('https://localhost')).rejects.toThrow();
      await expect(useCase.execute('https://127.0.0.1')).rejects.toThrow();
    });

    it('should reject private IP addresses', async () => {
      await expect(useCase.execute('https://192.168.1.1')).rejects.toThrow();
      await expect(useCase.execute('https://10.0.0.1')).rejects.toThrow();
    });

    it('should accept valid HTTPS URLs', async () => {
      const validUrls = [
        'https://example.com',
        'https://www.example.com',
        'https://subdomain.example.com',
        'https://example.com/path',
        'https://example.com?query=value',
      ];

      for (const url of validUrls) {
        const result = await useCase.execute(url);
        expect(result).toBeDefined();
        expect(result.originalUrl).toBeTruthy();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with special characters', async () => {
      const url = 'https://example.com/path?foo=bar&baz=qux#section';
      const result = await useCase.execute(url);

      expect(result).toBeDefined();
      expect(result.originalUrl).toBeTruthy();
    });

    it('should handle very long URLs', async () => {
      const longPath = 'a'.repeat(1000);
      const url = `https://example.com/${longPath}`;
      const result = await useCase.execute(url);

      expect(result).toBeDefined();
      expect(result.shortCode.length).toBeLessThan(url.length);
    });

    it('should handle concurrent requests', async () => {
      const urls = Array.from({ length: 10 }, (_, i) => `https://example${i}.com`);
      
      const results = await Promise.all(urls.map(url => useCase.execute(url)));

      expect(results).toHaveLength(10);
      const shortCodes = results.map(r => r.shortCode);
      const uniqueCodes = new Set(shortCodes);
      expect(uniqueCodes.size).toBe(10);
    });
  });
});
