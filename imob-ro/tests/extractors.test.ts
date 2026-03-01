import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { extractGeneric } from "@/lib/extractors";

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
}

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

describe("extractor regression: imobiliare.ro fixtures", () => {
  it("parses 2-room apartment listing", () => {
    const html = loadFixture("imobiliare-listing.html");
    const r = extractGeneric(html);
    expect(r.title).toBeTruthy();
    expect(r.price).toBe(95000);
    expect(r.areaM2).toBe(55);
  });

  it("parses garsoniera listing", () => {
    const html = loadFixture("imobiliare-garsoniera.html");
    const r = extractGeneric(html);
    expect(r.title).toBeTruthy();
    expect(r.price).toBe(45000);
    expect(r.areaM2).toBe(32);
  });

  it("parses 3-room apartment listing", () => {
    const html = loadFixture("imobiliare-3camere.html");
    const r = extractGeneric(html);
    expect(r.title).toBeTruthy();
    expect(r.price).toBe(185000);
    expect(r.areaM2).toBe(85);
  });
});
