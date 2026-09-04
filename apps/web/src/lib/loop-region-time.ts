/** Snap within this distance of file start/end stores as auto (empty string). */
export const LOOP_EDGE_SNAP_SEC = 0.05;

/** Minimum region length for the Wavesurfer Regions plugin. Overlay/fields swap instead. */
export const LOOP_MIN_GAP_SEC = 0.05;

export const LOOP_AUTO_LABEL = "Auto";

const LOOP_TIME_PATTERN = /^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/;

export function isAutoPoint(value: string): boolean {
  return value.trim() === "";
}

/** Format seconds as m:ss or m:ss.sss when sub-second precision matters. */
export function formatLoopTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const remainder = clamped - minutes * 60;
  const wholeSeconds = Math.floor(remainder);
  const milliseconds = Math.round((remainder - wholeSeconds) * 1000);

  const secondLabel = wholeSeconds.toString().padStart(2, "0");

  if (milliseconds === 0) {
    return `${minutes}:${secondLabel}`;
  }

  return `${minutes}:${secondLabel}.${milliseconds.toString().padStart(3, "0")}`;
}

export function parseLoopTimeInput(value: string): number | "auto" | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "auto") {
    return "auto";
  }

  const match = trimmed.match(LOOP_TIME_PATTERN);
  if (!match) {
    return null;
  }

  const minutes = Number.parseInt(match[1] ?? "0", 10);
  const seconds = Number.parseInt(match[2] ?? "0", 10);
  if (seconds >= 60) {
    return null;
  }

  const fractionRaw = match[3];
  let fractionSeconds = 0;
  if (fractionRaw) {
    const scale = 10 ** fractionRaw.length;
    fractionSeconds = Number.parseInt(fractionRaw, 10) / scale;
  }

  return minutes * 60 + seconds + fractionSeconds;
}

export function storedValueToSeconds(
  value: string,
  duration: number,
  edge: "in" | "out",
): number {
  if (isAutoPoint(value)) {
    return edge === "in" ? 0 : duration;
  }

  const parsed = parseLoopTimeInput(value);
  if (parsed === null || parsed === "auto") {
    return edge === "in" ? 0 : duration;
  }

  return Math.min(Math.max(0, parsed), duration);
}

export function timeToStoredValue(
  seconds: number,
  duration: number,
  edge: "in" | "out",
): string {
  if (edge === "in" && seconds <= LOOP_EDGE_SNAP_SEC) {
    return "";
  }
  if (edge === "out" && duration > 0 && duration - seconds <= LOOP_EDGE_SNAP_SEC) {
    return "";
  }
  return formatLoopTime(seconds);
}

export function clampLoopTimes(
  inSeconds: number,
  outSeconds: number,
  duration: number,
): { inSeconds: number; outSeconds: number } {
  if (duration <= 0) {
    return { inSeconds: 0, outSeconds: 0 };
  }

  const nextIn = Math.min(Math.max(0, inSeconds), duration);
  const nextOut = Math.min(Math.max(0, outSeconds), duration);

  if (nextIn <= nextOut) {
    return { inSeconds: nextIn, outSeconds: nextOut };
  }

  return { inSeconds: nextOut, outSeconds: nextIn };
}

export function toStoredLoopRegion(
  inSeconds: number,
  outSeconds: number,
  duration: number,
): { inPoint: string; outPoint: string } {
  return {
    inPoint: timeToStoredValue(inSeconds, duration, "in"),
    outPoint: timeToStoredValue(outSeconds, duration, "out"),
  };
}

/**
 * Apply optional zero-cross snap, then order in/out so In-point is never after Out-point.
 * Crossing swaps the two values. Used when committing marker drags, field scrubs, or text input.
 */
export function commitLoopPointSeconds(
  seconds: number,
  otherSeconds: number,
  duration: number,
  edge: "in" | "out",
  options?: {
    snap?: boolean;
    snapLoopPoint?: ((value: number) => number) | null;
  },
): { inSeconds: number; outSeconds: number } {
  let nextSeconds = seconds;

  if (options?.snap && options.snapLoopPoint) {
    nextSeconds = options.snapLoopPoint(nextSeconds);
  }

  if (edge === "in") {
    return clampLoopTimes(nextSeconds, otherSeconds, duration);
  }

  return clampLoopTimes(otherSeconds, nextSeconds, duration);
}
