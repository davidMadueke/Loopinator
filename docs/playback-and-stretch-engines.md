# Playback and stretch engines

A walkthrough of `apps/web/src/lib/playback/` and the Time-stretch code in `apps/web/src/lib/loop-analysis/engine/`. It assumes you already know why Target BPM is pitch-preserving stretch rather than `playbackRate`, and that you already know zero-cross snap, BPM detection, and Key detection. Implementation tables live in [apps/web/src/lib/playback/CONTEXT.md](../apps/web/src/lib/playback/CONTEXT.md) and [apps/web/src/lib/loop-analysis/CONTEXT.md](../apps/web/src/lib/loop-analysis/CONTEXT.md). The cuts that produced this split are [ADR-0015](adr/0015-web-audio-stretch-graph.md), [ADR-0017](adr/0017-audio-engine-seam.md), [ADR-0019](adr/0019-one-playback-engine.md), and [ADR-0020](adr/0020-live-stretch-worklet.md).

## Two jobs

Loop analysis does not play sound. It decodes the file, snaps In and Out, guesses Original BPM and Key, and for Sunday turns Original BPM plus Target BPM into a stretch ratio. Then it can register a worklet that can play stretched audio, but that worklet is a tool the playback engine owns at runtime.

Playback is the only thing that makes speakers move. One session per screen. Create Track preview, Row preview, and the Play screen each call `createPlaybackEngine()`. WaveSurfer draws the waveform. It does not play.

Stretch lives under `loop-analysis/engine/` because of a seam rule. UI never imports `@audio/*`. BPM, Key, and stretch each wrap a library behind that folder. That is a packaging choice, not a claim that stretch is an analysis pass.

## Web Audio, from the ground

The computer plays sound by mixing a stream of numbers (samples) at a fixed rate, usually 48,000 per second. The browser’s Web Audio API is a small factory for that stream.

An `AudioContext` is one mixing session. It has a clock, `currentTime`, in seconds since that context started. That clock is what the playback engine trusts while it is playing. React state is not a clock. `requestAnimationFrame` is only used to paint the Playhead. It does not decide where audio is.

An `AudioBuffer` is the decoded file sitting in memory. WAV or MP3 on disk is compressed or packed. Decode unpacks it into a list of samples per channel. `buffer.duration` is how long the file is at its own speed. That duration is file time, not how long the loop will take on Sunday.

You do not send the buffer to the speakers by yourself. You build a chain of nodes.

A source produces samples. In this app it is one of two things:

- `AudioBufferSourceNode`, the browser’s ordinary “play this buffer from offset X” node.
- `AudioWorkletNode`, a custom source that reads the same buffer and writes stretched samples.

A gain node is a volume knob you can automate on the audio clock. The engine has two, in series:

```
source → transportGain → edgeGain → speakers
```

`transportGain` is Play, Pause, and Restart. `edgeGain` is the 4 ms dip at In and Out so the wrap does not click. Same two knobs whether the source is the ordinary node or the worklet.

`destination` is the speakers.

That is the whole graph. There is no HTML `<audio>` element in this chain, and WaveSurfer’s element is not in it either. An earlier version routed WaveSurfer’s media into Web Audio. That second graph froze the playhead. The rule now is one context, one chain.

## Worker and worklet

Both names mean code that does not run in the React render. They are not interchangeable.

A Worker is a background JavaScript thread. It cannot output audio. After decode, Create Track posts the mono mix to `track-analysis.worker.ts`. That Worker calls `audioAnalysisEngine.detectBpm` and `detectKey`. Heavy math stays off the UI thread so dragging the loop region still feels immediate. Stretch is not in that Worker. Detection runs once per file. Stretch has to run every instant you are playing at a non-file tempo.

An AudioWorklet is a script the `AudioContext` loads onto the audio rendering thread. The browser calls `process()` about every 128 samples. If that callback is late, you hear a glitch. The stretch worklet lives here because it must keep filling speaker buffers on time.

So the same `engine/` folder holds two different kinds of off-main-thread code:

- Worker = analysis, once, no sound.
- Worklet = live Time-stretch, continuously, is the sound.

`registerStretchWorklet` is `audioWorklet.addModule(stretch-processor.ts)` on that context, once. If it has not finished, Play still starts the clock. Audio starts when the module is ready.

## File time, wall time, Playhead

Loop region and Playhead are domain terms. File time and wall time are different units, and stretch is the conversion.

File time is seconds into the WAV, from 0 to `buffer.duration`. In-point and Out-point are stored in file time. Snap, text fields, and the waveform all speak this unit. Time-stretch never rewrites those numbers. A 2-second loop in the file is still a 2-second loop in the file when Target BPM is 60.

