const STORAGE_KEY = "loopinator.offline-play";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type PayloadEntry = {
  payload: unknown;
  lastOpenedAt: number;
};

type PayloadIndex = Record<string, PayloadEntry>;

function canUseStorage() {
  return typeof localStorage !== "undefined";
}

function readIndex(): PayloadIndex {
  if (!canUseStorage()) {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as PayloadIndex;
  } catch {
    return {};
  }
}

function writeIndex(index: PayloadIndex) {
  if (!canUseStorage()) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
}

export function readPlayPayload<T>(routeKey: string): T | null {
  const entry = readIndex()[routeKey];
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.lastOpenedAt > TTL_MS) {
    return null;
  }
  return entry.payload as T;
}

export function writePlayPayload(routeKey: string, payload: unknown): void {
  const index = readIndex();
  index[routeKey] = { payload, lastOpenedAt: Date.now() };
  writeIndex(index);
}

export function touchPlayPayload(routeKey: string): void {
  const index = readIndex();
  const entry = index[routeKey];
  if (!entry) {
    return;
  }
  entry.lastOpenedAt = Date.now();
  writeIndex(index);
}

export function prunePlayPayloads(): void {
  const index = readIndex();
  const now = Date.now();
  let changed = false;
  for (const [key, entry] of Object.entries(index)) {
    if (now - entry.lastOpenedAt > TTL_MS) {
      delete index[key];
      changed = true;
    }
  }
  if (changed) {
    writeIndex(index);
  }
}

export const PLAY_PAYLOAD_TTL_MS = TTL_MS;
