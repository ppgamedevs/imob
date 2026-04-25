"use client";

import { useCallback, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OPTIONS: { value: "yes" | "partial" | "no"; label: string }[] = [
  { value: "yes", label: "Da" },
  { value: "partial", label: "Parțial" },
  { value: "no", label: "Nu" },
];

type Props = {
  analysisId: string;
  reportUnlockId: string;
};

export function PaidReportFeedback({ analysisId, reportUnlockId }: Props) {
  const [rating, setRating] = useState<"yes" | "partial" | "no" | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "err">("idle");

  const submit = useCallback(async () => {
    if (!rating) return;
    setStatus("sending");
    try {
      const res = await fetch(`/api/report/${analysisId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportUnlockId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      setStatus("err");
    } catch {
      setStatus("err");
    }
  }, [analysisId, reportUnlockId, rating, comment]);

  if (status === "done") {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Mulțumim pentru răspuns. Ne ajută să îmbunătățim raportul.
      </p>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Feedback scurt</CardTitle>
        <p className="text-sm text-muted-foreground">
          A meritat raportul prețul plătit?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setRating(o.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                rating === o.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-muted/60"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor={`fb-comment-${analysisId}`}>
            Ce ar trebui îmbunătățit? (opțional)
          </label>
          <textarea
            id={`fb-comment-${analysisId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            maxLength={8000}
          />
        </div>
        <button
          type="button"
          disabled={!rating || status === "sending"}
          onClick={() => void submit()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {status === "sending" ? "Se trimite…" : "Trimite feedback"}
        </button>
        {status === "err" ? (
          <p className="text-sm text-destructive">Nu am putut salva. Încearcă din nou.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
