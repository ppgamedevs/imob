/**
 * Day 29: Watch Button Component
 * Toggle favorite/watchlist for a property group
 */

"use client";

import { useEffect, useState } from "react";

import {
  addWatchAction,
  checkIsWatchedAction,
  removeWatchAction,
} from "@/app/me/buyer/watch.actions";
import { Button } from "@/components/ui/button";

type WatchButtonProps = {
  groupId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

export function WatchButton({ groupId, variant = "outline", size = "sm" }: WatchButtonProps) {
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkIsWatchedAction(groupId).then((result) => {
      setWatched(result.watched);
      setChecking(false);
    });
  }, [groupId]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (watched) {
        await removeWatchAction(groupId);
        setWatched(false);
      } else {
        await addWatchAction(groupId);
        setWatched(true);
      }
    } catch (err) {
      alert("Please sign in to use watchlist");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Button variant={variant} size={size} disabled>
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        ...
      </Button>
    );
  }

  return (
    <Button
      variant={watched ? "default" : variant}
      size={size}
      onClick={handleToggle}
      disabled={loading}
    >
      <svg
        className={`h-4 w-4 mr-2 ${watched ? "fill-current" : ""}`}
        fill={watched ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      {loading ? "..." : watched ? "Favorited" : "Favorite"}
    </Button>
  );
}
