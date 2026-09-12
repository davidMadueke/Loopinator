import type { LoopBounds } from "../loop-bounds";

export const LOOP_EDGE_FADE_SEC = 0.004;

/** Displayed Transport fade of 0 s still runs a click-safe envelope. */
export const TRANSPORT_FADE_CLICK_SAFE_SEC = 0.015;

export type TransportFadeCurve = "linear" | "exponential" | "equal-power";

export type TransportFade = {
  seconds: number;
  curve: TransportFadeCurve;
};

export type LoopEdgeFade = {
  seconds: number;
};

export type PlaybackEngineParams = {
  duration: number;
  bounds: LoopBounds;
  loopEnabled: boolean;
  stretchRatio: number;
  transportFade: TransportFade;
  loopEdgeFade: LoopEdgeFade;
  restartResumes: boolean;
};

export const DEFAULT_TRANSPORT_FADE: TransportFade = {
  seconds: 0,
  curve: "linear",
};

export const DEFAULT_LOOP_EDGE_FADE: LoopEdgeFade = {
  seconds: LOOP_EDGE_FADE_SEC,
};

export function defaultPlaybackParams(): PlaybackEngineParams {
  return {
    duration: 0,
    bounds: { in: 0, out: 0 },
    loopEnabled: true,
    stretchRatio: 1,
    transportFade: { ...DEFAULT_TRANSPORT_FADE },
    loopEdgeFade: { ...DEFAULT_LOOP_EDGE_FADE },
    restartResumes: false,
  };
}

export function transportFadeDurationSec(seconds: number): number {
  if (seconds <= 0) {
    return TRANSPORT_FADE_CLICK_SAFE_SEC;
  }

  return seconds;
}

export function canPlayBufferAudio(stretchRatio: number): boolean {
  return Math.abs(stretchRatio - 1) < 1e-6;
}

/** Linear Ableton-style edge envelope. 0 at In-point and Out-point, 1 in the middle. */
export function loopEdgeGain(
  time: number,
  inSeconds: number,
  outSeconds: number,
  fadeSec: number = LOOP_EDGE_FADE_SEC,
): number {
  const length = outSeconds - inSeconds;
  if (length <= 0 || fadeSec <= 0) {
    return 1;
  }

  const fade = Math.min(fadeSec, length / 2);
  const into = time - inSeconds;
  const fromOut = outSeconds - time;
  if (into < 0 || fromOut < 0) {
    return 0;
  }

  return Math.min(into / fade, fromOut / fade, 1);
}
