/** Ableton Live "Create Fades on Clip Edges": up to 4 ms at start and end. */
export const LOOP_EDGE_FADE_SEC = 0.004;

export type LoopEdgeFade = {
  resume: () => Promise<void>;
  silence: () => void;
  fadeIn: () => void;
  fadeOut: () => Promise<void>;
};

type WaveSurferGainHost = {
  getGainNode?: () => GainNode;
};

/** WaveSurfer's WebAudio backend already owns a GainNode. Nothing else to wire. */
export function getWaveSurferGain(media: unknown): GainNode | null {
  return (media as WaveSurferGainHost).getGainNode?.() ?? null;
}

export function resumeAudioContext(gain: GainNode | null) {
  const ctx = gain?.context as AudioContext | undefined;
  if (ctx?.state === "suspended") {
    return ctx.resume();
  }
  return Promise.resolve();
}

/** Linear Ableton-style edge envelope. 0 at In-point and Out-point, 1 in the middle. */
export function loopEdgeGain(
  time: number,
  inSeconds: number,
  outSeconds: number,
  fadeSec: number = LOOP_EDGE_FADE_SEC,
): number {
  const length = outSeconds - inSeconds;
  if (length <= 0 || fadeSec <= 0) {
    return 1;
  }

  const fade = Math.min(fadeSec, length / 2);
  const into = time - inSeconds;
  const fromOut = outSeconds - time;
  if (into < 0 || fromOut < 0) {
    return 0;
  }

  return Math.min(into / fade, fromOut / fade, 1);
}

function rampGain(gain: GainNode, value: number, durationSec: number) {
  const param = gain.gain;
  const now = gain.context.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  if (durationSec <= 0) {
    param.setValueAtTime(value, now);
    return;
  }
  param.linearRampToValueAtTime(value, now + durationSec);
}

export function createLoopEdgeFade(gain: GainNode): LoopEdgeFade {
  return {
    resume() {
      return resumeAudioContext(gain);
    },
    silence() {
      rampGain(gain, 0, 0);
    },
    fadeIn() {
      rampGain(gain, 1, LOOP_EDGE_FADE_SEC);
    },
    fadeOut() {
      rampGain(gain, 0, LOOP_EDGE_FADE_SEC);
      return new Promise((resolve) => {
        window.setTimeout(resolve, LOOP_EDGE_FADE_SEC * 1000 + 1);
      });
    },
  };
}
