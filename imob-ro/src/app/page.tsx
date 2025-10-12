/**
 * Copilot: Build a modern hero for a real-estate marketplace:
 * - Headline: "Caută, compară și vinde în București"
 * - Sub: "Preț estimat, timp până la vânzare, zone pe înțelesul tău."
 * - Search bar (fake for now) with Input + Button -> navigate to /search
 * - 3 Feature cards (Card) with icons: "Preț estimat", "Se vinde în ~X zile", "Area Interest"
 * - Responsive grid, nice spacing, minimal animation on hover
 */
"use client";

import { Clock, MapPin, Search, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const features = [
  {
    icon: TrendingUp,
    title: "Preț estimat",
    description: "Află prețul real de piață pentru orice proprietate din București.",
  },
  {
    icon: Clock,
    title: "Se vinde în ~X zile",
    description: "Estimăm timpul necesar pentru vânzarea proprietății tale.",
  },
  {
    icon: MapPin,
    title: "Area Interest",
    description: "Descoperă zonele cu cel mai mare potențial de investiție.",
  },
];

export default function Home() {
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/search");
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section - Mobile First */}
      <section className="bg-gradient-to-b from-background to-muted/20 px-4 py-12 md:py-20 lg:py-32">
        <div className="container mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Caută, compară și vinde în București
            </h1>
            <p className="mb-6 text-base text-muted-foreground sm:mb-8 sm:text-lg md:text-xl">
              Preț estimat, timp până la vânzare, zone pe înțelesul tău.
            </p>

            {/* Search Bar - Mobile Optimized */}
            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:h-5 sm:w-5" />
                  <Input
                    type="text"
                    placeholder="Caută după adresă, zonă sau cod poștal..."
                    className="h-12 pl-10 text-base sm:h-auto"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 sm:h-auto">
                  Caută
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section - Mobile First */}
      <section className="px-4 py-12 md:py-16 lg:py-20">
        <div className="container mx-auto max-w-7xl">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3 md:gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="transition-shadow hover:shadow-lg md:hover:scale-105"
                >
                  <CardHeader className="pb-3">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 sm:h-12 sm:w-12">
                      <Icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm sm:text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
