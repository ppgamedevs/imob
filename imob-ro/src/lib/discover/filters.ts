/**
 * Discover Filters v2 - URL-as-truth utilities
 * 
 * All filter state derives from URL query params.
 * This module provides type-safe parsing, serialization, and validation.
 */

import { z } from "zod";

/**
 * Filter state schema - matches URL query params exactly
 */
export const filterStateSchema = z.object({
  // Geographic & property type
  areas: z.array(z.string()).optional(),
  
  // Price filters
  priceMin: z.number().int().nonnegative().optional(),
  priceMax: z.number().int().nonnegative().optional(),
  
  // €/m² range
  eurm2Min: z.number().nonnegative().optional(),
  eurm2Max: z.number().nonnegative().optional(),
  
  // Size range
  m2Min: z.number().nonnegative().optional(),
  m2Max: z.number().nonnegative().optional(),
  
  // Rooms (can be multiple: [1,2,3])
  rooms: z.array(z.number().int().positive()).optional(),
  
  // Year built ranges or custom
  yearMin: z.number().int().optional(),
  yearMax: z.number().int().optional(),
  
  // Metro distance (max meters)
  metroMax: z.number().int().nonnegative().optional(),
  
  // Signals (checkboxes)
  signals: z.array(z.enum(['underpriced', 'fast_tts', 'yield_high', 'seismic_low'])).optional(),
  
  // Sort
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'eurm2_asc', 'eurm2_desc', 'yield_desc', 'tts_asc']).optional(),
  
  // UI preferences
  density: z.enum(['comfortable', 'compact']).optional(),
  
  // Pagination
  page: z.number().int().positive().optional(),
});

export type FilterState = z.infer<typeof filterStateSchema>;

/**
 * Parse URL search params into typed FilterState
 */
export function parseFiltersFromURL(searchParams: URLSearchParams): FilterState {
  const raw: Record<string, unknown> = {};
  
  // Areas (CSV)
  const areas = searchParams.get('areas');
  if (areas) raw.areas = areas.split(',').filter(Boolean);
  
  // Price range
  const priceRange = searchParams.get('price');
  if (priceRange) {
    const [min, max] = priceRange.split('-').map(Number);
    if (min) raw.priceMin = min;
    if (max) raw.priceMax = max;
  }
  
  // €/m² range
  const eurm2Range = searchParams.get('eurm2');
  if (eurm2Range) {
    const [min, max] = eurm2Range.split('-').map(Number);
    if (min) raw.eurm2Min = min;
    if (max) raw.eurm2Max = max;
  }
  
  // Size range
  const m2Range = searchParams.get('m2');
  if (m2Range) {
    const [min, max] = m2Range.split('-').map(Number);
    if (min) raw.m2Min = min;
    if (max) raw.m2Max = max;
  }
  
  // Rooms (CSV of numbers)
  const rooms = searchParams.get('rooms');
  if (rooms) raw.rooms = rooms.split(',').map(Number).filter(n => !isNaN(n));
  
  // Year range
  const year = searchParams.get('year');
  if (year) {
    if (year.endsWith('+')) {
      raw.yearMin = Number(year.slice(0, -1));
    } else {
      const [min, max] = year.split('-').map(Number);
      if (min) raw.yearMin = min;
      if (max) raw.yearMax = max;
    }
  }
  
  // Metro distance
  const metro = searchParams.get('metro');
  if (metro?.startsWith('<=')) {
    raw.metroMax = Number(metro.slice(2));
  }
  
  // Signals (CSV)
  const signals = searchParams.get('signals');
  if (signals) raw.signals = signals.split(',').filter(Boolean);
  
  // Sort
  const sort = searchParams.get('sort');
  if (sort) raw.sort = sort;
  
  // Density
  const density = searchParams.get('density');
  if (density) raw.density = density;
  
  // Page
  const page = searchParams.get('page');
  if (page) raw.page = Number(page);
  
  // Validate and return
  const result = filterStateSchema.safeParse(raw);
  return result.success ? result.data : {};
}

/**
 * Serialize FilterState into URL query params (compact format)
 */
