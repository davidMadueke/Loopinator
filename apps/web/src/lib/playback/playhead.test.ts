import { describe, expect, it } from "bun:test";

import { timeStretchEngine } from "@/lib/loop-analysis/engine/active";

import {
  advanceFileTime,
  fileTimeToPlayhead,
  loopCycleWallSec,
  playheadToFileTime,
  standInLoopDurationSec,
} from "./playhead";

const region = { in: 10, out: 13 };

describe("playhead", () => {
  it("is 0 at In-point and wraps to 0 at Out-point", () => {
    expect(fileTimeToPlayhead(10, region)).toBe(0);
    expect(fileTimeToPlayhead(13, region)).toBe(0);
    expect(fileTimeToPlayhead(11.5, region)).toBeCloseTo(0.5, 10);
  });

  it("maps Playhead 0-1 back to file time", () => {
    expect(playheadToFileTime(0, region)).toBe(10);
    expect(playheadToFileTime(1, region)).toBe(13);
    expect(playheadToFileTime(0.5, region)).toBe(11.5);
  });

  it("wraps file time inside the Loop region", () => {
    expect(advanceFileTime(12.5, 1, 120, region, true)).toBeCloseTo(10.5, 10);
    expect(advanceFileTime(10, 3, 120, region, true)).toBeCloseTo(10, 10);
  });

  it("stops at file end when looping is off", () => {
    expect(advanceFileTime(118, 5, 120, region, false)).toBe(120);
  });

  it("uses 4 beats at Original BPM as the Play screen stand-in region", () => {
    expect(standInLoopDurationSec(120)).toBe(2);
  });

  it("makes a 3 s region at 120 → 144 BPM last 2.5 s of wall clock", () => {
    const ratio = timeStretchEngine.ratioFromTempos(120, 144);
    expect(ratio).toBeCloseTo(1.2, 10);
    expect(loopCycleWallSec(region, ratio)).toBeCloseTo(2.5, 10);
  });
});
