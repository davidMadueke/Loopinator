import { BPM_BANDS, BPM_BAND_LABELS, type BpmBand, type Track } from "./play-types";

/** Extra tracks per band so Load more takes a couple of clicks once demo rows are included. */
const FIXTURES_PER_BAND = 11;

const BAND_BASE_BPM: Record<BpmBand, number> = {
  "under-80": 72,
  "80-99": 90,
  "100-129": 110,
  "130-159": 140,
  "160-plus": 168,
};

export const PAGINATION_FIXTURE_TRACKS: Track[] = BPM_BANDS.flatMap((band) => {
  const baseBpm = BAND_BASE_BPM[band];
  const label = BPM_BAND_LABELS[band];

  return Array.from({ length: FIXTURES_PER_BAND }, (_, index) => {
    const n = index + 1;
    const originalBpm = baseBpm + (index % 5);

    return {
      id: `pg-${band}-${n}`,
      displayName: `Pagination fixture ${label} ${n}`,
      filename: `pagination-fixture-${band}-${n}.wav`,
      originalBpm,
      bpmAutoDetected: false,
      keyAutoDetected: false,
      key: "C",
      keyMode: "major" as const,
      timeSignature: "4/4" as const,
      cached: false,
    };
  });
});
