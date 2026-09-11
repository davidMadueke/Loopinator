import { clampOriginalBpm } from "@/lib/play-types";

export const TAP_RESET_MS = 2000;
export const TAP_MIN_COUNT = 2;
export const TAP_MAX_COUNT = 8;

export function recordTap(
  previous: number[],
  now: number,
  resetMs = TAP_RESET_MS,
): number[] {
  const kept = previous.filter((stamp) => now - stamp < resetMs);
  kept.push(now);
  return kept.length > TAP_MAX_COUNT ? kept.slice(-TAP_MAX_COUNT) : kept;
}

export function bpmFromTaps(taps: number[]): number | null {
  if (taps.length < TAP_MIN_COUNT) {
    return null;
  }

  let total = 0;
  for (let index = 1; index < taps.length; index += 1) {
    total += taps[index]! - taps[index - 1]!;
  }

  const averageMs = total / (taps.length - 1);
  if (averageMs <= 0) {
    return null;
  }

  return clampOriginalBpm(60_000 / averageMs);
}
