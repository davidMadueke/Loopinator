import {
  loopEdgeGain,
  transportFadeDurationSec,
  type PlaybackEngineParams,
  type TransportFadeCurve,
} from "./params";

function equalPower(unit: number): number {
  return Math.sin((Math.min(Math.max(unit, 0), 1) * Math.PI) / 2);
}

export function transportFadeCurveValues(
  from: number,
  to: number,
  curve: TransportFadeCurve,
  steps = 32,
): Float32Array {
  const values = new Float32Array(steps);
  for (let i = 0; i < steps; i += 1) {
    const t = steps === 1 ? 1 : i / (steps - 1);
    let gain = t;
    if (curve === "equal-power") {
      gain = equalPower(t);
    } else if (curve === "exponential") {
      gain = t * t;
    }
    values[i] = from + (to - from) * gain;
  }
  return values;
}

export function applyTransportFade(
  gain: GainNode,
  toValue: number,
  seconds: number,
  curve: TransportFadeCurve,
): number {
  const durationSec = transportFadeDurationSec(seconds);
  const param = gain.gain;
  const now = gain.context.currentTime;
  const from = param.value;

  param.cancelScheduledValues(now);
  param.setValueAtTime(from, now);

  if (curve === "linear") {
    param.linearRampToValueAtTime(toValue, now + durationSec);
    return durationSec;
  }

  if (curve === "exponential") {
    const safeTo = Math.max(toValue, 0.0001);
    const safeFrom = Math.max(from, 0.0001);
    param.setValueAtTime(safeFrom, now);
    param.exponentialRampToValueAtTime(safeTo, now + durationSec);
    if (toValue <= 0) {
      param.setValueAtTime(0, now + durationSec);
    }
    return durationSec;
  }

  param.setValueCurveAtTime(
    transportFadeCurveValues(from, toValue, "equal-power"),
    now,
    durationSec,
  );
  return durationSec;
}

export function scheduleLoopEdgeFades(
  gain: GainNode,
  fileTime: number,
  params: PlaybackEngineParams,
  cycles = 64,
) {
  const param = gain.gain;
  const now = gain.context.currentTime;
  const { bounds, stretchRatio, loopEdgeFade, loopEnabled } = params;

  param.cancelScheduledValues(now);

  if (!loopEnabled || bounds.out <= bounds.in || stretchRatio <= 0) {
    param.setValueAtTime(1, now);
    return;
  }

  const fadeSec = loopEdgeFade.seconds;
  const length = bounds.out - bounds.in;
  const fade = Math.min(fadeSec, length / 2);
  const startGain = loopEdgeGain(fileTime, bounds.in, bounds.out, fadeSec);
  param.setValueAtTime(startGain, now);

  if (fade <= 0) {
    return;
  }

  const into = ((fileTime - bounds.in) % length + length) % length;
  const remain = length - into;
  const wallFade = fade / stretchRatio;
  const cycleWall = length / stretchRatio;

  if (into < fade) {
    param.linearRampToValueAtTime(1, now + (fade - into) / stretchRatio);
    param.setValueAtTime(1, now + (remain - fade) / stretchRatio);
    param.linearRampToValueAtTime(0, now + remain / stretchRatio);
  } else if (remain > fade) {
    param.setValueAtTime(1, now + (remain - fade) / stretchRatio);
    param.linearRampToValueAtTime(0, now + remain / stretchRatio);
  } else {
    param.linearRampToValueAtTime(0, now + remain / stretchRatio);
  }

  let cycleStart = now + remain / stretchRatio;
  for (let i = 0; i < cycles; i += 1) {
    param.setValueAtTime(0, cycleStart);
    param.linearRampToValueAtTime(1, cycleStart + wallFade);
    param.setValueAtTime(1, cycleStart + cycleWall - wallFade);
    param.linearRampToValueAtTime(0, cycleStart + cycleWall);
    cycleStart += cycleWall;
  }
}

export function waitSec(seconds: number): Promise<void> {
  const delay = Math.max(0, seconds) * 1000;
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
