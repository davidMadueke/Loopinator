# Loop region analysis

Browser-side audio analysis for Loop region snap, BPM detection, and Key detection. Domain terms live in [../../../../CONTEXT.md](../../../../CONTEXT.md). Create Track UI layout lives in [../../../CONTEXT.md](../../../CONTEXT.md).

## Why this exists

Loop quality depends on three separable problems. DAWs and online loop tools usually solve them in layers:

| Problem | Symptom | Fix |
|---|---|---|
| Amplitude discontinuity | Click or pop at the seam | Snap to **zero crossing** (or minimum-amplitude crossing) |
| Phase / waveform mismatch | Flam, whoosh, or “wrong beat” feel at the wrap | **Cross-correlation** micro-adjustment (±20–50 ms) |
| Musical misalignment | Loop length is not whole bars or beats | **Beat grid** or **transient** snap |

A fourth layer, **Loop edge fade** (fixed 4 ms at In-point and Out-point, also on Play, Pause, and Restart), kills clicks. It is not **Seam crossfade** (overlapping wrap, 5–50 ms, still later) and not **Transport fade**. Both fades live in `../playback/`. This folder does not play audio.

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
| Loop edge fade | 4 ms linear ramps on the playback engine `edgeGain`. Play, Pause, Restart, and wrap. Relocate to In-point before Play |
| Do not | Route the HTML `<audio>` element through `createMediaElementSource`. That second graph froze the playhead |
| BPM / Key detection | Browser **Web Worker** after the same full-rate decode. UI talks to `audioAnalysisEngine`, never `@audio/*`. [0017-audio-engine-seam](../../../../docs/adr/0017-audio-engine-seam.md) |
| BPM library | `@audio/beat` `detect()` behind `engine/bpm.ts`. Always writes the guess as **Auto-detected BPM** |
| What clears Auto-detected BPM | Typing, **Tap tempo**, or **Half/double** (×2 / ÷2) |
| Replace file | Reset every Create Track field. Detection fills Original BPM and Key from the new file. Loop region resets to Auto |
| Key library | `@audio/mir-chroma` + `@audio/mir-key` behind `engine/key.ts`. High confidence fills **Key**. Low confidence or no result leaves **No Key** |
| Key on replace | Reset Key to **No Key**. Detection fills it again from the new file |
| Key confidence | Pearson r ≥ `KEY_MIN_CONFIDENCE` (0.75) and winner–runner-up gap ≥ `KEY_MIN_CONFIDENCE_GAP` (0.08) |

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
  CONTEXT.md                 ← this file
  decode-audio.ts            ← File / URL → AudioBuffer (shared AudioContext)
  mono-mix.ts                ← AudioBuffer → Float32Array mono
  zero-crossing.ts           ← findNearestZeroCrossing()
  snap-loop-point.ts         ← snapLoopPointToZeroCrossing()
  apply-detection.ts         ← Auto-detected BPM / Key write rules
  tap-tempo.ts               ← TAP interval → Original BPM
  track-analysis.worker.ts   ← BPM + Key Worker
  use-track-analysis.ts      ← post decoded buffer to the Worker
  engine/
    types.ts                 ← AudioAnalysisEngine, stretch, transpose contracts
    active.ts                ← current BPM + Key backends
    bpm.ts                   ← @audio/beat only
    key.ts                   ← @audio/mir-chroma + @audio/mir-key only
    stretch.ts               ← Time-stretch ratio math; worklet later
    transpose.ts             ← v1 unused

../use-loop-snap.ts    ← React hook: decode src, expose snapLoopPoint()
../loop-region-time.ts ← parse, format, clamp, commitLoopPointSeconds()
../loop-region-time.test.ts
../loop-playback.ts    ← re-exports playback/loop-bounds
../loop-edge-fade.ts   ← re-exports playback Loop edge fade math
../playback/           ← file-time clock, Loop wrap, Transport fade, Loop edge fade
```

### Consumers

| Component | Role |
|---|---|
| `use-loop-snap.ts` | Decodes uploaded `File`; returns `snapLoopPoint \| null` and the buffer |
| `use-track-analysis.ts` | Sends that buffer to the Worker; returns BPM and Key results |
| `create-track-panel.tsx` | Owns Auto-detected: detection writes Auto-detected BPM / Key only |
| `audio-upload-field.tsx` | Receives `snapLoopPoint`; passes snap into WavePlayer and LoopRegionField |
| `wave-player.tsx` | Regions plugin: live times on `region-update`, zero-cross snap on `region-updated`. Audio from `createPlaybackEngine`. WaveSurfer is visual |
| `loop-region-field.tsx` | Snap on blur or scrub release via `commitLoopPointSeconds`; drag the field to scrub |

WavePlayer opt-in: `loopRegion` prop. Library preview and other uses stay unchanged when `snapLoopPoint` is omitted.

## Agreed (not shipped)

Time-stretch sits next to loop snap and detection. Create Track already decodes on the main thread via `useLoopSnap` and runs BPM / Key detection in the Worker.

| Decision | Choice |
|---|---|
| Time-stretch | Play screen only. Web Audio graph, `@audio/stretch-transient` in the stretch worklet. Create Track WavePlayer and Row preview play the file at its own speed. [0015-web-audio-stretch-graph](../../../../docs/adr/0015-web-audio-stretch-graph.md) |
| Stretch backend | `engine/stretch.ts` already holds the Target / Original ratio. The worklet is not wired |
| This pass leftover | Prove Play screen stretch on a fixture/sample until upload persists audio |

Worker pipeline now:

```
decode (full-rate AudioBuffer, main thread)
  → mono mix
  → Worker: audioAnalysisEngine.detectBpm + detectKey
  → Create Track applies Auto-detected BPM / high-confidence Key
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
| Beat grid snap | Original BPM + time signature + optional downbeat offset; prefer detected beats over math grid when BPM is Auto-detected |
| Transient snap | Onset peaks when beat detection is weak |
| Phase micro-align | Cross-correlate Out against In after zero-cross snap |
| Auto loop on upload | Default In/Out from bar guess + scoring |
| Loop compatibility meter | UI feedback after both points set |
| Seam crossfade in preview | Overlapping wrap, still later. Loop edge fade already ships as sequential 4 ms in/out |

