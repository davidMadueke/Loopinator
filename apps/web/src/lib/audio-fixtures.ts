export const AUDIO_FIXTURE_SAMPLE_RATE = 44100;

/** Shared silent file for Tracks marked `dev`. Long enough for a 4-beat stand-in down to 30 BPM. */
export const DEV_SILENT_FIXTURE_FILE = "dev-silent.wav";
export const DEV_SILENT_DURATION_SEC = 8;

export type AudioFixtureSpec = {
  id: string;
  file: string;
  originalBpm: number;
  bars: 4;
  pulsesPerBar: number;
};

export const AUDIO_FIXTURE_SPECS: readonly AudioFixtureSpec[] = [
  {
    id: "k7m2p9",
    file: "sunday-kick-loop.wav",
    originalBpm: 120,
    bars: 4,
    pulsesPerBar: 4,
  },
  {
    id: "n4w8q1",
    file: "shaker-groove-154.wav",
    originalBpm: 154,
    bars: 4,
    pulsesPerBar: 4,
  },
  {
    id: "r2t6h5",
    file: "conga-fill-92.wav",
    originalBpm: 92,
    bars: 4,
    pulsesPerBar: 2,
  },
];

export function fixtureSampleCount(
  spec: AudioFixtureSpec,
  sampleRate = AUDIO_FIXTURE_SAMPLE_RATE,
): number {
  return Math.round(
    spec.bars * spec.pulsesPerBar * (60 / spec.originalBpm) * sampleRate,
  );
}

export function fixtureDurationSec(
  spec: AudioFixtureSpec,
  sampleRate = AUDIO_FIXTURE_SAMPLE_RATE,
): number {
  return fixtureSampleCount(spec, sampleRate) / sampleRate;
}

export type AudioFixture = {
  url: string;
  inPoint: string;
  outPoint: string;
};

export const DEV_SILENT_FIXTURE: AudioFixture = {
  url: `/fixtures/${DEV_SILENT_FIXTURE_FILE}`,
  inPoint: "",
  outPoint: "",
};

export const AUDIO_FIXTURES: Record<string, AudioFixture> = Object.fromEntries(
  AUDIO_FIXTURE_SPECS.map((spec) => [
    spec.id,
    {
      url: `/fixtures/${spec.file}`,
      inPoint: "",
      outPoint: "",
    },
  ]),
);

export function getAudioFixture(trackId: string): AudioFixture | undefined {
  return AUDIO_FIXTURES[trackId];
}
