"use client";

import React, { useState } from "react";

import FeedbackModal from "./FeedbackModal";

export default function FeedbackBanner({ analysisId }: { analysisId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Ajută-ne cu feedback</div>
          <div className="text-sm text-muted-foreground">
            Acest raport are incertitudine ridicată. Ne poți spune dacă s-a vândut și la ce preț?
          </div>
        </div>
        <div>
          <button className="rounded bg-primary px-3 py-1 text-white" onClick={() => setOpen(true)}>
            Spune-ne
          </button>
        </div>
      </div>
      {open && <FeedbackModal analysisId={analysisId} onClose={() => setOpen(false)} />}
    </div>
  );
}
