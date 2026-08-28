# Loop region analysis

Browser-side audio analysis for placing Loop region In-points and Out-points. Domain terms (Loop region, In-point, Out-point) live in [../../../../CONTEXT.md](../../../../CONTEXT.md). Create Track UI layout lives in [../../../CONTEXT.md](../../../CONTEXT.md).

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
| Decode for analysis | Full sample rate via `AudioContext.decodeAudioData`, separate from Wavesurfer’s 8 kHz waveform decode |
| Snap mode | Zero crossing only, ±50 ms search (`DEFAULT_ZERO_CROSS_SEARCH_MS`) |
| When snap runs | Marker **drag release** and loop time **text blur** — not on every pointer move |
| Before decode finishes | Drag and text edit work; snap is skipped until `snapLoopPoint` is available |
| Time storage | `m:ss` or `m:ss.sss` strings (e.g. `1:05.125`); sample-accurate after snap |
| Edge auto | Within ~50 ms of file start/end → stored as empty string (**Auto**) |
| Min gap | In stays ≥50 ms before Out when clamping |
| Mono mix | All channels averaged before zero-cross search |
| Crossing pick | Nearest to target time; tie-break on lower amplitude at the crossing |

### Snap pipeline (on commit)

```
raw seconds
  → optional zeroCrossSnap (±50 ms, full-rate buffer)
  → clampLoopTimes (min gap, file bounds)
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
| `wave-player.tsx` | `loopRegion.snapLoopPoint`; Regions plugin snaps on `region-updated` |
| `loop-region-overlay.tsx` | Free drag while moving; snap on pointer up (`LOOP_REGION_IMPL === "custom"`) |
| `loop-region-field.tsx` | Snap on blur via `commitLoopPointSeconds` |

WavePlayer opt-in: `loopRegion` prop. Library preview and other uses stay unchanged when `snapLoopPoint` is omitted.

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
| Web Worker | Move decode + future beat/onset analysis off the main thread |
| Seam crossfade in preview | Playback concern; pairs with snap but not implemented here |

Suggested snap order when beat grid ships:

```
rawTime → beatGridSnap → zeroCrossSnap → phaseAlign (optional) → clamp → store
```

Suggested snap modes for UI: Off | Beat | Zero | Beat + Zero (default for worship percussion once beat grid exists).

## Constants

| Name | Value | File |
|---|---|---|
| `DEFAULT_ZERO_CROSS_SEARCH_MS` | 50 | `zero-crossing.ts` |
| `LOOP_EDGE_SNAP_SEC` | 0.05 | `loop-region-time.ts` |
| `LOOP_MIN_GAP_SEC` | 0.05 | `loop-region-time.ts` |
| `LOOP_WRAP_EPSILON_SEC` | 0.02 | `loop-playback.ts` |

## Tests

`loop-region-time.test.ts` — time parse/format round-trip, zero-crossing snap on synthetic buffers.

Run from `apps/web`:

```bash
bun test ./src/lib/loop-region-time.test.ts ./src/lib/loop-playback.test.ts
```

## Related

- [../../../CONTEXT.md](../../../CONTEXT.md) — Create Track loop region editor UI
- [../../../../CONTEXT.md](../../../../CONTEXT.md) — Loop region, seam crossfade, Original BPM
- [../../../../docs/adr/0010-save-unconfirmed-bpm.md](../../../../docs/adr/0010-save-unconfirmed-bpm.md) — beat snap must degrade when BPM is unconfirmed
