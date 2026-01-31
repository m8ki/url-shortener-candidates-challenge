import type { UrlRepository } from '../ports/repository';
import { generateShortCode } from '../domain/short-code';
import type { Url } from '../domain/url';
import { validateUrl, normalizeUrl } from '../domain/url-validation';

export class ShortenUrlUseCase {
  constructor(private readonly urlRepository: UrlRepository) {}

  async execute(originalUrl: string): Promise<Url> {
    // Step 1: Validate the URL (must be HTTPS)
    validateUrl(originalUrl);
    
    // Step 2: Normalize the URL for consistency
    const normalizedUrl = normalizeUrl(originalUrl);
    
    // Step 3: Check if this URL already exists (same URL = same short code)
    const allUrls = await this.urlRepository.findAll();
    const existingUrl = allUrls.find(url => {
      try {
        return normalizeUrl(url.originalUrl) === normalizedUrl;
      } catch {
        return url.originalUrl === normalizedUrl;
      }
    });
    
    if (existingUrl) {
      // Return the existing short code for this URL
      return existingUrl;
    }
    
    // Step 4: Generate a unique short code with collision prevention
    // With 8 characters (62^8 = 218 trillion combinations), collisions are extremely rare
    // Even at 1M URLs/day, the system remains viable for centuries
    const MAX_RETRIES = 10;
    let attempts = 0;
    
    while (attempts < MAX_RETRIES) {
      const shortCode = generateShortCode();
      
      // Check if this short code already exists (collision check)
      const existing = await this.urlRepository.findByShortCode(shortCode);
      
      if (!existing) {
        // No collision - create and save the new URL
        const url: Url = {
          originalUrl: normalizedUrl,
          shortCode,
          createdAt: new Date(),
        };
        return this.urlRepository.save(url);
      }
      
      // Collision detected - retry with a new code
      attempts++;
    }
    
    // If we've exhausted retries, throw an error
    // This is extremely unlikely to happen in practice (probability < 0.000001%)
    throw new Error('Failed to generate unique short code after retries');
  }
}

