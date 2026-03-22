import type { PoiProviderResult, PoiQueryInput } from "@/lib/geo/poi/types";

/**
 * Extensible POI provider (OSM, Google Places, Foursquare, …).
 * Paid providers: wire implementations later; OSM is default.
 */
export interface PoiProvider {
  readonly id: string;
  getNearbyPois(input: PoiQueryInput): Promise<PoiProviderResult>;
}
