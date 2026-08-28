/** Search radius when snapping loop markers to zero crossings. */
export const DEFAULT_ZERO_CROSS_SEARCH_MS = 50;

export type ZeroCrossDirection = "any" | "up" | "down";

function isZeroCrossing(
  previous: number,
  next: number,
  direction: ZeroCrossDirection,
): boolean {
  const up = previous <= 0 && next > 0;
  const down = previous >= 0 && next < 0;

  if (direction === "up") {
    return up;
  }
  if (direction === "down") {
    return down;
  }
  return up || down;
}

/**
 * Snap a time to the nearest zero crossing within ±searchMs.
 * Prefers crossings closer to the target, then lower amplitude at the crossing.
 */
export function findNearestZeroCrossing(
  samples: Float32Array,
  sampleRate: number,
  targetSeconds: number,
  searchMs = DEFAULT_ZERO_CROSS_SEARCH_MS,
  direction: ZeroCrossDirection = "any",
): number {
  if (sampleRate <= 0 || samples.length < 2) {
    return targetSeconds;
  }

  const targetSample = Math.round(targetSeconds * sampleRate);
  const radius = Math.round((searchMs / 1000) * sampleRate);
  const start = Math.max(0, targetSample - radius);
  const end = Math.min(samples.length - 2, targetSample + radius);

  let bestSample = targetSample;
  let bestDistance = Infinity;
  let bestAmplitude = Infinity;

  for (let i = start; i <= end; i += 1) {
    const previous = samples[i]!;
    const next = samples[i + 1]!;

    if (!isZeroCrossing(previous, next, direction)) {
      continue;
    }

    const distance = Math.abs(i - targetSample);
    const amplitude = Math.max(Math.abs(previous), Math.abs(next));

    if (
      distance < bestDistance ||
      (distance === bestDistance && amplitude < bestAmplitude)
    ) {
      bestSample = i;
      bestDistance = distance;
      bestAmplitude = amplitude;
    }
  }

  if (bestDistance === Infinity) {
    return Math.min(Math.max(0, targetSeconds), (samples.length - 1) / sampleRate);
  }

  return bestSample / sampleRate;
}
