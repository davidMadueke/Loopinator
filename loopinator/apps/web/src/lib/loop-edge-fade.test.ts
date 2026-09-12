import { describe, expect, it } from "bun:test";

import { LOOP_EDGE_FADE_SEC, loopEdgeGain } from "@/lib/loop-edge-fade";

describe("loop-edge-fade", () => {
  it("uses Ableton's 4 ms clip-edge default", () => {
    expect(LOOP_EDGE_FADE_SEC).toBe(0.004);
  });

  it("is silent at the In-point and Out-point", () => {
    expect(loopEdgeGain(10, 10, 13)).toBe(0);
    expect(loopEdgeGain(13, 10, 13)).toBe(0);
  });

  it("ramps linearly across the first and last 4 ms", () => {
    expect(loopEdgeGain(10.002, 10, 13)).toBeCloseTo(0.5, 5);
    expect(loopEdgeGain(12.998, 10, 13)).toBeCloseTo(0.5, 5);
  });

  it("is unity between the fades", () => {
    expect(loopEdgeGain(10.004, 10, 13)).toBeCloseTo(1, 10);
    expect(loopEdgeGain(11.5, 10, 13)).toBe(1);
    expect(loopEdgeGain(12.996, 10, 13)).toBeCloseTo(1, 10);
  });

  it("is silent outside the Loop region", () => {
    expect(loopEdgeGain(9.999, 10, 13)).toBe(0);
    expect(loopEdgeGain(13.001, 10, 13)).toBe(0);
  });

  it("shortens both fades when the region is under 8 ms", () => {
    expect(loopEdgeGain(1.001, 1, 1.004)).toBeCloseTo(0.5, 5);
    expect(loopEdgeGain(1.003, 1, 1.004)).toBeCloseTo(0.5, 5);
    expect(loopEdgeGain(1.002, 1, 1.004)).toBe(1);
  });
});
