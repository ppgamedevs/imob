/**
 * POI category registry.
 *
 * Single source of truth for all POI categories used in the
 * Neighborhood Intel Map. Each entry defines the label, icon,
 * Overpass tag filters, and default result limit.
 */

export type PoiCategoryKey =
  | "supermarket"
  | "transport"
  | "school"
  | "medical"
  | "restaurant"
  | "park"
  | "gym"
  | "parking";

export interface PoiCategoryDef {
  key: PoiCategoryKey;
  labelRo: string;
  icon: string;
  /** Overpass QL filter fragments (OR-combined) */
  overpassFilters: string[];
  defaultLimit: number;
  /** Color for map markers / UI accents */
  color: string;
}

export const POI_CATEGORIES: Record<PoiCategoryKey, PoiCategoryDef> = {
  supermarket: {
    key: "supermarket",
    labelRo: "Magazine",
    icon: "ShoppingCart",
    overpassFilters: [
      'node["shop"="supermarket"]',
      'way["shop"="supermarket"]',
      'relation["shop"="supermarket"]',
      'node["shop"="convenience"]',
      'way["shop"="convenience"]',
      'node["shop"="mall"]',
      'way["shop"="mall"]',
      'node["shop"="department_store"]',
      'way["shop"="department_store"]',
      'node["shop"="kiosk"]',
      'way["shop"="kiosk"]',
      'node["amenity"="pharmacy"]',
      'way["amenity"="pharmacy"]',
    ],
    defaultLimit: 30,
    color: "#10b981",
  },
  transport: {
    key: "transport",
    labelRo: "Transport",
    icon: "Train",
    overpassFilters: [
      'node["station"="subway"]',
      'node["railway"="tram_stop"]',
      'way["railway"="tram_stop"]',
      'node["highway"="bus_stop"]',
      'way["highway"="bus_stop"]',
      'node["amenity"="bus_station"]',
      'way["amenity"="bus_station"]',
    ],
    defaultLimit: 30,
    color: "#3b82f6",
  },
  school: {
    key: "school",
    labelRo: "Educatie",
    icon: "GraduationCap",
    overpassFilters: [
      'node["amenity"="school"]',
      'way["amenity"="school"]',
      'relation["amenity"="school"]',
      'node["amenity"="kindergarten"]',
      'way["amenity"="kindergarten"]',
      'relation["amenity"="kindergarten"]',
      'node["amenity"="university"]',
      'way["amenity"="university"]',
      'relation["amenity"="university"]',
    ],
    defaultLimit: 30,
    color: "#8b5cf6",
  },
  medical: {
    key: "medical",
    labelRo: "Sanatate",
    icon: "Heart",
    overpassFilters: [
      'node["amenity"="hospital"]',
      'way["amenity"="hospital"]',
      'relation["amenity"="hospital"]',
      'node["amenity"="clinic"]',
      'way["amenity"="clinic"]',
      'relation["amenity"="clinic"]',
      'node["amenity"="doctors"]',
      'node["amenity"="dentist"]',
    ],
    defaultLimit: 20,
    color: "#ef4444",
  },
  restaurant: {
    key: "restaurant",
    labelRo: "Restaurante",
    icon: "Utensils",
    overpassFilters: [
      'node["amenity"="restaurant"]',
      'node["amenity"="bar"]',
      'node["amenity"="cafe"]',
      'node["amenity"="nightclub"]',
      'node["amenity"="pub"]',
    ],
    defaultLimit: 30,
    color: "#f59e0b",
  },
  park: {
    key: "park",
    labelRo: "Parcuri",
    icon: "Trees",
    overpassFilters: [
      'node["leisure"="park"]',
      'way["leisure"="park"]',
      'relation["leisure"="park"]',
      'node["leisure"="playground"]',
      'way["leisure"="playground"]',
      'node["leisure"="garden"]',
      'way["leisure"="garden"]',
    ],
    defaultLimit: 15,
    color: "#22c55e",
  },
  gym: {
    key: "gym",
    labelRo: "Sport",
    icon: "Dumbbell",
    overpassFilters: [
      'node["leisure"="fitness_centre"]',
      'way["leisure"="fitness_centre"]',
      'node["leisure"="sports_centre"]',
      'way["leisure"="sports_centre"]',
      'node["leisure"="swimming_pool"]',
    ],
    defaultLimit: 15,
    color: "#06b6d4",
  },
  parking: {
    key: "parking",
    labelRo: "Parcare",
    icon: "ParkingCircle",
    overpassFilters: [
      'node["amenity"="parking"]',
      'way["amenity"="parking"]',
      'node["amenity"="parking_space"]',
    ],
    defaultLimit: 15,
    color: "#64748b",
  },
};

export const POI_CATEGORY_KEYS = Object.keys(POI_CATEGORIES) as PoiCategoryKey[];

export function isValidCategory(key: string): key is PoiCategoryKey {
  return key in POI_CATEGORIES;
}
