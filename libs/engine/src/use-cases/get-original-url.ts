import type { UrlRepository, AnalyticsRepository } from '../ports/repository';

export class GetOriginalUrlUseCase {
  constructor(
    private readonly urlRepository: UrlRepository,
    private readonly analyticsRepository: AnalyticsRepository
  ) {}

  async execute(shortCode: string, userAgent?: string): Promise<string | null> {
    const url = await this.urlRepository.findByShortCode(shortCode);
    
    if (!url) {
      return null;
    }

    // Fire and forget tracking? Or await?
    // Awaiting ensures data consistency but adds latency.
    // For this challenge, awaiting is safer to demonstrate correctness.
    await this.analyticsRepository.trackVisit(shortCode, userAgent);

    return url.originalUrl;
  }
}
