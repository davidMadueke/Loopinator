import { useEffect, useRef, useState } from "react";

import { timeStretchEngine } from "@/lib/loop-analysis/engine/active";

import { getLoopBounds } from "./loop-bounds";
import { standInLoopDurationSec } from "./playhead";
import { createPlaybackEngine } from "./engine/active";
import {
  DEFAULT_LOOP_EDGE_FADE,
  DEFAULT_TRANSPORT_FADE,
  type LoopEdgeFade,
  type TransportFade,
} from "./engine/params";
import type { PlaybackEngine, PlaybackSnapshot } from "./engine/types";

export type UsePlaybackEngineInput = {
  buffer?: AudioBuffer | null;
  duration?: number;
  inPoint?: string;
  outPoint?: string;
  loopEnabled?: boolean;
  originalBpm?: number;
  targetBpm?: number;
  stretch?: boolean;
  restartResumes?: boolean;
  transportFade?: TransportFade;
  loopEdgeFade?: LoopEdgeFade;
};

export function usePlaybackEngine(input: UsePlaybackEngineInput) {
  const engineRef = useRef<PlaybackEngine | null>(null);
  if (engineRef.current === null || engineRef.current.isDisposed()) {
    engineRef.current = createPlaybackEngine();
  }
  const engine = engineRef.current;

  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(() =>
    engine.getSnapshot(),
  );

  const duration =
    input.buffer?.duration ??
    input.duration ??
    standInLoopDurationSec(input.originalBpm ?? 0);

  const bounds = getLoopBounds(
    input.inPoint ?? "",
    input.outPoint ?? "",
    duration,
  );

  const stretchRatio = input.stretch
    ? timeStretchEngine.ratioFromTempos(
        input.originalBpm ?? 0,
        input.targetBpm ?? input.originalBpm ?? 0,
      )
    : 1;

  useEffect(() => {
    return engine.subscribe(setSnapshot);
  }, [engine]);

  /** Dispose on unmount only. Do not null the ref here: subscribe() setStates, and a
   *  null ref would allocate another engine, change `[engine]`, and loop. Strict Mode
   *  still disposes; the render-time `isDisposed()` check above allocates the next one. */
  useEffect(() => {
    return () => {
      engine.dispose();
    };
  }, [engine]);

  useEffect(() => {
    engine.load(input.buffer ?? null);
  }, [engine, input.buffer]);

  useEffect(() => {
    engine.setParams({
      duration,
      bounds,
      loopEnabled: input.loopEnabled ?? true,
      stretchRatio,
      transportFade: input.transportFade ?? DEFAULT_TRANSPORT_FADE,
      loopEdgeFade: input.loopEdgeFade ?? DEFAULT_LOOP_EDGE_FADE,
      restartResumes: input.restartResumes ?? false,
    });
  }, [
    engine,
    duration,
    bounds.in,
    bounds.out,
    input.loopEnabled,
    stretchRatio,
    input.transportFade,
    input.loopEdgeFade,
    input.restartResumes,
  ]);

  return {
    ...snapshot,
    play: engine.play,
    pause: engine.pause,
    restart: engine.restart,
    seekFileTime: engine.seekFileTime,
    seekPlayhead: engine.seekPlayhead,
  };
}
