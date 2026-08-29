import type { Setlist, Track } from "./play-types";

export const DEMO_TRACKS: Track[] = [
  {
    id: "k7m2p9",
    displayName: "Sunday Kick Loop",
    filename: "sunday-kick-loop.wav",
    songTitle: "Great Are You Lord",
    originalBpm: 120,
    bpmUnconfirmed: false,
    key: "D",
    keyMode: "major",
    timeSignature: "4/4",
    cached: true,
  },
  {
    id: "n4w8q1",
    displayName: "Shaker Groove",
    filename: "shaker-groove-154.mp3",
    songTitle: "Way Maker",
    originalBpm: 154,
    bpmUnconfirmed: true,
    key: "No Key",
    keyMode: "major",
    timeSignature: "4/4",
    cached: true,
  },
  {
    id: "r2t6h5",
    displayName: "Conga Fill",
    filename: "conga-fill-92.wav",
    songTitle: null,
    originalBpm: 92,
    bpmUnconfirmed: false,
    key: "G",
    keyMode: "minor",
    timeSignature: "6/8",
    cached: false,
  },
  {
    id: "b9c3x7",
    displayName: "Tambourine Pulse",
    filename: "tambourine-168.mp3",
    songTitle: "Build My Life",
    originalBpm: 168,
    bpmUnconfirmed: false,
    key: "E",
    keyMode: "major",
    timeSignature: "4/4",
    cached: true,
  },
  {
    id: "q8k4v3",
    displayName: "Extended Ambient Pad Swell With Reverse Cymbal Tail",
    filename: "extended-ambient-pad-swell-with-reverse-cymbal-tail-72.wav",
    songTitle: "Holy Forever (Combined Service Extended Arrangement)",
    originalBpm: 72,
    bpmUnconfirmed: false,
    key: "Bb",
    keyMode: "major",
    timeSignature: "4/4",
    cached: true,
  },
  {
    id: "z6y2n5",
    displayName: "Full Band Percussion Stack With Djembe, Shaker And Rim Clicks",
    filename: "full-band-percussion-stack-djembe-shaker-rim-clicks-104.mp3",
    songTitle: null,
    originalBpm: 104,
    bpmUnconfirmed: true,
    key: "F#",
    keyMode: "minor",
    timeSignature: "12/8",
    cached: false,
  },
];

export const DEMO_SETLISTS: Setlist[] = [
  {
    id: "x3f8s2",
    name: "Sunday AM",
    cached: true,
    slots: [
      { trackId: "k7m2p9", slotLabel: "Track 1", targetBpm: 120 },
      { trackId: "n4w8q1", slotLabel: "Track 2", targetBpm: 154 },
      { trackId: "b9c3x7", slotLabel: "Track 3", targetBpm: 166 },
    ],
  },
  {
    id: "p5d1m8",
    name: "Rehearsal Wed",
    cached: false,
    slots: [
      { trackId: "r2t6h5", slotLabel: "Track 1", targetBpm: 92 },
      { trackId: "k7m2p9", slotLabel: "Track 2", targetBpm: 118 },
    ],
  },
  {
    id: "w7j9t4",
    name: "Sunday Morning Combined Service With Youth Band And Choir",
    cached: false,
    slots: [
      {
        trackId: "q8k4v3",
        slotLabel: "Opening Worship Set, Track 1",
        targetBpm: 72,
      },
      {
        trackId: "z6y2n5",
        slotLabel: "Communion Response And Offering, Track 2",
        targetBpm: 104,
      },
      { trackId: "k7m2p9", slotLabel: "Track 3", targetBpm: 120 },
    ],
  },
];

export function getTrackById(id: string): Track | undefined {
  return DEMO_TRACKS.find((track) => track.id === id);
}

export function getSetlistById(id: string): Setlist | undefined {
  return DEMO_SETLISTS.find((setlist) => setlist.id === id);
}

export function getTrackForSlot(setlist: Setlist, slotIndex: number): Track | undefined {
  const slot = setlist.slots[slotIndex];
  if (!slot) {
    return undefined;
  }
  return getTrackById(slot.trackId);
}
