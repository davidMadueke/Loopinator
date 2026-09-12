# One playback engine, WaveSurfer is visual

Create Track preview and the Play screen both call `createPlaybackEngine`. WaveSurfer cannot host Transport fade, a file-time Loop wrap, or Time-stretch, so WavePlayer keeps it for the waveform and region handles only. The engine owns file time, Loop bounds, Transport fade, and Loop edge fade. Preview passes stretch ratio 1. Sunday passes Target / Original and stays silent until the stretch worklet lands in `loop-analysis/engine/stretch.ts`.
