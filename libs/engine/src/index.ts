import { PrismaClient } from '@prisma/client';
import { GetOriginalUrlUseCase } from './use-cases/get-original-url';
import { ShortenUrlUseCase } from './use-cases/shorten-url';
import { PrismaUrlRepository, PrismaAnalyticsRepository } from './adapters/prisma-repository';

// Singleton Prisma Client
const prisma = new PrismaClient();

const urlRepository = new PrismaUrlRepository(prisma);
const analyticsRepository = new PrismaAnalyticsRepository(prisma);

export const shortenUrlUseCase = new ShortenUrlUseCase(urlRepository);
export const getOriginalUrlUseCase = new GetOriginalUrlUseCase(urlRepository, analyticsRepository);
export const repository = urlRepository; // Exporting repository directly for list view if needed

// Export domain modules for testing and external use
export { validateUrl, normalizeUrl, InvalidUrlError } from './domain/url-validation';
export { generateShortCode } from './domain/short-code';

// Export types
export type { Url } from './domain/url';
export type { UrlRepository, AnalyticsRepository } from './ports/repository';
