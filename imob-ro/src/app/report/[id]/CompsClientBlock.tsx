"use client";
import { useState } from "react";

import type { CompItem } from "./CompsCarousel";
import { CompsCarousel } from "./CompsCarousel";
import { CompsMap } from "./CompsMap";

export default function CompsClientBlock({
  comps,
  center,
}: {
  comps: CompItem[];
  center?: { lat?: number | null; lng?: number | null };
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  return (
    <div>
      <CompsCarousel items={comps} onHover={setHoverId} />
      <div className="mt-3">
        <CompsMap
          items={comps.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng }))}
          center={center}
          hoverId={hoverId}
        />
      </div>
    </div>
  );
}
