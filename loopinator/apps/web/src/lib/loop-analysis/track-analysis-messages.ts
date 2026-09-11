import type { TrackAnalysisResult } from "./engine/types";

export type TrackAnalysisRequest = {
  requestId: number;
  samples: Float32Array;
  sampleRate: number;
};

export type TrackAnalysisResponse = TrackAnalysisResult & {
  requestId: number;
  error?: string;
};
