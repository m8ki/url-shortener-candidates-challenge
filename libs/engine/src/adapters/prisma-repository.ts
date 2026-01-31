import { PrismaClient } from '@prisma/client';
import type { UrlRepository, AnalyticsRepository } from '../ports/repository';
import type { Url } from '../domain/url';

export class PrismaUrlRepository implements UrlRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(url: Url): Promise<Url> {
    const saved = await this.prisma.url.create({
      data: {
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        createdAt: url.createdAt || new Date(),
      },
    });
    return {
      ...saved,
      createdAt: saved.createdAt, // Ensure date type compatibility
    };
  }

  async findByShortCode(shortCode: string): Promise<Url | null> {
    const found = await this.prisma.url.findUnique({
      where: { shortCode },
    });
    if (!found) return null;
    return found;
  }

  async findAll(): Promise<Url[]> {
    return this.prisma.url.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllWithStats(): Promise<(Url & { visitCount: number })[]> {
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
  }
}

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async trackVisit(shortCode: string, userAgent?: string): Promise<void> {
    // We need the ID of the URL, not just shortCode, for foreign key.
    // Optimisation: findUnique then create.
    const url = await this.prisma.url.findUnique({
      where: { shortCode },
    });

    if (url) {
        await this.prisma.visit.create({
            data: {
                urlId: url.id,
                userAgent: userAgent || null,
            }
        })
    }
  }

  async getVisits(shortCode: string): Promise<number> {
    const url = await this.prisma.url.findUnique({
      where: { shortCode },
      include: {
        _count: {
          select: { visits: true },
        },
      },
    });
    return url?._count.visits ?? 0;
  }
}
