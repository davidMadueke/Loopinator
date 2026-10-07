# Offline cache (handoff)

Implement the device Offline cache for public Play links. First open of `/t/{id}` or `/s/{id}` asks tRPC for a Play payload and a short-lived Blob URL, fetches the WAV/MP3, and stores the bytes. Later opens on that browser play from the stored file. The screen still renders if the network is gone, as long as the payload and audio were stored.

Do not reopen ADR-0021 or ADR-0011. Signed URLs expire. Cached bytes do not. Do not stream audio through Express.

Domain terms: [CONTEXT.md](../../CONTEXT.md). UI: [apps/web/CONTEXT.md](../../apps/web/CONTEXT.md). ADRs: [0011](../adr/0011-offline-cache.md), [0021](../adr/0021-private-blob-signed-url.md).

How Play routes choose mock vs tRPC: [play-source.md](./play-source.md). That slice owns `enableMockData` / `enableApiData` and `lib/audio.ts`. This slice only runs on the API path (`enableApiData`). Mock (`enableMockData`) keeps `getTrackById` / `getSetlistById` / fixture WAVs and must not write the Offline cache.

## What this is

| Term | Meaning here |
|---|---|
| Short id | Primary key of `Track` / `Setlist`. Same string as `/t/{id}` and `/s/{id}`. |
| Play payload | Public tRPC result for one Track or Setlist. Omits Filename, `blobPathname`, and Library-only fields. |
| Short-lived URL | Presigned private Blob GET, ~5 minutes. Fetch it, then throw it away. |
| Offline cache | Play payload + audio bytes on this device. Expires 30 days after last open. |
| Cache indicator | Cloud / Cloud-off chip on the Route breadcrumb. Not the Override dot. |
| Unavailable Track | A Setlist slot whose audio never finished caching and cannot be fetched now. Flag it before Play. Do not fail at Play. |
| `blobVersion` | Prisma field on `Track`. Column `audio_version`. Starts at 1. Bump it when the file is replaced. Client cache key uses this, never the signed URL. |

## Already built (do not redo)

- `Track.id` / `Setlist.id` are `@default(nanoid(8))`. Slot rows keep `cuid()` and have no public route.
- `Track.blobPathname` is unique, mapped to `audio_pathname`. Store the Blob pathname here, never a URL.
- `Track.blobVersion Int @default(1) @map("audio_version")` is in `packages/db/prisma/schema/library.prisma`.
- `packages/api/src/routers/play.ts` returns public Play payloads. It does **not** yet select `blobVersion`.
- `packages/api/src/routers/audio.ts` signs URLs:
  - `audio.forTrack` `{ trackId }`
  - `audio.forSetlistTrack` `{ setlistId, trackId }` (membership check, then same file)
  TTL is `URL_TTL_MS = 5 * 60 * 1000`. Soft-deleted tracks throw `NOT_FOUND`.
- `useTRPC` / `useTRPCClient` exist in `apps/web/src/utils/trpc.ts`.
- `CacheIndicator` in `route-breadcrumb.tsx` already reads `track.cached` / `setlist.cached`. Those flags currently come from mock data.
- `usePlayback` still loads `/fixtures/*.wav` via `getAudioFixture`. Decode helper `decodeAudioArrayBuffer` already exists.
- Play routes still import `@/lib/mock-data`. [play-source.md](./play-source.md) moves that file to `lib/dev/` and puts `getPlayTrack` / `getPlaySetlist` in `lib/audio.ts`.

## Out of scope for this slice

- Upload / replace-file (when that ships, it must increment `blobVersion` and write a new `blobPathname`).
- The mock/API toggle, the `lib/dev/` move, and `lib/audio.ts`. Implement [play-source.md](./play-source.md) first or in the same PR, then hang cache reads off `getPlay*` in API mode. Do not import `getTrackById` from a Play route.
- Service worker, PWA install prompt, background sync.
- Row preview, Create Track WavePlayer, `/dev/loop-preview`. Those keep fetching their own URLs.
- Changing Blob CORS or store privacy. Assume the store is private and the web origin can `fetch` a presigned GET.
- Persisting `audio.*` tRPC results. A signed URL is not a cache.

## Architecture

Two stores, because they have different shapes and TTLs.