Wall time is seconds of real life. `AudioContext.currentTime` while playing. `performance.now()` before a context exists. This is what your ear and the Playhead ring experience.

Playhead is not a third clock. It is file time, remapped to 0–1 inside `[In, Out)`:

`(fileTime − In) / (Out − In)`, wrapped.

Halfway through the loop is always Playhead 0.5, whether Sunday is at Original tempo or half time. The ring takes longer or shorter in wall time. The 0–1 meaning does not change.

The engine’s clock is one line:

```
elapsed file seconds = elapsed wall seconds × stretchRatio
```

`stretchRatio` is Target BPM / Original BPM, after clamping into the current Target BPM band.

Concrete case. Original 120, loop length 2 file seconds (one bar of 4/4).

- Target 120, ratio 1. One cycle is 2 wall seconds.
- Target 60, ratio 0.5. Each wall second only consumes 0.5 file seconds. One cycle is 4 wall seconds. Pitch stays put.
- Target 144, ratio 1.2. One cycle is 2 / 1.2 ≈ 1.67 wall seconds.

The Playhead ring is driven from this JS clock, not by asking the worklet where it is. That is why the circle still moves when there is no buffer. The Play screen stand-in is 4 beats at Original BPM of silence. Same formula, no samples.

Because ratio is applied to elapsed wall time, the engine reanchors whenever ratio or position changes. Reanchor means: read current file time, store it, store `now`. If you changed ratio from 1 to 0.5 without doing that, the next tick would apply 0.5 to time that had already elapsed at 1, and the Playhead would jump.

`advanceFileTime` adds elapsed file seconds, then wraps inside `[In, Out)` when looping. Stretch is not inside that wrap. Stretch already happened when wall elapsed became file elapsed.

## Playback engine

`createPlaybackEngine()` in `graph.ts` is the session. `active.ts` is the public factory so UI never reaches into the graph. React talks to it through `usePlaybackEngine`, which subscribes to snapshots `{ mode, fileTime, playhead, duration }`.

### What it owns

- The `AudioContext` and the two gains, created on first Play.
- The loaded `AudioBuffer`, or none.
- Params: duration, In/Out, loop on/off, stretch ratio, Transport fade, Loop edge fade, whether Restart resumes, whether to keep the worklet warmed (`prepareStretch`).
- The clock anchors.
- `commandGen`, a counter so an in-flight Pause fade does not stop a Play you started in the meantime.

### Play, Pause, Restart, seek

Play. If looping and you are outside the region, relocate to In. Resume the context if the browser suspended it (autoplay rules). Start the source at current file time. Ramp `transportGain` up. Displayed 0 s Transport fade is still 15 ms so the onset does not click. Mode becomes `playing`. RAF starts so React can paint.

Pause. Ramp `transportGain` down, wait that duration, then stop the source. File time freezes. Mode is `paused` if you are not at 0.

Restart. Fade out if playing, stop, set file time to In (or 0 if not looping). Play screen has `restartResumes: false`, so it stays stopped. WavePlayer preview has `restartResumes: true`, so it seeks In and plays.

Seek. Clamp into the loop if looping. If already playing, rebuild the source from that offset and snap `transportGain` to 1. Waveform click writes file time through this path. It does not use the media element’s `seeking` event.

### Two sources, one switch

`source.ts` is the only place the graph decides how to emit samples.

Ratio 1 and `prepareStretch` false (Create Track, Row preview): `AudioBufferSourceNode`. If looping, the browser’s own `loop`, `loopStart`, `loopEnd` wrap at Out back to In. Cheap, native, no worklet download.

Play screen passes `stretch: true`, which sets `prepareStretch: true`. Then the session keeps the worklet even at ratio 1. The Tempo stepper can then change Target BPM by posting a new factor. No node rebuild, no Transport fade, no seek to In. `playback/CONTEXT.md` still says “at ratio 1, buffer source.” The code in `params.ts` is the rule that actually runs.

When the source must change (first Play on the Play screen, or a structural param change while playing), `startAudio()` stops the old node and starts the other. Loop bounds or loop-enabled changing while playing is structural. A ratio-only change while the worklet is already up is not.

### Fades, on the audio clock

Transport fade is `applyTransportFade` on `transportGain`. Linear, exponential, or equal-power. It is Play/Pause/Restart only.

Loop edge fade is `scheduleLoopEdgeFades` on `edgeGain`. 4 ms linear down at Out and up at In, sequential, not overlapping. The 4 ms is in file time. Wall duration is `4 ms / stretchRatio`, so at half speed the dip lasts 8 ms of real time and still covers the same samples. The scheduler paints many upcoming cycles ahead (64). It is a volume envelope. It is not Seam crossfade. Seam would overlap Out with In on two sources. That is agreed and not shipped.

