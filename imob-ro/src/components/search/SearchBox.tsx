"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { getSuggestCached } from "@/lib/search/cache";
import type { SuggestItem, SuggestSections } from "@/lib/search/types";

import Autosuggest from "./Autosuggest";

export interface SearchBoxProps {
  placeholder?: string;
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

const EMPTY_SECTIONS: SuggestSections = {
  areas: [],
  addresses: [],
  listings: [],
  saved: [],
  pages: [],
};

export default function SearchBox({
  placeholder = "Caută zone, adrese, proprietăți...",
  className,
  onOpen,
  onClose,
}: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [sections, setSections] = React.useState<SuggestSections>(EMPTY_SECTIONS);
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);
  const abortController = React.useRef<AbortController | null>(null);

  // Flatten items for keyboard navigation
  const flatItems = React.useMemo(() => {
    const items: SuggestItem[] = [];
    (["areas", "addresses", "listings", "saved", "pages"] as const).forEach((section) => {
      items.push(...sections[section]);
    });
    return items;
  }, [sections]);

  // Fetch suggestions
  const fetchSuggestions = React.useCallback(async (q: string) => {
    if (q.length < 2) {
      setSections(EMPTY_SECTIONS);
      setLoading(false);
      return;
    }

    // Abort previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setLoading(true);

    try {
      const data = await getSuggestCached(q);
      setSections(data.sections);
      setSelectedIndex(0);
    } catch (error) {
      console.error("[SearchBox] Fetch error:", error);
      setSections(EMPTY_SECTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced input handler
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 120);
    },
    [fetchSuggestions],
  );

  // Handle focus
  const handleFocus = React.useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  // Handle blur (with delay to allow clicks)
  const handleBlur = React.useCallback(() => {
    setTimeout(() => {
      setIsOpen(false);
      onClose?.();
    }, 200);
  }, [onClose]);

  // Handle item selection
  const handleSelect = React.useCallback(
    (item: SuggestItem) => {
      router.push(item.href);
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
      onClose?.();
    },
    [router, onClose],
  );

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            handleSelect(flatItems[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          onClose?.();
          break;
        case "Tab":
          // Allow default tab behavior
          break;
        default:
          break;
      }
    },
    [isOpen, flatItems, selectedIndex, handleSelect, onClose],
  );

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div ref={containerRef} className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10"
          role="combobox"
          aria-controls="search-list"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <Autosuggest
            query={query}
            sections={sections}
            loading={loading}
            onSelect={handleSelect}
            selectedIndex={selectedIndex}
            onKeyboardNav={(direction) => {
              if (direction === "down") {
                setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
              } else {
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
