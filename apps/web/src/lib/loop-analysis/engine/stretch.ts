import {
  clampTargetBpmInBand,
  resolveTargetBpmBand,
} from "@/lib/play-types";

import { STRETCH_WORKLET_NAME } from "./stretch-worklet-name";
import type { TimeStretchEngine } from "./types";

export { STRETCH_WORKLET_NAME };

/**
 * Time-stretch math and the Play screen worklet. UI never imports
 * `@audio/stretch-transient`; only `stretch-processor.ts` does.
 */
export const timeStretchEngine: TimeStretchEngine = {
  ratioFromTempos(originalBpm, targetBpm) {
    if (originalBpm <= 0) {
      return 1;
    }
    const band = resolveTargetBpmBand(originalBpm, targetBpm);
    const clamped = clampTargetBpmInBand(originalBpm, targetBpm, band);
    return clamped / originalBpm;
  },
};

/** Library `factor` is output longer than input. Ours is Target / Original. */
export function stretchFactorFromRatio(stretchRatio: number): number {
  if (stretchRatio <= 0) {
    return 1;
  }
  return 1 / stretchRatio;
}

const registeredContexts = new WeakSet<AudioContext>();
const pendingByContext = new WeakMap<AudioContext, Promise<boolean>>();

export async function registerStretchWorklet(
  context: AudioContext,
): Promise<boolean> {
  if (registeredContexts.has(context)) {
    return true;
  }
  if (!context.audioWorklet) {
    return false;
  }

  const pending = pendingByContext.get(context);
  if (pending) {
    return pending;
  }

  const next = context.audioWorklet
    .addModule(new URL("./stretch-processor.ts", import.meta.url))
    .then(() => {
      registeredContexts.add(context);
      pendingByContext.delete(context);
      return true;
    })
    .catch(() => {
      pendingByContext.delete(context);
      return false;
    });

  pendingByContext.set(context, next);
  return next;
}

export type StretchWorkletStart = {
  context: AudioContext;
  destination: AudioNode;
  buffer: AudioBuffer;
  offset: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  stretchRatio: number;
};

export function createStretchWorkletNode({
  context,
  destination,
  buffer,
  offset,
  loopEnabled,
  loopStart,
  loopEnd,
  stretchRatio,
}: StretchWorkletStart): AudioWorkletNode {
  const channelCount = Math.max(1, buffer.numberOfChannels);
  const node = new AudioWorkletNode(context, STRETCH_WORKLET_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [channelCount],
  });

  const channels: Float32Array[] = [];
  for (let channel = 0; channel < channelCount; channel += 1) {
    channels.push(buffer.getChannelData(channel).slice());
  }

  node.port.postMessage(
    {
      type: "load",
      channels,
      sampleRate: buffer.sampleRate,
      loopEnabled,
      loopStart,
      loopEnd,
      offset,
      factor: stretchFactorFromRatio(stretchRatio),
    },
    channels.map((channel) => channel.buffer),
  );
  node.connect(destination);
  return node;
}

export function setStretchWorkletFactor(
  node: AudioWorkletNode,
  stretchRatio: number,
) {
  node.port.postMessage({
    type: "factor",
    factor: stretchFactorFromRatio(stretchRatio),
  });
}

export function stopStretchWorklet(node: AudioWorkletNode) {
  try {
    node.port.postMessage({ type: "stop" });
  } catch {
    /* closed */
  }
  node.disconnect();
}
