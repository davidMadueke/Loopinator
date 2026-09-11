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
  bpmUnconfirmed: boolean;
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
