import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computePriceVerdictPill,
  formatDeltaAsPercent,
} from "../src/lib/report/price-verdict-badge";

describe("computePriceVerdictPill", () => {
  it("returns null for invalid inputs", () => {
    assert.equal(computePriceVerdictPill(0, 100), null);
    assert.equal(computePriceVerdictPill(100, 0), null);
    assert.equal(computePriceVerdictPill(-1, 100), null);
  });

  it("Pret corect around parity", () => {
    const a = computePriceVerdictPill(100_000, 102_000);
    assert.equal(a?.label, "Preț corect");
    assert.equal(a?.tone, "yellow");
  });

  it("Ușor supraevaluat when list ~10% above estimate", () => {
    // est 90, listed 100 → delta = -0.10
    const a = computePriceVerdictPill(100_000, 90_000);
    assert.equal(a?.label, "Ușor supraevaluat");
    assert.equal(a?.tone, "yellow");
  });

  it("Supraevaluat when list far above estimate", () => {
    const a = computePriceVerdictPill(100_000, 80_000);
    assert.equal(a?.label, "Supraevaluat");
    assert.equal(a?.tone, "red");
  });

  it("Ușor subevaluat when list slightly below estimate", () => {
    const a = computePriceVerdictPill(100_000, 108_000);
    assert.equal(a?.label, "Ușor subevaluat");
    assert.equal(a?.tone, "green");
  });

  it("Subevaluat when list well below estimate", () => {
    const a = computePriceVerdictPill(100_000, 120_000);
    assert.equal(a?.label, "Subevaluat");
    assert.equal(a?.tone, "green");
  });
});

describe("formatDeltaAsPercent", () => {
  it("formats signed percent", () => {
    assert.equal(formatDeltaAsPercent(-0.124), "-12%");
    assert.equal(formatDeltaAsPercent(0.1), "+10%");
  });
});
