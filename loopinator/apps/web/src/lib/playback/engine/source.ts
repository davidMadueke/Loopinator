import {
  createStretchWorkletNode,
  registerStretchWorklet,
  setStretchWorkletFactor,
  stopStretchWorklet,
} from "@/lib/loop-analysis/engine/stretch";

import type { LoopBounds } from "../loop-bounds";

export type PlaybackSourceStart = {
  context: AudioContext;
  destination: AudioNode;
  buffer: AudioBuffer;
  offset: number;
  loopEnabled: boolean;
  bounds: LoopBounds;
};

export type StretchSourceStart = PlaybackSourceStart & {
  stretchRatio: number;
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

export function startStretchSource({
  context,
  destination,
  buffer,
  offset,
  loopEnabled,
  bounds,
  stretchRatio,
}: StretchSourceStart): AudioWorkletNode {
  return createStretchWorkletNode({
    context,
    destination,
    buffer,
    offset,
    loopEnabled,
    loopStart: bounds.in,
    loopEnd: bounds.out,
    stretchRatio,
  });
}

export function isStretchSource(
  node: AudioNode | null,
): node is AudioWorkletNode {
  return (
    node !== null &&
    typeof AudioWorkletNode !== "undefined" &&
    node instanceof AudioWorkletNode
  );
}

export {
  registerStretchWorklet,
  setStretchWorkletFactor,
  stopStretchWorklet,
};
