# audiojs for BPM detection and stretch

essentia.js can detect BPM and key in one WASM pass, but it is AGPL-3.0 and large on a church iPad. Rubber Band stretches well and is GPL. SoundTouch is a ready worklet and smears percussion. Loopinator uses `@audio/beat` in a browser Worker for BPM detection (BPM, confidence, beat times) and `@audio/stretch-transient` inside the Play screen stretch worklet. Both are MIT and aimed at drums.
