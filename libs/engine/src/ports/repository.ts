import type { Url } from '../domain/url';

export interface UrlRepository {
  save(url: Url): Promise<Url>;
  findByShortCode(shortCode: string): Promise<Url | null>;
  findAll(): Promise<Url[]>;
  findAllWithStats(): Promise<(Url & { visitCount: number })[]>;
}

export interface AnalyticsRepository {
  trackVisit(shortCode: string, userAgent?: string): Promise<void>;
  getVisits(shortCode: string): Promise<number>;
}
