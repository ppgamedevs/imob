"use client";
import { useState, useTransition } from "react";

import { createPriceBelowAlert, createUnderpricedAlert } from "./actions";

export function AlertsCtas({ analysisId, asking }: { analysisId: string; asking?: number | null }) {
  const [isPending, start] = useTransition();
  const [th, setTh] = useState<number>(() => Math.max(0, Math.round((asking ?? 0) * 0.97)));

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <input
          className="input w-28"
          type="number"
          value={th}
          onChange={(e) => setTh(parseInt(e.target.value || "0", 10))}
        />
        <button
          className="btn"
          disabled={isPending}
          onClick={() => start(() => void createPriceBelowAlert(analysisId, th))}
        >
          Alerta: preț ≤ {th} €
        </button>
      </div>
      <button
        className="btn"
        disabled={isPending}
        onClick={() => start(() => void createUnderpricedAlert(analysisId, 0.05))}
      >
        Alerta: Underpriced (5%)
      </button>
    </div>
  );
}
