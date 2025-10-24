/**
 * Pagination utilities for consistent query limiting
 * Enforces 50 items/page max with take + 1 pattern
 */

/**
 * Maximum items per page (recommended limit)
 */
export const MAX_PAGE_SIZE = 50;

/**
 * Default page size if not specified
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Parse and validate page size from request
 * Caps at MAX_PAGE_SIZE and defaults to DEFAULT_PAGE_SIZE
 *
 * @param raw - Raw page size from query params (could be string, number, or undefined)
 * @returns Validated page size between 1 and MAX_PAGE_SIZE
 *
 * @example
 * ```ts
 * const pageSize = parsePageSize(searchParams.get('pageSize'));
 * // Returns: number between 1 and 50
 * ```
 */
export function parsePageSize(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  const parsed = typeof raw === "string" ? parseInt(raw, 10) : raw;

  if (isNaN(parsed) || parsed < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(parsed, MAX_PAGE_SIZE);
}

/**
 * Apply take + 1 pattern for cursor pagination
 * Fetches one extra item to determine if there are more results
 *
 * @param pageSize - Desired page size
 * @returns Take value (pageSize + 1)
 *
 * @example
 * ```ts
 * const take = getTakePlusOne(20); // Returns 21
 * const items = await prisma.listing.findMany({ take });
 * const hasMore = items.length > 20;
 * const results = items.slice(0, 20);
 * ```
 */
export function getTakePlusOne(pageSize: number): number {
  return pageSize + 1;
}

/**
 * Check if there are more results (for take + 1 pattern)
 *
 * @param items - Array of fetched items
 * @param pageSize - Requested page size
 * @returns True if there are more results
 *
 * @example
 * ```ts
 * const items = await prisma.listing.findMany({ take: getTakePlusOne(20) });
 * const hasMore = hasMoreResults(items, 20);
 * const results = trimToPageSize(items, 20);
 * ```
 */
export function hasMoreResults<T>(items: T[], pageSize: number): boolean {
  return items.length > pageSize;
}

/**
 * Trim results to page size (remove the +1 item)
 *
 * @param items - Array of fetched items (with +1)
 * @param pageSize - Requested page size
 * @returns Trimmed array
 */
export function trimToPageSize<T>(items: T[], pageSize: number): T[] {
  return items.slice(0, pageSize);
}

/**
 * Get next cursor from results (for cursor-based pagination)
 *
 * @param items - Array of fetched items (with +1)
 * @param pageSize - Requested page size
 * @param getCursor - Function to extract cursor from item
 * @returns Next cursor or null if no more results
 *
 * @example
 * ```ts
 * const items = await prisma.listing.findMany({ take: getTakePlusOne(20) });
 * const nextCursor = getNextCursor(items, 20, (item) => item.id);
 * return { items: trimToPageSize(items, 20), nextCursor };
 * ```
 */
export function getNextCursor<T, C>(
  items: T[],
  pageSize: number,
  getCursor: (item: T) => C,
): C | null {
  if (!hasMoreResults(items, pageSize)) {
    return null;
  }
  return getCursor(items[pageSize - 1]);
}

/**
 * All-in-one pagination helper
 * Applies take + 1 pattern and returns results with metadata
 *
 * @param items - Array of fetched items (with +1)
 * @param pageSize - Requested page size
 * @param getCursor - Function to extract cursor from item
 * @returns Paginated results with metadata
 *
 * @example
 * ```ts
 * const items = await prisma.listing.findMany({
 *   take: getTakePlusOne(parsePageSize(req.query.pageSize))
 * });
 * return paginate(items, 20, (item) => item.id);
 * // Returns: { items: [...], hasMore: true, nextCursor: "xyz" }
 * ```
 */
export function paginate<T, C>(
  items: T[],
  pageSize: number,
  getCursor: (item: T) => C,
): {
  items: T[];
  hasMore: boolean;
  nextCursor: C | null;
} {
  const hasMore = hasMoreResults(items, pageSize);
  const trimmed = trimToPageSize(items, pageSize);
  const nextCursor = hasMore ? getCursor(items[pageSize - 1]) : null;

  return {
    items: trimmed,
    hasMore,
    nextCursor,
  };
}
