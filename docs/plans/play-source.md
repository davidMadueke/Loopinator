# Play source: mock vs API (handoff)

Move UI/frontend testing data out of `apps/web/src/lib/`, then put one module in front of PlayScreen so `/t/{id}` and `/s/{id}` stop importing mock helpers directly.

Sibling plan: [offline-cache.md](./offline-cache.md). That slice fills and reads the device cache. This slice decides whether a Play route even talks to tRPC.

Domain: [CONTEXT.md](../../CONTEXT.md) (Play payload, Short id, Offline cache). Library source table: [apps/web/CONTEXT.md](../../apps/web/CONTEXT.md) (mock vs turso). Session seam to copy: [0013](../adr/0013-session-source-seam.md).

## Goal

`PlayScreen` keeps the same props it has today. The routes do not know whether those props came from `DEMO_TRACKS` or from `play.track` / `play.setlist`.

```
/_play/t/$id  ──►  lib/audio.ts  ──►  enableMockData  ► getTrackById
                 (Play source)        enableApiData   ► play.track + mapper
/_play/s/$id  ──►  same module   ──►  getSetlistById + getTrackForSlot
                                      or play.setlist + mapper
```

## Folder move

Put everything that exists only so the UI can be designed and tested under `apps/web/src/lib/dev/`. The user called this `lib/div`. The path is `lib/dev`, matching `lib/session` and the "dev flags" below. Do not name it `div`.

Move:

| From | To |
|---|---|
| `apps/web/src/lib/mock-data.ts` | `apps/web/src/lib/dev/mock-data.ts` |
| `apps/web/src/lib/pagination-fixtures.ts` | `apps/web/src/lib/dev/pagination-fixtures.ts` |

Keep `getTrackById`, `getSetlistById`, `getTrackForSlot`, `getLibraryTracks`, `DEMO_TRACKS`, `DEMO_SETLISTS`. Update their import of `PAGINATION_FIXTURE_TRACKS` to the new neighbour.

Leave in `lib/` (not testing-only):

- `play-types.ts` (UI types PlayScreen already uses)
- `audio-fixtures.ts` (real WAV URLs `usePlayback` decodes in mock mode)
- `session/`, `playback/`, `loop-analysis/`

Fix every import of `@/lib/mock-data`. Current callers:

- `routes/_play/t/$id.tsx`
- `routes/_play/s/$id.tsx`
- `components/play/route-breadcrumb.tsx`
- `components/play/library-tracks-tab.tsx`
- `components/play/library-setlists-tab.tsx`
- `components/play/create-setlist-panel.tsx`
- `components/play/create-form-state.test.ts`

After this slice the two Play routes must not import `lib/dev/mock-data`. Library tabs, breadcrumb pickers, and Create Setlist may keep importing `DEMO_*` until a later Library-source pass. That is allowed. Play links are the gate.

Delete `lib/mock-data.ts` once the move compiles. Do not leave a re-export stub.

## Flags

Names: `enableMockData` and `enableApiData`. They are a pair, never both true.

Store them as one Zustand value, same shape as `pagination-fixtures-store` (toggle without a reload). Derive the booleans:

```ts
type PlaySource = "mock" | "api";

enableMockData  === source === "mock"
enableApiData   === source === "api"
```

Rules, copied from the Library source table in `apps/web/CONTEXT.md`:

- `bun dev` defaults to mock.
- A deployment is always API. The toggle must not render in a production build (`import.meta.env.DEV`).
- API mode still needs a real Better Auth session for Library writes. Public Play reads do not. `play.*` and `audio.*` are `publicProcedure`. Dummy Editor is not enough for writes, and it is not required to open `/t/{id}`.
- Mock writes stay disabled (Create / Save / Delete). That is already true.

Do not add a `VITE_` env for this unless you need a default other than "mock in dev, api in prod". Session source uses `VITE_SESSION_SOURCE` because it is fixed at page load. This toggle is live, so a store wins.

Mount the toggle next to the existing pagination-fixtures control in `dev-session-toggle.tsx` (dev-only). Labels: Mock data / API data.

## `lib/audio.ts`

This is the Play source. Production routes import it. It may import `lib/dev/mock-data`, never the other way around.

Exports (async, even on the mock path, so the routes stay identical):

```ts
getPlayTrack(id: string): Promise<Track | undefined>
getPlaySetlist(id: string): Promise<Setlist | undefined>
getPlayTrackForSlot(setlist: Setlist, slotIndex: number): Promise<Track | undefined>
```

Those three are the objects `PlayScreen` needs: `track`, `setlist`, and the current slot's `track`. `slotIndex` / `onSlotChange` stay in the route.

**Mock (`enableMockData`).** Call the existing helpers. Do not invent a second lookup.

```ts
getPlayTrack(id)           → getTrackById(id)
getPlaySetlist(id)         → getSetlistById(id)
getPlayTrackForSlot(...)   → getTrackForSlot(...)
```

