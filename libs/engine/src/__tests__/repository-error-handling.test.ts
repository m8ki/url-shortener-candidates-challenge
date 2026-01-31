import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaUrlRepository, PrismaAnalyticsRepository } from '../adapters/prisma-repository';
import { DatabaseError, DatabaseConnectionError, DatabaseTimeoutError } from '../domain/errors';
import type { Url } from '../domain/url';

// Mock Prisma errors
class MockPrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = code;
  }
}

class MockPrismaClientInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrismaClientInitializationError';
  }
}

describe('PrismaUrlRepository Error Handling', () => {
  let mockPrisma: any;
  let repository: PrismaUrlRepository;

  beforeEach(() => {
    mockPrisma = {
      url: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    };
    repository = new PrismaUrlRepository(mockPrisma);
  });

  describe('save', () => {
    it('should handle duplicate entry errors (P2002)', async () => {
      const url: Url = {
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        createdAt: new Date(),
      };

      const error = new MockPrismaClientKnownRequestError('Unique constraint failed', 'P2002');
      mockPrisma.url.create.mockRejectedValue(error);

      await expect(repository.save(url)).rejects.toThrow(DatabaseError);
      await expect(repository.save(url)).rejects.toThrow(/Failed to save URL/);
    });

    it('should handle connection errors', async () => {
      const url: Url = {
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        createdAt: new Date(),
      };

      const error = new MockPrismaClientInitializationError('Cannot connect to database');
      mockPrisma.url.create.mockRejectedValue(error);

      await expect(repository.save(url)).rejects.toThrow(DatabaseError);
      await expect(repository.save(url)).rejects.toThrow(/Failed to save URL/);
    });

    it('should handle timeout errors', async () => {
      const url: Url = {
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        createdAt: new Date(),
      };

      const error = new Error('Query timeout exceeded');
      mockPrisma.url.create.mockRejectedValue(error);

      await expect(repository.save(url)).rejects.toThrow(DatabaseTimeoutError);
    });

    it('should successfully save URL when no errors', async () => {
      const url: Url = {
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        createdAt: new Date(),
      };

      mockPrisma.url.create.mockResolvedValue({
        id: 1,
        ...url,
      });

      const result = await repository.save(url);

      expect(result).toEqual(expect.objectContaining({
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
      }));
    });
  });

  describe('findByShortCode', () => {
    it('should handle connection errors', async () => {
      const error = new MockPrismaClientInitializationError('Cannot connect to database');
      mockPrisma.url.findUnique.mockRejectedValue(error);

      await expect(repository.findByShortCode('abc123')).rejects.toThrow(DatabaseError);
      await expect(repository.findByShortCode('abc123')).rejects.toThrow(/Failed to find URL/);
    });

    it('should return null when URL not found', async () => {
      mockPrisma.url.findUnique.mockResolvedValue(null);

      const result = await repository.findByShortCode('notfound');

      expect(result).toBeNull();
    });

    it('should return URL when found', async () => {
      const mockUrl = {
        id: 1,
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        createdAt: new Date(),
      };

      mockPrisma.url.findUnique.mockResolvedValue(mockUrl);

      const result = await repository.findByShortCode('abc123');

      expect(result).toEqual(mockUrl);
    });
  });

  describe('findAll', () => {
    it('should handle connection errors', async () => {
      const error = new MockPrismaClientInitializationError('Cannot connect to database');
      mockPrisma.url.findMany.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow(DatabaseError);
      await expect(repository.findAll()).rejects.toThrow(/Failed to fetch URLs/);
    });

    it('should return empty array when no URLs', async () => {
      mockPrisma.url.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all URLs', async () => {
      const mockUrls = [
        {
          id: 1,
          originalUrl: 'https://example.com',
          shortCode: 'abc123',
          createdAt: new Date(),
        },
        {
          id: 2,
          originalUrl: 'https://test.com',
          shortCode: 'def456',
          createdAt: new Date(),
        },
      ];

      mockPrisma.url.findMany.mockResolvedValue(mockUrls);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('findAllWithStats', () => {
    it('should handle connection errors', async () => {
      const error = new MockPrismaClientInitializationError('Cannot connect to database');
      mockPrisma.url.findMany.mockRejectedValue(error);

      await expect(repository.findAllWithStats()).rejects.toThrow(DatabaseError);
      await expect(repository.findAllWithStats()).rejects.toThrow(/Failed to fetch URLs with statistics/);
    });

    it('should return URLs with visit counts', async () => {
      const mockUrls = [
        {
          id: 1,
          originalUrl: 'https://example.com',
          shortCode: 'abc123',
          createdAt: new Date(),
          _count: { visits: 5 },
        },
      ];

      mockPrisma.url.findMany.mockResolvedValue(mockUrls);

      const result = await repository.findAllWithStats();

      expect(result).toHaveLength(1);
      expect(result[0].visitCount).toBe(5);
    });
  });
});

describe('PrismaAnalyticsRepository Error Handling', () => {
  let mockPrisma: any;
  let repository: PrismaAnalyticsRepository;

  beforeEach(() => {
    mockPrisma = {
      url: {
        findUnique: vi.fn(),
      },
      visit: {
        create: vi.fn(),
      },
    };
    repository = new PrismaAnalyticsRepository(mockPrisma);
  });

  describe('trackVisit', () => {
    it('should handle connection errors', async () => {
      const error = new MockPrismaClientInitializationError('Cannot connect to database');
      mockPrisma.url.findUnique.mockRejectedValue(error);

      await expect(repository.trackVisit('abc123')).rejects.toThrow(DatabaseError);
      await expect(repository.trackVisit('abc123')).rejects.toThrow(/Failed to track visit/);
    });

    it('should not throw when URL not found', async () => {
      mockPrisma.url.findUnique.mockResolvedValue(null);

      // Should not throw
      await expect(repository.trackVisit('notfound')).resolves.toBeUndefined();
    });

    it('should successfully track visit', async () => {
      mockPrisma.url.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.visit.create.mockResolvedValue({ id: 1, urlId: 1 });

      await expect(repository.trackVisit('abc123', 'Mozilla/5.0')).resolves.toBeUndefined();
      expect(mockPrisma.visit.create).toHaveBeenCalledWith({
        data: {
          urlId: 1,
          userAgent: 'Mozilla/5.0',
        },
      });
    });
  });

  describe('getVisits', () => {
    it('should handle connection errors', async () => {
      const error = new MockPrismaClientInitializationError('Cannot connect to database');
      mockPrisma.url.findUnique.mockRejectedValue(error);

      await expect(repository.getVisits('abc123')).rejects.toThrow(DatabaseError);
      await expect(repository.getVisits('abc123')).rejects.toThrow(/Failed to get visit count/);
    });

    it('should return 0 when URL not found', async () => {
      mockPrisma.url.findUnique.mockResolvedValue(null);

      const result = await repository.getVisits('notfound');

      expect(result).toBe(0);
    });

    it('should return visit count', async () => {
      mockPrisma.url.findUnique.mockResolvedValue({
        id: 1,
        _count: { visits: 10 },
      });

      const result = await repository.getVisits('abc123');

      expect(result).toBe(10);
    });
  });
});
