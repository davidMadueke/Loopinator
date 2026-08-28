import { mixToMono } from "@/lib/loop-analysis/mono-mix";
import {
  DEFAULT_ZERO_CROSS_SEARCH_MS,
  findNearestZeroCrossing,
  type ZeroCrossDirection,
} from "@/lib/loop-analysis/zero-crossing";

export type SnapLoopPointOptions = {
  searchMs?: number;
  direction?: ZeroCrossDirection;
};

export function snapLoopPointToZeroCrossing(
  seconds: number,
  buffer: AudioBuffer,
  options?: SnapLoopPointOptions,
): number {
  const mono = mixToMono(buffer);
  return findNearestZeroCrossing(
    mono,
    buffer.sampleRate,
    seconds,
    options?.searchMs ?? DEFAULT_ZERO_CROSS_SEARCH_MS,
    options?.direction ?? "any",
  );
}
