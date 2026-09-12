import type { LoopBounds } from "./loop-bounds";

/** One bar of 4/4 at Original BPM. Play screen stand-in until a Track carries a Loop region. */
export function standInLoopDurationSec(originalBpm: number): number {
  if (originalBpm <= 0) {
    return 0;
  }

  return (60 / originalBpm) * 4;
}

export function fileTimeToPlayhead(
  fileTime: number,
  bounds: LoopBounds,
): number {
  const length = bounds.out - bounds.in;
  if (length <= 0) {
    return 0;
  }

  const pos = fileTime - bounds.in;
  const wrapped = ((pos % length) + length) % length;
  return wrapped / length;
}

export function playheadToFileTime(
  playhead: number,
  bounds: LoopBounds,
): number {
  const length = bounds.out - bounds.in;
  if (length <= 0) {
    return bounds.in;
  }

  const unit = Math.min(Math.max(0, playhead), 1);
  return bounds.in + unit * length;
}

export function fileProgress(fileTime: number, duration: number): number {
  if (duration <= 0) {
    return 0;
  }

  return Math.min(Math.max(0, fileTime / duration), 1);
}

/**
 * Advance file time by elapsed source seconds. When looping, wrap inside
 * [In, Out). Stretch belongs on the wall-clock side, not here.
 */
export function advanceFileTime(
  startFileTime: number,
  elapsedFileSec: number,
  duration: number,
  bounds: LoopBounds,
  loopEnabled: boolean,
): number {
  const raw = startFileTime + elapsedFileSec;

  if (!loopEnabled) {
    if (duration <= 0) {
      return Math.max(0, raw);
    }
    return Math.min(Math.max(0, raw), duration);
  }

  const length = bounds.out - bounds.in;
  if (length <= 0) {
    return bounds.in;
  }

  const pos = raw - bounds.in;
  const wrapped = ((pos % length) + length) % length;
  return bounds.in + wrapped;
}

/** Wall-clock seconds for one Loop cycle at this stretch ratio. */
export function loopCycleWallSec(
  bounds: LoopBounds,
  stretchRatio: number,
): number {
  const length = bounds.out - bounds.in;
  if (length <= 0 || stretchRatio <= 0) {
    return 0;
  }

  return length / stretchRatio;
}
