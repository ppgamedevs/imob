/**
 * POI categories for Neighborhood Intel map + scoring (UI labels, colors, limits).
 *
 * Overpass tag sets live in `src/lib/geo/poi/overpass-lines.ts` (broad OSM capture).
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
  defaultLimit: number;
  color: string;
}

export const POI_CATEGORIES: Record<PoiCategoryKey, PoiCategoryDef> = {
  supermarket: {
    key: "supermarket",
    labelRo: "Magazine",
    icon: "ShoppingCart",
    defaultLimit: 40,
    color: "#10b981",
  },
  transport: {
    key: "transport",
    labelRo: "Transport",
    icon: "Train",
    defaultLimit: 40,
    color: "#3b82f6",
  },
  school: {
    key: "school",
    labelRo: "Educatie",
    icon: "GraduationCap",
    defaultLimit: 35,
    color: "#8b5cf6",
  },
  medical: {
    key: "medical",
    labelRo: "Sanatate",
    icon: "Heart",
    defaultLimit: 25,
    color: "#ef4444",
  },
  restaurant: {
    key: "restaurant",
    labelRo: "Restaurante",
    icon: "Utensils",
    defaultLimit: 40,
    color: "#f59e0b",
  },
  park: {
    key: "park",
    labelRo: "Parcuri",
    icon: "Trees",
    defaultLimit: 20,
    color: "#22c55e",
  },
  gym: {
    key: "gym",
    labelRo: "Sport",
    icon: "Dumbbell",
    defaultLimit: 20,
    color: "#06b6d4",
  },
  parking: {
    key: "parking",
    labelRo: "Parcare",
    icon: "ParkingCircle",
    defaultLimit: 20,
    color: "#64748b",
  },
};

export const POI_CATEGORY_KEYS = Object.keys(POI_CATEGORIES) as PoiCategoryKey[];

export function isValidCategory(key: string): key is PoiCategoryKey {
  return key in POI_CATEGORIES;
}
