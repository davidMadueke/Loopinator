import { describe, expect, it } from "bun:test";

import { stretchFactorFromRatio, timeStretchEngine } from "./stretch";

describe("timeStretchEngine.ratioFromTempos", () => {
  it("keeps 120 → 144 inside the original band", () => {
    expect(timeStretchEngine.ratioFromTempos(120, 144)).toBeCloseTo(1.2, 10);
  });

  it("plays a half-band slot at 0.5, not the old ±20% floor", () => {
    expect(timeStretchEngine.ratioFromTempos(120, 60)).toBeCloseTo(0.5, 10);
    expect(timeStretchEngine.ratioFromTempos(120, 60)).not.toBeCloseTo(0.8, 5);
  });

  it("stays inside the current Target BPM band", () => {
    expect(timeStretchEngine.ratioFromTempos(120, 40)).toBeCloseTo(48 / 120, 10);
    expect(timeStretchEngine.ratioFromTempos(120, 160)).toBeCloseTo(144 / 120, 10);
    expect(timeStretchEngine.ratioFromTempos(120, 240)).toBeCloseTo(2, 10);
  });

  it("returns 1 when Original BPM is missing", () => {
    expect(timeStretchEngine.ratioFromTempos(0, 120)).toBe(1);
  });
});

describe("stretchFactorFromRatio", () => {
  it("inverts Target / Original so 120 → 144 is about 0.833", () => {
    expect(stretchFactorFromRatio(1.2)).toBeCloseTo(1 / 1.2, 10);
  });

  it("is 2 at half speed", () => {
    expect(stretchFactorFromRatio(0.5)).toBeCloseTo(2, 10);
  });
});
