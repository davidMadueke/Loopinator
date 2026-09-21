import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "bun:test";

import {
  AUDIO_FIXTURE_SAMPLE_RATE,
  AUDIO_FIXTURE_SPECS,
  AUDIO_FIXTURES,
  DEV_SILENT_DURATION_SEC,
  DEV_SILENT_FIXTURE,
  DEV_SILENT_FIXTURE_FILE,
  fixtureDurationSec,
  fixtureSampleCount,
  getAudioFixture,
} from "./audio-fixtures";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/fixtures",
);

function wavDurationSec(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sampleRate = view.getUint32(24, true);
  const blockAlign = view.getUint16(32, true);
  const dataSize = view.getUint32(40, true);
  return dataSize / blockAlign / sampleRate;
}

describe("audio fixtures", () => {
  it("side-maps the three Play screen Tracks by id", () => {
    expect(getAudioFixture("k7m2p9")?.url).toBe("/fixtures/sunday-kick-loop.wav");
    expect(getAudioFixture("n4w8q1")?.url).toBe("/fixtures/shaker-groove-154.wav");
    expect(getAudioFixture("r2t6h5")?.url).toBe("/fixtures/conga-fill-92.wav");
    expect(AUDIO_FIXTURES.k7m2p9?.inPoint).toBe("");
    expect(AUDIO_FIXTURES.k7m2p9?.outPoint).toBe("");
    expect(getAudioFixture("missing")).toBeUndefined();
  });

  it("keeps Sunday Kick at 8 seconds and the other two at four bars", () => {
    expect(fixtureSampleCount(AUDIO_FIXTURE_SPECS[0]!)).toBe(
      8 * AUDIO_FIXTURE_SAMPLE_RATE,
    );
    expect(fixtureDurationSec(AUDIO_FIXTURE_SPECS[1]!)).toBeCloseTo(
      (16 * 60) / 154,
      5,
    );
    expect(fixtureDurationSec(AUDIO_FIXTURE_SPECS[2]!)).toBeCloseTo(
      (8 * 60) / 92,
      5,
    );
  });

  it("commits WAV durations that match the side map", () => {
    for (const spec of AUDIO_FIXTURE_SPECS) {
      const bytes = readFileSync(join(fixturesDir, spec.file));
      expect(wavDurationSec(bytes)).toBeCloseTo(
        fixtureDurationSec(spec),
        5,
      );
    }
  });

  it("commits a silent WAV for dev tracks", () => {
    const bytes = readFileSync(join(fixturesDir, DEV_SILENT_FIXTURE_FILE));
    expect(DEV_SILENT_FIXTURE.url).toBe(`/fixtures/${DEV_SILENT_FIXTURE_FILE}`);
    expect(wavDurationSec(bytes)).toBeCloseTo(DEV_SILENT_DURATION_SEC, 5);

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dataSize = view.getUint32(40, true);
    let peak = 0;
    for (let offset = 44; offset < 44 + dataSize; offset += 2) {
      peak = Math.max(peak, Math.abs(view.getInt16(offset, true)));
    }
    expect(peak).toBe(0);
  });
});
