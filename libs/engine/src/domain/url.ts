import { z } from 'zod';

export const UrlSchema = z.object({
  id: z.string().optional(),
  originalUrl: z.string().url(),
  shortCode: z.string().min(6), // Ensure enough entropy
  createdAt: z.date().optional(),
});

export type Url = z.infer<typeof UrlSchema>;

export class UrlDomain {
  constructor(public readonly props: Url) {}

  static create(originalUrl: string, shortCode: string): UrlDomain {
    const props = UrlSchema.parse({
      originalUrl,
      shortCode,
      createdAt: new Date(),
    });
    return new UrlDomain(props);
  }
}
