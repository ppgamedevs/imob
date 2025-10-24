import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import FiltersBar from "./FiltersBar";
import DiscoverClient from "./DiscoverClient";

export const metadata: Metadata = {
  title: "Descoperă proprietăți în București – imob.ro",
  description:
    "Caută și compară proprietăți cu filtre avansate. Hartă interactivă, estimări AVM, TTS, randamente.",
  openGraph: {
    title: "Descoperă proprietăți în București",
    description: "Filtrare avansată + hartă interactivă cu date în timp real",
  },
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
