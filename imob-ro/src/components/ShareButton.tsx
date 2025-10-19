"use client";
import { Share2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

type Props = { url: string; title?: string };

export default function ShareButton({ url, title }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleShare(): Promise<void> {
    setLoading(true);
    try {
      // Web Share API when available
      const maybeShare = (
        navigator as unknown as {
          share?: (data: { title?: string; url?: string }) => Promise<void>;
        }
      ).share;

      if (typeof maybeShare === "function") {
        await maybeShare.call(navigator, { title, url });
        toast.success("Trimis");
        setLoading(false);
        return;
      }

      // create shortlink
      const res = await fetch("/api/shortlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: url }),
      });
      const data = await res.json().catch(() => null);
      const shareUrl = data?.url ?? url;

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiat în clipboard");
    } catch (e) {
      console.error("share failed", e);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiat în clipboard");
      } catch (err) {
        console.error("copy failed", err);
        toast.error("Nu am putut copia linkul");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm bg-muted hover:bg-muted/80 transition"
      aria-label="Share"
      title="Share"
    >
      <Share2 className="h-4 w-4" />
      {loading ? <span className="text-sm">…</span> : <span className="sr-only">Share</span>}
    </button>
  );
}
