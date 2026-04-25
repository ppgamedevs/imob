import { describe, expect, it } from "vitest";

import { buildPdfDiffExplanationRo, pdfNoEmDash } from "@/lib/pdf/map-report";

describe("pdfNoEmDash", () => {
  it("replaces common dash punctuation for printable PDF", () => {
    expect(pdfNoEmDash("A \u2014 B")).toMatch(/A/);
    expect(pdfNoEmDash("A \u2014 B")).toMatch(/B/);
  });
});

describe("buildPdfDiffExplanationRo", () => {
  it("returns cautious copy when baseline is missing", () => {
    const s = buildPdfDiffExplanationRo(12, true, false);
    expect(s.toLowerCase()).toMatch(/nu|lips/);
  });

  it("does not assert certainty when data is strong", () => {
    const s = buildPdfDiffExplanationRo(8, true, true);
    expect(s.toLowerCase()).toMatch(/orient|aprox/);
  });
});
