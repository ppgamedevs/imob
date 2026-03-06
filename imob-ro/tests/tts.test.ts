import { describe, expect, it } from "vitest";

import estimateTTS, { humanizeBucket } from "@/lib/ml/tts";

describe("estimateTTS", () => {
  it("returns bucket for a priced listing", async () => {
    const res = await estimateTTS({
      avmMid: 100000,
      asking: 92000,
      areaM2: 55,
      month: 5,
    });
    expect(["<30", "30-60", "60-90", "90+"]).toContain(res.bucket);
  });

  it("returns slower bucket for overpriced listing", async () => {
    const res = await estimateTTS({
      avmMid: 100000,
      asking: 125000,
      areaM2: 85,
      month: 1,
    });
    expect(["30-60", "60-90", "90+"]).toContain(res.bucket);
  });

  it("humanizeBucket works", () => {
    expect(humanizeBucket("<30")).toBe("Sub 30 zile");
    expect(humanizeBucket("30-60")).toBe("30-60 zile");
  });
});
