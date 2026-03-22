/**
 * Maps raw OSM tags → NormalizedPoi (product categories).
 * Priority order matters when multiple themes could apply.
 */
import { haversineM } from "@/lib/geo";
import type { ProductPoiCategory } from "@/lib/geo/poi/constants";
import type { NormalizedPoi } from "@/lib/geo/poi/types";

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function normName(tags: Record<string, string>): string | undefined {
  const n = tags.name ?? tags["name:ro"];
  return n?.trim() || undefined;
}

/**
 * Classify OSM tags into product category + scoring subcategory (amenity/shop/leisure/…).
 */
export function classifyOsmTags(tags: Record<string, string>): {
  category: ProductPoiCategory;
  subcategory: string;
} | null {
  const a = tags.amenity ?? "";
  const railway = tags.railway ?? "";
  const highway = tags.highway ?? "";
  const pt = tags.public_transport ?? "";
  const leisure = tags.leisure ?? "";
  const landuse = tags.landuse ?? "";
  const shop = tags.shop ?? "";
  const parking = tags.parking ?? "";
  const station = tags.station ?? "";

  // —— Transport (first) ——
  if (railway === "subway_entrance") {
    return { category: "transport", subcategory: "subway" };
  }
  if (railway === "station" && station === "subway") {
    return { category: "transport", subcategory: "subway" };
  }
  if (highway === "bus_stop") {
    return { category: "transport", subcategory: "bus_stop" };
  }
  if (railway === "tram_stop") {
    return { category: "transport", subcategory: "tram_stop" };
  }
  if (a === "bus_station") {
    return { category: "transport", subcategory: "bus_station" };
  }
  if (pt === "platform" || pt === "stop_position") {
    return { category: "transport", subcategory: pt };
  }
  if (railway === "station" || railway === "halt") {
    return { category: "transport", subcategory: "station" };
  }

  // —— Parking ——
  if (a === "parking" || parking) {
    return { category: "parking", subcategory: parking || a || "parking" };
  }

  // —— Healthcare ——
  if (a === "pharmacy") {
    return { category: "healthcare", subcategory: "pharmacy" };
  }
  if (a === "hospital" || a === "clinic" || a === "doctors" || a === "dentist") {
    return { category: "healthcare", subcategory: a };
  }

  // —— Education ——
  if (
    a === "school" ||
    a === "kindergarten" ||
    a === "university" ||
    a === "college" ||
    a === "library"
  ) {
    return { category: "education", subcategory: a };
  }

  // —— Food ——
  if (
    a === "restaurant" ||
    a === "fast_food" ||
    a === "cafe" ||
    a === "bar" ||
    a === "pub" ||
    a === "food_court" ||
    a === "ice_cream" ||
    a === "nightclub"
  ) {
    return { category: "restaurants", subcategory: a };
  }

  // —— Parks ——
  if (leisure === "park" || leisure === "garden" || leisure === "playground") {
    return { category: "parks", subcategory: leisure };
  }
  if (landuse === "recreation_ground") {
    return { category: "parks", subcategory: "recreation_ground" };
  }

  // —— Sports ——
  if (
    leisure === "sports_centre" ||
    leisure === "fitness_centre" ||
    leisure === "stadium" ||
    leisure === "pitch" ||
    leisure === "swimming_pool"
  ) {
    return { category: "sports", subcategory: leisure };
  }
  if (tags.sport) {
    return { category: "sports", subcategory: tags.sport };
  }

  // —— Shops / daily ——
  if (shop) {
    return { category: "shops", subcategory: shop };
  }
  if (a === "marketplace" || a === "post_office" || a === "bank" || a === "atm") {
    return { category: "shops", subcategory: a };
  }

  return null;
}

export function osmElementToNormalizedPoi(
  el: OsmElement,
  centerLat: number,
  centerLng: number,
): NormalizedPoi | null {
  const elLat = el.lat ?? el.center?.lat;
  const elLng = el.lon ?? el.center?.lon;
  if (elLat == null || elLng == null) return null;

  const tags = el.tags ?? {};
  const cls = classifyOsmTags(tags);
  if (!cls) return null;

  const dist = haversineM(centerLat, centerLng, elLat, elLng);
  return {
    id: `osm:${el.type}/${el.id}`,
    source: "osm",
    category: cls.category,
    subcategory: cls.subcategory,
    name: normName(tags),
    lat: elLat,
    lng: elLng,
    distanceM: Math.round(dist),
    rawTags: tags,
  };
}
