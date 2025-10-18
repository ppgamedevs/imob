import { describe, expect, it } from "vitest";

import { mapScoreToVerdict } from "@/lib/ml/vision/condition";

describe("mapScoreToVerdict", () => {
  it("maps low scores to necesită renovare", () => {
    expect(mapScoreToVerdict(0.1).verdict).toBe("necesită renovare");
  });

  it("maps mid scores to decent", () => {
    expect(mapScoreToVerdict(0.5).verdict).toBe("decent");
  });

  it("maps high scores to modern", () => {
    expect(mapScoreToVerdict(0.95).verdict).toBe("modern");
  });

  it("clamps out-of-range scores", () => {
    expect(mapScoreToVerdict(-1).conditionScore).toBe(0);
    expect(mapScoreToVerdict(2).conditionScore).toBe(1);
  });
});
