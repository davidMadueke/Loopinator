import { describe, expect, it } from "bun:test";

import {
  findNearestZeroCrossing,
} from "@/lib/loop-analysis/zero-crossing";
import {
  formatLoopTime,
  parseLoopTimeInput,
  storedValueToSeconds,
  timeToStoredValue,
} from "@/lib/loop-region-time";

describe("loop-region-time", () => {
  it("formats whole seconds without fractional suffix", () => {
    expect(formatLoopTime(65)).toBe("1:05");
  });

  it("formats sub-second precision with milliseconds", () => {
    expect(formatLoopTime(65.125)).toBe("1:05.125");
  });

  it("parses m:ss and m:ss.sss", () => {
    expect(parseLoopTimeInput("1:05")).toBe(65);
    expect(parseLoopTimeInput("1:05.125")).toBe(65.125);
    expect(parseLoopTimeInput("0:03.5")).toBe(3.5);
  });

  it("round-trips stored values with millisecond precision", () => {
    const stored = timeToStoredValue(12.347, 120, "in");
    expect(stored).toBe("0:12.347");
    expect(storedValueToSeconds(stored, 120, "in")).toBeCloseTo(12.347, 3);
  });
});

describe("zero-crossing", () => {
  it("snaps to the nearest crossing within the search window", () => {
    const sampleRate = 1000;
    const samples = new Float32Array([
      -0.5, -0.1, 0.2, 0.4, -0.3, -0.05, 0.1, 0.2,
    ]);

    const snapped = findNearestZeroCrossing(samples, sampleRate, 0.004, 10);
    expect(snapped).toBeCloseTo(0.005, 3);
  });

  it("returns the target time when no crossing exists in range", () => {
    const sampleRate = 1000;
    const samples = new Float32Array([0.5, 0.6, 0.7, 0.8]);

    const snapped = findNearestZeroCrossing(samples, sampleRate, 0.002, 1);
    expect(snapped).toBeCloseTo(0.002, 3);
  });
});
