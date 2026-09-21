import { describe, expect, it } from "bun:test";

import {
  LOOP_EDGE_FADE_SEC,
  TRANSPORT_FADE_CLICK_SAFE_SEC,
  canPlayBufferAudio,
  loopEdgeGain,
  transportFadeDurationSec,
  usesStretchWorklet,
} from "./params";
import { transportFadeCurveValues } from "./fade";

describe("playback engine params", () => {
  it("keeps Ableton's 4 ms Loop edge fade", () => {
    expect(LOOP_EDGE_FADE_SEC).toBe(0.004);
  });

  it("treats a displayed 0 s Transport fade as 15 ms", () => {
    expect(transportFadeDurationSec(0)).toBe(TRANSPORT_FADE_CLICK_SAFE_SEC);
    expect(TRANSPORT_FADE_CLICK_SAFE_SEC).toBe(0.015);
    expect(transportFadeDurationSec(0.25)).toBe(0.25);
  });

  it("plays the buffer only at stretch ratio 1", () => {
    expect(canPlayBufferAudio(1)).toBe(true);
    expect(canPlayBufferAudio(1.2)).toBe(false);
  });

  it("keeps the Play screen worklet at ratio 1", () => {
    expect(usesStretchWorklet(1, true)).toBe(true);
    expect(usesStretchWorklet(1, false)).toBe(false);
    expect(usesStretchWorklet(1.2, false)).toBe(true);
  });

  it("is silent at In-point and Out-point", () => {
    expect(loopEdgeGain(10, 10, 13)).toBe(0);
    expect(loopEdgeGain(13, 10, 13)).toBe(0);
  });

  it("starts and ends an equal-power Transport fade at the endpoints", () => {
    const up = transportFadeCurveValues(0, 1, "equal-power");
    expect(up[0]).toBeCloseTo(0, 10);
    expect(up[up.length - 1]).toBeCloseTo(1, 10);
  });
});
