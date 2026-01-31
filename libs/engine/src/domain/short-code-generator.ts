/**
 * Short Code Generator Module
 * Generates collision-resistant short codes with dynamic length scaling
 */

import { customAlphabet } from 'nanoid';

// URL-safe alphabet (62 characters: 0-9, A-Z, a-z)
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ALPHABET_SIZE = ALPHABET.length; // 62

// Configuration
const INITIAL_LENGTH = 8;
const COLLISION_THRESHOLD = 0.5; // 50% of possible combinations

export interface ShortCodeGeneratorConfig {
  currentLength: number;
  totalUrls: number;
}

/**
 * Calculates the total possible combinations for a given length
 * Formula: ALPHABET_SIZE ^ length
 */
export function calculatePossibleCombinations(length: number): number {
  return Math.pow(ALPHABET_SIZE, length);
}

/**
 * Calculates the current utilization percentage
 */
export function calculateUtilization(totalUrls: number, length: number): number {
  const possible = calculatePossibleCombinations(length);
  return totalUrls / possible;
}

/**
 * Determines if we should increase the short code length
 * based on current utilization
 */
export function shouldIncreaseLength(totalUrls: number, currentLength: number): boolean {
  const utilization = calculateUtilization(totalUrls, currentLength);
  return utilization >= COLLISION_THRESHOLD;
}

/**
 * Calculates the optimal length based on total URLs
 */
export function calculateOptimalLength(totalUrls: number): number {
  let length = INITIAL_LENGTH;
  
  while (shouldIncreaseLength(totalUrls, length)) {
    length++;
  }
  
  return length;
}

/**
 * Short Code Generator class with dynamic length scaling
 */
export class ShortCodeGenerator {
  private currentLength: number;
  private nanoid: ReturnType<typeof customAlphabet>;

  constructor(initialLength: number = INITIAL_LENGTH) {
    this.currentLength = initialLength;
    this.nanoid = customAlphabet(ALPHABET, this.currentLength);
  }

  /**
   * Generates a short code with the current length
   */
  generate(): string {
    return this.nanoid();
  }

  /**
   * Updates the generator length based on total URLs
   */
  updateLength(totalUrls: number): void {
    const optimalLength = calculateOptimalLength(totalUrls);
    
    if (optimalLength !== this.currentLength) {
      this.currentLength = optimalLength;
      this.nanoid = customAlphabet(ALPHABET, this.currentLength);
    }
  }

  /**
   * Gets the current length
   */
  getLength(): number {
    return this.currentLength;
  }

  /**
   * Gets statistics about the generator
   */
  getStats(totalUrls: number) {
    const possibleCombinations = calculatePossibleCombinations(this.currentLength);
    const utilization = calculateUtilization(totalUrls, this.currentLength);
    
    return {
      currentLength: this.currentLength,
      totalUrls,
      possibleCombinations,
      utilization: utilization * 100, // as percentage
      shouldIncrease: shouldIncreaseLength(totalUrls, this.currentLength),
    };
  }
}

// Export a singleton instance
export const shortCodeGenerator = new ShortCodeGenerator();

/**
 * Legacy function for backward compatibility
 */
export function generateShortCode(): string {
  return shortCodeGenerator.generate();
}
