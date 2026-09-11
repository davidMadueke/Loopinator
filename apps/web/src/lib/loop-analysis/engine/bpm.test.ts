import { describe, expect, it } from "bun:test";

import { detectBpmWithAudioBeat } from "@/lib/loop-analysis/engine/bpm";

function clickTrack(bpm: number, seconds: number, sampleRate = 44100) {
  const samples = new Float32Array(sampleRate * seconds);
  const interval = 60 / bpm;
  for (let time = 0; time < seconds; time += interval) {
    const start = Math.floor(time * sampleRate);
    for (let offset = 0; offset < 32 && start + offset < samples.length; offset += 1) {
      samples[start + offset] = 1 - offset / 32;
    }
  }
  return samples;
}

describe("detectBpmWithAudioBeat", () => {
  it("reads a metronomic click track near 120 BPM", () => {
    const result = detectBpmWithAudioBeat(clickTrack(120, 8), 44100);
    expect(result).not.toBe(null);
    expect(result!.bpm).toBeGreaterThan(110);
    expect(result!.bpm).toBeLessThan(130);
  });
});
