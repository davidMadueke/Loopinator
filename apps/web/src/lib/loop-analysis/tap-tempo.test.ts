import { describe, expect, it } from "bun:test";

import { bpmFromTaps, recordTap, TAP_RESET_MS } from "@/lib/loop-analysis/tap-tempo";

describe("recordTap", () => {
  it("drops taps older than the reset window", () => {
    expect(recordTap([1000, 1500], 1500 + TAP_RESET_MS + 1)).toEqual([
      1500 + TAP_RESET_MS + 1,
    ]);
  });
});

describe("bpmFromTaps", () => {
  it("needs two taps", () => {
    expect(bpmFromTaps([0])).toBe(null);
  });

  it("averages intervals into Original BPM", () => {
    expect(bpmFromTaps([0, 500, 1000])).toBe(120);
  });
});
