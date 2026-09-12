import type { PlaybackMode } from "@/lib/play-types";

import type { LoopBounds } from "../loop-bounds";
import type { LoopEdgeFade, TransportFade } from "./params";

export type PlaybackSnapshot = {
  mode: PlaybackMode;
  fileTime: number;
  playhead: number;
  duration: number;
};

export type PlaybackEngineParamPatch = {
  duration?: number;
  bounds?: LoopBounds;
  loopEnabled?: boolean;
  stretchRatio?: number;
  transportFade?: TransportFade;
  loopEdgeFade?: LoopEdgeFade;
  restartResumes?: boolean;
};

/**
 * One session. WavePlayer and the Play screen each create their own.
 * Swap the graph behind `createPlaybackEngine` in `active.ts`.
 */
export type PlaybackEngine = {
  load: (buffer: AudioBuffer | null) => void;
  setParams: (patch: PlaybackEngineParamPatch) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  restart: () => Promise<void>;
  seekFileTime: (seconds: number) => void;
  seekPlayhead: (unit: number) => void;
  getSnapshot: () => PlaybackSnapshot;
  subscribe: (listener: (snapshot: PlaybackSnapshot) => void) => () => void;
  dispose: () => void;
};
