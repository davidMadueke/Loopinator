# Audio engines sit behind a seam

Create Track and the Play screen call Loopinator functions, never `@audio/*` directly. BPM detection, Key detection, Time-stretch, and a future transpose slot each have one backend file under `loop-analysis/engine`. Swapping a library is a change in that file. Current backends are `@audio/beat` for BPM and `@audio/mir-chroma` plus `@audio/mir-key` for Key. Time-stretch still waits on `@audio/stretch-transient` in the Play screen worklet. Transpose stays unused in v1 because Key is metadata and a Track whose Key is No Key never transposes.
