export type TimeSignature = "4/4" | "3/4" | "6/8" | "12/8" | "2/4";

export const TIME_SIGNATURES: TimeSignature[] = ["4/4", "3/4", "6/8", "12/8", "2/4"];

export type KeyCenter =
  | "No Key"
  | "C"
  | "C#"
  | "Db"
  | "D"
  | "D#"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "Gb"
  | "G"
  | "G#"
  | "Ab"
  | "A"
  | "A#"
  | "Bb"
  | "B";

export type KeyScale = "major" | "minor";

export type TrackKey = {
  center: KeyCenter;
  scale: KeyScale;
};

export const KEY_CENTERS: KeyCenter[] = [
  "No Key",
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
];

export const KEY_SCALES: KeyScale[] = ["major", "minor"];

export const DEFAULT_TRACK_KEY: TrackKey = {
  center: "No Key",
  scale: "major",
};

export type Track = {
  id: string;
  displayName: string;
  filename: string;
  originalBpm: number;
  bpmAutoDetected: boolean;
  key: string;
  keyMode: "major" | "minor";
  timeSignature: TimeSignature;
  cached: boolean;
};

export type SetlistSlot = {
  trackId: string;
  slotLabel: string;
  targetBpm: number;
  timeSignature: TimeSignature;
  key: string;
  keyMode: "major" | "minor";
};

export type Setlist = {
  id: string;
  name: string;
  slots: SetlistSlot[];
  cached: boolean;
};

export type BpmBand = "under-80" | "80-99" | "100-129" | "130-159" | "160-plus";

export const BPM_BANDS: BpmBand[] = ["under-80", "80-99", "100-129", "130-159", "160-plus"];

export function getBpmBand(bpm: number): BpmBand {
  if (bpm < 80) return "under-80";
  if (bpm < 100) return "80-99";
  if (bpm < 130) return "100-129";
  if (bpm < 160) return "130-159";
  return "160-plus";
}

export const BPM_BAND_LABELS: Record<BpmBand, string> = {
  "under-80": "Under 80 BPM",
  "80-99": "80 to 99 BPM",
  "100-129": "100 to 129 BPM",
  "130-159": "130 to 159 BPM",
  "160-plus": "160 BPM or more",
};

export type PlaybackMode = "stopped" | "playing" | "paused";

export type PlaybackState = {
  mode: PlaybackMode;
  playhead: number;
  targetBpm: number;
  hasLocalOverride: boolean;
};

export function clampTargetBpm(originalBpm: number, targetBpm: number) {
  const min = originalBpm * 0.8;
  const max = originalBpm * 1.2;
  return Math.min(max, Math.max(min, targetBpm));
}

export type TargetBpmBand = "half" | "original" | "double";

const TARGET_BPM_BAND_FACTOR: Record<TargetBpmBand, number> = {
  half: 0.5,
  original: 1,
  double: 2,
};

const TARGET_BPM_BANDS: TargetBpmBand[] = ["half", "original", "double"];

/** ±20% around half, original, and double Original BPM. ADR-0018. */
export const TARGET_BPM_BAND_MARGIN = 0.2;

export function targetBpmBandBounds(originalBpm: number, band: TargetBpmBand) {
  const center = originalBpm * TARGET_BPM_BAND_FACTOR[band];
  return {
    min: center * (1 - TARGET_BPM_BAND_MARGIN),
    max: center * (1 + TARGET_BPM_BAND_MARGIN),
  };
}

export function resolveTargetBpmBand(originalBpm: number, targetBpm: number): TargetBpmBand {
  for (const band of TARGET_BPM_BANDS) {
    const { min, max } = targetBpmBandBounds(originalBpm, band);
    if (targetBpm >= min && targetBpm <= max) {
      return band;
    }
  }

  let nearest: TargetBpmBand = "original";
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const band of TARGET_BPM_BANDS) {
    const center = originalBpm * TARGET_BPM_BAND_FACTOR[band];
    const distance = Math.abs(targetBpm - center);
    if (distance < nearestDistance) {
      nearest = band;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function clampTargetBpmInBand(
  originalBpm: number,
  targetBpm: number,
  band: TargetBpmBand = resolveTargetBpmBand(originalBpm, targetBpm),
) {
  const { min, max } = targetBpmBandBounds(originalBpm, band);
  return Math.round(Math.min(max, Math.max(min, targetBpm)));
}

export function stepTargetBpm(originalBpm: number, targetBpm: number, delta: number) {
  const band = resolveTargetBpmBand(originalBpm, targetBpm);
  return clampTargetBpmInBand(originalBpm, targetBpm + delta, band);
}

/** ×2 or ÷2. May leave the current band, then clamps into the destination. */
export function scaleTargetBpm(originalBpm: number, targetBpm: number, factor: 2 | 0.5) {
  const currentBand = resolveTargetBpmBand(originalBpm, targetBpm);
  const destination: TargetBpmBand =
    factor === 2
      ? currentBand === "half"
        ? "original"
        : "double"
      : currentBand === "double"
        ? "original"
        : "half";
  return clampTargetBpmInBand(originalBpm, targetBpm * factor, destination);
}

export function commitTargetBpmInput(originalBpm: number, current: number, raw: string) {
  const parsed = Number(raw.trim());
  const band = resolveTargetBpmBand(originalBpm, current);
  if (!Number.isFinite(parsed)) {
    return clampTargetBpmInBand(originalBpm, current, band);
  }
  return clampTargetBpmInBand(originalBpm, parsed, band);
}

/** Inclusive Original BPM bounds. Change these to retune Create Track validation. */
export const MIN_ORIGINAL_BPM = 30;
export const MAX_ORIGINAL_BPM = 999;

/** Implicit Original BPM when the field is empty and the stepper is used. */
export const DEFAULT_ORIGINAL_BPM = 120;

export function clampOriginalBpm(bpm: number) {
  return Math.min(MAX_ORIGINAL_BPM, Math.max(MIN_ORIGINAL_BPM, Math.round(bpm)));
}

/** Draft sanitizer. Empty stays empty. Values below min are kept so "50" can be typed. */
export function sanitizeOriginalBpmDraft(raw: string): string | null {
  if (raw === "") return "";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > MAX_ORIGINAL_BPM) return String(MAX_ORIGINAL_BPM);
  if (parsed < 0) return null;
  if (!Number.isInteger(parsed)) return String(Math.trunc(parsed));
  return String(parsed);
}

/** Blur/commit: empty stays empty, anything else clamps into range. */
export function commitOriginalBpmInput(raw: string) {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return "";
  return String(clampOriginalBpm(parsed));
}

export function stepOriginalBpm(current: string, direction: 1 | -1) {
  const parsed = current.trim() === "" ? Number.NaN : Number(current);
  const base = Number.isFinite(parsed) ? parsed : DEFAULT_ORIGINAL_BPM;
  return String(clampOriginalBpm(base + direction));
}

/** ×2 or ÷2 for Half/double. Empty or invalid stays put. */
export function scaleOriginalBpm(current: string, factor: 2 | 0.5) {
  const parsed = Number(current);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return current;
  }
  return String(clampOriginalBpm(parsed * factor));
}
