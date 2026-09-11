# Loop region analysis

Browser-side audio analysis for Loop region snap, BPM detection, and Key detection. Domain terms live in [../../../../CONTEXT.md](../../../../CONTEXT.md). Create Track UI layout lives in [../../../CONTEXT.md](../../../CONTEXT.md).

## Why this exists

Loop quality depends on three separable problems. DAWs and online loop tools usually solve them in layers:

| Problem | Symptom | Fix |
|---|---|---|
| Amplitude discontinuity | Click or pop at the seam | Snap to **zero crossing** (or minimum-amplitude crossing) |
| Phase / waveform mismatch | Flam, whoosh, or “wrong beat” feel at the wrap | **Cross-correlation** micro-adjustment (±20–50 ms) |
| Musical misalignment | Loop length is not whole bars or beats | **Beat grid** or **transient** snap |

A fourth layer — **seam crossfade** (5–50 ms at the wrap, separate from Transport fade) — masks whatever mismatch remains after snapping. That belongs in playback/render, not in this folder.

Loop points are always stored in **source file time**. Time-stretch (Target BPM vs Original BPM) does not move them; the stretch engine runs against file coordinates.

## Shipped (v1)

| Decision | Choice |
|---|---|
| Decode for analysis | Full sample rate via `AudioContext.decodeAudioData`. WavePlayer also decodes the waveform at 44.1 kHz so zoom can reach per-sample zero crossings |
| Snap mode | Zero crossing only, ±50 ms search (`DEFAULT_ZERO_CROSS_SEARCH_MS`) |
| When snap runs | Marker **drag release**, field **scrub release**, and loop time **text blur** — not on every pointer move |
| Before decode finishes | Drag and text edit work; snap is skipped until `snapLoopPoint` is available |
| Time storage | `m:ss` or `m:ss.sss` strings (e.g. `1:05.125`); sample-accurate after snap |
| Edge auto | Within ~50 ms of file start/end → stored as empty string (**Auto**) |
| In/Out order | In-point stays at or before Out-point; crossing swaps the two values. Equal is allowed |
| Mono mix | All channels averaged before zero-cross search |
| Crossing pick | Nearest to target time; tie-break on lower amplitude at the crossing |

### Snap pipeline (on commit)

```
raw seconds
  → optional zeroCrossSnap (±50 ms, full-rate buffer)
  → clampLoopTimes (order/swap, file bounds)
  → timeToStoredValue (edge auto, format m:ss.sss)
```

Orchestration for UI lives in `loop-region-time.ts` → `commitLoopPointSeconds()`. Analysis primitives live in this folder.

### Module layout

```
loop-analysis/
  CONTEXT.md           ← this file
  decode-audio.ts      ← File / URL → AudioBuffer (shared AudioContext)
  mono-mix.ts          ← AudioBuffer → Float32Array mono
  zero-crossing.ts     ← findNearestZeroCrossing()
  snap-loop-point.ts   ← snapLoopPointToZeroCrossing()

../use-loop-snap.ts    ← React hook: decode src, expose snapLoopPoint()
../loop-region-time.ts ← parse, format, clamp, commitLoopPointSeconds()
../loop-region-time.test.ts
../loop-playback.ts    ← preview wrap (hard seek today; seam crossfade later)
```

### Consumers

| Component | Role |
|---|---|
| `use-loop-snap.ts` | Decodes uploaded `File`; returns `snapLoopPoint \| null` |
| `audio-upload-field.tsx` | Calls `useLoopSnap(file)`; passes snap into WavePlayer and LoopRegionField |
| `wave-player.tsx` | Regions plugin: live times on `region-update`, zero-cross snap on `region-updated` |
| `loop-region-field.tsx` | Snap on blur or scrub release via `commitLoopPointSeconds`; drag the field to scrub |

WavePlayer opt-in: `loopRegion` prop. Library preview and other uses stay unchanged when `snapLoopPoint` is omitted.

## Agreed (not shipped)

BPM detection, Key detection, and Time-stretch sit next to loop snap. They are not in the tree yet. Create Track already decodes the file on the main thread via `useLoopSnap`.