export function serializeFiltersToURL(filters: FilterState): string {
  const params = new URLSearchParams();
  
  // Areas (CSV)
  if (filters.areas?.length) {
    params.set('areas', filters.areas.join(','));
  }
  
  // Price range (compact: 50000-120000)
  if (filters.priceMin || filters.priceMax) {
    const min = filters.priceMin || '';
    const max = filters.priceMax || '';
    params.set('price', `${min}-${max}`);
  }
  
  // €/m² range
  if (filters.eurm2Min || filters.eurm2Max) {
    const min = filters.eurm2Min || '';
    const max = filters.eurm2Max || '';
    params.set('eurm2', `${min}-${max}`);
  }
  
  // Size range
  if (filters.m2Min || filters.m2Max) {
    const min = filters.m2Min || '';
    const max = filters.m2Max || '';
    params.set('m2', `${min}-${max}`);
  }
  
  // Rooms (CSV)
  if (filters.rooms?.length) {
    params.set('rooms', filters.rooms.join(','));
  }
  
  // Year (compact: 2011+ or 1990-2000)
  if (filters.yearMin || filters.yearMax) {
    if (filters.yearMin && !filters.yearMax) {
      params.set('year', `${filters.yearMin}+`);
    } else {
      const min = filters.yearMin || '';
      const max = filters.yearMax || '';
      params.set('year', `${min}-${max}`);
    }
  }
  
  // Metro (compact: <=600)
  if (filters.metroMax !== undefined) {
    params.set('metro', `<=${filters.metroMax}`);
  }
  
  // Signals (CSV)
  if (filters.signals?.length) {
    params.set('signals', filters.signals.join(','));
  }
  
  // Sort
  if (filters.sort && filters.sort !== 'relevance') {
    params.set('sort', filters.sort);
  }
  
  // Density
  if (filters.density && filters.density !== 'comfortable') {
    params.set('density', filters.density);
  }
  
  // Page (only if > 1)
  if (filters.page && filters.page > 1) {
    params.set('page', String(filters.page));
  }
  
  return params.toString();
}

/**
 * Get human-readable summary for a filter chip
 */
export function getFilterSummary(key: keyof FilterState, filters: FilterState): string {
  switch (key) {
    case 'areas':
      return filters.areas?.length ? `${filters.areas.length} zone` : '';
    
    case 'priceMin':
    case 'priceMax':
      const priceMin = filters.priceMin;
      const priceMax = filters.priceMax;
      if (!priceMin && !priceMax) return '';
      if (priceMin && priceMax) return `${formatPrice(priceMin)}–${formatPrice(priceMax)}`;
      if (priceMin) return `min ${formatPrice(priceMin)}`;
      return `max ${formatPrice(priceMax!)}`;
    
    case 'eurm2Min':
    case 'eurm2Max':
      const eurm2Min = filters.eurm2Min;
      const eurm2Max = filters.eurm2Max;
      if (!eurm2Min && !eurm2Max) return '';
      if (eurm2Min && eurm2Max) return `${eurm2Min}–${eurm2Max} €/m²`;
      if (eurm2Min) return `min ${eurm2Min} €/m²`;
      return `max ${eurm2Max} €/m²`;
    
    case 'm2Min':
    case 'm2Max':
      const m2Min = filters.m2Min;
      const m2Max = filters.m2Max;
      if (!m2Min && !m2Max) return '';
      if (m2Min && m2Max) return `${m2Min}–${m2Max} m²`;
      if (m2Min) return `min ${m2Min} m²`;
      return `max ${m2Max} m²`;
    
    case 'rooms':
      if (!filters.rooms?.length) return '';
      const sorted = [...filters.rooms].sort((a, b) => a - b);
      if (sorted.length === 1) return `${sorted[0]} camere`;
      return `${sorted.join(', ')} camere`;
    
    case 'yearMin':
    case 'yearMax':
      const yearMin = filters.yearMin;
      const yearMax = filters.yearMax;
      if (!yearMin && !yearMax) return '';
      if (yearMin && !yearMax) return `din ${yearMin}+`;
      if (!yearMin && yearMax) return `până în ${yearMax}`;
      return `${yearMin}–${yearMax}`;
    
    case 'metroMax':
      if (!filters.metroMax) return '';
      return `max ${filters.metroMax}m de metrou`;
    
    case 'signals':
      if (!filters.signals?.length) return '';
      return `${filters.signals.length} semnale`;
    
    case 'sort':
      if (!filters.sort || filters.sort === 'relevance') return '';
      return getSortLabel(filters.sort);
    
    default:
      return '';
  }
}

/**
 * Format price for display (k = thousands)
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return `${Math.round(price / 1000)}k`;
  }
  return String(price);
}

/**
 * Get sort option label
 */
export function getSortLabel(sort: string): string {
  const labels: Record<string, string> = {
    relevance: 'Relevanță',
    price_asc: 'Preț crescător',
    price_desc: 'Preț descrescător',
    eurm2_asc: '€/m² crescător',
    eurm2_desc: '€/m² descrescător',
    yield_desc: 'Randament',
    tts_asc: 'TTS rapid',
  };
  return labels[sort] || sort;
}

