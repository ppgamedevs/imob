/* eslint-disable prettier/prettier */
"use client";

import React, { useState } from "react";
import { toast } from "sonner";

export default function FeedbackModal({
  analysisId,
  onClose,
}: {
  analysisId: string;
  onClose?: () => void;
}) {
  const [sold, setSold] = useState<boolean | null>(null);
  const [price, setPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, sold, price: price ? Number(price) : undefined, notes }),
      });
      const json = await res.json();
      if (json?.ok) {
        toast("Mulțumim — ai primit 1 raport gratuit!");
        onClose?.();
      } else {
        toast("Eroare la trimitere");
      }
    } catch {
      toast("Eroare la trimitere");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-6">
        <h3 className="mb-3 text-lg font-semibold">Ajută-ne cu feedback</h3>
        <div className="mb-2 text-sm text-muted-foreground">S-a vândut această proprietate?</div>
        <div className="flex gap-2 mb-3">
          <button
            className={`px-3 py-1 rounded ${sold === true ? "bg-primary text-white" : "bg-muted"}`}
            onClick={() => setSold(true)}
          >
            Da
          </button>
          <button
            className={`px-3 py-1 rounded ${sold === false ? "bg-primary text-white" : "bg-muted"}`}
            onClick={() => setSold(false)}
          >
            Nu
          </button>
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Preț (opțional)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Note (opțional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded" onClick={onClose} disabled={loading}>
            Anulează
          </button>
          <button
            className="px-3 py-1 rounded bg-primary text-white"
            onClick={submit}
            disabled={loading}
          >
            Trimite
          </button>
        </div>
      </div>
    </div>
  );
}
