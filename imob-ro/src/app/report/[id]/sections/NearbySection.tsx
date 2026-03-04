"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface POI {
  name: string;
  type: string;
  distM: number;
}

interface NearbyData {
  metro: POI[];
  schools: POI[];
  kindergartens: POI[];
  parks: POI[];
  supermarkets: POI[];
  hospitals: POI[];
  landmarks: POI[];
  restaurants: POI[];
  pharmacies: POI[];
}

interface Props {
  lat: number;
  lng: number;
  distMetroM?: number | null;
  nearestMetro?: string | null;
  hasParking?: boolean | null;
}

const CATEGORY_CONFIG: {
  key: keyof NearbyData;
  label: string;
  icon: string;
  goodIfClose: boolean;
  thresholdM: number;
}[] = [
  { key: "metro", label: "Metrou", icon: "🚇", goodIfClose: true, thresholdM: 800 },
  { key: "schools", label: "Scoli / Licee", icon: "🎓", goodIfClose: true, thresholdM: 1000 },
  { key: "kindergartens", label: "Gradinite", icon: "👶", goodIfClose: true, thresholdM: 800 },
  { key: "parks", label: "Parcuri", icon: "🌳", goodIfClose: true, thresholdM: 600 },
  { key: "supermarkets", label: "Supermarketuri", icon: "🛒", goodIfClose: true, thresholdM: 500 },
  { key: "hospitals", label: "Spitale / Clinici", icon: "🏥", goodIfClose: true, thresholdM: 2000 },
  { key: "restaurants", label: "Restaurante / Baruri", icon: "🍽️", goodIfClose: true, thresholdM: 500 },
  { key: "pharmacies", label: "Farmacii", icon: "💊", goodIfClose: true, thresholdM: 500 },
  { key: "landmarks", label: "Obiective", icon: "📍", goodIfClose: true, thresholdM: 1500 },
];

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function deriveZoneCharacter(data: NearbyData): string[] {
  const tags: string[] = [];

  if (data.restaurants.length >= 5) {
    tags.push("Zona cu restaurante si baruri");
  }

  const totalPOI = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  const hasSchools = data.schools.length > 0 || data.kindergartens.length > 0;
  const hasSupermarkets = data.supermarkets.length > 0;
  const hasParks = data.parks.length > 0;

  if (hasSchools && hasSupermarkets && hasParks && totalPOI > 8) {
    tags.push("Zona rezidentiala completa");
  } else if (totalPOI < 4) {
    tags.push("Zona cu facilitati limitate");
  }

  if (data.parks.length >= 2 && data.parks[0].distM < 500) {
    tags.push("Zona verde");
  }

  if (data.metro.length > 0 && data.metro[0].distM < 500 && data.restaurants.length >= 3) {
    tags.push("Zona centrala / activa");
  }

  return tags;
}

