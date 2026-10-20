import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";

import { getPlaySetlist, getPlayTrack, getPlayTrackForSlot } from "@/lib/audio";
import { getSetlistById, getTrackById, getTrackForSlot } from "@/lib/dev/mock-data";
import type { PlaySetlistDto, PlayTrackDto } from "@/lib/play-payload";
import { usePlaySourceStore } from "@/stores/play-source-store";

function trackDto(overrides: Partial<PlayTrackDto> = {}): PlayTrackDto {
  return {
    id: "k7m2p9",
    name: "From API",
    originalBPM: 120,
    bpmAutoDetected: false,
    keyCenter: "D",
    keyMode: "major",
    keyAutoDetected: false,
    timeSignature: "FOUR_FOUR",
    inPoint: "",
    outPoint: "",
    transportFadeSec: 0,
    transportFadeCurve: "linear",
    blobVersion: 1,
    ...overrides,
  };
}

function setlistDto(): PlaySetlistDto {
  return {
    id: "p5d1m8",
    name: "From API",
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
          removed: false,
        },
      },
    ],
  };
}

beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
});

afterEach(() => {
  usePlaySourceStore.setState({ source: "mock" });
  localStorage.removeItem("loopinator.offline-play");
});

describe("getPlayTrack", () => {
  it("returns the same object as getTrackById for k7m2p9 in mock mode", async () => {
    usePlaySourceStore.setState({ source: "mock" });
    expect(await getPlayTrack("k7m2p9")).toEqual(getTrackById("k7m2p9"));
  });

  it("returns undefined for a garbage id in mock mode", async () => {
    usePlaySourceStore.setState({ source: "mock" });
    expect(await getPlayTrack("not-a-real-id")).toBeUndefined();
  });

  it("calls play.track in API mode and does not use getTrackById", async () => {
    usePlaySourceStore.setState({ source: "api" });
    const playTrack = mock(async () => trackDto());
    const track = await getPlayTrack("k7m2p9", { playTrack });
    expect(playTrack).toHaveBeenCalledTimes(1);
    expect(playTrack.mock.calls[0]?.[0]).toBe("k7m2p9");
    expect(track?.displayName).toBe("From API");
    expect(track?.displayName).not.toBe(getTrackById("k7m2p9")?.displayName);
    expect(track?.blobVersion).toBe(1);
    expect(track?.filename).toBe("");
    expect(track?.dev).toBe(false);
  });
});

describe("getPlaySetlist", () => {
  it("matches getSetlistById and getTrackForSlot for a DEMO setlist", async () => {
    usePlaySourceStore.setState({ source: "mock" });
    const setlist = await getPlaySetlist("p5d1m8");
    expect(setlist).toEqual(getSetlistById("p5d1m8"));
    expect(await getPlayTrackForSlot(setlist!, 0)).toEqual(getTrackForSlot(setlist!, 0));
    expect(await getPlayTrackForSlot(setlist!, 2)).toEqual(getTrackForSlot(setlist!, 2));
  });

  it("calls play.setlist in API mode and uses the nested slot track", async () => {
    usePlaySourceStore.setState({ source: "api" });
    const playSetlist = mock(async () => setlistDto());
    const playTrack = mock(async () => trackDto());
    const setlist = await getPlaySetlist("p5d1m8", { playSetlist, playTrack });
    expect(playSetlist).toHaveBeenCalledTimes(1);
    expect(setlist?.name).toBe("From API");
    const slotTrack = await getPlayTrackForSlot(setlist!, 0, { playSetlist, playTrack });
    expect(slotTrack?.id).toBe("r2t6h5");
    expect(playTrack).not.toHaveBeenCalled();
  });
});
