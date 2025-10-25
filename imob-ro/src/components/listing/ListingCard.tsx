import Image from "next/image";
import * as React from "react";

import { SponsoredLabel } from "@/components/ui/SponsoredLabel";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

/**
 * ListingCard v3 - Future-proof property card
 *
 * Info hierarchy (top → bottom):
 * 1. Media: photo with fallback
 * 2. Price + €/m² + AVM badge
 * 3. Meta: m², rooms, floor, year, metro distance
 * 4. Signals: TTS, Yield, Seismic, Quality badges
 * 5. Location + Title
 * 6. Footer: source favicon + chevron
 *
 * Sponsored variant: identical layout + subtle tint + label
 */

export interface ListingCardProps {
  /** Unique identifier */
  id: string;

  /** Dedup group ID */
  groupId?: string;

  /** Link to report page */
  href: string;

  /** First photo URL */
  mediaUrl?: string;

  /** Price in EUR */
  priceEur?: number;

  /** Price per m² in EUR */
  eurM2?: number;

  /** AVM valuation badge */
  avmBadge?: "under" | "fair" | "over";

  /** Time to sell estimate */
  tts?: string; // e.g., "sub 60 zile"

  /** Net yield (0-1) */
  yieldNet?: number;

  /** Seismic risk */
  seismic?: string; // "RS1" | "RS2" | "none"

  /** Distance to nearest metro (meters) */
  distMetroM?: number;

  /** Property area in m² */
  areaM2?: number;

  /** Number of rooms */
  rooms?: number;

  /** Floor information */
  floor?: string;

  /** Year built */
  yearBuilt?: number;

  /** Area/neighborhood name */
  areaName?: string;

  /** Property title */
  title?: string;

  /** Source domain */
  sourceHost?: string;

  /** Source favicon URL */
  faviconUrl?: string;

  /** Is this a sponsored listing? */
  sponsored?: boolean;

  /** Hover callback for map highlighting */
  onHover?: (id: string) => void;
}

export default function ListingCard(props: ListingCardProps) {
  const {
    id,
    href,
    mediaUrl,
    priceEur,
    eurM2,
    avmBadge,
    tts,
    yieldNet,
    seismic,
    distMetroM,
    areaM2,
    rooms,
    floor,
    yearBuilt,
    areaName,
    title,
    sourceHost,
    faviconUrl,
    sponsored = false,
    onHover,
  } = props;

  // Build accessible label
  const ariaLabel = `${title || "Proprietate"} în ${areaName || "București"}. 
    ${fmtEur(priceEur)}, ${areaM2} metri pătrați, ${rooms} camere. 
    ${sponsored ? "Anunț sponsorizat." : ""}`;

  return (
    <Surface
      asChild
      elevation={0}
      rounded="xl"
      className={cn(
        "group relative overflow-hidden transition-shadow duration-med ease-inout hover:shadow-elev1",
        sponsored && "border-2 border-adBorder bg-adBg/30",
      )}
    >
      <a
        href={href}
        onMouseEnter={() => onHover?.(id)}
        className="block focus-ring"
        aria-label={ariaLabel}
      >
        {/* Media */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {mediaUrl ? (
            <Image
              src={mediaUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover transition-transform duration-slow group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted font-medium">
              Fără foto
            </div>
          )}

          {sponsored && (
            <div className="absolute left-2 top-2">
              <SponsoredLabel variant="sponsored" size="md" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Price + AVM Badge */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <div className="text-lg font-semibold tracking-tight">{fmtEur(priceEur)}</div>
              {eurM2 && <div className="text-xs text-muted">· {fmtEur(eurM2)}/m²</div>}
            </div>
            {avmBadge && <AvmBadge badge={avmBadge} />}
          </div>

          {/* Meta Row */}
          <div className="text-xs text-muted truncate">
            {areaM2 ? `${areaM2} m²` : "—"}
            {" · "}
            {rooms ? `${rooms} cam` : "—"}
            {" · "}
            {floor || "—"}
            {" · "}
            {yearBuilt || "—"}
            {typeof distMetroM === "number" && <span> · {Math.round(distMetroM)} m de metrou</span>}
          </div>

          {/* Signals Row */}
          {(tts || yieldNet || seismic) && (
            <div className="flex flex-wrap items-center gap-1">
              {tts && <Chip>{tts}</Chip>}
              {typeof yieldNet === "number" && (
                <Chip title="Randament net anual">{Math.round(yieldNet * 100)}% net</Chip>
              )}
              {seismic && seismic !== "none" && <Chip title="Risc seismic">{seismic}</Chip>}
            </div>
          )}

          {/* Title / Location */}
          <div className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
            {title || "Fără titlu"}
          </div>
          <div className="text-xs text-muted">{areaName || "București"}</div>

          {/* Footer */}
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted">
              {faviconUrl && (
                <img src={faviconUrl} alt="" width={14} height={14} className="rounded-sm" />
              )}
              <span className="truncate max-w-[120px]">{sourceHost || "imob.ro"}</span>
            </div>
            <span aria-hidden className="text-xs text-muted">
              →
            </span>
          </div>
        </div>
      </a>
    </Surface>
  );
}

/** AVM Badge Component */
function AvmBadge({ badge }: { badge: "under" | "fair" | "over" }) {
  const config = {
    under: {
      label: "Underpriced",
      className: "bg-success/15 text-success",
    },
    fair: {
      label: "Fair",
      className: "bg-warning/15 text-warning",
    },
    over: {
      label: "Overpriced",
      className: "bg-danger/15 text-danger",
    },
  };

  const { label, className } = config[badge];

  return (
    <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-medium", className)}>{label}</span>
  );
}

/** Signal Chip Component */
function Chip({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium">
      {children}
    </span>
  );
}

/** Format EUR currency */
function fmtEur(value?: number): string {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
