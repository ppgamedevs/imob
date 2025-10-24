import * as React from "react";
import { Container } from "@/components/layout/Container";
import { Surface } from "@/components/ui/Surface";
import { SponsoredLabel } from "@/components/ui/SponsoredLabel";
import { AdSlot } from "@/components/ads/AdSlot";
import { SponsoredCard } from "@/components/ads/SponsoredCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * UI Showcase - Visual QA for design system primitives
 *
 * Access: /ui (development only - can be removed in production)
 *
 * Displays all core components for quick visual testing:
 * - Design tokens (colors, shadows, spacing)
 * - Surface elevations
 * - Sponsored labels
 * - Ad slots with all sizes
 * - Sponsored cards
 * - Focus states
 */

export default function UIShowcasePage() {
  const sampleListing = {
    id: "sample-1",
    title: "Apartament 3 camere, Pipera",
    price: 185000,
    area: 85,
    rooms: 3,
    neighborhood: "Pipera",
    image: "/placeholder.jpg",
    url: "https://example.com",
    sponsorId: "sponsor-1",
  };

  return (
    <div className="min-h-screen bg-bg py-12">
      <Container>
        <div className="space-y-16">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold mb-2">Design System Showcase</h1>
            <p className="text-muted text-lg">Visual QA pentru componente și tokens</p>
          </div>

          {/* Color Tokens */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Color Tokens</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-bg border border-border" />
                <p className="text-sm font-medium">bg</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-surface border border-border" />
                <p className="text-sm font-medium">surface</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-muted border border-border" />
                <p className="text-sm font-medium">muted</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-primary" />
                <p className="text-sm font-medium">primary</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-success" />
                <p className="text-sm font-medium">success</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-warning" />
                <p className="text-sm font-medium">warning</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-danger" />
                <p className="text-sm font-medium">danger</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-info" />
                <p className="text-sm font-medium">info</p>
              </div>
            </div>
          </section>

          {/* Surface Elevations */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Surface Elevations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Surface elevation={0} className="p-6">
                <h3 className="font-semibold mb-2">Elevation 0</h3>
                <p className="text-sm text-muted">Minimal border, subtle presence</p>
              </Surface>
              <Surface elevation={1} className="p-6">
                <h3 className="font-semibold mb-2">Elevation 1</h3>
                <p className="text-sm text-muted">Small shadow, cards</p>
              </Surface>
              <Surface elevation={2} className="p-6">
                <h3 className="font-semibold mb-2">Elevation 2</h3>
                <p className="text-sm text-muted">Large shadow, modals</p>
              </Surface>
            </div>
          </section>

          {/* Sponsored Labels */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Sponsored Labels</h2>
            <div className="flex flex-wrap gap-4">
              <SponsoredLabel variant="sponsored" size="sm" />
              <SponsoredLabel variant="sponsored" size="md" />
              <SponsoredLabel variant="ad" size="sm" />
              <SponsoredLabel variant="ad" size="md" />
            </div>
          </section>

          {/* Buttons & Focus States */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Buttons & Focus States</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <p className="text-sm text-muted mt-4">
              Testeaza Tab pentru focus ring (outline primary, 2px offset)
            </p>
          </section>

          {/* Badges */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Badges</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </section>

          {/* Ad Slots */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Ad Slots (Zero CLS)</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-medium mb-3 text-muted">
                  Banner (728×90 desktop / 320×100 mobile)
                </h3>
                <AdSlot id="showcase-banner" position="top" size="banner" />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-3 text-muted">Rectangle (300×250)</h3>
                <AdSlot id="showcase-rectangle" position="sidebar" size="rectangle" />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-3 text-muted">
                  Skyscraper (300×600 desktop / 300×250 mobile)
                </h3>
                <AdSlot id="showcase-skyscraper" position="sidebar" size="skyscraper" />
              </div>
            </div>
          </section>

          {/* Sponsored Card */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Sponsored Card</h2>
            <div className="max-w-sm">
              <SponsoredCard listing={sampleListing} position={1} />
            </div>
          </section>

          {/* Typography Scale */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Typography Scale</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted mb-1">text-xs (12px)</p>
                <p className="text-xs">The quick brown fox jumps over the lazy dog</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">text-sm (14px)</p>
                <p className="text-sm">The quick brown fox jumps over the lazy dog</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">text-base (16px)</p>
                <p className="text-base">The quick brown fox jumps over the lazy dog</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">text-lg (18px)</p>
                <p className="text-lg">The quick brown fox jumps over the lazy dog</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">text-xl (20px)</p>
                <p className="text-xl">The quick brown fox jumps over the lazy dog</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">text-2xl (24px)</p>
                <p className="text-2xl">The quick brown fox jumps over the lazy dog</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">text-3xl (28px)</p>
                <p className="text-3xl">The quick brown fox jumps over the lazy dog</p>
              </div>
            </div>
          </section>

          {/* Spacing Scale */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Spacing Scale (4px base)</h2>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="flex items-center gap-4">
                  <span className="text-sm text-muted w-20">space-{n}</span>
                  <div className="h-6 bg-primary rounded" style={{ width: `${n * 4}px` }} />
                  <span className="text-xs text-muted">{n * 4}px</span>
                </div>
              ))}
            </div>
          </section>

          {/* Border Radius */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Border Radius</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Surface rounded="sm" className="h-24 flex items-center justify-center">
                <p className="text-sm">sm (10px)</p>
              </Surface>
              <Surface rounded="md" className="h-24 flex items-center justify-center">
                <p className="text-sm">md (16px)</p>
              </Surface>
              <Surface rounded="lg" className="h-24 flex items-center justify-center">
                <p className="text-sm">lg (24px)</p>
              </Surface>
              <Surface rounded="xl" className="h-24 flex items-center justify-center">
                <p className="text-sm">xl (28px)</p>
              </Surface>
            </div>
          </section>

          {/* Motion Timing */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Motion Timing</h2>
            <div className="space-y-4">
              <div>
                <Button
                  className="transition-transform duration-fast ease-emph hover:scale-105"
                  onMouseEnter={(e) => e.currentTarget.classList.add("scale-105")}
                  onMouseLeave={(e) => e.currentTarget.classList.remove("scale-105")}
                >
                  Fast (120ms) + Emph Easing
                </Button>
              </div>
              <div>
                <Button
                  className="transition-transform duration-med ease-inout hover:scale-105"
                  onMouseEnter={(e) => e.currentTarget.classList.add("scale-105")}
                  onMouseLeave={(e) => e.currentTarget.classList.remove("scale-105")}
                >
                  Medium (220ms) + In-Out Easing
                </Button>
              </div>
              <div>
                <Button
                  className="transition-transform duration-slow ease-inout hover:scale-105"
                  onMouseEnter={(e) => e.currentTarget.classList.add("scale-105")}
                  onMouseLeave={(e) => e.currentTarget.classList.remove("scale-105")}
                >
                  Slow (400ms) + In-Out Easing
                </Button>
              </div>
            </div>
          </section>

          {/* Accessibility Notes */}
          <section className="bg-info/10 border border-info/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-info"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Accessibility Checklist
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>4.5:1 contrast minimum pentru text pe surfaces</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Focus ring vizibil (2px primary, offset 2px)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>44×44px touch targets minim</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>prefers-reduced-motion support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Ad slots cu aria-label și role</span>
              </li>
            </ul>
          </section>
        </div>
      </Container>
    </div>
  );
}