/**
 * Check if any filters are active (excluding page)
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return Boolean(
    filters.areas?.length ||
    filters.priceMin ||
    filters.priceMax ||
    filters.eurm2Min ||
    filters.eurm2Max ||
    filters.m2Min ||
    filters.m2Max ||
    filters.rooms?.length ||
    filters.yearMin ||
    filters.yearMax ||
    filters.metroMax !== undefined ||
    filters.signals?.length ||
    (filters.sort && filters.sort !== 'relevance')
  );
}

/**
 * Clear all filters (reset to empty state)
 */
export function clearAllFilters(): FilterState {
  return { page: 1 };
}

/**
 * Clear specific filter key
 */
export function clearFilter(filters: FilterState, key: keyof FilterState): FilterState {
  const newFilters = { ...filters };
  
  // Handle compound keys (price, eurm2, m2, year)
  if (key === 'priceMin' || key === 'priceMax') {
    delete newFilters.priceMin;
    delete newFilters.priceMax;
  } else if (key === 'eurm2Min' || key === 'eurm2Max') {
    delete newFilters.eurm2Min;
    delete newFilters.eurm2Max;
  } else if (key === 'm2Min' || key === 'm2Max') {
    delete newFilters.m2Min;
    delete newFilters.m2Max;
  } else if (key === 'yearMin' || key === 'yearMax') {
    delete newFilters.yearMin;
    delete newFilters.yearMax;
  } else {
    delete newFilters[key];
  }
  
  return newFilters;
}

/**
 * Update filter value (immutable)
 */
export function updateFilter<K extends keyof FilterState>(
  filters: FilterState,
  key: K,
  value: FilterState[K]
): FilterState {
  // Reset to page 1 when filters change
  return { ...filters, [key]: value, page: 1 };
}

/**
 * București area zones (hardcoded v1, TODO: fetch from API)
 */
export const BUCURESTI_AREAS = [
  { slug: 'aviației', name: 'Aviației' },
  { slug: 'baneasa', name: 'Băneasa' },
  { slug: 'berceni', name: 'Berceni' },
  { slug: 'centru-vechi', name: 'Centru Vechi' },
  { slug: 'colentina', name: 'Colentina' },
  { slug: 'crangasi', name: 'Crângași' },
  { slug: 'dorobanti', name: 'Dorobanți' },
  { slug: 'drumul-taberei', name: 'Drumul Taberei' },
  { slug: 'floreasca', name: 'Floreasca' },
  { slug: 'ghencea', name: 'Ghencea' },
  { slug: 'militari', name: 'Militari' },
  { slug: 'obor', name: 'Obor' },
  { slug: 'pantelimon', name: 'Pantelimon' },
  { slug: 'pipera', name: 'Pipera' },
  { slug: 'primaverii', name: 'Primăverii' },
  { slug: 'titan', name: 'Titan' },
  { slug: 'unirii', name: 'Unirii' },
  { slug: 'vitan', name: 'Vitan' },
];

/**
 * Price presets for quick selection (EUR)
 */
export const PRICE_PRESETS = [
  { label: '60k', value: 60000 },
  { label: '100k', value: 100000 },
  { label: '150k', value: 150000 },
  { label: '200k', value: 200000 },
  { label: '300k', value: 300000 },
];

/**
 * Year built ranges (predefined + custom)
 */
export const YEAR_RANGES = [
  { label: 'Înainte de 1990', min: undefined, max: 1989 },
  { label: '1990–2000', min: 1990, max: 2000 },
  { label: '2001–2010', min: 2001, max: 2010 },
  { label: '2011+', min: 2011, max: undefined },
];

/**
 * Metro distance options (meters)
 */
export const METRO_OPTIONS = [
  { label: 'Indiferent', value: undefined },
  { label: 'Max 300m', value: 300 },
  { label: 'Max 600m', value: 600 },
  { label: 'Max 1000m', value: 1000 },
];

/**
 * Signal definitions
 */
export const SIGNALS = [
  { key: 'underpriced' as const, label: 'Underpriced', description: 'Sub AVM' },
  { key: 'fast_tts' as const, label: 'TTS rapid', description: '< 60 zile' },
  { key: 'yield_high' as const, label: 'Randament mare', description: '> 6% net' },
  { key: 'seismic_low' as const, label: 'Risc seismic scăzut', description: 'RS3+' },
];

/**
 * Sort options
 */
export const SORT_OPTIONS = [
  { value: 'relevance' as const, label: 'Relevanță' },
  { value: 'price_asc' as const, label: 'Preț crescător' },
  { value: 'price_desc' as const, label: 'Preț descrescător' },
  { value: 'eurm2_asc' as const, label: '€/m² crescător' },
  { value: 'eurm2_desc' as const, label: '€/m² descrescător' },
  { value: 'yield_desc' as const, label: 'Randament' },
  { value: 'tts_asc' as const, label: 'TTS rapid' },
];
