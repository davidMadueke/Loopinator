import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  AUDIO_CACHE_TTL_MS,
  ensureTrackAudio,
  isTrackAudioCached,
  pruneAudioCache,
  readTrackAudio,
} from "./audio-cache";

class MemoryCache {
  map = new Map<string, ArrayBuffer>();
  failPut = false;

  async match(request: RequestInfo) {
    const body = this.map.get(cacheKey(request));
    if (!body) {
      return undefined;
    }
    return new Response(body.slice(0));
  }

  async put(request: RequestInfo, response: Response) {
    if (this.failPut) {
      throw new Error("cache.put failed");
    }
    this.map.set(cacheKey(request), await response.clone().arrayBuffer());
  }

  async delete(request: RequestInfo) {
    return this.map.delete(cacheKey(request));
  }

  async keys() {
    return [...this.map.keys()].map((path) => new Request(`https://loop.test${path}`));
  }
}

class MemoryCacheStorage {
  stores = new Map<string, MemoryCache>();

  async open(name: string) {
    const existing = this.stores.get(name);
    if (existing) {
      return existing;
    }
    const created = new MemoryCache();
    this.stores.set(name, created);
    return created;
  }
}

function cacheKey(request: RequestInfo) {
  if (typeof request === "string") {
    return request;
  }
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}

const originalCaches = globalThis.caches;
const originalFetch = globalThis.fetch;
let storage: MemoryCacheStorage;

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

beforeEach(() => {
  storage = new MemoryCacheStorage();
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: storage,
  });
  localStorage.removeItem("loopinator.offline-audio");
});

afterEach(() => {
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: originalCaches,
  });
  globalThis.fetch = originalFetch;
  localStorage.removeItem("loopinator.offline-audio");
});

describe("ensureTrackAudio", () => {
  it("does not call fetchUrl on a cache hit", async () => {
    const fetchUrl = mock(async () => ({ url: "https://blob.test/a", validUntil: Date.now() + 1000 }));
    const fetchMock = mock(async () => new Response(new Uint8Array([1, 2, 3])));
    globalThis.fetch = fetchMock as typeof fetch;

    await ensureTrackAudio("k7m2p9", 1, fetchUrl);
    fetchUrl.mockClear();
    fetchMock.mockClear();

    await ensureTrackAudio("k7m2p9", 1, fetchUrl);
    expect(fetchUrl).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stores nothing when fetch fails", async () => {
    const fetchUrl = mock(async () => ({ url: "https://blob.test/a", validUntil: Date.now() + 1000 }));
    globalThis.fetch = mock(async () => new Response(null, { status: 500 })) as typeof fetch;

    await expect(ensureTrackAudio("k7m2p9", 1, fetchUrl)).rejects.toThrow();
    expect(await isTrackAudioCached("k7m2p9", 1)).toBe(false);
    expect(await readTrackAudio("k7m2p9", 1)).toBeNull();
  });

  it("stores nothing when cache.put fails", async () => {
    const cache = await storage.open("loopinator-audio-v1");
    cache.failPut = true;
    const fetchUrl = mock(async () => ({ url: "https://blob.test/a", validUntil: Date.now() + 1000 }));
    globalThis.fetch = mock(async () => new Response(new Uint8Array([1, 2, 3]))) as typeof fetch;

    await expect(ensureTrackAudio("k7m2p9", 1, fetchUrl)).rejects.toThrow("cache.put failed");
    cache.failPut = false;
    expect(await isTrackAudioCached("k7m2p9", 1)).toBe(false);
  });

  it("shares one in-flight promise for the same key", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchUrl = mock(async () => {
      await gate;
      return { url: "https://blob.test/a", validUntil: Date.now() + 1000 };
    });
    globalThis.fetch = mock(async () => new Response(new Uint8Array([9]))) as typeof fetch;

    const first = ensureTrackAudio("inflight-share", 1, fetchUrl);
    const second = ensureTrackAudio("inflight-share", 1, fetchUrl);
    expect(second === first).toBe(true);
    release();
    await Promise.all([first, second]);
    expect(fetchUrl).toHaveBeenCalledTimes(1);
  });

  it("stores a new blobVersion and deletes the old key", async () => {
    const fetchUrl = mock(async () => ({ url: "https://blob.test/a", validUntil: Date.now() + 1000 }));
    globalThis.fetch = mock(async () => new Response(new Uint8Array([1]))) as typeof fetch;

    await ensureTrackAudio("k7m2p9", 1, fetchUrl);
    expect(await isTrackAudioCached("k7m2p9", 1)).toBe(true);

    await ensureTrackAudio("k7m2p9", 2, fetchUrl);
    expect(await isTrackAudioCached("k7m2p9", 2)).toBe(true);
    expect(await isTrackAudioCached("k7m2p9", 1)).toBe(false);
  });
});

describe("pruneAudioCache", () => {
  it("drops entries older than 30 days and keeps younger ones", async () => {
    const fetchUrl = mock(async () => ({ url: "https://blob.test/a", validUntil: Date.now() + 1000 }));
    globalThis.fetch = mock(async () => new Response(new Uint8Array([1]))) as typeof fetch;

    await ensureTrackAudio("old", 1, fetchUrl);
    await ensureTrackAudio("young", 1, fetchUrl);

    const index = JSON.parse(localStorage.getItem("loopinator.offline-audio") ?? "{}") as Record<
      string,
      number
    >;
    index["/offline-audio/old/1"] = Date.now() - AUDIO_CACHE_TTL_MS - 1000;
    localStorage.setItem("loopinator.offline-audio", JSON.stringify(index));

    await pruneAudioCache();
    expect(await isTrackAudioCached("old", 1)).toBe(false);
    expect(await isTrackAudioCached("young", 1)).toBe(true);
  });
});
