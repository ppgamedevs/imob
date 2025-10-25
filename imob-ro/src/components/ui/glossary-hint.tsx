"use client";

import { InfoIcon } from "lucide-react";
import * as React from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ro } from "@/i18n/ro";
import { cn } from "@/lib/utils";

export type GlossaryTerm =
  | "avm"
  | "tts"
  | "eurm2"
  | "yield"
  | "seismic"
  | "confidence"
  | "comparable";

interface GlossaryHintProps {
  term: GlossaryTerm;
  /** Optional custom label instead of ⓘ icon */
  label?: string;
  /** Optional className for styling */
  className?: string;
  /** Show as inline text with underline instead of icon */
  inline?: boolean;
}

/**
 * GlossaryHint - Tooltip component for technical terms
 *
 * Features:
 * - Keyboard accessible (focus/escape)
 * - Screen reader friendly (aria-label)
 * - Links to full glossary page
 * - Respects prefers-reduced-motion
 *
 * Usage:
 * <GlossaryHint term="avm" />
 * <GlossaryHint term="yield" inline label="Randament" />
 */
export function GlossaryHint({ term, label, className, inline = false }: GlossaryHintProps) {
  const definition = ro.glossary[term];

  if (!definition) {
    console.warn(`GlossaryHint: Unknown term "${term}"`);
    return null;
  }

  const glossaryUrl = `/glosar#${term}`;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger
          asChild
          className={cn(
            "inline-flex items-center gap-1",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))]",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))]",
            "rounded-[var(--r-sm)]",
            "transition-colors duration-[var(--duration-fast)]",
            className,
          )}
        >
          {inline ? (
            <span
              className={cn(
                "cursor-help",
                "border-b border-dashed border-[rgb(var(--muted))]",
                "hover:border-[rgb(var(--primary))]",
                "text-[rgb(var(--text))]",
              )}
              role="button"
              tabIndex={0}
              aria-label={`Află mai multe despre ${label || term}: ${definition.short}`}
            >
              {label || term.toUpperCase()}
            </span>
          ) : (
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center",
                "w-4 h-4",
                "text-[rgb(var(--muted))]",
                "hover:text-[rgb(var(--primary))]",
                "transition-colors duration-[var(--duration-fast)]",
              )}
              aria-label={`Află mai multe despre ${label || term}: ${definition.short}`}
            >
              <InfoIcon className="w-full h-full" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className={cn(
            "max-w-xs",
            "bg-[rgb(var(--surface))]",
            "border border-[rgb(var(--border))]",
            "shadow-[var(--elev2)]",
            "rounded-[var(--r-md)]",
            "p-3",
            "text-sm text-[rgb(var(--text))]",
            "animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          )}
          sideOffset={8}
        >
          <div className="space-y-2">
            <p className="leading-relaxed">{definition.short}</p>
            <a
              href={glossaryUrl}
              className={cn(
                "inline-flex items-center gap-1",
                "text-xs text-[rgb(var(--primary))]",
                "hover:underline",
                "focus-visible:outline-none focus-visible:underline",
              )}
              onClick={(e) => {
                // Allow Cmd/Ctrl+Click to open in new tab
                if (!e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  window.location.href = glossaryUrl;
                }
              }}
            >
              {ro.common.learnMore} →
            </a>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * GlossaryLink - Inline text with underline that shows tooltip
 * Shorthand for <GlossaryHint inline />
 */
export function GlossaryLink({
  term,
  children,
  className,
}: {
  term: GlossaryTerm;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlossaryHint
      term={term}
      label={typeof children === "string" ? children : undefined}
      inline
      className={className}
    />
  );
}
