"use client";
import React from "react";

async function postEvent(areaSlug: string, event: string) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaSlug, event }),
    });
  } catch {
    // ignore
  }
}

export default function ReportTracker({ areaSlug }: { areaSlug?: string | null }) {
  React.useEffect(() => {
    if (!areaSlug) return;
    // fire a view_report event on mount
    void postEvent(areaSlug, "view_report");
  }, [areaSlug]);

  const onSave = () => {
    if (!areaSlug) return;
    void postEvent(areaSlug, "save_report");
  };

  const onShare = () => {
    if (!areaSlug) return;
    void postEvent(areaSlug, "share_pdf");
  };

  return (
    <div className="flex gap-2">
      <button onClick={onSave} className="btn">
        Save
      </button>
      <button onClick={onShare} className="btn">
        Share
      </button>
    </div>
  );
}