Suggested snap order when beat grid ships:

```
rawTime → beatGridSnap → zeroCrossSnap → phaseAlign (optional) → clamp → store
```

Suggested snap modes for UI: Off | Beat | Zero | Beat + Zero (default for worship percussion once beat grid exists).

## Constants

| Name | Value | File |
|---|---|---|
| `DEFAULT_ZERO_CROSS_SEARCH_MS` | 50 ms | `zero-crossing.ts` |
| `LOOP_EDGE_SNAP_SEC` | 0.05 s | `loop-region-time.ts` |
| `LOOP_MIN_GAP_SEC` | 0.05 s | `loop-region-time.ts` (Regions plugin minLength only) |
| `LOOP_WRAP_EPSILON_SEC` | 0.02 s | `loop-playback.ts` |
| `LOOP_IN_SEEK_SLOP_SEC` | 0.002 s | `loop-playback.ts` |
| `LOOP_EDGE_FADE_SEC` | 0.004 s | `loop-edge-fade.ts` |
| `KEY_MIN_CONFIDENCE` | 0.75 Pearson r | `engine/key.ts` |
| `KEY_MIN_CONFIDENCE_GAP` | 0.08 | `engine/key.ts` |
| `TAP_RESET_MS` | 2000 ms | `tap-tempo.ts` |
| `TAP_MIN_COUNT` | 2 | `tap-tempo.ts` |

## Tests

`loop-region-time.test.ts` — time parse/format round-trip, zero-crossing snap on synthetic buffers.

`loop-edge-fade.test.ts` — 4 ms Loop edge fade envelope at In-point, Out-point, and short regions.

`loop-playback.test.ts` — wrap at Out-point, wrap before In-point, 2 ms seek slop at In-point.

`apply-detection.test.ts`, `tap-tempo.test.ts`, `engine/key.test.ts`, `engine/bpm.test.ts` — detection write rules, TAP math, Key confidence, `@audio/beat` on a click track.

Run from `apps/web`:

```bash
bun test ./src/lib/loop-region-time.test.ts ./src/lib/loop-playback.test.ts ./src/lib/loop-edge-fade.test.ts ./src/lib/loop-analysis ./src/lib/playback
```

## Related

- [../../../CONTEXT.md](../../../CONTEXT.md) — Create Track loop region editor UI
- [../../../../CONTEXT.md](../../../../CONTEXT.md) — Loop region, Loop edge fade, Transport fade, Seam crossfade, Original BPM, Auto-detected BPM, Key, Auto-detected Key, No Key, Time-stretch
- [../../../../docs/adr/0004-pitch-preserving-stretch.md](../../../../docs/adr/0004-pitch-preserving-stretch.md) — pitch-preserving stretch, Key stays metadata, No Key has no key-change UI
- [../../../../docs/adr/0010-save-unconfirmed-bpm.md](../../../../docs/adr/0010-save-unconfirmed-bpm.md) — beat snap must degrade when BPM is Auto-detected
- [../../../../docs/adr/0015-web-audio-stretch-graph.md](../../../../docs/adr/0015-web-audio-stretch-graph.md) — Play screen Web Audio stretch graph
- [../../../../docs/adr/0016-audiojs-beat-and-stretch.md](../../../../docs/adr/0016-audiojs-beat-and-stretch.md) — `@audio/beat` and `@audio/stretch-transient`
- [../../../../docs/adr/0017-audio-engine-seam.md](../../../../docs/adr/0017-audio-engine-seam.md) — UI never imports `@audio/*`; swap backends in `engine/`
- [../../../../docs/adr/0019-one-playback-engine.md](../../../../docs/adr/0019-one-playback-engine.md) — one playback session, WaveSurfer is visual
- [../playback/CONTEXT.md](../playback/CONTEXT.md) — file-time clock, fades, Loop wrap
