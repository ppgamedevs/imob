/**
 * Step 7: Universal search suggest API
 * Returns areas, addresses, listings, saved items, and pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { SuggestResponse, SuggestItem } from '@/lib/search/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = request.url ? new URL(request.url) : request.nextUrl;
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '24', 10);

    if (!q || q.length < 2) {
      return NextResponse.json({
        sections: {
          areas: [],
          addresses: [],
          listings: [],
          saved: [],
          pages: [],
        },
        meta: { q, tookMs: Date.now() - startTime },
      });
    }

    const normalizedQ = q.toLowerCase().trim();

    // Parallel queries
    const [areas, listings, pages] = await Promise.all([
      searchAreas(normalizedQ, 5),
      searchListings(normalizedQ, 5),
      searchPages(normalizedQ, 5),
    ]);

    // TODO: Add address geocoding
    const addresses: SuggestItem[] = [];

    // TODO: Add saved items (requires user session)
    const saved: SuggestItem[] = [];

    // TODO: Insert sponsored suggestions (max 2 total, max 1 per section)

    const response: SuggestResponse = {
      sections: {
        areas,
        addresses,
        listings,
        saved,
        pages,
      },
      meta: {
        q,
        tookMs: Date.now() - startTime,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Search areas by name or slug (prefix match)
 */
async function searchAreas(q: string, limit: number): Promise<SuggestItem[]> {
  const areas = await prisma.area.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ],
      city: 'București', // Focus on București for now
    },
    orderBy: [
      { name: 'asc' },
    ],
    take: limit,
    select: {
      slug: true,
      name: true,
      city: true,
      stats: true,
    },
  });

  return areas.map((area) => {
    const stats = area.stats as any;
    return {
      kind: 'area' as const,
      slug: area.slug,
      name: area.name,
      city: area.city,
      listingsNow: stats?.listingsNow || 0,
      href: `/area/${area.slug}`,
      highlight: area.name,
    };
  });
}

/**
 * Search listings by title (recent first, boosted by badges)
 */
async function searchListings(q: string, limit: number): Promise<SuggestItem[]> {
  const analyses = await prisma.analysis.findMany({
    where: {
      AND: [
        { extractedListing: { title: { contains: q, mode: 'insensitive' } } },
        { status: 'done' },
      ],
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
    take: limit * 2, // Get more for scoring
    select: {
      id: true,
      groupId: true,
      extractedListing: {
        select: {
          title: true,
          price: true,
          areaM2: true,
          photos: true,
        },
      },
      scoreSnapshot: {
        select: {
          priceBadge: true,
          yieldNet: true,
          ttsBucket: true,
        },
      },
      createdAt: true,
    },
  });

  // Score and sort
  const scored = analyses.map((a) => {
    const title = a.extractedListing?.title || 'Apartament';
    const price = a.extractedListing?.price || 0;
    const areaM2 = a.extractedListing?.areaM2 || 1;
    const photos = a.extractedListing?.photos as string[] | null;
    const scores = a.scoreSnapshot;
    
    let score = 0;
    
    // Boost underpriced
    if (scores?.priceBadge === 'Underpriced') score += 100;
    
    // Boost high yield
    if (scores?.yieldNet && scores.yieldNet > 0.06) score += 50;
    
    // Boost fast TTS
    if (scores?.ttsBucket === 'fast') score += 30;
    
    // Recent listings get small boost
    const ageHours = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) score += 10;

    const eurM2 = Math.round(price / areaM2);
    
    const avmBadge: 'under' | 'fair' | 'over' | undefined = 
      scores?.priceBadge === 'Underpriced' 
        ? 'under' 
        : scores?.priceBadge === 'Overpriced' 
        ? 'over' 
        : scores?.priceBadge === 'Fair'
        ? 'fair'
        : undefined;

    return {
      kind: 'listing' as const,
      id: a.id,
      title,
      priceEur: price,
      eurM2,
      avmBadge,
      thumb: Array.isArray(photos) && photos.length > 0 ? photos[0] : undefined,
      href: `/report/${a.id}`,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ score, ...item }) => item);
}

/**
 * Search static pages
 */
async function searchPages(q: string, limit: number): Promise<SuggestItem[]> {
  const staticPages = [
    { title: 'Descoperă proprietăți', href: '/discover', keywords: ['descopera', 'proprietati', 'anunturi', 'cautare'] },
    { title: 'Zone București', href: '/area', keywords: ['zone', 'cartiere', 'bucure', 'quartiere'] },
    { title: 'Pentru proprietari', href: '/owners', keywords: ['proprietari', 'vanzare', 'estimare', 'evaluare'] },
    { title: 'Despre imob.ro', href: '/about', keywords: ['despre', 'about', 'echipa', 'contact'] },
  ];

  const matches = staticPages.filter((page) => {
    const lowerTitle = page.title.toLowerCase();
    const matchesTitle = lowerTitle.includes(q);
    const matchesKeyword = page.keywords.some((kw) => kw.includes(q));
    return matchesTitle || matchesKeyword;
  });

  return matches.slice(0, limit).map((page) => ({
    kind: 'page' as const,
    title: page.title,
    href: page.href,
  }));
}
