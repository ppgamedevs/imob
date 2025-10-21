import type { Metadata } from "next";

import { DiscoverClient } from "./ui/DiscoverClient";

export const metadata: Metadata = {
  title: "Caută proprietăți în București – ImobIntel",
  description: "Filtrează listările analizate: preț, m², camere, an, distanță la metrou.",
};

export default function DiscoverPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <h1 className="text-xl font-semibold">Caută în București</h1>
      <p className="text-sm text-muted-foreground">Rezultate din analizele recente (BETA)</p>
      <div className="mt-4 space-y-3">
        <DiscoverClient />
      </div>
    </div>
  );
}