Wrap in `Promise.resolve`. Pagination fixtures still flow through `getTrackById`'s `fixturesEnabled` argument / store. Do not call tRPC. Do not write the Offline cache. `usePlayback` keeps using `getAudioFixture` / the silent WAV.

**API (`enableApiData`).**

```ts
getPlayTrack(id)           → trpc.play.track.query({ id }) then mapPlayTrack
getPlaySetlist(id)         → trpc.play.setlist.query({ id }) then mapPlaySetlist
getPlayTrackForSlot(...)   → same as mock (slot.trackId + getPlayTrack)
                             or take the nested track from the setlist payload
                             if you already fetched it. One network call per open.
```

On network failure, read the stored Play payload from the Offline cache ([offline-cache.md](./offline-cache.md)). Missing payload is `undefined`, and the route throws `notFound()`.

Map API DTOs onto `play-types.ts`. Do not leak Prisma enums into PlayScreen.

| API field | UI field |
|---|---|
| `name` | `displayName` |
| `originalBPM` | `originalBpm` |
| `keyCenter` | `key` (serialize the enum the way Library Filters already does) |
| `blobVersion` | keep on the mapped object (extend `Track` if needed) so the cache key exists |
| (absent) `filename` | `""` |
| (absent) `dev` | `false` |
| (absent) `cached` | `isTrackAudioCached(id, blobVersion)` after the cache module exists; `false` until then |

A Setlist's `cached` flag is "every unique live track is cached". Compute it on the client.

`getPlayTrackForSlot` on the API path must not call `audio.forTrack` with a Track id that is not in that Setlist. Prefer the nested `track` on the slot, or `audio.forSetlistTrack` when the offline-cache slice asks for bytes. Membership is the Setlist procedure's job.

## Route changes

`t/$id.tsx` today:

```ts
const track = getTrackById(id, fixturesEnabled);
if (!track) throw notFound();
return <PlayScreen key={track.id} mode="track" track={track} />;
```

Becomes: `const track = await getPlayTrack(id)` (loader, or a small hook that suspends / waits). Same `notFound()` and same `PlayScreen` props.

`s/$id.tsx` today uses `getSetlistById` + `getTrackForSlot`. Same swap: `getPlaySetlist` then `getPlayTrackForSlot`. Keep the `key={setlist.id}` remount and local `slotIndex` state.

Do not put `enableMockData` checks in the route files.

## PlayScreen / `usePlayback`

`PlayScreen` does not import `lib/dev` or tRPC. It already receives `track` / `setlist`.

`usePlayback` still branches on whether a fixture URL exists. That is independent of these flags. Mock tracks with an `audio-fixtures.ts` entry keep decoding `/fixtures/*.wav`. API tracks go through `ensureTrackAudio` once [offline-cache.md](./offline-cache.md) lands. If this slice ships first, API mode can render the Play screen with no buffer (existing empty-clock path) until the cache module exists.

## Tests

- `getPlayTrack` with `enableMockData` returns the same object as `getTrackById` for `k7m2p9` and `undefined` for a garbage id.
- `getPlaySetlist` + `getPlayTrackForSlot` match `getSetlistById` / `getTrackForSlot` for a DEMO setlist.
- With `enableApiData`, the module calls `play.track` / `play.setlist` (mock the tRPC client). It does not call `getTrackById`.
- Both flags cannot read as true from the store.
- Production build path: `import.meta.env.DEV === false` forces API even if someone left the store on mock.

Keep `create-form-state.test.ts` importing `DEMO_TRACKS` from `@/lib/dev/mock-data`.

## Done when

- `lib/mock-data.ts` is gone. Call sites compile against `@/lib/dev/mock-data` or `@/lib/audio`.
- `/t/{id}` and `/s/{id}` import only `@/lib/audio` for Track/Setlist lookup.
- Flipping the dev toggle from Mock to API makes the next Play open hit tRPC (or the stored payload). Flipping back hits `getTrackById` / `getSetlistById`.
- Fixture Play screen (`k7m2p9` and friends) still works on mock.

## Suggested file layout

```
apps/web/src/lib/audio.ts                 ← Play source (the only import Play routes use)
apps/web/src/lib/audio.test.ts
apps/web/src/lib/play-payload.ts          ← API DTO → play-types mapper (if audio.ts gets crowded)
apps/web/src/lib/dev/
  mock-data.ts                            ← DEMO_* + getTrackById / getSetlistById / getTrackForSlot
  pagination-fixtures.ts
apps/web/src/stores/play-source-store.ts  ← source: "mock" | "api"; enableMockData / enableApiData
apps/web/src/routes/_play/t/$id.tsx       ← getPlayTrack
apps/web/src/routes/_play/s/$id.tsx       ← getPlaySetlist + getPlayTrackForSlot
```

## Out of scope

- Offline cache implementation (the other plan). This slice only has to leave a `getPlay*` API those functions can sit behind.
- Switching Library tabs / breadcrumb pickers off `DEMO_*`. Same flags can feed that later.
- Moving `audio-fixtures.ts`.
- Upload, seed, or `blobVersion` bumping.
