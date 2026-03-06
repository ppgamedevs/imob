"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RetryAnalysisButton({ url }: { url: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRetry() {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.id) {
        router.push(`/report/${data.id}`);
      } else {
        router.push(`/analyze?url=${encodeURIComponent(url)}`);
      }
    } catch {
      router.push(`/analyze?url=${encodeURIComponent(url)}`);
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-all"
    >
      {loading ? (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.379 2.624l-1.414 1.414a7.5 7.5 0 0012.756-3.573l-1.963-.465zM4.688 8.576a5.5 5.5 0 019.379-2.624l1.414-1.414a7.5 7.5 0 00-12.756 3.573l1.963.465z" clipRule="evenodd" />
        </svg>
      )}
      {loading ? "Se reincearca..." : "Reincearca analiza"}
    </button>
  );
}
