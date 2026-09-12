# Playback engine review

In-repo copy of the architecture cut that led to [ADR-0019](adr/0019-one-playback-engine.md). The same review is the Cursor canvas `playback-engine-review.canvas.tsx` beside the chat. Implementation decisions live in [apps/web/src/lib/playback/CONTEXT.md](../apps/web/src/lib/playback/CONTEXT.md).

## Verdict

PlayheadPanel is a view. It must not own audio. WavePlayer is an editor plus waveform. It must not own the clock. Both call `createPlaybackEngine`.

ADR-0015 already forbids HTMLAudio and Wavesurfer for Time-stretch, Transport fade, and Seam crossfade. Growing WavePlayer into the Play screen would lock those out.

## Two clocks that existed before this pass

| Surface | Clock | Audio | Loop wrap | Stretch |
|---|---|---|---|---|
| WavePlayer | WaveSurfer `currentTime`, file seconds | WaveSurfer media + optional GainNode | `audioprocess` poll, then `setTime(In)` | None. File speed. |
| usePlayback | RAF. `(60_000 / Target BPM) × 4` | None | Ring modulo 1 | Tempo only spun the fake ring |
| PlayheadPanel | Reads Playhead 0-1 | None | Draws the wrap as a ring | Shows Target BPM |

Domain Playhead is position inside the Loop region. A 3 s region at 120 → 144 BPM wraps every 2.5 s of wall clock. The old RAF stub wrapped every 1.667 s and never read In-point or Out-point.

## Share the rules, not the WaveSurfer instance

Keep shared: `getLoopBounds`, wrap decisions, `loopEdgeGain`, file time to Playhead 0-1, Space Active-transport stack, In / Out in source file time.

Preview only: WaveSurfer, regions, zoom, follow-playhead, Loop preview toggle, Restart that seeks In and plays.

Sunday: Web Audio graph, Transport fade, Restart that stays paused at In, stretch worklet, Seam crossfade later.

## WavePlayer pitfalls this engine must not copy

- Poll wrap (`audioprocess` ~16 ms, epsilon 20 ms) can pass Out before wrap.
- Sequential `setTimeout` fade then seek. Ends do not overlap. Seam needs two sources.
- `loopEdgeGain` was tested and unused on the live path.
- React `setCurrentTime` was treated as the clock.
- Seek slider was file-absolute and could land outside the region.
- `getGainNode()` could return null because WaveSurfer was never given a WebAudioPlayer.

## Sunday graph

AudioBuffer → stretch worklet (later) → Transport fade GainNode → Loop edge fade GainNode → destination.

Source file time stays canonical. Stretch ratio is Target / Original from `timeStretchEngine`. Playhead = `(fileTime − In) / (Out − In)`, wrapped at 1. Wall-clock cycle is `loopLength / stretchRatio`.

Until the worklet lands, ratio ≠ 1 runs the clock and stays silent. Preview always uses ratio 1 and plays the buffer.

## Build order

1. Extract wrap and Playhead 0-1 from WaveSurfer types.
2. Replace the RAF stub with a file-time clock and Loop bounds.
3. Play / Pause / Restart with Transport fade on a GainNode.
4. Stretch worklet through `engine/stretch.ts` when `@audio/stretch-transient` is wired.
5. Native `AudioBufferSourceNode` loop in source time, plus Loop edge fade ramps on the audio clock.

## Glossary check

Playhead is Loop-cycle progress, not file progress and not a 4-beat bar. Transport fade is Play / Pause / Restart. Loop edge fade is the fixed 4 ms click kill. Seam crossfade is the later overlapping wrap. WavePlayer Restart plays. Play screen Restart does not.
