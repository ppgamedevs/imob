"use client";

import { Command as CommandIcon, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getSuggestCached } from "@/lib/search/cache";
import type { CommandAction, SuggestItem, SuggestSections } from "@/lib/search/types";

import Autosuggest from "../search/Autosuggest";

const EMPTY_SECTIONS: SuggestSections = {
  areas: [],
  addresses: [],
  listings: [],
  saved: [],
  pages: [],
};

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [sections, setSections] = React.useState<SuggestSections>(EMPTY_SECTIONS);
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("imob_recent_searches");
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved).slice(0, 8));
        } catch (e) {
          // Ignore
        }
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = React.useCallback((q: string) => {
    if (q.length < 2) return;

    setRecentSearches((prev) => {
      const updated = [q, ...prev.filter((s) => s !== q)].slice(0, 8);
      if (typeof window !== "undefined") {
        localStorage.setItem("imob_recent_searches", JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Global keyboard shortcut (⌘K / CTRL-K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setSections(EMPTY_SECTIONS);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Fetch suggestions
  const fetchSuggestions = React.useCallback(async (q: string) => {
    if (q.length < 2) {
      setSections(EMPTY_SECTIONS);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await getSuggestCached(q);
      setSections(data.sections);
      setSelectedIndex(0);
    } catch (error) {
      console.error("[CommandPalette] Fetch error:", error);
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

  // Handle item selection
  const handleSelect = React.useCallback(
    (item: SuggestItem) => {
      saveRecentSearch(query);
      router.push(item.href);
      setIsOpen(false);
    },
    [router, query, saveRecentSearch],
  );

  // Get contextual actions based on current page
  const contextActions = React.useMemo((): CommandAction[] => {
    const actions: CommandAction[] = [];

    // Common actions
    actions.push({
      id: "discover",
      label: "Deschide Descoperă",
      icon: "🔍",
      shortcut: "D",
      onExecute: () => {
        router.push("/discover");
        setIsOpen(false);
      },
    });

    actions.push({
      id: "areas",
      label: "Vezi toate zonele",
      icon: "📍",
      shortcut: "A",
      onExecute: () => {
        router.push("/area");
        setIsOpen(false);
      },
    });

    // Page-specific actions
    if (pathname?.startsWith("/report/")) {
      actions.push({
        id: "share",
        label: "Distribuie raportul",
        icon: "📤",
        onExecute: () => {
          if (navigator.share) {
            navigator.share({ url: window.location.href });
          }
          setIsOpen(false);
        },
      });

      actions.push({
        id: "pdf",
        label: "Descarcă PDF",
        icon: "📄",
        onExecute: () => {
          // TODO: Implement PDF download
          console.log("Download PDF");
          setIsOpen(false);
        },
      });
    }

    if (pathname?.startsWith("/area/")) {
      actions.push({
        id: "charts-3m",
        label: "Grafice: 3 luni",
        icon: "📊",
        onExecute: () => {
          const url = new URL(window.location.href);
          url.searchParams.set("range", "3m");
          router.push(url.pathname + url.search);
          setIsOpen(false);
        },
      });

      actions.push({
        id: "charts-12m",
        label: "Grafice: 12 luni",
        icon: "📈",
        onExecute: () => {
          const url = new URL(window.location.href);
          url.searchParams.set("range", "12m");
          router.push(url.pathname + url.search);
          setIsOpen(false);
        },
      });
    }

    return actions;
  }, [pathname, router]);

  // Keyboard navigation
  const flatItems = React.useMemo(() => {
    const items: SuggestItem[] = [];
    (["areas", "addresses", "listings", "saved", "pages"] as const).forEach((section) => {
      items.push(...sections[section]);
    });
    return items;
  }, [sections]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
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
          break;
        default:
          break;
      }
    },
    [flatItems, selectedIndex, handleSelect],
  );

  // Execute action by shortcut
  React.useEffect(() => {
    if (!isOpen) return;

    const handleActionKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return; // Ignore with modifiers

      const action = contextActions.find((a) => a.shortcut?.toLowerCase() === e.key.toLowerCase());
      if (action) {
        e.preventDefault();
        action.onExecute();
      }
    };

    document.addEventListener("keydown", handleActionKey);
    return () => document.removeEventListener("keydown", handleActionKey);
  }, [isOpen, contextActions]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header with input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <CommandIcon className="h-5 w-5 text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Caută sau tastează o comandă..."
            className="flex-1 bg-transparent text-fg placeholder:text-muted outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted hover:text-fg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto">
          {query.length >= 2 ? (
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
          ) : (
            <div className="py-4">
              {/* Contextual actions */}
              {contextActions.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                    Acțiuni
                  </div>
                  <div>
                    {contextActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={action.onExecute}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                      >
                        <span className="text-2xl">{action.icon}</span>
                        <span className="flex-1 font-medium text-fg">{action.label}</span>
                        {action.shortcut && (
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted/20 border border-border rounded">
                            {action.shortcut}
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                    Căutări recente
                  </div>
                  <div>
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuery(search);
                          fetchSuggestions(search);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                      >
                        <span className="text-muted">🕐</span>
                        <span className="font-medium text-fg">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border bg-accent/50 text-xs text-muted flex items-center justify-between">
          <span>Navighează cu săgețile, Enter pentru selectare</span>
          <span>ESC pentru închidere</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
