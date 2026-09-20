# Play screen Time-stretch is a live worklet

ADR-0015 already requires a Web Audio graph and `@audio/stretch-transient`. The published library stretches a whole buffer offline. Pre-rendering on every Tempo stepper tap would hitch, especially hold (±3). Sunday Time-stretch runs the transient algorithm inside an AudioWorklet so Target BPM can change while the Playhead keeps file time. Create Track preview and Row preview stay at ratio 1 and never load the worklet.
