"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface GeoResult {
  placeId: string;
  display: string;
  lat: number;
  lng: number;
  type: string;
  road?: string;
  houseNumber?: string;
  suburb?: string;
  district?: string;
  city?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (lat: number, lng: number, displayName: string) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 300;

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "ex: Bulevardul Mihai Bravu 13",
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error("Geocode error");
      const json = await res.json();
      const results: GeoResult[] = json.results ?? [];
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
    },
    [onChange, fetchSuggestions],
  );

  const handleSelect = useCallback(
    (result: GeoResult) => {
      onChange(result.display);
      onSelect(result.lat, result.lng, result.display);
      setIsOpen(false);
      setSuggestions([]);
      inputRef.current?.blur();
    },
    [onChange, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [isOpen, suggestions, activeIndex, handleSelect],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="pr-8"
        />
        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
        {!isLoading && value.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-start gap-2
                ${i === activeIndex ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"}`}
            >
              <svg
                className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <div className="min-w-0 flex-1">
                <span className="leading-snug block truncate">{s.display}</span>
                {s.suburb && s.suburb !== s.city && (
                  <span className="text-[11px] text-gray-400 block truncate">{s.suburb}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