export default function NearbySection({ lat, lng, distMetroM, nearestMetro, hasParking }: Props) {
  const [data, setData] = useState<NearbyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lng) return;
    fetchNearby(lat, lng).then(setData).finally(() => setLoading(false));
  }, [lat, lng]);

  const benefits: string[] = [];
  const downsides: string[] = [];

  if (hasParking === true) benefits.push("Loc de parcare inclus");
  if (hasParking === false) downsides.push("Fara loc de parcare menționat");

  if (distMetroM != null && distMetroM < 500) {
    benefits.push(`Foarte aproape de metrou${nearestMetro ? ` (${nearestMetro})` : ""} - ${formatDist(distMetroM)}`);
  } else if (distMetroM != null && distMetroM < 1000) {
    benefits.push(`Metrou la distanta de mers pe jos${nearestMetro ? ` (${nearestMetro})` : ""} - ${formatDist(distMetroM)}`);
  } else if (distMetroM != null && distMetroM > 2000) {
    downsides.push(`Departe de metrou - ${formatDist(distMetroM)}`);
  }

  if (data) {
    if (data.parks.length > 0 && data.parks[0].distM < 500) benefits.push(`Parc aproape: ${data.parks[0].name} (${formatDist(data.parks[0].distM)})`);
    if (data.schools.length > 0 && data.schools[0].distM < 800) benefits.push(`Scoala aproape: ${data.schools[0].name} (${formatDist(data.schools[0].distM)})`);
    if (data.kindergartens.length > 0 && data.kindergartens[0].distM < 600) benefits.push(`Gradinita aproape: ${data.kindergartens[0].name} (${formatDist(data.kindergartens[0].distM)})`);
    if (data.supermarkets.length > 0 && data.supermarkets[0].distM < 400) benefits.push(`Supermarket la ${formatDist(data.supermarkets[0].distM)}: ${data.supermarkets[0].name}`);
    if (data.restaurants.length >= 3) benefits.push(`${data.restaurants.length} restaurante/baruri in apropiere`);
    if (data.pharmacies.length > 0 && data.pharmacies[0].distM < 500) benefits.push(`Farmacie la ${formatDist(data.pharmacies[0].distM)}`);
    if (data.hospitals.length === 0) downsides.push("Niciun spital/clinica in raza de 1.5 km");
    if (data.parks.length === 0) downsides.push("Niciun parc in raza de 1.5 km");
    if (data.supermarkets.length === 0) downsides.push("Niciun supermarket in raza de 1.5 km");
    if (data.pharmacies.length === 0) downsides.push("Nicio farmacie in raza de 1.5 km");
  }

  const zoneTags = data ? deriveZoneCharacter(data) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Zona si vecinatati</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone character tags */}
        {zoneTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {zoneTags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Parking highlight */}
        {hasParking != null && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${hasParking ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            <span className="text-base">{hasParking ? "🅿️" : "⚠️"}</span>
            <span className="font-medium">{hasParking ? "Loc de parcare inclus" : "Fara loc de parcare mentionat"}</span>
          </div>
        )}

        {/* POI categories */}
        {loading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-400 animate-pulse" />
            Se incarca informatii despre zona...
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORY_CONFIG.map((cat) => {
              const items = data[cat.key];
              if (items.length === 0) return null;
              return (
                <div key={cat.key} className="text-sm">
                  <div className="font-medium flex items-center gap-1.5 mb-1">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <ul className="space-y-0.5 pl-6">
                    {items.slice(0, 3).map((poi, i) => (
                      <li key={i} className="text-muted-foreground flex items-center gap-1.5">
                        <span className={`font-medium ${poi.distM < cat.thresholdM ? "text-emerald-600" : "text-gray-500"}`}>
                          {formatDist(poi.distM)}
                        </span>
                        <span className="truncate">{poi.name || poi.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Benefits & Downsides */}
        {(benefits.length > 0 || downsides.length > 0) && (
          <div className="border-t pt-3 space-y-3">
            {benefits.length > 0 && (
              <div>
                <div className="text-sm font-medium text-emerald-700 mb-1">Avantaje zona</div>
                <ul className="space-y-0.5">
                  {benefits.map((b, i) => (
                    <li key={i} className="text-sm flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {downsides.length > 0 && (
              <div>
                <div className="text-sm font-medium text-amber-700 mb-1">De luat in considerare</div>
                <ul className="space-y-0.5">
                  {downsides.map((d, i) => (
                    <li key={i} className="text-sm flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5 shrink-0">-</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Date bazate pe OpenStreetMap. Distantele sunt in linie dreapta.
        </p>
      </CardContent>
    </Card>
  );
}

async function fetchNearby(lat: number, lng: number): Promise<NearbyData> {
  const radius = 1500;
  const query = `
[out:json][timeout:10];
(
  node["station"="subway"](around:${radius},${lat},${lng});
  node["amenity"="school"](around:${radius},${lat},${lng});
  way["amenity"="school"](around:${radius},${lat},${lng});
  node["amenity"="kindergarten"](around:${radius},${lat},${lng});
  way["amenity"="kindergarten"](around:${radius},${lat},${lng});
  node["leisure"="park"](around:${radius},${lat},${lng});
  way["leisure"="park"](around:${radius},${lat},${lng});
  node["shop"="supermarket"](around:${radius},${lat},${lng});
  way["shop"="supermarket"](around:${radius},${lat},${lng});
  node["amenity"="hospital"](around:${radius},${lat},${lng});
  way["amenity"="hospital"](around:${radius},${lat},${lng});
  node["amenity"="clinic"](around:${radius},${lat},${lng});
  node["amenity"="pharmacy"](around:${radius},${lat},${lng});
  node["amenity"="restaurant"](around:${radius},${lat},${lng});
  node["amenity"="bar"](around:${radius},${lat},${lng});
  node["amenity"="cafe"](around:${radius},${lat},${lng});
  node["tourism"~"museum|attraction|gallery"](around:${radius},${lat},${lng});
  way["tourism"~"museum|attraction|gallery"](around:${radius},${lat},${lng});
);
out center tags;
`;

  const result: NearbyData = {
    metro: [], schools: [], kindergartens: [],
    parks: [], supermarkets: [], hospitals: [],
    landmarks: [], restaurants: [], pharmacies: [],
  };

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) return result;
    const json = await res.json();

    for (const el of json.elements ?? []) {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (!elLat || !elLng) continue;

      const tags = el.tags ?? {};
      const name = tags.name ?? tags["name:ro"] ?? "";
      const dist = haversine(lat, lng, elLat, elLng);

      if (tags.station === "subway" || tags.railway === "station") {
        result.metro.push({ name, type: "Metrou", distM: dist });
      } else if (tags.amenity === "school") {
        result.schools.push({ name, type: "Scoala", distM: dist });
      } else if (tags.amenity === "kindergarten") {
        result.kindergartens.push({ name, type: "Gradinita", distM: dist });
      } else if (tags.leisure === "park") {
        result.parks.push({ name, type: "Parc", distM: dist });
      } else if (tags.shop === "supermarket") {
        result.supermarkets.push({ name, type: "Supermarket", distM: dist });
      } else if (tags.amenity === "hospital" || tags.amenity === "clinic") {
        result.hospitals.push({ name, type: "Spital", distM: dist });
      } else if (tags.amenity === "pharmacy") {
        result.pharmacies.push({ name, type: "Farmacie", distM: dist });
      } else if (tags.amenity === "restaurant" || tags.amenity === "bar" || tags.amenity === "cafe") {
        const typeName = tags.amenity === "bar" ? "Bar" : tags.amenity === "cafe" ? "Cafenea" : "Restaurant";
        result.restaurants.push({ name, type: typeName, distM: dist });
      } else if (tags.tourism) {
        result.landmarks.push({ name, type: tags.tourism, distM: dist });
      }
    }

    for (const key of Object.keys(result) as (keyof NearbyData)[]) {
      result[key].sort((a, b) => a.distM - b.distM);
    }
  } catch {
    // Overpass API might be slow/down
  }

  return result;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
