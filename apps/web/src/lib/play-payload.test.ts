import { describe, expect, it } from "bun:test";

import {
  mapKeyCenter,
  mapPlaySetlist,
  mapPlayTrack,
  mapTimeSignature,
  uniqueLiveTracks,
  type PlaySetlistDto,
  type PlayTrackDto,
} from "./play-payload";

const trackDto: PlayTrackDto = {
  id: "k7m2p9",
  name: "Sunday Kick Loop",
  originalBPM: 120,
  bpmAutoDetected: false,
  keyCenter: "C_SHARP",
  keyMode: "minor",
  keyAutoDetected: true,
  timeSignature: "SIX_EIGHT",
  inPoint: "0.1",
  outPoint: "2.2",
  transportFadeSec: 0,
  transportFadeCurve: "linear",
  blobVersion: 3,
};

describe("mapPlayTrack", () => {
  it("maps API fields onto play-types and keeps blobVersion", () => {
    const track = mapPlayTrack(trackDto, true);
    expect(track.displayName).toBe("Sunday Kick Loop");
    expect(track.originalBpm).toBe(120);
    expect(track.key).toBe("C#");
    expect(track.keyMode).toBe("minor");
    expect(track.timeSignature).toBe("6/8");
    expect(track.blobVersion).toBe(3);
    expect(track.filename).toBe("");
    expect(track.dev).toBe(false);
    expect(track.cached).toBe(true);
    expect(track.inPoint).toBe("0.1");
    expect(track.outPoint).toBe("2.2");
  });
});

describe("mapPlaySetlist", () => {
  it("flags a removed nested track without dropping the Setlist", () => {
    const dto: PlaySetlistDto = {
      id: "p5d1m8",
      name: "Rehearsal Wed",
      slots: [
        {
          id: "slot-1",
          position: 0,
          trackId: "r2t6h5",
          slotLabel: "Track 1",
          targetBpm: 92,
          keyCenter: "G",
          keyMode: "minor",
          keyAutoDetected: false,
          timeSignature: "SIX_EIGHT",
          inPoint: "",
          outPoint: "",
          transportFadeSec: 0,
          transportFadeCurve: "linear",
          track: {
            id: "r2t6h5",
            name: "Conga Fill",
            originalBPM: 92,
            blobVersion: 1,
            removed: true,
          },
        },
        {
          id: "slot-2",
          position: 1,
          trackId: "k7m2p9",
          slotLabel: "Track 2",
          targetBpm: 118,
          keyCenter: "C",
          keyMode: "major",
          keyAutoDetected: false,
          timeSignature: "FOUR_FOUR",
          inPoint: "",
          outPoint: "",
          transportFadeSec: 0,
          transportFadeCurve: "linear",
          track: {
            id: "k7m2p9",
            name: "Sunday Kick Loop",
            originalBPM: 120,
            blobVersion: 1,
            removed: false,
          },
        },
      ],
    };

    const setlist = mapPlaySetlist(dto, false);
    expect(setlist.slots[0]?.removed).toBe(true);
    expect(setlist.slots[0]?.track?.removed).toBe(true);
    expect(uniqueLiveTracks(setlist)).toEqual([{ trackId: "k7m2p9", blobVersion: 1 }]);
  });
});

describe("enum mappers", () => {
  it("serializes Prisma key and time-signature enums the way Library Filters does", () => {
    expect(mapKeyCenter("NO_KEY")).toBe("No Key");
    expect(mapKeyCenter("B_FLAT")).toBe("Bb");
    expect(mapTimeSignature("TWELVE_EIGHT")).toBe("12/8");
  });
});
