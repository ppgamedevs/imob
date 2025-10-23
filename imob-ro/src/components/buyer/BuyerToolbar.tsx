/**
 * Day 29: Buyer Toolbar Component
 * Save search, compare, and favorite actions
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { createSavedSearchAction } from "@/app/me/buyer/saved.actions";
import { createCompareSetAction } from "@/app/compare/actions";
import { useRouter } from "next/navigation";

type BuyerToolbarProps = {
  currentQuery?: any;
  selectedGroupIds?: string[];
  onSelectionChange?: (groupIds: string[]) => void;
};

export function BuyerToolbar({
  currentQuery,
  selectedGroupIds = [],
  onSelectionChange,
}: BuyerToolbarProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [comparing, setComparing] = useState(false);

  const handleSaveSearch = async () => {
    if (!currentQuery) return;

    const name = prompt("Name for this search (optional):");
    if (name === null) return; // User cancelled

    setSaving(true);
    try {
      const result = await createSavedSearchAction(name || "Untitled", currentQuery);
      if (result.ok) {
        alert("Search saved successfully!");
      }
    } catch (err) {
      alert("Failed to save search. Please sign in.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompare = async () => {
    if (selectedGroupIds.length === 0) {
      alert("Please select at least 2 properties to compare");
      return;
    }
    if (selectedGroupIds.length > 4) {
      alert("Maximum 4 properties can be compared");
      return;
    }

    setComparing(true);
    try {
      const result = await createCompareSetAction(selectedGroupIds);
      if (result.ok && result.id) {
        router.push(`/compare/${result.id}`);
      }
    } catch (err) {
      alert("Failed to create comparison. Please sign in.");
      setComparing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {currentQuery && (
        <Button variant="outline" size="sm" onClick={handleSaveSearch} disabled={saving}>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          {saving ? "Saving..." : "Save Search"}
        </Button>
      )}

      {selectedGroupIds.length > 0 && (
        <>
          <Badge variant="secondary">{selectedGroupIds.length} selected</Badge>
          <Button
            variant="default"
            size="sm"
            onClick={handleCompare}
            disabled={comparing || selectedGroupIds.length < 2}
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            {comparing ? "Creating..." : "Compare"}
          </Button>
          {onSelectionChange && (
            <Button variant="ghost" size="sm" onClick={() => onSelectionChange([])}>
              Clear
            </Button>
          )}
        </>
      )}
    </div>
  );
}
