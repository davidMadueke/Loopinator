import type { TrackKey } from "@/lib/play-types";

export type BpmDetectionResult = {
  bpm: number;
  confidence: number;
  beatTimes: number[];
  onsetTimes: number[];
};

export type KeyDetectionResult = {
  key: TrackKey;
  confidence: number;
};

export type TrackAnalysisResult = {
  bpm: BpmDetectionResult | null;
  key: KeyDetectionResult | null;
};

/**
 * Browser analysis for Create Track. Swap a backend by changing `active.ts`.
 * The rest of the app imports this type, not `@audio/*`.
 */
export type AudioAnalysisEngine = {
  detectBpm(
    samples: Float32Array,
    sampleRate: number,
  ): BpmDetectionResult | null;
  detectKey(
    samples: Float32Array,
    sampleRate: number,
  ): KeyDetectionResult | null;
};

/**
 * Play screen Time-stretch. Create Track and Row preview do not stretch.
 * Wire `@audio/stretch-transient` (or a replacement) in `stretch.ts` when the
 * Play screen worklet lands.
 */
export type TimeStretchEngine = {
  ratioFromTempos(originalBpm: number, targetBpm: number): number;
};

/**
 * Live transpose. Unused in v1. Key stays metadata. A Track whose Key is
 * No Key never transposes.
 */
export type TransposeEngine = {
  canTranspose(key: TrackKey): boolean;
};
