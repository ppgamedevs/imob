/**
 * Copilot: Create the Search page shell:
 * - Left: filters sidebar (Card) with price range, rooms, area m², neighborhood (Input placeholders for now)
 * - Right: results header (sort select), grid of ListingCard placeholders (skeleton)
 * - Sticky actions bar on mobile (open filters Sheet)
 * - Use shadcn/ui components and Tailwind for layout
 */
"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Mock data for demonstration
const mockListings = Array.from({ length: 6 }, (_, i) => ({
  id: `listing-${i}`,
  title: `Apartament ${i + 1}`,
  price: 85000 + i * 10000,
  area: 50 + i * 10,
  rooms: 2 + (i % 3),
  neighborhood: ["Militari", "Drumul Taberei", "Titan", "Pantelimon"][i % 4],
  priceStatus: (["fair", "overpriced", "underpriced"] as const)[i % 3],
}));

function FiltersContent() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="price-min">Preț minim (€)</Label>
        <Input id="price-min" type="number" placeholder="50.000" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price-max">Preț maxim (€)</Label>
        <Input id="price-max" type="number" placeholder="150.000" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rooms">Număr camere</Label>
        <Select>
          <SelectTrigger id="rooms">
            <SelectValue placeholder="Selectează" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 cameră</SelectItem>
            <SelectItem value="2">2 camere</SelectItem>
            <SelectItem value="3">3 camere</SelectItem>
            <SelectItem value="4">4+ camere</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="area-min">Suprafață min (m²)</Label>
        <Input id="area-min" type="number" placeholder="40" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="neighborhood">Cartier</Label>
        <Input id="neighborhood" placeholder="Ex: Militari, Titan..." />
      </div>

      <Button className="w-full">Aplică filtre</Button>
    </div>
  );
}

export default function SearchPage() {
  const [sortBy, setSortBy] = useState("relevant");

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-8">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Filtrează</CardTitle>
            </CardHeader>
            <CardContent>
              <FiltersContent />
            </CardContent>
          </Card>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {/* Results Header */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{mockListings.length}</span> rezultate
              găsite
            </p>

            <div className="flex items-center gap-2">
              <Label htmlFor="sort" className="text-sm">
                Sortează:
              </Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevant">Relevante</SelectItem>
                  <SelectItem value="price-asc">Preț crescător</SelectItem>
                  <SelectItem value="price-desc">Preț descrescător</SelectItem>
                  <SelectItem value="area-desc">Suprafață mare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {mockListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filters Button */}
      <div className="fixed bottom-4 right-4 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="shadow-lg">
              <SlidersHorizontal className="mr-2 h-5 w-5" />
              Filtre
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filtrează</SheetTitle>
            </SheetHeader>
            <div className="mt-6 overflow-y-auto pb-6">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