| Decision | Choice |
|---|---|
| Where it runs | Browser **Web Worker**, this folder |
| When BPM / Key detection run | Automatically when the uploaded file finishes decoding |
| BPM library | `@audio/beat` (`detect()` → BPM, confidence, beat times, onsets). MIT. Percussion path is energy onsets. See [0016-audiojs-beat-and-stretch](../../../../docs/adr/0016-audiojs-beat-and-stretch.md) |
| BPM payload | BPM, confidence, and beat times. Create Track UI uses the BPM number now; beat times wait for beat-grid snap |
| Failed / low-confidence BPM | Still write the best guess as **Unconfirmed BPM** |
| What confirms Original BPM | Typing, **Tap tempo**, or **Half/double** (×2 / ÷2, Unconfirmed only) |
| Replace file | Re-run BPM detection while Original BPM is still Unconfirmed. Keep a confirmed value. Loop region still resets to Auto |
| Key detection | Same Worker, same decode. High confidence fills **Key**. Low confidence or no result leaves **No Key** |
| No Key | Future key-change UI does not apply. Play screen Key stays read-only either way |
| Time-stretch | Play screen only. Web Audio graph, `@audio/stretch-transient` in the stretch worklet. Create Track WavePlayer and Row preview play the file at its own speed. [0015-web-audio-stretch-graph](../../../../docs/adr/0015-web-audio-stretch-graph.md) |
| This pass | Wire BPM detection, Tap tempo, Half/double, and Key detection on Create Track. Prove Play screen stretch on a fixture/sample until upload persists audio |

Suggested Worker pipeline:

```
decode (full-rate AudioBuffer)
  → mono mix
  → @audio/beat detect()
  → optional Key detection (fill Key only at high confidence)
  → expose snapLoopPoint from the same buffer
```

## Industry reference (condensed)

**DAWs (Logic, Cubase, Ardour, Cakewalk):** layered snap — grid (bar/beat/subdivision), zero crossings, transients, event boundaries; snap on edit completion; optional magnetic intensity.

**Online tools:**

- **SOUNDLOOPER** — RMS envelope similarity for candidates; zero-cross alignment; loop compatibility score (level delta, connection smoothness, tonal balance).
- **PyMusicLooper** — chroma similarity at detected beats; optional search near approximate positions (`--approx-loop-position`).
- **audiolooper** — beats + novelty peaks + chroma scoring; ±50 ms cross-correlation at loop end vs start; downbeat-snapped crossfade lengths.
- **Phaseloop** — manual timeline align; snap to zero crossing on export.

**Phase alignment:** after coarse snap, cross-correlate a short window at In with ±50 ms around Out; shift Out by the best lag. Normalized correlation is enough for percussion; phase cross-correlation helps when amplitude varies widely.

**Auto-detect on upload (domain goal):** first whole bars from detected Original BPM; for percussion, onset/RMS similarity may beat pure chroma. Score candidates; leave Auto when confidence is low.

## Planned (not shipped)

| Feature | Notes |
|---|---|
| Beat grid snap | Original BPM + time signature + optional downbeat offset; prefer detected beats over math grid when BPM is Unconfirmed |
| Transient snap | Onset peaks when beat detection is weak |
| Phase micro-align | Cross-correlate Out against In after zero-cross snap |
| Auto loop on upload | Default In/Out from bar guess + scoring |
| Loop compatibility meter | UI feedback after both points set |
| Seam crossfade in preview | Playback concern; pairs with snap but not implemented here |

Suggested snap order when beat grid ships:

```
rawTime → beatGridSnap → zeroCrossSnap → phaseAlign (optional) → clamp → store
```

Suggested snap modes for UI: Off | Beat | Zero | Beat + Zero (default for worship percussion once beat grid exists).

## Constants

| Name | Value (Seconds) | File |
|---|---|---|
| `DEFAULT_ZERO_CROSS_SEARCH_MS` | 50 | `zero-crossing.ts` |
| `LOOP_EDGE_SNAP_SEC` | 0.05 | `loop-region-time.ts` |
| `LOOP_MIN_GAP_SEC` | 0.05 | `loop-region-time.ts` (Regions plugin minLength only) |
| `LOOP_WRAP_EPSILON_SEC` | 0.02 | `loop-playback.ts` |

## Tests

`loop-region-time.test.ts` — time parse/format round-trip, zero-crossing snap on synthetic buffers.

Run from `apps/web`:

```bash
bun test ./src/lib/loop-region-time.test.ts ./src/lib/loop-playback.test.ts
```

## Related

- [../../../CONTEXT.md](../../../CONTEXT.md) — Create Track loop region editor UI
- [../../../../CONTEXT.md](../../../../CONTEXT.md) — Loop region, Original BPM, Unconfirmed BPM, Key, No Key, Time-stretch
- [../../../../docs/adr/0004-pitch-preserving-stretch.md](../../../../docs/adr/0004-pitch-preserving-stretch.md) — pitch-preserving stretch, Key stays metadata, No Key has no key-change UI
- [../../../../docs/adr/0010-save-unconfirmed-bpm.md](../../../../docs/adr/0010-save-unconfirmed-bpm.md) — beat snap must degrade when BPM is unconfirmed
- [../../../../docs/adr/0015-web-audio-stretch-graph.md](../../../../docs/adr/0015-web-audio-stretch-graph.md) — Play screen Web Audio stretch graph
- [../../../../docs/adr/0016-audiojs-beat-and-stretch.md](../../../../docs/adr/0016-audiojs-beat-and-stretch.md) — `@audio/beat` and `@audio/stretch-transient`
