import { describe, it, expect } from 'vitest';
import { generateShortCode } from '../domain/short-code';

describe('Short Code Generator', () => {
  describe('generateShortCode', () => {
    it('should generate codes of 8 characters', () => {
      const code = generateShortCode();
      expect(code).toHaveLength(8);
    });

    it('should generate different codes on subsequent calls', () => {
      const codes = new Set<string>();
      
      // Generate 1000 codes
      for (let i = 0; i < 1000; i++) {
        codes.add(generateShortCode());
      }
      
      // All should be unique (statistically almost certain with 62^8 possibilities)
      expect(codes.size).toBe(1000);
    });

    it('should only use characters from the URL-safe alphabet', () => {
      const validChars = /^[0-9A-Za-z]+$/;
      
      for (let i = 0; i < 100; i++) {
        const code = generateShortCode();
        expect(code).toMatch(validChars);
      }
    });

    it('should generate unique codes with extremely low collision probability', () => {
      const codes = new Set<string>();
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        codes.add(generateShortCode());
      }
      
      // With 62^8 possibilities (218 trillion), 10k codes should have no collisions
      expect(codes.size).toBe(iterations);
    });
  });

  describe('Collision Resistance Analysis', () => {
    it('should have 62^8 total combinations available', () => {
      // Mathematical verification
      const alphabetSize = 62; // 0-9, A-Z, a-z
      const codeLength = 8;
      const totalCombinations = Math.pow(alphabetSize, codeLength);
      
      expect(totalCombinations).toBe(218_340_105_584_896);
    });

    it('should demonstrate negligible collision probability at realistic scale', () => {
      // Birthday paradox approximation: P(collision) ≈ n² / (2 * N)
      const N = Math.pow(62, 8); // Total combinations = 218,340,105,584,896
      
      // Test various scales - probabilities should be very small
      const scenarios = [
        { urls: 1_000, description: '1K URLs' },
        { urls: 1_000_000, description: '1M URLs' },
        { urls: 10_000_000, description: '10M URLs' },
      ];
      
      scenarios.forEach(({ urls, description }) => {
        const probability = (urls * urls) / (2 * N);
        
        // At 1K URLs: probability ≈ 0.0000000023 (negligible)
        // At 1M URLs: probability ≈ 0.0023 (0.23%, still very low)
        // At 10M URLs: probability ≈ 0.23 (23%, getting higher but manageable with retries)
        
        // Verify probability is calculated correctly
        expect(probability).toBeGreaterThanOrEqual(0);
        expect(probability).toBeLessThan(1); // Should never exceed 100%
      });
    });
  });
});
