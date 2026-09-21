import transient from "@audio/stretch-transient";

import { STRETCH_WORKLET_NAME } from "./stretch-worklet-name.ts";

declare const sampleRate: number;

interface WorkletProcessorScope {
  readonly port: MessagePort;
}

declare class AudioWorkletProcessor implements WorkletProcessorScope {
  readonly port: MessagePort;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor,
): void;

const FRAME_SIZE = 2048;
const HOP_SIZE = 512;

type StretchLoadMessage = {
  type: "load";
  channels: Float32Array[];
  sampleRate: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  offset: number;
  factor: number;
};

type StretchFactorMessage = {
  type: "factor";
  factor: number;
};

type StretchStopMessage = {
  type: "stop";
};

type StretchMessage = StretchLoadMessage | StretchFactorMessage | StretchStopMessage;

type StretchWriter = (chunk?: Float32Array) => Float32Array;

class SampleQueue {
  private readonly chunks: Float32Array[] = [];
  private offset = 0;
  length = 0;

  push(data: Float32Array) {
    if (data.length === 0) {
      return;
    }
    this.chunks.push(data);
    this.length += data.length;
  }

  pull(out: Float32Array) {
    let written = 0;
    while (written < out.length && this.chunks.length > 0) {
      const head = this.chunks[0];
      if (!head) {
        break;
      }
      const take = Math.min(head.length - this.offset, out.length - written);
      out.set(head.subarray(this.offset, this.offset + take), written);
      this.offset += take;
      written += take;
      this.length -= take;
      if (this.offset >= head.length) {
        this.chunks.shift();
        this.offset = 0;
      }
    }
    if (written < out.length) {
      out.fill(0, written);
    }
  }

  clear() {
    this.chunks.length = 0;
    this.offset = 0;
    this.length = 0;
  }
}

function resampleChannel(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) {
    return input;
  }
  const outLen = Math.max(1, Math.round((input.length * toRate) / fromRate));
  const out = new Float32Array(outLen);
  const scale = fromRate / toRate;
  for (let i = 0; i < outLen; i += 1) {
    const src = i * scale;
    const i0 = Math.min(Math.floor(src), input.length - 1);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = src - i0;
    const a = input[i0] ?? 0;
    const b = input[i1] ?? 0;
    out[i] = a * (1 - t) + b * t;
  }
  return out;
}

function clampFactor(factor: number): number {
  if (!Number.isFinite(factor) || factor <= 0) {
    return 1;
  }
  return Math.min(4, Math.max(0.25, factor));
}

function createWriter(getFactor: () => number, sampleRate: number): StretchWriter {
  // stretchOpts freezes numeric hops. factor stays 1 so anaHop is hopSize.
  // Live Target BPM moves synHop; the library then stretches by synHop / anaHop.
  // Fractional synHop zeros the OLA buffer. Round to whole samples.
  const write = (
    transient as (opts: Record<string, unknown>) => StretchWriter
  )({
    factor: 1,
    frameSize: FRAME_SIZE,
    hopSize: HOP_SIZE,
    sampleRate,
    synHop: () => Math.max(1, Math.round(HOP_SIZE * getFactor())),
  });
  return write;
}

function prerollInputCount(factor: number): number {
  const f = clampFactor(factor);
  const framesNeeded = Math.ceil(4 + 4 / f) + 2;
  return Math.max(FRAME_SIZE + HOP_SIZE * 2, framesNeeded * HOP_SIZE);
}

class StretchProcessor extends AudioWorkletProcessor {
  private channels: Float32Array[] = [];
  private writers: StretchWriter[] = [];
  private queues: SampleQueue[] = [];
  private factor = 1;
  private filePos = 0;
  private loopEnabled = true;
  private loopStart = 0;
  private loopEnd = 0;
  private ready = false;
  private stopped = false;
  private ended = false;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<StretchMessage>) => {
      this.onMessage(event.data);
    };
  }

  private onMessage(message: StretchMessage) {
    if (message.type === "stop") {
      this.stopped = true;
      this.ready = false;
      return;
    }

    if (message.type === "factor") {
      this.factor = clampFactor(message.factor);
      return;
    }

    this.factor = clampFactor(message.factor);
    this.loopEnabled = message.loopEnabled;
    this.loopStart = Math.max(0, message.loopStart) * sampleRate;
    this.loopEnd = Math.max(this.loopStart, message.loopEnd) * sampleRate;
    this.filePos = Math.max(0, message.offset) * sampleRate;
    this.ended = false;
    this.stopped = false;
    this.channels = message.channels.map((channel) =>
      resampleChannel(channel, message.sampleRate, sampleRate),
    );
    const getFactor = () => this.factor;
    this.writers = this.channels.map(() => createWriter(getFactor, sampleRate));
    this.queues = this.channels.map(() => new SampleQueue());
    this.ready = this.channels.length > 0;
    this.preroll();
  }

  private preroll() {
    this.feed(prerollInputCount(this.factor));
  }

  private readWrapped(count: number): Float32Array[] {
    const outs = this.channels.map(() => new Float32Array(count));
    const length = this.channels[0]?.length ?? 0;
    const loopLen = this.loopEnd - this.loopStart;

    for (let i = 0; i < count; i += 1) {
      if (this.loopEnabled && loopLen > 0 && this.filePos >= this.loopEnd) {
        this.filePos = this.loopStart + ((this.filePos - this.loopStart) % loopLen);
      }
      if (this.filePos >= length) {
        this.ended = true;
        break;
      }
      const index = Math.min(Math.floor(this.filePos), length - 1);
      for (let channel = 0; channel < this.channels.length; channel += 1) {
        outs[channel]![i] = this.channels[channel]![index] ?? 0;
      }
      this.filePos += 1;
    }

    return outs;
  }

  private feed(inputCount: number) {
    if (!this.ready || this.ended || inputCount <= 0) {
      return;
    }
    const chunks = this.readWrapped(inputCount);
    for (let channel = 0; channel < this.writers.length; channel += 1) {
      const writer = this.writers[channel];
      const chunk = chunks[channel];
      const queue = this.queues[channel];
      if (!writer || !chunk || !queue) {
        continue;
      }
      queue.push(writer(chunk));
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    const output = outputs[0];
    if (!output || this.stopped || !this.ready) {
      return !this.stopped;
    }

    const frames = output[0]?.length ?? 128;
    const factor = this.factor;
    let feeds = 0;
    while (
      !this.ended &&
      this.queues[0] &&
      this.queues[0].length < frames &&
      feeds < 24
    ) {
      feeds += 1;
      const wantIn = Math.max(HOP_SIZE, Math.ceil(frames / factor) + 8);
      this.feed(wantIn);
    }

    for (let channel = 0; channel < output.length; channel += 1) {
      const dest = output[channel];
      const queue = this.queues[channel] ?? this.queues[0];
      if (!dest) {
        continue;
      }
      if (!queue) {
        dest.fill(0);
        continue;
      }
      queue.pull(dest);
    }

    return true;
  }
}

registerProcessor(STRETCH_WORKLET_NAME, StretchProcessor);
