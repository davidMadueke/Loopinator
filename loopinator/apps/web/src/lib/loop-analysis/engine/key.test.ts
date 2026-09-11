import { describe, expect, it } from "bun:test";

import {
  isHighConfidenceKey,
  KEY_MIN_CONFIDENCE,
  KEY_MIN_CONFIDENCE_GAP,
  trackKeyFromPitchClass,
} from "@/lib/loop-analysis/engine/key";

describe("trackKeyFromPitchClass", () => {
  it("uses worship-chart spelling", () => {
    expect(trackKeyFromPitchClass(0, "major")).toEqual({
      center: "C",
      scale: "major",
    });
    expect(trackKeyFromPitchClass(1, "minor")).toEqual({
      center: "Db",
      scale: "minor",
    });
    expect(trackKeyFromPitchClass(10, "major")).toEqual({
      center: "Bb",
      scale: "major",
    });
  });

  it("rejects an out-of-range tonic", () => {
    expect(trackKeyFromPitchClass(12, "major")).toBe(null);
  });
});

describe("isHighConfidenceKey", () => {
  it("rejects a weak Pearson score", () => {
    expect(isHighConfidenceKey(0.4, 0.1)).toBe(false);
  });

  it("rejects a close runner-up", () => {
    expect(
      isHighConfidenceKey(KEY_MIN_CONFIDENCE, KEY_MIN_CONFIDENCE - 0.01),
    ).toBe(false);
  });

  it("accepts a clear winner", () => {
    expect(
      isHighConfidenceKey(
        KEY_MIN_CONFIDENCE,
        KEY_MIN_CONFIDENCE - KEY_MIN_CONFIDENCE_GAP - 0.01,
      ),
    ).toBe(true);
  });
});
