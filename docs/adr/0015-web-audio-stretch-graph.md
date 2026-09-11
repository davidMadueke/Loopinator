# Play screen stretch is a Web Audio graph

ADR-0004 requires pitch-preserving Time-stretch at Target BPM, live with the Tempo stepper. HTMLAudio and Wavesurfer `preservesPitch` cannot host Transport fade or seam crossfade. Play screen audio is a Web Audio graph. The stretch node is `@audio/stretch-transient` wrapped in that worklet, so drum attacks stay sharp inside ±20% and those envelopes can sit on the same graph later. Create Track preview and Row preview do not stretch.
