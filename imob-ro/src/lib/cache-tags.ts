/**
 * ISR Cache Tags for Next.js
 * Provides granular cache invalidation using revalidateTag()
 */

"use server";

import { revalidateTag } from "next/cache";
import { CacheTags } from "./cache-tag-names";

/**
 * Revalidate a specific area's cache
 */
export async function revalidateArea(slug: string) {
  revalidateTag(CacheTags.area(slug));
  revalidateTag(CacheTags.allAreas());
}

/**
 * Revalidate all areas cache
 */
export async function revalidateAllAreas() {
  revalidateTag(CacheTags.allAreas());
}

/**
 * Revalidate a specific dedup group's cache
 */
export async function revalidateGroup(groupId: string) {
  revalidateTag(CacheTags.group(groupId));
  revalidateTag(CacheTags.allGroups());
  // Also revalidate discover since group changes affect listings
  revalidateTag(CacheTags.discover());
}

/**
 * Revalidate all groups cache
 */
export async function revalidateAllGroups() {
  revalidateTag(CacheTags.allGroups());
  revalidateTag(CacheTags.discover());
}

/**
 * Revalidate a specific zone page
 */
export async function revalidateZone(slug: string) {
  revalidateTag(CacheTags.zone(slug));
  revalidateTag(CacheTags.allZones());
}

/**
 * Revalidate all zone pages
 */
export async function revalidateAllZones() {
  revalidateTag(CacheTags.allZones());
}

/**
 * Revalidate a specific analysis/listing
 */
export async function revalidateAnalysis(id: string) {
  revalidateTag(CacheTags.analysis(id));
  revalidateTag(CacheTags.discover());
}

/**
 * Revalidate a specific report
 */
export async function revalidateReport(id: string) {
  revalidateTag(CacheTags.report(id));
}

/**
 * Revalidate discover/search results
 */
export async function revalidateDiscover() {
  revalidateTag(CacheTags.discover());
}

/**
 * Revalidate user-specific caches
 */
export async function revalidateUserCache(userId: string) {
  revalidateTag(CacheTags.userWatchlist(userId));
  revalidateTag(CacheTags.userSaved(userId));
}
