/**
 * taste.ts
 * User taste tracking with decay for personalized recommendations
 *
 * Tracks:
 * - Area preferences (Sector 1, Sector 2, etc.) with scores
 * - Price band (min/max EUR)
 * - Room count preferences (1, 2, 3, etc.)
 * - Property types (apartment, house, etc.)
 *
 * Event weights:
 * - view_property: 1.0
 * - dwell_property (>15s): 3.0
 * - add_to_watch: 5.0
 * - discover_card_click: 0.5
 * - search_filters: 2.0
 *
 * Decay: 7-day half-life (0.5^(daysSince/7))
 */

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

// Event weights for taste updates
export const EVENT_WEIGHTS = {
  view_property: 1.0,
  dwell_property: 3.0,
  add_to_watch: 5.0,
  discover_card_click: 0.5,
  search_filters: 2.0,
} as const;

export type EventKind = keyof typeof EVENT_WEIGHTS;

// Taste update payload
export interface TasteUpdate {
  userId: string;
  eventKind: EventKind;
  meta: {
    areaSlug?: string; // e.g. "sector-1"
    priceEur?: number; // Property price in EUR
    rooms?: number; // Number of rooms
    type?: string; // e.g. "apartment", "house"
  };
  eventTs?: Date; // Event timestamp (default: now)
}

// Area preference entry
interface AreaEntry {
  slug: string;
  score: number;
  ts: string; // ISO timestamp
}

// Get decay factor based on event age
// 7-day half-life: 0.5^(daysSince/7)
function getDecayFactor(eventTs: Date): number {
  const now = new Date();
  const daysSince = (now.getTime() - eventTs.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, daysSince / 7);
}

/**
 * Update user taste profile based on an event
 *
 * @param update - Taste update with userId, event kind, and property metadata
 * @returns Updated UserTaste record
 */
export async function updateUserTaste(update: TasteUpdate) {
  const { userId, eventKind, meta, eventTs = new Date() } = update;

  // Get event weight
  const eventWeight = EVENT_WEIGHTS[eventKind];
  if (!eventWeight) {
    throw new Error(`Unknown event kind: ${eventKind}`);
  }

  // Apply decay to event weight
  const decayFactor = getDecayFactor(eventTs);
  const weight = eventWeight * decayFactor;

  // Get or create taste profile
  let taste = await prisma.userTaste.findUnique({
    where: { userId },
  });

  if (!taste) {
    // Create new taste profile
    taste = await prisma.userTaste.create({
      data: {
        userId,
        areas: Prisma.JsonNull,
        minPrice: null,
        maxPrice: null,
        rooms: Prisma.JsonNull,
        types: Prisma.JsonNull,
      },
    });
  }

  // Parse existing JSON fields
  const areas = (taste.areas as AreaEntry[] | null) || [];
  const rooms = (taste.rooms as Record<string, number> | null) || {};
  const types = (taste.types as Record<string, number> | null) || {};

  // Update area preferences
  if (meta.areaSlug) {
    const existingIdx = areas.findIndex((a) => a.slug === meta.areaSlug);
    if (existingIdx >= 0) {
      // Increment existing area score
      areas[existingIdx].score += weight;
      areas[existingIdx].ts = eventTs.toISOString();
    } else {
      // Add new area
      areas.push({
        slug: meta.areaSlug,
        score: weight,
        ts: eventTs.toISOString(),
      });
    }

    // Keep top 20 areas by score
    areas.sort((a, b) => b.score - a.score);
    if (areas.length > 20) {
      areas.length = 20;
    }
  }

  // Update price band
  let minPrice = taste.minPrice;
  let maxPrice = taste.maxPrice;
  if (meta.priceEur) {
    if (!minPrice || meta.priceEur < minPrice) {
      minPrice = meta.priceEur;
    }
    if (!maxPrice || meta.priceEur > maxPrice) {
      maxPrice = meta.priceEur;
    }
  }

  // Update room preferences
  if (meta.rooms !== undefined) {
    const roomKey = String(meta.rooms);
    rooms[roomKey] = (rooms[roomKey] || 0) + weight;
  }

  // Update type preferences
  if (meta.type) {
    types[meta.type] = (types[meta.type] || 0) + weight;
  }

  // Update taste profile
  const updated = await prisma.userTaste.update({
    where: { userId },
    data: {
      areas: areas.length > 0 ? (areas as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      minPrice,
      maxPrice,
      rooms:
        Object.keys(rooms).length > 0
          ? (rooms as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      types:
        Object.keys(types).length > 0
          ? (types as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  });

  return updated;
}

/**
 * Decay all user taste profiles (run weekly via cron)
 * Applies 7-day half-life decay to all scores
 *
 * @returns Stats { usersProcessed, areasDecayed }
 */
export async function decayAllTastes() {
  const allTastes = await prisma.userTaste.findMany();

  let usersProcessed = 0;
  let areasDecayed = 0;

  for (const taste of allTastes) {
    const areas = (taste.areas as AreaEntry[] | null) || [];
    const rooms = (taste.rooms as Record<string, number> | null) || {};
    const types = (taste.types as Record<string, number> | null) || {};

    let modified = false;

    // Decay area scores
    if (areas.length > 0) {
      for (const area of areas) {
        const areaTs = new Date(area.ts);
        const decayFactor = getDecayFactor(areaTs);
        area.score *= decayFactor;
        areasDecayed++;
      }

      // Remove areas with very low scores (<0.1)
      const filtered = areas.filter((a) => a.score >= 0.1);
      if (filtered.length !== areas.length) {
        areas.length = 0;
        areas.push(...filtered);
      }

      // Re-sort by score
      areas.sort((a, b) => b.score - a.score);
      modified = true;
    }

    // Decay room preferences (use updatedAt as reference)
    if (Object.keys(rooms).length > 0) {
      const decayFactor = getDecayFactor(taste.updatedAt);
      for (const roomKey in rooms) {
        rooms[roomKey] *= decayFactor;
        // Remove very low scores
        if (rooms[roomKey] < 0.1) {
          delete rooms[roomKey];
        }
      }
      modified = true;
    }

    // Decay type preferences
    if (Object.keys(types).length > 0) {
      const decayFactor = getDecayFactor(taste.updatedAt);
      for (const typeKey in types) {
        types[typeKey] *= decayFactor;
        // Remove very low scores
        if (types[typeKey] < 0.1) {
          delete types[typeKey];
        }
      }
      modified = true;
    }

    // Update if modified
    if (modified) {
      await prisma.userTaste.update({
        where: { id: taste.id },
        data: {
          areas: areas.length > 0 ? (areas as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          rooms:
            Object.keys(rooms).length > 0
              ? (rooms as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          types:
            Object.keys(types).length > 0
              ? (types as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });
      usersProcessed++;
    }
  }

  return { usersProcessed, areasDecayed };
}
