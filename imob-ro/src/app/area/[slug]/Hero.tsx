"use client";

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Save, Share2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AreaKpis, AreaSeries } from '@/lib/areas/dto';
import {
  generateSparklinePath,
  calculateTrend,
  formatNumber,
  formatChange,
} from '@/lib/areas/series';

export interface HeroProps {
  kpis: AreaKpis;
  series: AreaSeries[];
}

export default function Hero({ kpis, series }: HeroProps) {
  const trend = calculateTrend(series, 'eurM2');
  const sparklinePath = generateSparklinePath(series.slice(-90), 'eurM2', 200, 40);

  const handleSave = () => {
    // TODO: Implement save to user's saved areas
    console.log('[Area] Save area:', kpis.slug);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/area/${kpis.slug}`;
    const text = `${kpis.name} — Preț median ${formatNumber(kpis.medianEurM2)} €/m²`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copiat în clipboard!');
    }
  };

  const discoverUrl = `/discover?areas=${kpis.slug}`;

  return (
    <div className="bg-gradient-to-b from-surface/50 to-bg border-b border-border">
      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted mb-4" aria-label="Breadcrumb">
          <Link href="/area" className="hover:text-fg transition-colors">
            {kpis.city}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-fg font-medium">{kpis.name}</span>
        </nav>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
          {/* Left: Title + KPIs */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-fg mb-6">{kpis.name}</h1>

            {/* Inline KPIs */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {/* Median Price */}
              <div>
                <div className="text-sm text-muted mb-1">Preț median</div>
                <div className="text-2xl font-bold text-fg">
                  {formatNumber(kpis.medianEurM2)} €/m²
                </div>
                <div
                  className={cn(
                    'text-sm font-medium mt-1',
                    kpis.medianEurM2Change30d > 0
                      ? 'text-green-600 dark:text-green-400'
                      : kpis.medianEurM2Change30d < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted'
                  )}
                >
                  {formatChange(kpis.medianEurM2Change30d)} în 30 zile
                </div>
              </div>

              {/* Listings Now */}
              <div>
                <div className="text-sm text-muted mb-1">Anunțuri active</div>
                <div className="text-2xl font-bold text-fg">{kpis.listingsNow}</div>
              </div>

              {/* Rent (if available) */}
              {kpis.medianRentEurM2 && (
                <div>
                  <div className="text-sm text-muted mb-1">Chirie medie</div>
                  <div className="text-2xl font-bold text-fg">
                    {formatNumber(kpis.medianRentEurM2)} €/m²
                  </div>
                </div>
              )}

              {/* Yield (if available) */}
              {kpis.yieldNet && (
                <div>
                  <div className="text-sm text-muted mb-1">Randament net</div>
                  <div className="text-2xl font-bold text-fg">
                    {(kpis.yieldNet * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Button asChild className="gap-2">
                <Link href={discoverUrl}>
                  <Search className="h-4 w-4" />
                  Descoperă în {kpis.name}
                </Link>
              </Button>
              <Button variant="outline" onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Salvează zona
              </Button>
              <Button variant="ghost" onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                Distribuie
              </Button>
            </div>
          </div>

          {/* Right: Sparkline */}
          <div className="lg:w-[240px]">
            <div className="p-4 rounded-lg border border-border bg-surface">
              <div className="text-xs text-muted mb-2">Evoluție €/m² (90 zile)</div>
              <svg
                viewBox="0 0 200 40"
                className="w-full h-10"
                preserveAspectRatio="none"
                aria-label={`Sparkline showing ${trend} trend`}
              >
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke={
                    trend === 'up'
                      ? 'currentColor'
                      : trend === 'down'
                      ? 'currentColor'
                      : 'currentColor'
                  }
                  strokeWidth="2"
                  className={cn(
                    trend === 'up'
                      ? 'text-green-500'
                      : trend === 'down'
                      ? 'text-red-500'
                      : 'text-muted'
                  )}
                />
              </svg>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted">Trend:</span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend === 'up'
                      ? 'text-green-600 dark:text-green-400'
                      : trend === 'down'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted'
                  )}
                >
                  {trend === 'up' ? '↗ Creștere' : trend === 'down' ? '↘ Scădere' : '→ Stabil'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
