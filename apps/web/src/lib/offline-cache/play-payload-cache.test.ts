import { afterEach, beforeAll, describe, expect, it } from "bun:test";

import {
  PLAY_PAYLOAD_TTL_MS,
  prunePlayPayloads,
  readPlayPayload,
  writePlayPayload,
} from "./play-payload-cache";

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
  localStorage.removeItem("loopinator.offline-play");
});

describe("play payload cache", () => {
  it("round-trips a payload and prunes entries older than 30 days", () => {
    writePlayPayload("/t/k7m2p9", { id: "k7m2p9", name: "Sunday Kick Loop" });
    expect(readPlayPayload<{ id: string }>("/t/k7m2p9")?.id).toBe("k7m2p9");

    const index = JSON.parse(localStorage.getItem("loopinator.offline-play") ?? "{}") as Record<
      string,
      { payload: unknown; lastOpenedAt: number }
    >;
    index["/t/old"] = {
      payload: { id: "old" },
      lastOpenedAt: Date.now() - PLAY_PAYLOAD_TTL_MS - 1000,
    };
    localStorage.setItem("loopinator.offline-play", JSON.stringify(index));

    prunePlayPayloads();
    expect(readPlayPayload("/t/k7m2p9")).not.toBeNull();
    expect(readPlayPayload("/t/old")).toBeNull();
  });
});
