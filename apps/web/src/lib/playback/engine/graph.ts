import type { PlaybackMode } from "@/lib/play-types";

import { clampFileTimeToLoop } from "../loop-bounds";
import {
  advanceFileTime,
  fileTimeToPlayhead,
  playheadToFileTime,
} from "../playhead";
import {
  applyTransportFade,
  scheduleLoopEdgeFades,
  waitSec,
} from "./fade";
import {
  canPlayBufferAudio,
  defaultPlaybackParams,
  transportFadeDurationSec,
} from "./params";
import { startBufferSource } from "./source";
import type { PlaybackEngine, PlaybackEngineParamPatch, PlaybackSnapshot } from "./types";

export function createPlaybackEngine(): PlaybackEngine {
  const params = defaultPlaybackParams();
  const listeners = new Set<(snapshot: PlaybackSnapshot) => void>();

  let buffer: AudioBuffer | null = null;
  let context: AudioContext | null = null;
  let transportGain: GainNode | null = null;
  let edgeGain: GainNode | null = null;
  let source: AudioBufferSourceNode | null = null;

  let mode: PlaybackMode = "stopped";
  let fileTime = 0;
  let clockKind: "context" | "perf" = "perf";
  let anchorClock = 0;
  let anchorFileTime = 0;
  let commandGen = 0;
  let rafId = 0;
  let disposed = false;

  function snapshot(): PlaybackSnapshot {
    const time = currentFileTime();
    const playhead =
      params.loopEnabled && params.bounds.out > params.bounds.in
        ? fileTimeToPlayhead(time, params.bounds)
        : params.duration > 0
          ? time / params.duration
          : 0;

    return {
      mode,
      fileTime: time,
      playhead,
      duration: params.duration,
    };
  }

  function emit() {
    if (disposed) {
      return;
    }
    const next = snapshot();
    listeners.forEach((listener) => listener(next));
  }

  function nowSec() {
    if (clockKind === "context" && context) {
      return context.currentTime;
    }
    return performance.now() / 1000;
  }

  function currentFileTime() {
    if (mode !== "playing") {
      return fileTime;
    }

    const elapsedWall = nowSec() - anchorClock;
    const elapsedFile = elapsedWall * params.stretchRatio;
    fileTime = advanceFileTime(
      anchorFileTime,
      elapsedFile,
      params.duration,
      params.bounds,
      params.loopEnabled,
    );

    if (
      !params.loopEnabled &&
      params.duration > 0 &&
      fileTime >= params.duration
    ) {
      fileTime = params.duration;
      stopSource();
      mode = "stopped";
      stopRaf();
    }

    return fileTime;
  }

  function reanchor() {
    fileTime = currentFileTime();
    anchorFileTime = fileTime;
    anchorClock = nowSec();
  }

  function ensureContext() {
    if (context) {
      return context;
    }

    context = new AudioContext();
    transportGain = context.createGain();
    edgeGain = context.createGain();
    transportGain.gain.value = 0;
    edgeGain.gain.value = 1;
    transportGain.connect(edgeGain);
    edgeGain.connect(context.destination);
    clockKind = "context";
    return context;
  }

  function stopSource() {
    if (!source) {
      return;
    }
    try {
      source.onended = null;
      source.stop();
    } catch {
      /* already stopped */
    }
    source.disconnect();
    source = null;
  }

  function startRaf() {
    if (rafId !== 0) {
      return;
    }

    const tick = () => {
      if (mode === "playing" && !disposed) {
        emit();
        rafId = requestAnimationFrame(tick);
        return;
      }
      rafId = 0;
    };

    rafId = requestAnimationFrame(tick);
  }

  function stopRaf() {
    if (rafId === 0) {
      return;
    }
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function relocateIfNeeded() {
    fileTime = clampFileTimeToLoop(
      fileTime,
      params.duration,
      params.bounds,
      params.loopEnabled,
    );
  }

  function startAudio() {
    if (!buffer || !transportGain || !edgeGain || !context) {
      return;
    }
    if (!canPlayBufferAudio(params.stretchRatio)) {
      return;
    }

    stopSource();
    const node = startBufferSource({
      context,
      destination: transportGain,
      buffer,
      offset: fileTime,
      loopEnabled: params.loopEnabled,
      bounds: params.bounds,
    });
    node.onended = () => {
      if (source !== node || params.loopEnabled) {
        return;
      }
      fileTime = params.duration;
      mode = "stopped";
      source = null;
      stopRaf();
      emit();
    };
    source = node;
    scheduleLoopEdgeFades(edgeGain, fileTime, params);
  }

  async function play() {
    if (disposed || mode === "playing") {
      return;
    }

    const gen = ++commandGen;
    relocateIfNeeded();
    if (
      !params.loopEnabled &&
      params.duration > 0 &&
      fileTime >= params.duration
    ) {
      return;
    }
    const ctx = ensureContext();
    clockKind = "context";
    reanchor();

    if (ctx.state === "suspended") {
      await ctx.resume();
      if (gen !== commandGen || disposed) {
        return;
      }
    }

    startAudio();
    if (transportGain) {
      applyTransportFade(
        transportGain,
        1,
        params.transportFade.seconds,
        params.transportFade.curve,
      );
    }

    mode = "playing";
    reanchor();
    startRaf();
    emit();
  }

  async function pause() {
    if (disposed || mode !== "playing") {
      return;
    }

    const gen = ++commandGen;
    reanchor();
    const fadeSec = transportGain
      ? applyTransportFade(
          transportGain,
          0,
          params.transportFade.seconds,
          params.transportFade.curve,
        )
      : 0;

    await waitSec(fadeSec);
    if (gen !== commandGen || disposed) {
      return;
    }

    fileTime = currentFileTime();
    stopSource();
    mode = fileTime > 0 ? "paused" : "stopped";
    stopRaf();
    emit();
  }

  async function restart() {
    if (disposed) {
      return;
    }

    const gen = ++commandGen;
    if (mode === "playing" && transportGain) {
      applyTransportFade(
        transportGain,
        0,
        params.transportFade.seconds,
        params.transportFade.curve,
      );
      await waitSec(transportFadeDurationSec(params.transportFade.seconds));
      if (gen !== commandGen || disposed) {
        return;
      }
    }

    stopSource();
    stopRaf();
    /** `currentFileTime()` follows the old play clock while mode is still
     *  "playing", so `reanchor()` would restore that time over the reset. */
    mode = "stopped";
    fileTime = params.loopEnabled ? params.bounds.in : 0;
    if (transportGain) {
      transportGain.gain.cancelScheduledValues(transportGain.context.currentTime);
      transportGain.gain.setValueAtTime(0, transportGain.context.currentTime);
    }

    if (params.restartResumes) {
      const ctx = ensureContext();
      clockKind = "context";
      reanchor();
      if (ctx.state === "suspended") {
        await ctx.resume();
        if (gen !== commandGen || disposed) {
          return;
        }
      }
      startAudio();
      if (transportGain) {
        applyTransportFade(
          transportGain,
          1,
          params.transportFade.seconds,
          params.transportFade.curve,
        );
      }
      mode = "playing";
      reanchor();
      startRaf();
    }

    emit();
  }

  function seekTo(nextFileTime: number) {
    fileTime = clampFileTimeToLoop(
      nextFileTime,
      params.duration,
      params.bounds,
      params.loopEnabled,
    );
    anchorFileTime = fileTime;
    anchorClock = nowSec();

    if (mode === "playing") {
      startAudio();
      if (transportGain) {
        transportGain.gain.setValueAtTime(1, transportGain.context.currentTime);
      }
    }

    emit();
  }

  function load(next: AudioBuffer | null) {
    const wasPlaying = mode === "playing";
    stopSource();
    buffer = next;
    if (next) {
      params.duration = next.duration;
      if (params.bounds.out <= 0 || params.bounds.out > next.duration) {
        params.bounds = { in: params.bounds.in, out: next.duration };
      }
    }
    fileTime = clampFileTimeToLoop(
      fileTime,
      params.duration,
      params.bounds,
      params.loopEnabled,
    );
    if (wasPlaying && next) {
      startAudio();
      reanchor();
    } else if (wasPlaying) {
      mode = fileTime > 0 ? "paused" : "stopped";
      stopRaf();
    }
    emit();
  }

  function setParams(patch: PlaybackEngineParamPatch) {
    const wasPlaying = mode === "playing";
    reanchor();
    if (patch.duration !== undefined && !buffer) {
      params.duration = patch.duration;
    }
    if (patch.bounds) {
      params.bounds = patch.bounds;
    }
    if (patch.loopEnabled !== undefined) {
      params.loopEnabled = patch.loopEnabled;
    }
    if (patch.stretchRatio !== undefined) {
      params.stretchRatio = patch.stretchRatio;
    }
    if (patch.transportFade) {
      params.transportFade = patch.transportFade;
    }
    if (patch.loopEdgeFade) {
      params.loopEdgeFade = patch.loopEdgeFade;
    }
    if (patch.restartResumes !== undefined) {
      params.restartResumes = patch.restartResumes;
    }

    fileTime = clampFileTimeToLoop(
      fileTime,
      params.duration,
      params.bounds,
      params.loopEnabled,
    );
    reanchor();

    if (wasPlaying) {
      startAudio();
    }
    emit();
  }

  return {
    load,
    setParams,
    play,
    pause,
    restart,
    seekFileTime(seconds) {
      seekTo(seconds);
    },
    seekPlayhead(unit) {
      seekTo(playheadToFileTime(unit, params.bounds));
    },
    getSnapshot: snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      commandGen += 1;
      stopRaf();
      stopSource();
      listeners.clear();
      if (context) {
        void context.close();
        context = null;
        transportGain = null;
        edgeGain = null;
      }
    },
    isDisposed() {
      return disposed;
    },
  };
}
