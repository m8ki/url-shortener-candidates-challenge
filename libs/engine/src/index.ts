import { PrismaClient } from '@prisma/client';
import { GetOriginalUrlUseCase } from './use-cases/get-original-url';
import { ShortenUrlUseCase } from './use-cases/shorten-url';
import { PrismaUrlRepository, PrismaAnalyticsRepository } from './adapters/prisma-repository';
import { createHealthCheck } from './adapters/database-health';

// Singleton Prisma Client
const prisma = new PrismaClient();

const urlRepository = new PrismaUrlRepository(prisma);
const analyticsRepository = new PrismaAnalyticsRepository(prisma);

export const shortenUrlUseCase = new ShortenUrlUseCase(urlRepository);
export const getOriginalUrlUseCase = new GetOriginalUrlUseCase(urlRepository, analyticsRepository);
export const repository = urlRepository; // Exporting repository directly for list view if needed
export const databaseHealth = createHealthCheck(prisma); // Export health check

// Export domain modules for testing and external use
export { validateUrl, normalizeUrl, InvalidUrlError } from './domain/url-validation';
export { generateShortCode } from './domain/short-code';

// Export error handling
export {
  ApplicationError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  ValidationError,
  NotFoundError,
  ShortCodeGenerationError,
  RateLimitError,
  isApplicationError,
  isDatabaseError,
  getErrorMessage,
  getErrorCode,
  getStatusCode,
} from './domain/errors';

// Export types
export type { Url } from './domain/url';
export type { UrlRepository, AnalyticsRepository } from './ports/repository';

