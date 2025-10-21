"use client";
import { Share2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { createShareLink } from "./actions";

type Props = { analysisId: string };

export function ReportShareButton({ analysisId }: Props) {
  const [isPending, startTransition] = useTransition();

  async function handleShare() {
    startTransition(async () => {
      try {
        // Create share link via server action
        const { slug } = await createShareLink(analysisId);
        const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const url = `${base}/s/${slug}`;

        // Try Web Share API first
        if (navigator.share) {
          await navigator.share({
            title: "Raport imobiliar",
            url,
          });
          toast.success("Partajat cu succes!");
          return;
        }

        // Fallback to clipboard
        await navigator.clipboard.writeText(url);
        toast.success("Link copiat în clipboard!");
      } catch (error) {
        console.error("Share failed:", error);
        toast.error("Eroare la partajare");
      }
    });
  }

  return (
    <button
      onClick={handleShare}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Partajează raport"
      title="Partajează raport"
    >
      <Share2 className="h-4 w-4" />
      {isPending ? "..." : "Share"}
    </button>
  );
}