### What it refuses

- WaveSurfer as the audio device.
- `playbackRate` for Target BPM.
- Driving Playhead from React timers.

UI calls `createPlaybackEngine`. It does not import `@audio/stretch-transient`.

## Stretch engine

Two parts, both under `loop-analysis/engine/`.

### Ratio math (`stretch.ts`, `timeStretchEngine`)

`ratioFromTempos(originalBpm, targetBpm)`:

1. Pick the Target BPM band (half, original, or double) that contains the requested tempo, or the nearest if it sits in a gap.
2. Clamp into that band’s ±20%.
3. Return `clamped / originalBpm`.
4. If Original BPM is 0, return 1 (do not stretch).

That number is what the playback clock multiplies by. It is also what the Play screen hook passes into `setParams({ stretchRatio })`.

The worklet library does not speak Target/Original. Its `factor` means how much longer the output is than the input. We send `1 / stretchRatio`. Half speed is ratio 0.5, factor 2. Faster is factor less than 1.

### Live node (`stretch.ts` + `stretch-processor.ts`)

Playback calls `createStretchWorkletNode` with the buffer, file-time offset, loop flag, In, Out, and ratio. The node has no audio inputs. It is a generator. Channel data is copied out of the `AudioBuffer` and transferred to the worklet so the audio thread has its own samples.

Three messages on `node.port`:

| Message | When | Payload |
|---|---|---|
| `load` | Starting the worklet source | channel arrays, buffer sample rate, loop on/off, In, Out, offset, `factor` |
| `factor` | Tempo stepper, worklet already running | new `factor` only |
| `stop` | Pause, Restart, dispose, or swapping sources | none |

On `load`, the processor resamples those channels to the context sample rate if they differ, stores loop bounds in samples (file time × sample rate), sets `filePos` from offset, and starts producing. Wrap happens in `readWrapped`. When looping and `filePos` passes Out, it modulo-wraps back to In, in file samples. Playback’s JS clock wraps the same region independently so the ring and the audio agree on meaning, even if they are not sample-locked to each other.

`setStretchWorkletFactor` is the Sunday path. `graph.ts` reanchors, posts `factor`, and reschedules Loop edge fades because those ramps are in wall time.

This note skips how the library chops frames. The contract is the table above, plus: Play screen always uses this node once stretch is enabled. Preview never loads it.

## How stretch plugs into the rest of loop-analysis

Stretch is a consumer of analysis outputs, not a step in that pipeline.

Decode on the main thread gives an `AudioBuffer`. Snap uses that buffer. The Worker uses a mono mix of that buffer for BPM and Key. Playback later `load()`s an `AudioBuffer` (fixtures on the Play screen, the upload on Create Track). The worklet copies channels from that same kind of object. Analysis and playback share the decode utility, not a running graph.

Original BPM is the denominator of `ratioFromTempos`. Auto-detected or typed, that number is what Sunday stretches against. Stretch does not detect BPM. If Original BPM is wrong, the ratio is wrong, and the loop still wraps at the snapped In/Out. Those are separate mistakes.

In and Out stay in file time after zero-cross snap. Stretch does not move them. That is why a loop that clicks at ratio 1 still clicks at ratio 0.5 if snap failed. Edge fade is playback’s click killer. It is not analysis.

Create Track WavePlayer sets `stretch: false`. Ratio stays 1. You hear the file at file speed while you edit the region. That is deliberate. You are placing In and Out on the waveform, which is file time. Stretching preview would make the waveform cursor and the ear disagree about where the seam is.

The Play screen is the only caller that sets `stretch: true`. `usePlayback` holds Target BPM, loads a fixture, snaps fixture In/Out once, and hands buffer plus tempos to `usePlaybackEngine`. That hook is the only UI that should call `timeStretchEngine`.

`transpose.ts` is unused. Key stays metadata. Stretch does not transpose.

The seam in `engine/active.ts` is the swap point. BPM backend, Key backend, stretch math, and later transpose bind there. Changing `@audio/stretch-transient` should touch `stretch-processor.ts` and nowhere else. Changing how ratio is computed should touch `stretch.ts` and its tests, not `graph.ts`.

```
Decode → snap In/Out (file time)
       → Worker BPM / Key → Original BPM, Key
                              ↓
Play screen Target BPM + Original BPM
  → timeStretchEngine.ratioFromTempos
  → playback setParams(stretchRatio)
  → buffer source (preview) or worklet (Sunday)
```

The analysis folder answers where the loop is, and what this Track is. The playback folder answers what is sounding right now. Stretch is the conversion between those two, plus the worklet that makes the conversion audible without moving pitch.
