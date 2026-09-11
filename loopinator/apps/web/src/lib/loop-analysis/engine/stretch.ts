import { clampTargetBpm } from "@/lib/play-types";

import type { TimeStretchEngine } from "./types";

/**
 * Time-stretch math used by the Play screen. The worklet backend
 * (`@audio/stretch-transient`) is not wired yet. Swap that implementation here,
 * not in Transport or Tempo stepper UI.
 */
export const timeStretchEngine: TimeStretchEngine = {
  ratioFromTempos(originalBpm, targetBpm) {
    if (originalBpm <= 0) {
      return 1;
    }
    const clamped = clampTargetBpm(originalBpm, targetBpm);
    return clamped / originalBpm;
  },
};
