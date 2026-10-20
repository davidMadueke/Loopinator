import type { KeyCenter, KeyScale, Setlist, SetlistSlot, TimeSignature, Track } from "@/lib/play-types";
import { KEY_CENTERS, TIME_SIGNATURES } from "@/lib/play-types";

export type PlayTrackDto = {
  id: string;
  name: string;
  originalBPM: number;
  bpmAutoDetected: boolean;
  keyCenter: string;
  keyMode: KeyScale;
  keyAutoDetected: boolean;
  timeSignature: string;
  inPoint: string;
  outPoint: string;
  transportFadeSec: number;
  transportFadeCurve: string;
  blobVersion: number;
};

export type PlaySetlistNestedTrackDto = {
  id: string;
  name: string;
  originalBPM: number;
  blobVersion: number;
  removed: boolean;
};

export type PlaySetlistSlotDto = {
  id: string;
  position: number;
  trackId: string;
  slotLabel: string;
  targetBpm: number;
  keyCenter: string;
  keyMode: KeyScale;
  keyAutoDetected: boolean;
  timeSignature: string;
  inPoint: string;
  outPoint: string;
  transportFadeSec: number;
  transportFadeCurve: string;
  track: PlaySetlistNestedTrackDto | null;
};

export type PlaySetlistDto = {
  id: string;
  name: string;
  slots: PlaySetlistSlotDto[];
};

const MUSICAL_KEY_TO_UI: Record<string, KeyCenter> = {
  NO_KEY: "No Key",
  "No Key": "No Key",
  C: "C",
  C_SHARP: "C#",
  "C#": "C#",
  D_FLAT: "Db",
  Db: "Db",
  D: "D",
  D_SHARP: "D#",
  "D#": "D#",
  E_FLAT: "Eb",
  Eb: "Eb",
  E: "E",
  F: "F",
  F_SHARP: "F#",
  "F#": "F#",
  G_FLAT: "Gb",
  Gb: "Gb",
  G: "G",
  G_SHARP: "G#",
  "G#": "G#",
  A_FLAT: "Ab",
  Ab: "Ab",
  A: "A",
  A_SHARP: "A#",
  "A#": "A#",
  B_FLAT: "Bb",
  Bb: "Bb",
  B: "B",
};

const TIME_SIGNATURE_TO_UI: Record<string, TimeSignature> = {
  FOUR_FOUR: "4/4",
  "4/4": "4/4",
  THREE_FOUR: "3/4",
  "3/4": "3/4",
  SIX_EIGHT: "6/8",
  "6/8": "6/8",
  TWELVE_EIGHT: "12/8",
  "12/8": "12/8",
  TWO_FOUR: "2/4",
  "2/4": "2/4",
};

export function mapKeyCenter(value: string): KeyCenter {
  const mapped = MUSICAL_KEY_TO_UI[value];
  if (mapped && KEY_CENTERS.includes(mapped)) {
    return mapped;
  }
  return "No Key";
}

export function mapTimeSignature(value: string): TimeSignature {
  const mapped = TIME_SIGNATURE_TO_UI[value];
  if (mapped && TIME_SIGNATURES.includes(mapped)) {
    return mapped;
  }
  return "4/4";
}

function mapNestedTrack(
  dto: PlaySetlistNestedTrackDto,
  slot: PlaySetlistSlotDto,
  cached: boolean,
): Track {
  return {
    id: dto.id,
    displayName: dto.name,
    filename: "",
    originalBpm: dto.originalBPM,
    bpmAutoDetected: false,
    keyAutoDetected: slot.keyAutoDetected,
    key: mapKeyCenter(slot.keyCenter),
    keyMode: slot.keyMode,
    timeSignature: mapTimeSignature(slot.timeSignature),
    cached,
    dev: false,
    blobVersion: dto.blobVersion,
    inPoint: slot.inPoint,
    outPoint: slot.outPoint,
    removed: dto.removed,
  };
}

function placeholderTrack(slot: PlaySetlistSlotDto): Track {
  return {
    id: slot.trackId,
    displayName: slot.slotLabel,
    filename: "",
    originalBpm: slot.targetBpm,
    bpmAutoDetected: false,
    keyAutoDetected: slot.keyAutoDetected,
    key: mapKeyCenter(slot.keyCenter),
    keyMode: slot.keyMode,
    timeSignature: mapTimeSignature(slot.timeSignature),
    cached: false,
    dev: false,
    inPoint: slot.inPoint,
    outPoint: slot.outPoint,
    removed: true,
  };
}

export function mapPlayTrack(dto: PlayTrackDto, cached: boolean): Track {
  return {
    id: dto.id,
    displayName: dto.name,
    filename: "",
    originalBpm: dto.originalBPM,
    bpmAutoDetected: dto.bpmAutoDetected,
    keyAutoDetected: dto.keyAutoDetected,
    key: mapKeyCenter(dto.keyCenter),
    keyMode: dto.keyMode,
    timeSignature: mapTimeSignature(dto.timeSignature),
    cached,
    dev: false,
    blobVersion: dto.blobVersion,
    inPoint: dto.inPoint,
    outPoint: dto.outPoint,
  };
}

export function mapPlaySlot(dto: PlaySetlistSlotDto, cached: boolean): SetlistSlot {
  const removed = !dto.track || dto.track.removed;
  const track = dto.track
    ? mapNestedTrack(dto.track, dto, removed ? false : cached)
    : placeholderTrack(dto);

  return {
    trackId: dto.trackId,
    slotLabel: dto.slotLabel,
    targetBpm: dto.targetBpm,
    timeSignature: mapTimeSignature(dto.timeSignature),
    key: mapKeyCenter(dto.keyCenter),
    keyMode: dto.keyMode,
    inPoint: dto.inPoint,
    outPoint: dto.outPoint,
    removed,
    track,
  };
}

export function mapPlaySetlist(dto: PlaySetlistDto, cached: boolean): Setlist {
  return {
    id: dto.id,
    name: dto.name,
    slots: dto.slots.map((slot) => mapPlaySlot(slot, cached)),
    cached,
  };
}

export function uniqueLiveTracks(
  setlist: Setlist,
): Array<{ trackId: string; blobVersion: number }> {
  const seen = new Set<string>();
  const out: Array<{ trackId: string; blobVersion: number }> = [];

  for (const slot of setlist.slots) {
    if (slot.removed) {
      continue;
    }
    const blobVersion = slot.track?.blobVersion;
    if (blobVersion == null) {
      continue;
    }
    const key = `${slot.trackId}:${blobVersion}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({ trackId: slot.trackId, blobVersion });
  }

  return out;
}
