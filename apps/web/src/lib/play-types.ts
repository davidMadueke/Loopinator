export type TimeSignature = "4/4" | "3/4" | "6/8" | "12/8" | "2/4";

export type Track = {
  id: string;
  displayName: string;
  filename: string;
  songTitle: string | null;
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
};

export type Setlist = {
  id: string;
  name: string;
  slots: SetlistSlot[];
  cached: boolean;
};

export type BpmBand = "under-80" | "80-99" | "100-129" | "130-159" | "160-plus";

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
