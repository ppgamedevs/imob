/**
 * Day 29: Saved Search Card Component
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { deleteSavedSearchAction } from "./saved.actions";

type SavedSearchCardProps = {
  search: {
    id: string;
    name: string | null;
    queryJson: any;
    lastRunAt: Date | null;
    createdAt: Date;
  };
};

export function SavedSearchCard({ search }: SavedSearchCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this saved search?")) return;
    setDeleting(true);
    try {
      await deleteSavedSearchAction(search.id);
    } catch (err) {
      console.error("Failed to delete:", err);
      setDeleting(false);
    }
  };

  // Build query string from queryJson
  const params = new URLSearchParams();
  const q = search.queryJson;
  if (q.areas) params.set("areas", q.areas.join(","));
  if (q.priceMin) params.set("priceMin", q.priceMin);
  if (q.priceMax) params.set("priceMax", q.priceMax);
  if (q.rooms) params.set("rooms", q.rooms.join(","));
  if (q.underpriced) params.set("underpriced", "true");
  if (q.tts) params.set("tts", q.tts);

  const queryString = params.toString();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium">{search.name || "Untitled Search"}</p>
            {search.lastRunAt && (
              <Badge variant="outline" className="text-xs">
                Last run: {new Date(search.lastRunAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(search.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/discover?${queryString}`}>
            <Button variant="outline" size="sm">
              Run Search
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "..." : "Delete"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
