# Playback engine

One Web Audio session for Create Track preview, `/dev/loop-preview`, and the Play screen. WaveSurfer draws the waveform. It does not play. Domain terms live in [../../../../CONTEXT.md](../../../../CONTEXT.md). The cut that led here is [../../../../docs/playback-engine-review.md](../../../../docs/playback-engine-review.md) and [ADR-0019](../../../../docs/adr/0019-one-playback-engine.md).

UI calls `createPlaybackEngine` from `engine/active.ts`, never WaveSurfer media, never `@audio/*`. Time-stretch ratio math and the live worklet live in `loop-analysis/engine/stretch.ts`. The processor is the only other file that may import `@audio/stretch-transient`.

## Why this exists

WavePlayer used to wrap on `audioprocess` (~16 ms) and fade with `setTimeout`. The Play screen ring used a fake 4-beat RAF clock. Those clocks disagreed with Playhead, which is position inside the Loop region. One engine owns file time, Loop bounds, Transport fade, and Loop edge fade.

## Shipped (this pass)

| Decision | Choice |
|---|---|
| API | `createPlaybackEngine()`. WavePlayer and `usePlayback` each hold a session |
| Clock | `AudioContext.currentTime` while playing. File seconds, not React state |
| Playhead | `(fileTime − In) / (Out − In)`, wrapped at Out to 0 |
| Loop wrap | `AudioBufferSourceNode.loop` + `loopStart` / `loopEnd` when a buffer is loaded and stretch ratio is 1. The worklet loops in file time when ratio is not 1 |
| Outside the region on Play | Relocate to In-point before start |
| Loop edge fade | 4 ms linear ramps on `edgeGain`, scheduled on the audio clock from `loopEdgeGain` |
| Transport fade | Linear (default), exponential, or equal-power on `transportGain`. Displayed 0 s is 15 ms |
| Preview stretch | Ratio 1. File speed. Create Track and Row preview do not stretch and do not load the worklet |
| Sunday stretch | Ratio from `timeStretchEngine` inside the current Target BPM band. At ratio 1, buffer source. Otherwise the live worklet. A ratio-only stepper change reanchors the clock and messages factor; no Transport fade, no seek to In |
| No buffer | Silent clock still walks file time so the Playhead circle moves |
| Play screen stand-in region | 4 beats at Original BPM when the Track has no Audio fixture |
| Audio fixtures | `lib/audio-fixtures.ts` maps Track id → `/fixtures/*.wav` and a whole-file Loop region. Decode snaps In/Out |
| WavePlayer cursor | Engine `fileTime` drives `ws.setTime`. Waveform click/drag writes back via `interaction`, not media `seeking` |
| WavePlayer Restart | `restartResumes: true`. Seek In and play |
| Play screen Restart | `restartResumes: false`. Seek In and stay stopped |
| Do not | Drive audio from WaveSurfer. Do not `createMediaElementSource` on WaveSurfer's element |
| Do not | Use `playbackRate` for Target BPM. That is varispeed and breaks pitch |

### Graph

```
AudioBufferSourceNode (ratio 1) or stretch worklet (ratio ≠ 1)
  → transportGain     ← Transport fade
  → edgeGain          ← Loop edge fade
  → destination
```

Same gains either way. The worklet lives in `loop-analysis/engine/stretch-processor.ts`.

### Module layout

```
playback/
  CONTEXT.md
  playhead.ts                 ← file time ↔ Playhead 0–1, advanceFileTime
  loop-bounds.ts              ← getLoopBounds, shouldWrapLoop, clampFileTimeToLoop
  use-playback-engine.ts      ← React session + snapshot
  engine/
    types.ts                  ← PlaybackEngine contract
    params.ts                 ← TransportFade, LoopEdgeFade, click-safe 15 ms
    fade.ts                   ← GainNode ramps
    source.ts                 ← BufferSource at ratio 1; stretch worklet otherwise
    graph.ts                  ← session implementation
    active.ts                 ← createPlaybackEngine()
```

`../loop-playback.ts` and `../loop-edge-fade.ts` re-export the policy functions so older tests keep their paths.

### Consumers

| Caller | Role |
|---|---|
| `use-playback.ts` | Play screen Transport, Playhead circle, Tempo stepper |
| `wave-player.tsx` | Preview transport. WaveSurfer cursor follows `fileTime` |
| `playhead-panel.tsx` | Reads `playhead` only |

## Agreed (not shipped)

| Decision | Choice |
|---|---|
| Seam crossfade | Overlapping sources at Out → In, 5–50 ms. Not Loop edge fade |
| Upload Loop region on Play screen | Fixtures cover the three demo Tracks. Other Tracks keep the 4-beat stand-in until upload persists In / Out |
| Waveform peaks from the buffer | Skip WaveSurfer's second decode when we already have `AudioBuffer` |

## Tests

`playhead.test.ts` — wrap, Playhead 0–1, stand-in 4-beat region vs stretched wall clock, half-band 120 → 60.

`loop-bounds` coverage stays in `../loop-playback.test.ts`.

`engine/params.test.ts` — 15 ms click-safe Transport fade, 4 ms Loop edge fade.

Run from `apps/web`:

```bash
bun test ./src/lib/playback ./src/lib/loop-playback.test.ts ./src/lib/loop-edge-fade.test.ts
```

## Related

- [../../../../docs/playback-engine-review.md](../../../../docs/playback-engine-review.md) — review that produced this folder
- [../../../../docs/adr/0015-web-audio-stretch-graph.md](../../../../docs/adr/0015-web-audio-stretch-graph.md)
- [../../../../docs/adr/0017-audio-engine-seam.md](../../../../docs/adr/0017-audio-engine-seam.md)
- [../../../../docs/adr/0019-one-playback-engine.md](../../../../docs/adr/0019-one-playback-engine.md)
- [../loop-analysis/CONTEXT.md](../loop-analysis/CONTEXT.md) — decode, snap, stretch ratio
