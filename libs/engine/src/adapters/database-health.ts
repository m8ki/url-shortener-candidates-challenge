import { PrismaClient } from '@prisma/client';
import {
  DatabaseConnectionError,
  DatabaseTimeoutError,
  DatabaseError,
} from '../domain/errors';

/**
 * Database Health Check Service
 * Provides utilities to check if the database is accessible
 */
export class DatabaseHealthCheck {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Check if the database is accessible
   * @param timeoutMs - Timeout in milliseconds (default: 5000)
   * @returns true if database is accessible, throws error otherwise
   */
  async check(timeoutMs: number = 5000): Promise<boolean> {
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new DatabaseTimeoutError(
            `Database health check timed out after ${timeoutMs}ms`
          ));
        }, timeoutMs);
      });

      // Try to execute a simple query
      const healthCheckPromise = this.prisma.$queryRaw`SELECT 1`;

      // Race between the query and timeout
      await Promise.race([healthCheckPromise, timeoutPromise]);

      return true;
    } catch (error) {
      if (error instanceof DatabaseTimeoutError) {
        throw error;
      }

      // Check for specific Prisma connection errors
      if (this.isPrismaConnectionError(error)) {
        throw new DatabaseConnectionError(
          'Database is not accessible. Please ensure the database is running.',
          error
        );
      }

      throw new DatabaseError(
        'Database health check failed',
        error
      );
    }
  }

  /**
   * Check if database is accessible without throwing
   * @returns true if accessible, false otherwise
   */
  async isHealthy(timeoutMs: number = 5000): Promise<boolean> {
    try {
      await this.check(timeoutMs);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if error is a Prisma connection error
   */
  private isPrismaConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    
    // Common Prisma connection error patterns
    return (
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('enotfound') ||
      message.includes('can\'t reach database') ||
      message.includes('database server') ||
      message.includes('prisma client')
    );
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/**
 * Create a database health check instance
 */
export function createHealthCheck(prisma: PrismaClient): DatabaseHealthCheck {
  return new DatabaseHealthCheck(prisma);
}
