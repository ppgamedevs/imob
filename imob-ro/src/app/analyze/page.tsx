"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import Hero from "@/components/ui/hero";
import { Input } from "@/components/ui/input";

function AnalyzePageContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");
  const [url, setUrl] = useState(urlParam || "");
  const [status, setStatus] = useState<"idle" | "fetching" | "done">("idle");
  const router = useRouter();

  // Auto-submit if URL is provided in query params
  useEffect(() => {
    if (urlParam && status === "idle") {
      handleSubmit(new Event("submit") as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    console.log("🔍 Starting analysis for URL:", url);
    setStatus("fetching");
    
    try {
      console.log("📡 Sending POST to /api/analyze...");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      
      console.log("📥 Response status:", res.status);
      const data = await res.json();
      console.log("📦 Response data:", data);
      
      if (res.ok && data?.id) {
        setStatus("done");
        console.log("✅ Success! Redirecting to report:", data.id);
        router.push(`/report/${data.id}`);
      } else {
        setStatus("idle");
        console.error("❌ Analysis failed:", data);
        alert(data?.error || "Failed to create analysis");
      }
    } catch (err) {
      console.error("💥 Network error:", err);
      setStatus("idle");
      alert("Network error");
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <Hero title={<>Analizează un link</>} subtitle="Primește estimări rapide în câteva secunde" />

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          placeholder="Introdu URL-ul anunțului..."
        />
        <Button type="submit" disabled={status === "fetching"}>
          {status === "fetching" ? "Analizează..." : "Analizează"}
        </Button>
      </form>

      <div className="mt-4">
        {status === "idle" && (
          <p className="text-sm text-muted-foreground">Introdu un link și apasă Analizează.</p>
        )}
        {status === "fetching" && (
          <p className="text-sm text-muted-foreground">Se pornește analiza…</p>
        )}
        {status === "done" && (
          <p className="text-sm text-muted-foreground">Analiza a fost inițiată. Redirecționare…</p>
        )}
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-2xl py-12">Se încarcă...</div>}>
      <AnalyzePageContent />
    </Suspense>
  );
}
