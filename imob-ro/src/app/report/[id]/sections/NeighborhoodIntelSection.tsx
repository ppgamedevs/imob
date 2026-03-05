import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { NearbyPOI, VibeScores } from "@/lib/geo/vibe";

// ---- Types ----

interface Props {
  scores: VibeScores | null;
  topNearby: Record<string, NearbyPOI[]> | null;
  totalPOIs: number;
}

// ---- Score display config ----

const DIMENSIONS: {
  key: keyof Pick<VibeScores, "nightlifeScore" | "familyScore" | "convenienceScore" | "greenScore">;
  label: string;
  icon: string;
  low: string;
  high: string;
  color: string;
  bgActive: string;
}[] = [
  {
    key: "nightlifeScore",
    label: "Viata de noapte",
    icon: "🍷",
    low: "Putine optiuni de dining/baruri in zona",
    high: "Zona activa cu baruri si restaurante",
    color: "text-purple-700",
    bgActive: "bg-purple-500",
  },
  {
    key: "familyScore",
    label: "Familie",
    icon: "👨‍👩‍👧‍👦",
    low: "Putine facilitati pentru familii",
    high: "Ideala pentru familii cu copii",
    color: "text-blue-700",
    bgActive: "bg-blue-500",
  },
  {
    key: "convenienceScore",
    label: "Comoditate",
    icon: "🛒",
    low: "Acces limitat la magazine si servicii",
    high: "Tot ce ai nevoie, la indemana",
    color: "text-emerald-700",
    bgActive: "bg-emerald-500",
  },
  {
    key: "greenScore",
    label: "Spatii verzi",
    icon: "🌳",
    low: "Putine parcuri in proximitate",
    high: "Zona verde, cu parcuri accesibile",
    color: "text-green-700",
    bgActive: "bg-green-500",
  },
];

const ZONE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  nightlife: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  residential: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  mixed: { bg: "bg-gray-50", text: "text-gray-800", border: "border-gray-200" },
  green: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" },
  limited: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
  BAR: "Bar",
  RESTAURANT: "Restaurant",
  NIGHTCLUB: "Club",
  PARK: "Parc",
  SCHOOL: "Scoala",
  KINDERGARTEN: "Gradinita",
  PLAYGROUND: "Loc de joaca",
  SUPERMARKET: "Supermarket",
  PHARMACY: "Farmacie",
  GYM: "Sala de sport",
};

const GROUP_CONFIG: {
  key: string;
  label: string;
  icon: string;
}[] = [
  { key: "nightlife", label: "Baruri / Restaurante", icon: "🍽️" },
  { key: "family", label: "Familie / Educatie", icon: "🎓" },
  { key: "convenience", label: "Magazine / Servicii", icon: "🏪" },
  { key: "green", label: "Parcuri / Spatii verzi", icon: "🌿" },
];

// ---- Helpers ----

function formatDist(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excelent";
  if (score >= 60) return "Bun";
  if (score >= 40) return "Acceptabil";
  if (score >= 20) return "Slab";
  return "Foarte slab";
}

// ---- Component ----

export default function NeighborhoodIntelSection({ scores, topNearby, totalPOIs }: Props) {
  if (!scores) return null;

  const zoneStyle = ZONE_STYLES[scores.zoneTypeKey] ?? ZONE_STYLES.mixed;
  const overallAvg = Math.round(
    (scores.nightlifeScore + scores.familyScore + scores.convenienceScore + scores.greenScore) / 4,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Inteligenta de cartier</CardTitle>
          <div className="flex items-center gap-2">
            {totalPOIs > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {totalPOIs} POI in 800m
              </span>
            )}
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                overallAvg >= 60
                  ? "bg-emerald-100 text-emerald-800"
                  : overallAvg >= 35
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {overallAvg}/100
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Zone type badge */}
        <div className={`rounded-lg border p-3 ${zoneStyle.bg} ${zoneStyle.border}`}>
          <div className={`font-semibold text-sm ${zoneStyle.text}`}>
            {scores.zoneType}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {scores.zoneTypeKey === "nightlife" &&
              "Zona cu multe optiuni de dining si divertisment. Ideala pentru tineri profesionisti."}
            {scores.zoneTypeKey === "residential" &&
              "Zona linistita, cu facilitati educationale si spatii verzi. Ideala pentru familii."}
            {scores.zoneTypeKey === "green" &&
              "Zona cu acces generos la parcuri si spatii de recreere."}
            {scores.zoneTypeKey === "mixed" &&
              "Zona echilibrata, cu un mix de facilitati pentru diverse stiluri de viata."}
            {scores.zoneTypeKey === "limited" &&
              "Zona cu facilitati limitate in proximitate. Deplasarea cu masina poate fi necesara."}
          </p>
        </div>

        {/* Score bars */}
        <div className="space-y-3">
          {DIMENSIONS.map((dim) => {
            const score = scores[dim.key];
            const explanation = score >= 50 ? dim.high : dim.low;
            return (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <span>{dim.icon}</span>
                    <span>{dim.label}</span>
                  </span>
                  <span className={`text-xs font-semibold ${dim.color}`}>
                    {score} - {scoreLabel(score)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dim.bgActive}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {explanation}
                </p>
              </div>
            );
          })}
        </div>

        {/* Top nearby POIs */}
        {topNearby && (
          <div className="border-t pt-4">
            <div className="text-xs font-medium text-muted-foreground mb-3">
              Top locatii din zona
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GROUP_CONFIG.map((group) => {
                const items = topNearby[group.key];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group.key}>
                    <div className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                      <span>{group.icon}</span>
                      <span>{group.label}</span>
                      <span className="text-muted-foreground font-normal">({items.length})</span>
                    </div>
                    <ul className="space-y-0.5">
                      {items.slice(0, 3).map((poi) => (
                        <li
                          key={poi.id}
                          className="text-xs text-muted-foreground flex items-center gap-1.5"
                        >
                          <span
                            className={`font-medium ${
                              poi.distanceM <= 300 ? "text-emerald-600" : "text-gray-500"
                            }`}
                          >
                            {formatDist(poi.distanceM)}
                          </span>
                          <span className="truncate">
                            {poi.name || CATEGORY_LABELS[poi.category] || poi.category}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Scorurile sunt calculate pe baza punctelor de interes (POI) din OpenStreetMap in raza de 300m si 800m. Distantele sunt in linie dreapta.
        </p>
      </CardContent>
    </Card>
  );
}
