import { createPlaybackEngine } from "./graph";

/**
 * Current playback backend. UI imports this factory, never WaveSurfer media
 * and never `@audio/*`. Swap `graph.ts` / `source.ts` here when the stretch
 * worklet lands.
 */
export { createPlaybackEngine };
