import chroma from "@audio/mir-chroma";
import detectKeyFromChroma from "@audio/mir-key";

import { type KeyCenter, type KeyScale, type TrackKey } from "@/lib/play-types";

import type { KeyDetectionResult } from "./types";

/** Pearson r must reach this to fill Key. Sparse percussion usually does not. */
export const KEY_MIN_CONFIDENCE = 0.75;

/** Winner must beat the runner-up by this much, or the result stays No Key. */
export const KEY_MIN_CONFIDENCE_GAP = 0.08;

const CHROMA_FRAME_SIZE = 4096;
const CHROMA_HOP_SIZE = 2048;

/** Worship-chart spelling for pitch classes 0–11. */
export const PITCH_CLASS_TO_CENTER: KeyCenter[] = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export function trackKeyFromPitchClass(
  tonic: number,
  mode: string,
): TrackKey | null {
  const center = PITCH_CLASS_TO_CENTER[tonic];
  if (!center) {
    return null;
  }

  const scale: KeyScale = mode === "minor" ? "minor" : "major";
  return { center, scale };
}

export function isHighConfidenceKey(
  confidence: number,
  runnerUpScore: number | undefined,
): boolean {
  if (!Number.isFinite(confidence) || confidence < KEY_MIN_CONFIDENCE) {
    return false;
  }
  if (runnerUpScore === undefined || !Number.isFinite(runnerUpScore)) {
    return true;
  }
  return confidence - runnerUpScore >= KEY_MIN_CONFIDENCE_GAP;
}

function chromaFrames(
  samples: Float32Array,
  sampleRate: number,
): Float64Array[] {
  const frames: Float64Array[] = [];

  if (samples.length < CHROMA_FRAME_SIZE) {
    const padded = new Float32Array(CHROMA_FRAME_SIZE);
    padded.set(samples);
    frames.push(chroma(padded, { fs: sampleRate, method: "pcp" }));
    return frames;
  }

  for (
    let offset = 0;
    offset + CHROMA_FRAME_SIZE <= samples.length;
    offset += CHROMA_HOP_SIZE
  ) {
    frames.push(
      chroma(samples.subarray(offset, offset + CHROMA_FRAME_SIZE), {
        fs: sampleRate,
        method: "pcp",
      }),
    );
  }

  return frames;
}

/** `@audio/mir-chroma` + `@audio/mir-key` backend. The only file that may import those packages. */
export function detectKeyWithAudioMir(
  samples: Float32Array,
  sampleRate: number,
): KeyDetectionResult | null {
  if (samples.length < 2 || sampleRate <= 0) {
    return null;
  }

  try {
    const frames = chromaFrames(samples, sampleRate);
    if (frames.length === 0) {
      return null;
    }

    const result = detectKeyFromChroma(frames);
    if (!isHighConfidenceKey(result.confidence, result.scores[1]?.score)) {
      return null;
    }

    const key = trackKeyFromPitchClass(result.tonic, result.mode);
    if (!key || key.center === "No Key") {
      return null;
    }

    return { key, confidence: result.confidence };
  } catch {
    return null;
  }
}
