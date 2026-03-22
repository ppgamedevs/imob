/**
 * Placeholder for a future Foursquare (or similar) provider.
 * Implements {@link PoiProvider}; returns empty until API keys + mapping are wired.
 */
import type { PoiProvider } from "@/lib/geo/poi/providers/types";
import { evaluatePoiDataQuality } from "@/lib/geo/poi/evaluate-poi-quality";
import type { PoiProviderResult, PoiQueryInput } from "@/lib/geo/poi/types";

export class FoursquarePoiProviderStub implements PoiProvider {
  readonly id = "foursquare";

  async getNearbyPois(input: PoiQueryInput): Promise<PoiProviderResult> {
    const empty: PoiProviderResult["normalized"] = [];
    return {
      normalized: empty,
      rawElementCount: 0,
      dedupedCount: 0,
      quality: evaluatePoiDataQuality({ pois: empty, lat: input.lat, lng: input.lng }),
      queriesExecuted: 0,
    };
  }
}
