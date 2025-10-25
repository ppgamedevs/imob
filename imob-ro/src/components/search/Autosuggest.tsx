"use client";

import { Bookmark, ExternalLink, FileText, Home, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/areas/series";
import type { SuggestItem, SuggestSections } from "@/lib/search/types";
import { cn } from "@/lib/utils";

export interface AutosuggestProps {
  query: string;
  sections: SuggestSections;
  loading?: boolean;
  onSelect: (item: SuggestItem) => void;
  selectedIndex: number;
  onKeyboardNav: (direction: "up" | "down") => void;
}

const SECTION_LABELS = {
  areas: "Zone",
  addresses: "Adrese",
  listings: "Proprietăți",
  saved: "Salvate",
  pages: "Pagini",
} as const;

const SECTION_ORDER: (keyof SuggestSections)[] = [
  "areas",
  "addresses",
  "listings",
  "saved",
  "pages",
];

export default function Autosuggest({
  query,
  sections,
  loading,
  onSelect,
  selectedIndex,
  // onKeyboardNav, // Future: keyboard navigation callback
}: AutosuggestProps) {
  const flatItems = React.useMemo(() => {
    const items: { section: keyof SuggestSections; item: SuggestItem }[] = [];
    SECTION_ORDER.forEach((section) => {
      sections[section].forEach((item) => {
        items.push({ section, item });
      });
    });
    return items;
  }, [sections]);

  const hasResults = flatItems.length > 0;

  if (loading) {
    return (
      <div className="w-full max-w-2xl bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
        <AutosuggestHeader />
        <div className="max-h-[500px] overflow-y-auto">
          {SECTION_ORDER.map((section) => (
            <SectionSkeleton key={section} label={SECTION_LABELS[section]} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="w-full max-w-2xl bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
        <AutosuggestHeader />
        <div className="p-8 text-center text-muted">
          <p className="mb-2">Niciun rezultat pentru &quot;{query}&quot;</p>
          <p className="text-sm">Încearcă un termen diferit sau navighează către Descoperă</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
      <AutosuggestHeader />
      <div className="max-h-[500px] overflow-y-auto">
        {SECTION_ORDER.map((section) => {
          const items = sections[section];
          if (items.length === 0) return null;

          return (
            <SuggestSection
              key={section}
              label={SECTION_LABELS[section]}
              items={items}
              onSelect={onSelect}
              selectedIndex={selectedIndex}
              globalOffset={flatItems.findIndex(
                (fi) => fi.section === section && fi.item === items[0],
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function AutosuggestHeader() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-accent/50">
      <div className="text-sm font-medium text-fg">Căutare</div>
      <div className="flex items-center gap-2">
        <kbd className="px-2 py-1 text-xs font-semibold text-muted bg-muted/20 border border-border rounded">
          ⌘K
        </kbd>
        <span className="text-xs text-muted">pentru comandă rapidă</span>
      </div>
    </div>
  );
}

interface SuggestSectionProps {
  label: string;
  items: SuggestItem[];
  onSelect: (item: SuggestItem) => void;
  selectedIndex: number;
  globalOffset: number;
}

function SuggestSection({
  label,
  items,
  onSelect,
  selectedIndex,
  globalOffset,
}: SuggestSectionProps) {
  return (
    <div className="py-2">
      <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div>
        {items.map((item, idx) => {
          const globalIdx = globalOffset + idx;
          return (
            <SuggestItem
              key={`${item.kind}-${idx}`}
              item={item}
              selected={globalIdx === selectedIndex}
              onSelect={() => onSelect(item)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface SuggestItemProps {
  item: SuggestItem;
  selected: boolean;
  onSelect: () => void;
}

function SuggestItem({ item, selected, onSelect }: SuggestItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect();
  };

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors",
        "hover:bg-accent focus:bg-accent focus:outline-none",
        selected && "bg-accent",
      )}
      role="option"
      aria-selected={selected}
    >
      <ItemIcon item={item} />
      <div className="flex-1 min-w-0">
        <ItemContent item={item} />
      </div>
      <ItemHint item={item} />
    </Link>
  );
}

function ItemIcon({ item }: { item: SuggestItem }) {
  const iconClass = "h-5 w-5 text-muted";

  switch (item.kind) {
    case "area":
      return <MapPin className={iconClass} />;
    case "address":
      return <MapPin className={iconClass} />;
    case "listing":
    case "group":
      return item.thumb ? (
        <Image src={item.thumb} alt="" width={40} height={40} className="rounded object-cover" />
      ) : (
        <Home className={iconClass} />
      );
    case "saved":
      return <Bookmark className={iconClass} />;
    case "page":
      return <FileText className={iconClass} />;
    case "sponsored":
      return <Star className={iconClass} />;
    default:
      return <ExternalLink className={iconClass} />;
  }
}

function ItemContent({ item }: { item: SuggestItem }) {
  if (item.kind === "area") {
    return (
      <div>
        <div className="font-medium text-fg">{item.name}</div>
        {item.listingsNow !== undefined && (
          <div className="text-xs text-muted">{item.listingsNow} anunțuri active</div>
        )}
      </div>
    );
  }

  if (item.kind === "address") {
    return (
      <div>
        <div className="font-medium text-fg">{item.name}</div>
        <div className="text-xs text-muted">Adresă</div>
      </div>
    );
  }

  if (item.kind === "listing" || item.kind === "group") {
    return (
      <div>
        <div className="font-medium text-fg truncate">{item.title}</div>
        <div className="text-xs text-muted">
          {formatNumber(item.priceEur)} € · {formatNumber(item.eurM2)} €/m²
        </div>
      </div>
    );
  }

  if (item.kind === "saved") {
    return (
      <div>
        <div className="font-medium text-fg">{item.label}</div>
        <div className="text-xs text-muted capitalize">{item.type}</div>
      </div>
    );
  }

  if (item.kind === "page") {
    return (
      <div>
        <div className="font-medium text-fg">{item.title}</div>
      </div>
    );
  }

  return null;
}

function ItemHint({ item }: { item: SuggestItem }) {
  if (item.kind === "listing" && item.avmBadge === "under") {
    return <Badge variant="default">Subapreciat</Badge>;
  }

  if (item.kind === "sponsored") {
    return <Badge variant="secondary">Sponsorizat</Badge>;
  }

  return null;
}

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="py-2">
      <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="space-y-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
