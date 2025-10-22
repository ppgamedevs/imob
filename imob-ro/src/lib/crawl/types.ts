/**
 * Day 25 - Crawler Types
 * Source adapter interface for pluggable crawlers
 */

export type DiscoverResult = {
  links: string[];
  next?: string | null;
};

export interface SourceAdapter {
  domain: string;
  discover(listUrl: URL): Promise<DiscoverResult>;
  extract(input: { url: URL; html: string }): Promise<{
    extracted: {
      title?: string;
      price?: number;
      currency?: string;
      areaM2?: number;
      rooms?: number;
      floorRaw?: string;
      yearBuilt?: number;
      addressRaw?: string;
      lat?: number;
      lng?: number;
      photos?: string[];
      sourceMeta?: Record<string, unknown>;
    };
  }>;
}
