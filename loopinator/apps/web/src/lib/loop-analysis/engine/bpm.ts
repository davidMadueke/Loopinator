import { detect } from "@audio/beat";

import type { BpmDetectionResult } from "./types";

/** `@audio/beat` backend. The only file that may import that package. */
export function detectBpmWithAudioBeat(
  samples: Float32Array,
  sampleRate: number,
): BpmDetectionResult | null {
  if (samples.length < 2 || sampleRate <= 0) {
    return null;
  }

  try {
    const result = detect(samples, { fs: sampleRate });
    if (!Number.isFinite(result.bpm) || result.bpm <= 0) {
      return null;
    }

    return {
      bpm: result.bpm,
      confidence: result.confidence,
      beatTimes: Array.from(result.beats),
      onsetTimes: Array.from(result.onsets),
    };
  } catch {
    return null;
  }
}
