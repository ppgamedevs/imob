"use client";
import { useState } from "react";

export function ImportClient() {
  const [urls, setUrls] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPaste() {
    setBusy(true);
    const res = await fetch("/api/import/paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    setBusy(false);
    const json = await res.json();
    alert(
      json.ok
        ? `Batch ${json.batchId}: accepted ${json.accepted}, skipped ${json.skipped}`
        : "Eroare",
    );
  }

  async function submitCsv() {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    setBusy(true);
    const res = await fetch("/api/import/csv", { method: "POST", body: fd });
    setBusy(false);
    const json = await res.json();
    alert(
      json.ok
        ? `Batch ${json.batchId}: accepted ${json.accepted}, skipped ${json.skipped}`
        : "Eroare",
    );
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-4 space-y-3">
        <div className="font-medium">Paste URLs</div>
        <textarea
          className="textarea w-full"
          rows={8}
          placeholder="Un URL pe linie…"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
        />
        <button className="btn" disabled={busy || !urls.trim()} onClick={submitPaste}>
          {busy ? "Se procesează…" : "Importă"}
        </button>
      </div>

      <div className="border rounded-xl p-4 space-y-3">
        <div className="font-medium">CSV (coloana &ldquo;url&rdquo;)</div>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button className="btn" disabled={busy || !file} onClick={submitCsv}>
          {busy ? "Se încarcă…" : "Importă CSV"}
        </button>
      </div>
    </div>
  );
}
