import { describe, expect, it } from "vitest";

import normalizeExtracted, { normalizeAddress } from "@/lib/normalize";

describe("normalizeExtracted", () => {
  it("parses numeric fields and converts currency when EUR", async () => {
    const ex = { price: "123.456", currency: "EUR", areaM2: "75", rooms: "2", floor: "3" };
    const n = await normalizeExtracted(ex as unknown as Record<string, unknown>);
    expect(n.price_eur).toBe(123456);
    expect(n.price_ron).toBeGreaterThan(0);
    expect(n.area_m2).toBe(75);
    expect(n.rooms).toBe(2);
    expect(n.floor).toBe(3);
  });

  it("parses RON currency and converts to EUR", async () => {
    const ex = { price: "490000", currency: "RON", areaM2: "100" };
    const n = await normalizeExtracted(ex as unknown as Record<string, unknown>);
    expect(n.price_ron).toBe(490000);
    expect(n.price_eur).toBeGreaterThan(0);
  });

  it("generates area slug from address when mapbox token missing (no throw)", async () => {
    const ex = { addressRaw: "Bd. Magheru, Bucuresti" };
    // ensure no MAPBOX_API_TOKEN in env for this test
    const prev = process.env.MAPBOX_API_TOKEN;
    delete process.env.MAPBOX_API_TOKEN;
    const n = await normalizeExtracted(ex as unknown as Record<string, unknown>);
    expect(n.area_slug).toBeTruthy();
    // restore
    if (prev) process.env.MAPBOX_API_TOKEN = prev;
  });
});

describe("normalizeAddress", () => {
  it("returns null when MAPBOX_API_TOKEN missing", async () => {
    const prev = process.env.MAPBOX_API_TOKEN;
    delete process.env.MAPBOX_API_TOKEN;
    const res = await normalizeAddress("Calea Victoriei, Bucuresti");
    expect(res).toBeNull();
    if (prev) process.env.MAPBOX_API_TOKEN = prev;
  });
});
