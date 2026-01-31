import { PrismaClient, Prisma } from '@prisma/client';
import type { UrlRepository, AnalyticsRepository } from '../ports/repository';
import type { Url } from '../domain/url';
import {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
} from '../domain/errors';

/**
 * Enhanced Prisma URL Repository with robust error handling
 */
export class PrismaUrlRepository implements UrlRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(url: Url): Promise<Url> {
    try {
      const saved = await this.prisma.url.create({
        data: {
          originalUrl: url.originalUrl,
          shortCode: url.shortCode,
          createdAt: url.createdAt || new Date(),
        },
      });
      return {
        ...saved,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      throw this.handlePrismaError(error, 'Failed to save URL');
    }
  }

  async findByShortCode(shortCode: string): Promise<Url | null> {
    try {
      const found = await this.prisma.url.findUnique({
        where: { shortCode },
      });
      if (!found) return null;
      return found;
    } catch (error) {
      throw this.handlePrismaError(error, 'Failed to find URL by short code');
    }
  }

  async findAll(): Promise<Url[]> {
    try {
      return await this.prisma.url.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw this.handlePrismaError(error, 'Failed to fetch URLs');
    }
  }

  async findAllWithStats(): Promise<(Url & { visitCount: number })[]> {
    try {
      const urls = await this.prisma.url.findMany({
        include: {
          _count: {
            select: { visits: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return urls.map((url: any) => ({
        id: url.id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        createdAt: url.createdAt,
        visitCount: url._count.visits,
      }));
    } catch (error) {
      throw this.handlePrismaError(error, 'Failed to fetch URLs with statistics');
    }
  }

  /**
   * Handle Prisma errors and convert them to application errors
   */
  private handlePrismaError(error: unknown, context: string): Error {
    // Check if it's a Prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma error codes
      switch (error.code) {
        case 'P2002':
          return new DatabaseError(`${context}: Duplicate entry detected`);
        case 'P2025':
          return new DatabaseError(`${context}: Record not found`);
        default:
          return new DatabaseError(`${context}: ${error.message}`, error);
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return new DatabaseConnectionError(
        `${context}: Unable to connect to database. Please ensure the database is running.`,
        error
      );
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return new DatabaseError(`${context}: Database engine error`, error);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return new DatabaseError(`${context}: Invalid data provided`, error);
    }

    // Check for timeout errors
    if (error instanceof Error && error.message.includes('timeout')) {
      return new DatabaseTimeoutError(`${context}: Operation timed out`, error);
    }

    // Generic database error
    if (error instanceof Error) {
      return new DatabaseError(`${context}: ${error.message}`, error);
    }

    return new DatabaseError(context, error);
  }
}

/**
 * Enhanced Prisma Analytics Repository with robust error handling
 */
export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async trackVisit(shortCode: string, userAgent?: string): Promise<void> {
    try {
      // We need the ID of the URL, not just shortCode, for foreign key.
      const url = await this.prisma.url.findUnique({
        where: { shortCode },
      });

      if (url) {
        await this.prisma.visit.create({
          data: {
            urlId: url.id,
            userAgent: userAgent || null,
          },
        });
      }
    } catch (error) {
      throw this.handlePrismaError(error, 'Failed to track visit');
    }
  }

  async getVisits(shortCode: string): Promise<number> {
    try {
      const url = await this.prisma.url.findUnique({
        where: { shortCode },
        include: {
          _count: {
            select: { visits: true },
          },
        },
      });
      return url?._count.visits ?? 0;
    } catch (error) {
      throw this.handlePrismaError(error, 'Failed to get visit count');
    }
  }

  /**
   * Handle Prisma errors and convert them to application errors
   */
  private handlePrismaError(error: unknown, context: string): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return new DatabaseError(`${context}: ${error.message}`, error);
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return new DatabaseConnectionError(
        `${context}: Unable to connect to database`,
        error
      );
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return new DatabaseError(`${context}: Database engine error`, error);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return new DatabaseError(`${context}: Invalid data`, error);
    }

    if (error instanceof Error && error.message.includes('timeout')) {
      return new DatabaseTimeoutError(`${context}: Operation timed out`, error);
    }

    if (error instanceof Error) {
      return new DatabaseError(`${context}: ${error.message}`, error);
    }

    return new DatabaseError(context, error);
  }
}
