import type { LoopBounds } from "../loop-bounds";

/**
 * Buffer playback at file speed. Replace this file with the stretch worklet
 * when `@audio/stretch-transient` is wired in `loop-analysis/engine/stretch.ts`.
 */
export type PlaybackSourceStart = {
  context: AudioContext;
  destination: AudioNode;
  buffer: AudioBuffer;
  offset: number;
  loopEnabled: boolean;
  bounds: LoopBounds;
};

export function startBufferSource({
  context,
  destination,
  buffer,
  offset,
  loopEnabled,
  bounds,
}: PlaybackSourceStart): AudioBufferSourceNode {
  const node = context.createBufferSource();
  node.buffer = buffer;
  node.loop = loopEnabled && bounds.out > bounds.in;
  if (node.loop) {
    node.loopStart = bounds.in;
    node.loopEnd = bounds.out;
  }
  node.connect(destination);
  const startAt = Math.min(Math.max(0, offset), Math.max(0, buffer.duration - 1e-6));
  node.start(0, startAt);
  return node;
}
