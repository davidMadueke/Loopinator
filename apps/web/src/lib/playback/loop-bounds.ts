import { storedValueToSeconds } from "@/lib/loop-region-time";

/** Kept for callers that still poll. The engine wrap is modulo, not this epsilon. */
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

export function clampFileTime(
  time: number,
  duration: number,
): number {
  if (duration <= 0) {
    return 0;
  }

  return Math.min(Math.max(0, time), duration);
}

/** On Play or seek, relocate into the Loop region when looping. */
export function clampFileTimeToLoop(
  time: number,
  duration: number,
  bounds: LoopBounds,
  loopEnabled: boolean,
): number {
  const clamped = clampFileTime(time, duration);
  if (!loopEnabled) {
    return clamped;
  }

  if (shouldWrapLoop(clamped, duration, bounds)) {
    return bounds.in;
  }

  return clamped;
}
