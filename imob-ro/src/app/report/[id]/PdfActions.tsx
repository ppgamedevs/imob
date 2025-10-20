"use client";
import { useMemo, useState } from "react";

export function PdfActions({ analysisId }: { analysisId: string }) {
  const [brand, setBrand] = useState({ name: "", color: "", logo: "" });
  const [toggle, setToggle] = useState({
    overview: true,
    avm: true,
    tts: true,
    yield: true,
    risk: true,
    gallery: true,
  });

  const href = useMemo(() => {
    const p = new URLSearchParams();
    if (brand.name) p.set("brand", brand.name);
    if (brand.color) p.set("color", brand.color);
    if (brand.logo) p.set("logo", brand.logo);
    for (const k of Object.keys(toggle) as (keyof typeof toggle)[]) {
      if (toggle[k] === false) p.set(k, "false");
    }
    return `/api/report/${analysisId}/pdf?` + p.toString();
  }, [analysisId, brand, toggle]);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <a className="btn" href={href} target="_blank" rel="noreferrer">
        Descarcă PDF
      </a>
      <div className="flex items-center gap-2">
        <label className="text-sm">
          <input
            type="checkbox"
            checked={toggle.overview}
            onChange={(e) => setToggle({ ...toggle, overview: e.target.checked })}
          />{" "}
          Overview
        </label>
        <label className="text-sm">
          <input
            type="checkbox"
            checked={toggle.gallery}
            onChange={(e) => setToggle({ ...toggle, gallery: e.target.checked })}
          />{" "}
          Gallery
        </label>
      </div>
      <input
        className="input w-36"
        placeholder="Brand Name"
        value={brand.name}
        onChange={(e) => setBrand({ ...brand, name: e.target.value })}
      />
      <input
        className="input w-36"
        placeholder="#hex color"
        value={brand.color}
        onChange={(e) => setBrand({ ...brand, color: e.target.value })}
      />
      <input
        className="input w-60"
        placeholder="Logo URL"
        value={brand.logo}
        onChange={(e) => setBrand({ ...brand, logo: e.target.value })}
      />
    </div>
  );
}
