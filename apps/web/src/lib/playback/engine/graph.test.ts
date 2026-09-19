import { afterEach, describe, expect, it } from "bun:test";

import { createPlaybackEngine } from "./graph";
import type { PlaybackEngine } from "./types";

let audioNow = 0;
let rafId = 0;
const OriginalAudioContext = globalThis.AudioContext;

globalThis.requestAnimationFrame = ((_cb: FrameRequestCallback) => {
  rafId += 1;
  return rafId;
}) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = ((_id: number) => {}) as typeof cancelAnimationFrame;

class FakeParam {
  value = 0;
  cancelScheduledValues(_time: number) {}
  setValueAtTime(value: number, _time: number) {
    this.value = value;
  }
  linearRampToValueAtTime(_value: number, _time: number) {}
}

class FakeNode {
  gain = new FakeParam();
  constructor(readonly context: FakeAudioContext) {}
  connect(_dest: unknown) {
    return this;
  }
  disconnect() {}
}

class FakeAudioContext {
  state: AudioContextState = "running";
  destination = {};
  get currentTime() {
    return audioNow;
  }
  createGain() {
    return new FakeNode(this);
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

function engineWithClock(): PlaybackEngine {
  audioNow = 0;
  globalThis.AudioContext =
    FakeAudioContext as unknown as typeof AudioContext;
  const engine = createPlaybackEngine();
  engine.setParams({
    duration: 10,
    bounds: { in: 2, out: 8 },
    loopEnabled: false,
    restartResumes: true,
  });
  return engine;
}

describe("playback engine restart", () => {
  let engine: PlaybackEngine | undefined;

  afterEach(() => {
    engine?.dispose();
    engine = undefined;
    globalThis.AudioContext = OriginalAudioContext;
  });

  it("seeks to the start and keeps playing", async () => {
    engine = engineWithClock();
    await engine.play();
    audioNow = 0.4;
    expect(engine.getSnapshot().fileTime).toBeCloseTo(0.4, 5);

    await engine.restart();
    const snapshot = engine.getSnapshot();
    expect(snapshot.mode).toBe("playing");
    expect(snapshot.fileTime).toBeCloseTo(0, 5);
  });

  it("seeks to the Loop in-point when looping is on", async () => {
    engine = engineWithClock();
    engine.setParams({ loopEnabled: true, restartResumes: true });
    await engine.play();
    engine.seekFileTime(5);
    expect(engine.getSnapshot().fileTime).toBeCloseTo(5, 5);

    await engine.restart();
    const snapshot = engine.getSnapshot();
    expect(snapshot.mode).toBe("playing");
    expect(snapshot.fileTime).toBeCloseTo(2, 5);
  });

  it("stops at the start when restartResumes is off", async () => {
    engine = engineWithClock();
    engine.setParams({ restartResumes: false });
    await engine.play();
    audioNow = 0.4;

    await engine.restart();
    const snapshot = engine.getSnapshot();
    expect(snapshot.mode).toBe("stopped");
    expect(snapshot.fileTime).toBeCloseTo(0, 5);
  });
});
