import type { Metadata } from "next";

import { ImportClient } from "./ui/ImportClient";

export const metadata: Metadata = { title: "Import anunțuri – ImobIntel" };

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Import anunțuri</h1>
      <ImportClient />
    </div>
  );
}
