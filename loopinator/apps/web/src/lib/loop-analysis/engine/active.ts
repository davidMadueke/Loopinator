import { detectBpmWithAudioBeat } from "./bpm";
import { detectKeyWithAudioMir } from "./key";
import { timeStretchEngine } from "./stretch";
import { transposeEngine } from "./transpose";
import type { AudioAnalysisEngine } from "./types";

/**
 * Current backends. Change a binding here to swap a library.
 * UI and the Worker import these objects, never `@audio/*`.
 */
export const audioAnalysisEngine: AudioAnalysisEngine = {
  detectBpm: detectBpmWithAudioBeat,
  detectKey: detectKeyWithAudioMir,
};

export { timeStretchEngine, transposeEngine };
