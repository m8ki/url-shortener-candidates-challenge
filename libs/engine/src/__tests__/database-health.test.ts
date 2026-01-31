import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseHealthCheck } from '../adapters/database-health';
import { DatabaseConnectionError, DatabaseTimeoutError } from '../domain/errors';

describe('DatabaseHealthCheck', () => {
  let mockPrisma: any;
  let healthCheck: DatabaseHealthCheck;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(),
      $disconnect: vi.fn(),
    };
    healthCheck = new DatabaseHealthCheck(mockPrisma);
  });

  describe('check', () => {
    it('should return true when database is accessible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const result = await healthCheck.check();

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should throw DatabaseTimeoutError when query times out', async () => {
      // Mock a slow query that takes longer than timeout
      mockPrisma.$queryRaw.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      await expect(healthCheck.check(100)).rejects.toThrow(DatabaseTimeoutError);
    });

    it('should throw DatabaseConnectionError for connection errors', async () => {
      const connectionError = new Error('Connection refused');
      mockPrisma.$queryRaw.mockRejectedValue(connectionError);

      await expect(healthCheck.check()).rejects.toThrow(DatabaseConnectionError);
    });

    it('should detect Prisma connection error patterns', async () => {
      const errors = [
        new Error('ECONNREFUSED'),
        new Error('ETIMEDOUT'),
        new Error('Can\'t reach database server'),
      ];

      for (const error of errors) {
        mockPrisma.$queryRaw.mockRejectedValue(error);
        await expect(healthCheck.check()).rejects.toThrow(DatabaseConnectionError);
      }
    });
  });

  describe('isHealthy', () => {
    it('should return true when database is accessible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const result = await healthCheck.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when database is not accessible', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const result = await healthCheck.isHealthy();

      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      mockPrisma.$queryRaw.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const result = await healthCheck.isHealthy(100);

      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should call prisma disconnect', async () => {
      await healthCheck.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
