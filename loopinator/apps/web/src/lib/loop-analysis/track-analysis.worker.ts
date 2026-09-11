/// <reference lib="webworker" />

import { audioAnalysisEngine } from "./engine/active";
import type {
  TrackAnalysisRequest,
  TrackAnalysisResponse,
} from "./track-analysis-messages";

self.onmessage = (event: MessageEvent<TrackAnalysisRequest>) => {
  const { requestId, samples, sampleRate } = event.data;

  try {
    const bpm = audioAnalysisEngine.detectBpm(samples, sampleRate);
    const key = audioAnalysisEngine.detectKey(samples, sampleRate);
    const response: TrackAnalysisResponse = { requestId, bpm, key };
    self.postMessage(response);
  } catch (error) {
    const response: TrackAnalysisResponse = {
      requestId,
      bpm: null,
      key: null,
      error: error instanceof Error ? error.message : "Analysis failed",
    };
    self.postMessage(response);
  }
};
