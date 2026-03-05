"use client";

import dynamic from "next/dynamic";

const NeighborhoodIntelV2 = dynamic(
  () => import("@/components/geo/NeighborhoodIntelV2"),
  { ssr: false },
);

export default function NeighborhoodIntelV2Lazy(props: {
  lat: number;
  lng: number;
  initialRadiusM?: number;
  mode?: "report" | "standalone";
}) {
  return <NeighborhoodIntelV2 {...props} />;
}
