import type WaveSurfer from "wavesurfer.js";
import { storedValueToSeconds } from "@/lib/loop-region-time";

/** One timer tick (~16 ms) — detect out-point before the playhead overshoots. */
export const LOOP_WRAP_EPSILON_SEC = 0.02;

/** Seek often lands a hair before In-point. Don't treat that as outside the region. */
export const LOOP_IN_SEEK_SLOP_SEC = 0.002;

export type LoopBounds = {
  in: number;
  out: number;
};

export function getLoopBounds(
  inPoint: string,
  outPoint: string,
  duration: number,
): LoopBounds {
  return {
    in: storedValueToSeconds(inPoint, duration, "in"),
    out: storedValueToSeconds(outPoint, duration, "out"),
  };
}

export function isPastLoopOut(
  time: number,
  duration: number,
  bounds: LoopBounds,
): boolean {
  if (duration <= 0) {
    return false;
  }

  const nearFileEnd = time >= duration - LOOP_WRAP_EPSILON_SEC;
  const outIsFileEnd = bounds.out >= duration - LOOP_WRAP_EPSILON_SEC;
  return (
    time >= bounds.out - LOOP_WRAP_EPSILON_SEC || (nearFileEnd && outIsFileEnd)
  );
}

export function shouldWrapLoop(
  time: number,
  duration: number,
  bounds: LoopBounds,
): boolean {
  if (duration <= 0) {
    return false;
  }

  const pastOut = isPastLoopOut(time, duration, bounds);
  if (!pastOut && time >= bounds.in - LOOP_IN_SEEK_SLOP_SEC) {
    return false;
  }

  return pastOut || time < bounds.in - LOOP_IN_SEEK_SLOP_SEC;
}

export type WrapLoopResult = {
  wrapped: boolean;
  timeBefore: number;
  timeAfter: number;
  bounds: LoopBounds;
};

export function wrapLoopPlayback(
  ws: WaveSurfer,
  inPoint: string,
  outPoint: string,
  options?: { resume?: boolean },
): WrapLoopResult | null {
  const duration = ws.getDuration();
  if (duration <= 0) {
    return null;
  }

  const bounds = getLoopBounds(inPoint, outPoint, duration);
  const timeBefore = ws.getCurrentTime();

  if (!shouldWrapLoop(timeBefore, duration, bounds)) {
    return null;
  }

  ws.setTime(bounds.in);
  const timeAfter = ws.getCurrentTime();

  if (options?.resume && !ws.isPlaying()) {
    void ws.play();
  }

  return { wrapped: true, timeBefore, timeAfter, bounds };
}
