/**
 * ISR Cache Tag Definitions
 * Constants for cache tag naming
 */

/**
 * Cache tag types for different entities
 */
export const CacheTags = {
  // Area-related tags
  area: (slug: string) => `area:${slug}`,
  allAreas: () => "areas:all",

  // Group-related tags (dedup groups)
  group: (id: string) => `group:${id}`,
  allGroups: () => "groups:all",

  // Analysis/Listing tags
  analysis: (id: string) => `analysis:${id}`,

  // Zone page tags
  zone: (slug: string) => `zone:${slug}`,
  allZones: () => "zones:all",

  // Report tags
  report: (id: string) => `report:${id}`,

  // Discover/search tags
  discover: () => "discover:all",

  // User-specific tags
  userWatchlist: (userId: string) => `user:${userId}:watchlist`,
  userSaved: (userId: string) => `user:${userId}:saved`,
} as const;
