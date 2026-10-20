const AUDIO_CACHE_NAME = "loopinator-audio-v1";
const AUDIO_INDEX_KEY = "loopinator.offline-audio";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^\/offline-audio\/([^/]+)\/(\d+)$/;

export type SignedUrl = { url: string; validUntil: number };
export type FetchUrl = (trackId: string) => Promise<SignedUrl>;

type AudioIndex = Record<string, number>;
type CacheListener = () => void;

const listeners = new Set<CacheListener>();
const inflight = new Map<string, Promise<void>>();

export function audioCacheKey(trackId: string, blobVersion: number) {
  return `/offline-audio/${trackId}/${blobVersion}`;
}

export function subscribeAudioCache(listener: CacheListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyAudioCache() {
  for (const listener of listeners) {
    listener();
  }
}

function canUseStorage() {
  return typeof localStorage !== "undefined";
}

function readIndex(): AudioIndex {
  if (!canUseStorage()) {
    return {};
  }
  try {
    const raw = localStorage.getItem(AUDIO_INDEX_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as AudioIndex;
  } catch {
    return {};
  }
}

function writeIndex(index: AudioIndex) {
  if (!canUseStorage()) {
    return;
  }
  localStorage.setItem(AUDIO_INDEX_KEY, JSON.stringify(index));
}

function parseAudioKey(key: string): { trackId: string; blobVersion: number } | null {
  const match = KEY_PATTERN.exec(key);
  if (!match) {
    return null;
  }
  return { trackId: match[1] ?? "", blobVersion: Number(match[2]) };
}

function requestPath(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}

async function openAudioCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") {
    return null;
  }
  return caches.open(AUDIO_CACHE_NAME);
}

export function touchTrackAudio(trackId: string, blobVersion: number): void {
  const key = audioCacheKey(trackId, blobVersion);
  const index = readIndex();
  index[key] = Date.now();
  writeIndex(index);
}

async function deleteOtherVersions(cache: Cache, trackId: string, keepVersion: number) {
  const keys = await cache.keys();
  for (const request of keys) {
    const path = requestPath(request);
    const parsed = parseAudioKey(path);
    if (!parsed || parsed.trackId !== trackId || parsed.blobVersion === keepVersion) {
      continue;
    }
    await cache.delete(request);
    const index = readIndex();
    delete index[path];
    writeIndex(index);
  }
}

async function ensureTrackAudioOnce(
  trackId: string,
  blobVersion: number,
  fetchUrl: FetchUrl,
): Promise<void> {
  const key = audioCacheKey(trackId, blobVersion);
  const cache = await openAudioCache();
  if (!cache) {
    throw new Error("Cache API is not available");
  }

  const hit = await cache.match(key);
  if (hit) {
    touchTrackAudio(trackId, blobVersion);
    return;
  }

  const signed = await fetchUrl(trackId);
  const response = await fetch(signed.url);
  if (!response.ok) {
    throw new Error(`Audio download failed: ${response.status}`);
  }

  await cache.put(key, response);
  await deleteOtherVersions(cache, trackId, blobVersion);
  touchTrackAudio(trackId, blobVersion);
  notifyAudioCache();
}

export function ensureTrackAudio(
  trackId: string,
  blobVersion: number,
  fetchUrl: FetchUrl,
): Promise<void> {
  const key = audioCacheKey(trackId, blobVersion);
  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }

  const promise = ensureTrackAudioOnce(trackId, blobVersion, fetchUrl).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

export async function readTrackAudio(
  trackId: string,
  blobVersion: number,
): Promise<ArrayBuffer | null> {
  const cache = await openAudioCache();
  if (!cache) {
    return null;
  }
  const hit = await cache.match(audioCacheKey(trackId, blobVersion));
  if (!hit) {
    return null;
  }
  return hit.arrayBuffer();
}

export async function isTrackAudioCached(
  trackId: string,
  blobVersion: number,
): Promise<boolean> {
  const cache = await openAudioCache();
  if (!cache) {
    return false;
  }
  const hit = await cache.match(audioCacheKey(trackId, blobVersion));
  return Boolean(hit);
}

export async function pruneAudioCache(): Promise<void> {
  const cache = await openAudioCache();
  if (!cache) {
    return;
  }

  const index = readIndex();
  const now = Date.now();
  const keys = await cache.keys();
  const latestByTrack = new Map<string, { version: number; openedAt: number; path: string }>();

  for (const request of keys) {
    const path = requestPath(request);
    const parsed = parseAudioKey(path);
    const openedAt = index[path];
    const stale = openedAt == null || now - openedAt > TTL_MS;
    if (!parsed || stale) {
      await cache.delete(request);
      delete index[path];
      continue;
    }

    const current = latestByTrack.get(parsed.trackId);
    if (!current || openedAt > current.openedAt) {
      latestByTrack.set(parsed.trackId, {
        version: parsed.blobVersion,
        openedAt,
        path,
      });
    }
  }

  for (const request of await cache.keys()) {
    const path = requestPath(request);
    const parsed = parseAudioKey(path);
    if (!parsed) {
      await cache.delete(request);
      delete index[path];
      continue;
    }
    const keep = latestByTrack.get(parsed.trackId);
    if (!keep || keep.path !== path) {
      await cache.delete(request);
      delete index[path];
    }
  }

  writeIndex(index);
  notifyAudioCache();
}

export const AUDIO_CACHE_TTL_MS = TTL_MS;
