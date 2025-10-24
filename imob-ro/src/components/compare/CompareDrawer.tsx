"use client";

import * as React from "react";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * CompareDrawer - Global comparison drawer
 * 
 * Features:
 * - Up to 4 properties
 * - SessionStorage persistence
 * - Mobile: slide-up bottom sheet
 * - Desktop: slide-over right panel
 * - Create compare set and navigate to /compare/[id]
 */

export interface CompareItem {
  id: string;
  groupId: string;
  title: string;
  primaryImage: string;
  priceEur: number;
  eurM2: number;
  avmBadge?: "under" | "fair" | "over";
}

export interface CompareDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CompareDrawer({ open, onClose }: CompareDrawerProps) {
  const [items, setItems] = React.useState<CompareItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Load from sessionStorage on mount and when drawer opens
  React.useEffect(() => {
    if (open) {
      const stored = sessionStorage.getItem("compare:items");
      if (stored) {
        try {
          setItems(JSON.parse(stored));
        } catch (err) {
          console.error("Failed to parse compare items", err);
        }
      }
    }
  }, [open]);

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const removeItem = (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    sessionStorage.setItem("compare:items", JSON.stringify(newItems));
    
    // Also remove from localStorage compare:set
    const compareSet = JSON.parse(localStorage.getItem("compare:set") || "[]");
    localStorage.setItem(
      "compare:set",
      JSON.stringify(compareSet.filter((itemId: string) => itemId !== id))
    );
  };

  const clearAll = () => {
    setItems([]);
    sessionStorage.removeItem("compare:items");
    localStorage.removeItem("compare:set");
  };

  const handleCompare = async () => {
    if (items.length < 2) return;

    setIsLoading(true);
    try {
      // TODO: Call server action to create compare set
      // For now, navigate with IDs in query
      const ids = items.map((item) => item.id).join(",");
      window.location.href = `/compare?ids=${ids}`;
    } catch (err) {
      console.error("Failed to create compare set", err);
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[60] animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed z-[70] bg-surface border shadow-elev2",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 max-h-[80vh] rounded-t-xl animate-in slide-in-from-bottom",
          // Desktop: right panel
          "lg:top-0 lg:right-0 lg:bottom-0 lg:left-auto lg:w-[400px] lg:max-h-none lg:rounded-none lg:rounded-l-xl lg:animate-in lg:slide-in-from-right"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 id="compare-drawer-title" className="text-lg font-semibold">
              Compară Proprietăți
            </h2>
            <p className="text-xs text-muted">
              {items.length}/4 proprietăți selectate
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors focus-ring"
            aria-label="Închide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-140px)] lg:max-h-[calc(100vh-140px)] p-4">
          {items.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <p className="text-sm">
                Nu ai selectat nicio proprietate pentru comparație.
              </p>
              <p className="text-xs mt-2">
                Apasă pe butonul "Compară" de pe orice proprietate pentru a o
                adăuga.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <CompareItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="w-full"
            >
              Șterge Tot
            </Button>
          )}
          <Button
            onClick={handleCompare}
            disabled={items.length < 2 || isLoading}
            className="w-full"
          >
            {isLoading ? (
              "Se încarcă..."
            ) : (
              <>
                Compară ({items.length})
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          {items.length < 2 && (
            <p className="text-xs text-center text-muted">
              Selectează cel puțin 2 proprietăți
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/** Compare Item Card */
function CompareItemCard({
  item,
  onRemove,
}: {
  item: CompareItem;
  onRemove: () => void;
}) {
  const avmBadgeConfig = {
    under: { label: "Under", className: "bg-success/15 text-success" },
    fair: { label: "Fair", className: "bg-warning/15 text-warning" },
    over: { label: "Over", className: "bg-danger/15 text-danger" },
  };

  return (
    <div className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors group">
      {/* Thumbnail */}
      <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0">
        <Image
          src={item.primaryImage}
          alt={item.title}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium line-clamp-2 mb-1">{item.title}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold">{formatEur(item.priceEur)}</span>
          {item.avmBadge && (
            <Badge
              variant="outline"
              className={cn("text-xs", avmBadgeConfig[item.avmBadge].className)}
            >
              {avmBadgeConfig[item.avmBadge].label}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted mt-0.5">{formatEur(item.eurM2)}/m²</div>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-2 hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus-ring"
        aria-label="Elimină din comparație"
      >
        <X className="h-4 w-4 text-danger" />
      </button>
    </div>
  );
}

/** Format EUR currency */
function formatEur(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