| What | Where | Key | TTL |
|---|---|---|---|
| Audio bytes | Cache API, cache name `loopinator-audio-v1` | `/offline-audio/{trackId}/{blobVersion}` | 30 days after last open (enforced by a separate index) |
| Last-opened index | `localStorage` key `loopinator.offline-audio` | same cache key → `lastOpenedAt` ms | used to prune |
| Play payload | `localStorage` key `loopinator.offline-play` | `/t/{id}` or `/s/{id}` → `{ payload, lastOpenedAt }` | 30 days after last open |

Cache API has no TTL of its own. Prune both stores on app start (and after a successful open). A closed tab past 30 days is allowed to keep bytes until the next launch.

`cache.put` only succeeds if the whole body arrived. A dropped download stores nothing. That is the Unavailable Track rule. Do not write partial files.

Deduplicate in-flight downloads by cache key. Two slots on the same Track share one request.

Safari / iOS: `navigator.storage.persist()` is worth one call, but iOS often ignores it unless the site is on the home screen. Do not block the slice on that. Document it in a comment on the persist call.

## Play payload changes

`play.ts` must include `blobVersion` so the client can build a cache key before it asks for a URL.

**`play.track`** add `blobVersion: true` to `trackPlayFields`. Keep omitting `blobPathname`, `filename`, `softDeleted` (soft-deleted still maps to `NOT_FOUND`).

**`play.setlist`** expand the nested track select to `{ id, name, originalBPM, blobVersion }`. Do not send `blobPathname`. A slot whose track is `softDeleted` is an Unavailable Track: either omit the file and flag it, or include the track with a `removed: true` flag and skip the audio fetch. Pick the flag. Do not 404 the whole Setlist because one slot is gone.

A Setlist is `cached` only when its payload is stored **and** every unique live `trackId`+`blobVersion` has bytes in the Cache API.

Do not add `cached` to the server payload. It is per-device.

## Client module

Add `apps/web/src/lib/offline-cache/audio-cache.ts` (or split payload vs audio if the file gets large). Pure functions, no React.

Required exports:

```ts
type SignedUrl = { url: string; validUntil: number };
type FetchUrl = (trackId: string) => Promise<SignedUrl>;

ensureTrackAudio(trackId: string, blobVersion: number, fetchUrl: FetchUrl): Promise<void>
readTrackAudio(trackId: string, blobVersion: number): Promise<ArrayBuffer | null>
isTrackAudioCached(trackId: string, blobVersion: number): Promise<boolean>
pruneAudioCache(): Promise<void>           // 30-day sweep, drop older versions of the same trackId
touchTrackAudio(trackId: string, blobVersion: number): void

readPlayPayload<T>(routeKey: string): T | null
writePlayPayload(routeKey: string, payload: unknown): void
prunePlayPayloads(): void
```

`ensureTrackAudio` algorithm:

1. If `cache.match(key)` hits, `touch` and return.
2. Else `fetchUrl(trackId)`, then `fetch(url)`. If not `ok`, throw.
3. `cache.put(key, response)`. If this rejects, throw (nothing stored).
4. `touch`. Delete any other `/offline-audio/{trackId}/*` keys (stale versions).

`fetchUrl` is injected so Track vs Setlist membership stays at the call site:

```ts
const client = useTRPCClient();
const forTrack = (trackId: string) => client.audio.forTrack.query({ trackId });
const forSetlist = (setlistId: string) => (trackId: string) =>
  client.audio.forSetlistTrack.query({ setlistId, trackId });
```

Call these through `useTRPCClient()`, not `useQuery`. React Query must not cache or refetch a URL that dies in five minutes.

## Wire-up

### 1. Play routes go through `lib/audio.ts`

Do not call `play.track` / `play.setlist` from `t/$id.tsx` or `s/$id.tsx`. Those files call `getPlayTrack` / `getPlaySetlist` / `getPlayTrackForSlot` ([play-source.md](./play-source.md)).

Inside `getPlay*` when `enableApiData`:

1. `play.track` / `play.setlist` query (network). On success, `writePlayPayload`.
2. On network failure, `readPlayPayload`. If missing, return `undefined` and the route throws `notFound()`.
3. Map the payload onto existing `Track` / `Setlist` UI types. `cached` comes from `isTrackAudioCached` (Track) or "all unique tracks cached" (Setlist). `displayName` is `name`. `filename` / `dev` stay mock-only; Turso Play payloads have no Filename.

When `enableMockData`, `getPlay*` is `getTrackById` / `getSetlistById` / `getTrackForSlot`. Skip steps 1 to 3. Skip `ensureTrackAudio`. Fixture Play screen stays as it is.

### 2. `usePlayback`

Today: `decodeAudioUrl(fixture.url)`.

Turso path:

```
await ensureTrackAudio(trackId, blobVersion, fetchUrl)
const bytes = await readTrackAudio(trackId, blobVersion)
if (!bytes) → Unavailable Track (no buffer, existing empty-clock behaviour)
else decodeAudioArrayBuffer(bytes)
```

Keep the fixture branch when `enableMockData`, or when `getAudioFixture(trackId)` hits, or `dev` is set. Loop region for API tracks comes from the Play payload (`inPoint` / `outPoint`), not from `audio-fixtures.ts`. Slot copies of those fields already live on the Setlist slot; playback should prefer the slot's in/out when `mode === "setlist"`.

Pass `blobVersion` and `fetchUrl` into `usePlayback` on the API path only. Do not call `audio.forTrack` from a Setlist screen (`audio.forSetlistTrack` instead, via the injected `fetchUrl`).

### 3. Prefetch the rest of a Setlist

After the current slot's track is ensured (success or fail), walk unique `trackId`s in slot order, skip the one already fetched, `await ensureTrackAudio` **one at a time**. Collect failures into a `Set<string>`. Those ids are Unavailable Tracks.

Do not download two 40MB files in parallel. Venue wifi will lose both.

### 4. Cache indicator

Drive `CacheIndicator` from the Cache API, not mock `cached`. Update it when `ensureTrackAudio` finishes. A Setlist chip is "Cached" only when every unique live track is present.

### 5. Prune

Call `pruneAudioCache()` + `prunePlayPayloads()` once on app start (root client effect is enough). Also `touch` on every successful Play open so a weekly Sunday setlist never ages out.

Optional: `navigator.storage.persist()` next to that, fire-and-forget.

## Audio router nits (only if you touch the file)

- Prefer `ctx.prisma` over the direct `@loopinator/db` import, matching `play.ts`.
- `forSetlistTrack` already uses `findFirst` so duplicate slots do not double-sign. Keep that.
- Do not add `blobVersion` to the signed-URL response. The Play payload already has it. Returning it from `audio.*` would invite using the URL as a cache key.

## Tests

jsdom has no Cache API you can trust for this. Cover the index/prune logic with a fake `caches` + `localStorage`:

- `ensureTrackAudio` on a cache hit does not call `fetchUrl`.
- Failed `fetch` or failed `cache.put` leaves no entry.
- Two concurrent `ensureTrackAudio` for the same key share one in-flight promise.
- Bumping `blobVersion` stores a new key and deletes the old one.
- `pruneAudioCache` drops entries whose `lastOpenedAt` is older than 30 days and leaves younger ones.
- `play.track` / `play.setlist` selects include `blobVersion` (unit-test the mapper, or a tRPC handler test if one exists).

Do not add a Playwright "download 40MB" test in this slice.

## Done when

- Opening `/t/{id}` against Turso stores payload + audio. Reload with the network off still plays that Track.
- Opening `/s/{id}` stores the Setlist payload, plays the current slot, then fills the other unique tracks. A slot that never finished shows as Unavailable Track, not a thrown Play.
- Replacing a file (when upload exists later) is already supported by the key: new `blobVersion` misses the cache and refetches. No code in this slice needs to pretend to replace files.
- Mock fixture Play screen still works (`enableMockData`, `getPlayTrack` → `getTrackById`, no Cache API writes).
- Signed URLs are not written to `localStorage` or the Query cache.

## Suggested file layout

```
apps/web/src/lib/audio.ts                   ← Play source (see play-source.md)
apps/web/src/lib/play-payload.ts            ← API DTO → play-types (owned by play-source.md)
apps/web/src/lib/offline-cache/
  audio-cache.ts          ← Cache API + last-opened index + ensure/read/isCached/prune
  play-payload-cache.ts   ← localStorage Play payloads (split if audio-cache.ts stays small)
  audio-cache.test.ts
  play-payload-cache.test.ts

apps/web/src/hooks/use-playback.ts          ← API branch behind enableApiData
apps/web/src/routes/_play/t/$id.tsx         ← getPlayTrack only
apps/web/src/routes/_play/s/$id.tsx         ← getPlaySetlist + getPlayTrackForSlot
apps/web/src/components/play/route-breadcrumb.tsx  ← cached from Cache API when enableApiData
packages/api/src/routers/play.ts            ← select blobVersion
```

The DTO mapper lives in `lib/play-payload.ts` if `lib/audio.ts` gets crowded. Do not stuff Prisma enums into the Play screen. Do not import `@/lib/dev/mock-data` from the cache module.
