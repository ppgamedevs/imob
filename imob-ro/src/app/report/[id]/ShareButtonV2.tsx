"use client";

import { useState } from "react";

import { createShareLink, revokeShareLink } from "./actions";

export function ShareButtonV2({
  analysisId,
  initialSlug,
}: {
  analysisId: string;
  initialSlug?: string;
}) {
  const [slug, setSlug] = useState(initialSlug || "");
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState({
    scrub: true,
    watermark: true,
    hideSource: false,
    hidePrice: false,
    ttlDays: 0,
  });

  async function createLink() {
    setLoading(true);
    try {
      const res = await createShareLink(analysisId, opts);
      if (res?.slug) setSlug(res.slug);
    } catch (err) {
      console.error(err);
      alert("Eroare la crearea link-ului");
    } finally {
      setLoading(false);
    }
  }

  async function revokeLink() {
    if (!confirm("Sigur revoci acest link? Nu va mai fi accesibil.")) return;
    setLoading(true);
    try {
      await revokeShareLink(slug);
      setSlug("");
    } catch (err) {
      console.error(err);
      alert("Eroare la revocare");
    } finally {
      setLoading(false);
    }
  }

  function shareUrl() {
    return slug ? `${location.origin}/s/${slug}` : "";
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="font-medium">Distribuie public (Share v2)</div>

      {!slug ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.scrub}
                onChange={(e) => setOpts((v) => ({ ...v, scrub: e.target.checked }))}
              />
              <span>Scrub locație/adresă</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.watermark}
                onChange={(e) => setOpts((v) => ({ ...v, watermark: e.target.checked }))}
              />
              <span>Watermark poze</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.hideSource}
                onChange={(e) => setOpts((v) => ({ ...v, hideSource: e.target.checked }))}
              />
              <span>Ascunde link sursă</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.hidePrice}
                onChange={(e) => setOpts((v) => ({ ...v, hidePrice: e.target.checked }))}
              />
              <span>Ascunde preț</span>
            </label>
          </div>

          <div className="text-sm">
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Expirare:</span>
              <select
                className="rounded border px-2 py-1"
                value={opts.ttlDays}
                onChange={(e) => setOpts((v) => ({ ...v, ttlDays: parseInt(e.target.value) }))}
              >
                <option value="0">Permanent</option>
                <option value="7">7 zile</option>
                <option value="30">30 zile</option>
                <option value="90">90 zile</option>
              </select>
            </label>
          </div>

          <button
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={createLink}
            disabled={loading}
          >
            {loading ? "Generare..." : "Generează link"}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded border px-3 py-2 text-sm"
              readOnly
              value={shareUrl()}
            />
            <button
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl());
                alert("Link copiat!");
              }}
            >
              Copy
            </button>
            <button
              className="rounded-lg border border-red-500 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={revokeLink}
              disabled={loading}
            >
              Revoke
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            <div className="mb-1 font-medium">Partajează:</div>
            <div className="flex flex-wrap gap-2">
              <a
                className="rounded border px-2 py-1 hover:bg-accent"
                target="_blank"
                href={`https://wa.me/?text=${encodeURIComponent(shareUrl())}`}
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="rounded border px-2 py-1 hover:bg-accent"
                target="_blank"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`}
                rel="noopener noreferrer"
              >
                Facebook
              </a>
              <a
                className="rounded border px-2 py-1 hover:bg-accent"
                target="_blank"
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent("Analiză ImobIntel")}`}
                rel="noopener noreferrer"
              >
                X
              </a>
              <a
                className="rounded border px-2 py-1 hover:bg-accent"
                target="_blank"
                href={`mailto:?subject=Analiză ImobIntel&body=${encodeURIComponent(shareUrl())}`}
                rel="noopener noreferrer"
              >
                Email
              </a>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <div className="mb-1 font-medium">Widget embed:</div>
            <input
              className="w-full rounded border px-2 py-1 font-mono text-xs"
              readOnly
              value={`<script src="${location.origin}/api/embed/${slug}"></script>`}
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
        </>
      )}
    </div>
  );
}
