/**
 * Overpass QL filter fragments (no `around:`) — expanded to node/way/relation in the query builder.
 * Each line uses the semantic radius for that OSM theme (see POI_RADIUS_M_BY_PRODUCT).
 */
import type { PoiCategoryKey } from "@/lib/geo/poiCategories";
import type { ProductPoiCategory } from "@/lib/geo/poi/constants";
import { POI_RADIUS_M_BY_PRODUCT } from "@/lib/geo/poi/constants";

const R = POI_RADIUS_M_BY_PRODUCT;

export interface CatalogLine {
  /** Single fragment; `node[` or `way[` */
  nodeQl: string;
  radiusM: number;
  product: ProductPoiCategory;
}

function L(nodeQl: string, product: ProductPoiCategory): CatalogLine {
  return { nodeQl, radiusM: R[product], product };
}

/**
 * Ordered catalog: broad capture for urban Romania.
 * Classification happens in normalize-osm-poi.ts (tag priority), not per query line.
 */
export const OSM_OVERPASS_CATALOG: CatalogLine[] = [
  // —— Shops / daily ——
  L('node["shop"]', "shops"),
  L('node["amenity"="marketplace"]', "shops"),
  L('node["amenity"="post_office"]', "shops"),
  L('node["amenity"="bank"]', "shops"),
  L('node["amenity"="atm"]', "shops"),

  // —— Food ——
  L('node["amenity"="restaurant"]', "restaurants"),
  L('node["amenity"="fast_food"]', "restaurants"),
  L('node["amenity"="cafe"]', "restaurants"),
  L('node["amenity"="bar"]', "restaurants"),
  L('node["amenity"="pub"]', "restaurants"),
  L('node["amenity"="food_court"]', "restaurants"),
  L('node["amenity"="ice_cream"]', "restaurants"),
  L('node["amenity"="nightclub"]', "restaurants"),

  // —— Education ——
  L('node["amenity"="school"]', "education"),
  L('node["amenity"="kindergarten"]', "education"),
  L('node["amenity"="university"]', "education"),
  L('node["amenity"="college"]', "education"),
  L('node["amenity"="library"]', "education"),

  // —— Healthcare (incl. pharmacy tag for fetch; intel maps pharmacy → supermarket bucket) ——
  L('node["amenity"="pharmacy"]', "healthcare"),
  L('node["amenity"="hospital"]', "healthcare"),
  L('node["amenity"="clinic"]', "healthcare"),
  L('node["amenity"="doctors"]', "healthcare"),
  L('node["amenity"="dentist"]', "healthcare"),

  // —— Transport ——
  L('node["public_transport"="platform"]', "transport"),
  L('node["public_transport"="stop_position"]', "transport"),
  L('node["highway"="bus_stop"]', "transport"),
  L('node["railway"="tram_stop"]', "transport"),
  L('node["railway"="station"]', "transport"),
  L('node["railway"="subway_entrance"]', "transport"),
  L('node["railway"="station"]["station"="subway"]', "transport"),
  L('node["amenity"="bus_station"]', "transport"),

  // —— Parks / green ——
  L('node["leisure"="park"]', "parks"),
  L('node["leisure"="garden"]', "parks"),
  L('node["leisure"="playground"]', "parks"),
  L('node["landuse"="recreation_ground"]', "parks"),

  // —— Sports ——
  L('node["leisure"="sports_centre"]', "sports"),
  L('node["leisure"="fitness_centre"]', "sports"),
  L('node["leisure"="stadium"]', "sports"),
  L('node["leisure"="pitch"]', "sports"),
  L('node["leisure"="swimming_pool"]', "sports"),
  L('node["sport"]', "sports"),

  // —— Parking ——
  L('node["amenity"="parking"]', "parking"),
  L('way["amenity"="parking"]', "parking"),
  L('way["parking"="surface"]', "parking"),
  L('way["parking"="underground"]', "parking"),
  L('way["parking"="multi-storey"]', "parking"),
];

/** Max fragments per Overpass request (avoid timeouts / 414). */
export const OVERPASS_MAX_FRAGMENTS_PER_QUERY = 52;

/** Subset of catalog for `/api/geo/pois?category=` single-layer fetches. */
export function catalogLinesForIntelCategory(key: PoiCategoryKey): CatalogLine[] {
  if (key === "supermarket") {
    return OSM_OVERPASS_CATALOG.filter(
      (l) => l.product === "shops" || l.nodeQl.includes("pharmacy"),
    );
  }
  if (key === "transport") {
    return OSM_OVERPASS_CATALOG.filter((l) => l.product === "transport");
  }
  if (key === "school") {
    return OSM_OVERPASS_CATALOG.filter((l) => l.product === "education");
  }
  if (key === "medical") {
    return OSM_OVERPASS_CATALOG.filter(
      (l) => l.product === "healthcare" && !l.nodeQl.includes("pharmacy"),
    );
  }
  if (key === "restaurant") {
    return OSM_OVERPASS_CATALOG.filter((l) => l.product === "restaurants");
  }
  if (key === "park") {
    return OSM_OVERPASS_CATALOG.filter((l) => l.product === "parks");
  }
  if (key === "gym") {
    return OSM_OVERPASS_CATALOG.filter((l) => l.product === "sports");
  }
  if (key === "parking") {
    return OSM_OVERPASS_CATALOG.filter((l) => l.product === "parking");
  }
  return [];
}

/**
 * Expand a node-only fragment to node + way + relation where applicable.
 * Lines that already target `way[` are left as-is (no triple expansion).
 */
export function expandNwr(nodeQl: string): string[] {
  if (nodeQl.startsWith("way[")) {
    return [nodeQl];
  }
  if (!nodeQl.startsWith("node[")) {
    return [nodeQl];
  }
  const wayQl = nodeQl.replace(/^node\[/, "way[");
  const relQl = nodeQl.replace(/^node\[/, "relation[");
  return [nodeQl, wayQl, relQl];
}
