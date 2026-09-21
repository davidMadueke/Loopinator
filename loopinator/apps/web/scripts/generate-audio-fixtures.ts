import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUDIO_FIXTURE_SAMPLE_RATE,
  AUDIO_FIXTURE_SPECS,
  fixtureSampleCount,
  type AudioFixtureSpec,
} from "../src/lib/audio-fixtures.ts";

const SAMPLE_RATE = AUDIO_FIXTURE_SAMPLE_RATE;
const TWO_PI = Math.PI * 2;

function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataSize = samples.length * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);

  function writeString(offset: number, value: string) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return bytes;
}

function sealLoop(samples: Float32Array, sampleRate: number) {
  const fade = Math.min(samples.length, Math.round(sampleRate * 0.002));
  for (let i = 0; i < fade; i += 1) {
    const gain = i / fade;
    const last = samples.length - 1 - i;
    samples[i] = (samples[i] ?? 0) * gain;
    if (last >= fade) {
      samples[last] = (samples[last] ?? 0) * gain;
    }
  }
  samples[0] = 0;
  samples[samples.length - 1] = 0;
}

function renderKick(length: number, bpm: number): Float32Array {
  const samples = new Float32Array(length);
  const period = (60 / bpm) * SAMPLE_RATE;
  const hits = Math.round(length / period);

  for (let hit = 0; hit < hits; hit += 1) {
    const start = Math.round(hit * period);
    let phase = 0;
    for (let i = 0; i < SAMPLE_RATE && start + i < length; i += 1) {
      const t = i / SAMPLE_RATE;
      const freq = 42 + 150 * Math.exp(-t * 18);
      phase += (TWO_PI * freq) / SAMPLE_RATE;
      const body = Math.sin(phase) * Math.exp(-t * 8);
      const click = Math.sin(TWO_PI * 1800 * t) * Math.exp(-t * 80) * 0.28;
      samples[start + i] = (samples[start + i] ?? 0) + body * 0.92 + click;
    }
  }

  return samples;
}

function renderShaker(length: number, bpm: number): Float32Array {
  const samples = new Float32Array(length);
  const sixteenth = ((60 / bpm) * SAMPLE_RATE) / 4;
  const hits = Math.round(length / sixteenth);
  let prev = 0;

  for (let hit = 0; hit < hits; hit += 1) {
    const start = Math.round(hit * sixteenth);
    const beat = hit % 4;
    const accent = beat === 0 ? 1 : beat === 2 ? 0.58 : 0.3;
    for (let i = 0; i < Math.round(SAMPLE_RATE * 0.042) && start + i < length; i += 1) {
      const t = i / SAMPLE_RATE;
      const noise = Math.random() * 2 - 1;
      const high = noise - prev;
      prev = noise;
      samples[start + i] =
        (samples[start + i] ?? 0) + high * Math.exp(-t * 92) * accent * 0.7;
    }
  }

  return samples;
}

function renderConga(length: number, bpm: number): Float32Array {
  const samples = new Float32Array(length);
  const period = (60 / bpm) * SAMPLE_RATE;
  const hits = Math.round(length / period);

  for (let hit = 0; hit < hits; hit += 1) {
    const start = Math.round(hit * period);
    const slap = hit % 2 === 0 ? 1 : 0.72;
    for (let i = 0; i < Math.round(SAMPLE_RATE * 0.28) && start + i < length; i += 1) {
      const t = i / SAMPLE_RATE;
      const tone =
        Math.sin(TWO_PI * 210 * t) + 0.42 * Math.sin(TWO_PI * 335 * t);
      const attack = (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.22;
      samples[start + i] =
        (samples[start + i] ?? 0) + (tone * 0.55 + attack) * Math.exp(-t * 13) * slap;
    }
  }

  return samples;
}

function renderSpec(spec: AudioFixtureSpec): Float32Array {
  const length = fixtureSampleCount(spec, SAMPLE_RATE);
  const samples =
    spec.id === "k7m2p9"
      ? renderKick(length, spec.originalBpm)
      : spec.id === "n4w8q1"
        ? renderShaker(length, spec.originalBpm)
        : renderConga(length, spec.originalBpm);
  sealLoop(samples, SAMPLE_RATE);
  return samples;
}

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "fixtures",
);
mkdirSync(outDir, { recursive: true });

for (const spec of AUDIO_FIXTURE_SPECS) {
  const wav = encodeWav(renderSpec(spec), SAMPLE_RATE);
  const path = join(outDir, spec.file);
  writeFileSync(path, wav);
  console.log(`${spec.file} ${wav.byteLength} bytes ${fixtureSampleCount(spec)} samples`);
}
