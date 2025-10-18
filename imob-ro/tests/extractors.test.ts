import { describe, expect, it } from "vitest";

import { extractGeneric } from "@/lib/extractors";

describe("extractGeneric", () => {
  it("extracts og:title", () => {
    const html = `<html><head><meta property="og:title" content="Nice apartment"/></head></html>`;
    const r = extractGeneric(html);
    expect(r.title).toBe("Nice apartment");
  });

  it("extracts price from text", () => {
    const html = `<div>Preț: 123.456 lei</div>`;
    const r = extractGeneric(html);
    expect(r.price).toBe(123456);
  });

  it("extracts area in m²", () => {
    const html = `<div>Suprafață: 75 m²</div>`;
    const r = extractGeneric(html);
    expect(r.areaM2).toBe(75);
  });
});
