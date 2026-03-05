import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";

import DiscoverClient from "./DiscoverClient";
import FiltersBar from "./FiltersBar";

export const metadata: Metadata = {
  title: "Descopera proprietati in Bucuresti - ImobIntel",
  description:
    "Cauta si compara proprietati cu filtre avansate. Harta interactiva, estimari AVM, TTS, randamente. Date actualizate zilnic.",
  openGraph: {
    title: "Descopera proprietati in Bucuresti",
    description: "Filtrare avansata si harta interactiva cu date in timp real.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Descopera proprietati in Bucuresti",
    description: "Filtrare avansata si harta interactiva cu date in timp real.",
  },
  alternates: { canonical: "/discover" },
};

export default async function DiscoverPage() {
  // TODO: Read initial query params for SEO-friendly SSR
  // const searchParams = await useSearchParams();
  // const initialFilters = parseFilters(searchParams);
  // const initialItems = await fetchListings(initialFilters);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <Container className="py-6">
        <h1 className="text-2xl font-bold mb-1">Descoperă proprietăți</h1>
        <p className="text-sm text-muted">
          Caută în {/* TODO: dynamic count */} proprietăți analizate din București
        </p>
      </Container>

      {/* Filters Bar */}
      <FiltersBar />

      {/* List + Map */}
      <div className="mt-4">
        <DiscoverClient />
      </div>
    </main>
  );
}
