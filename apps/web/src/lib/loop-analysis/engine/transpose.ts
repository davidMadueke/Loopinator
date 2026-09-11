import type { TrackKey } from "@/lib/play-types";

import type { TransposeEngine } from "./types";

/**
 * Live transpose. Unused in v1. Swap a library here when key-change UI ships.
 * A Track whose Key is No Key never transposes.
 */
export const transposeEngine: TransposeEngine = {
  canTranspose(key: TrackKey) {
    return key.center !== "No Key";
  },
};
