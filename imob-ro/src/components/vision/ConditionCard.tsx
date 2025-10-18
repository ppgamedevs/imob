/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hashPhotoUrls, mapScoreToVerdict } from "@/lib/ml/vision/condition";

type Props = { photos: string[] | null | undefined };

type CacheEntry = { score: number; verdict: string; ts: number };

export default function ConditionCard({ photos }: Props) {
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  useEffect(() => {
    if (!photos || photos.length === 0) return;

    let mounted = true;

    async function run() {
      setLoading(true);
      try {
        const key = await hashPhotoUrls(photos as string[]);
        const raw = localStorage.getItem("vision:condition:" + key);
        if (raw) {
          const parsed: CacheEntry = JSON.parse(raw);
          // cache for 30 days
          if (Date.now() - parsed.ts < 1000 * 60 * 60 * 24 * 30) {
            if (!mounted) return;
            setScore(parsed.score);
            setVerdict(parsed.verdict);
            setLoading(false);
            return;
          }
        }

        let mapped: { verdict: string; conditionScore: number } | null = null;

        // Prefer running in a worker; worker script is hosted at /vision.worker.js
        try {
          const worker = new Worker("/vision.worker.js");
          const id = Math.random().toString(36).slice(2);
          const res = await new Promise<any>((resolve) => {
            const onMsg = (ev: MessageEvent) => {
              if (ev.data?.id === id) {
                worker.removeEventListener("message", onMsg as any);
                resolve(ev.data);
              }
            };
            worker.addEventListener("message", onMsg as any);
            worker.postMessage({ id, photos });
          });
          mapped = { verdict: res.verdict, conditionScore: res.score };
          worker.terminate();
        } catch {
          // fallback to main-thread inference (loads TF.js from CDN)
          let mobilenet: any = null;
          try {
            // Try dynamic import; if bundler resolves it because package is installed, this will succeed.
            mobilenet = await import("@tensorflow-models/mobilenet");
          } catch {
            await Promise.all([
              loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.9.0/dist/tf.min.js"),
              loadScript(
                "https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js",
              ),
            ]);
            mobilenet = (window as any).mobilenet;
          }

          const model = await mobilenet.load({ version: 2, alpha: 0.5 });

          async function classifyUrl(url: string) {
            return new Promise<number>((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.src = url;
              img.onload = async () => {
                try {
                  const predictions: any = await model.classify(img as any);
                  let s = 0.5;
                  if (Array.isArray(predictions) && predictions.length) {
                    const top = predictions[0].className.toLowerCase();
                    if (top.includes("studio") || top.includes("living")) s += 0.05;
                    if (top.includes("bedroom") || top.includes("kitchen")) s += 0.1;
                    if (top.includes("bathroom") || top.includes("shower")) s += 0.08;
                    if (top.includes("construction") || top.includes("excavation")) s -= 0.2;
                    if (top.includes("rubble") || top.includes("ruin")) s -= 0.3;
                    if (top.includes("house") || top.includes("apartment")) s += 0.05;
                  }
                  resolve(Math.max(0, Math.min(1, s)));
                } catch {
                  resolve(0.5);
                }
              };
              img.onerror = () => resolve(0.5);
            });
          }

          const sample = (photos as string[]).slice(0, 3);
          const scores: number[] = [];
          for (const u of sample) {
            try {
              const sc = await classifyUrl(String(u));
              scores.push(sc);
            } catch {
              // ignore
            }
          }

          const finalScore = scores.length
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0.5;
          mapped = mapScoreToVerdict(finalScore);
        }

        const entry: CacheEntry = {
          score: mapped!.conditionScore,
          verdict: mapped!.verdict,
          ts: Date.now(),
        };
        try {
          localStorage.setItem(
            "vision:condition:" + (await hashPhotoUrls(photos as string[])),
            JSON.stringify(entry),
          );
        } catch {
          // ignore storage errors
        }

        if (!mounted) return;
        setScore(mapped!.conditionScore);
        setVerdict(mapped!.verdict);
      } catch {
        // silently ignore inference errors
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [photos]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="font-medium">Stare din poze</div>
          <div className="text-sm text-muted-foreground">estimare din poze</div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : score != null && verdict ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">{verdict}</div>
              <div className="text-lg font-semibold">{Math.round(score * 100)}%</div>
            </div>
            <div className="text-sm text-muted-foreground">averaged from photos</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Nu sunt poze suficiente</div>
        )}
      </CardContent>
    </Card>
  );
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}
