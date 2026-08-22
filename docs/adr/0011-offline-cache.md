# Cache Setlist metadata with the audio

Church Wi-Fi fails during services. Caching only the audio still leaves the Play screen unable to render, because the Setlist rows live in Turso. Opening a Play screen caches the Setlist metadata alongside every Track's audio, so the screen works with no network at all. A Track whose audio never finished caching shows as unavailable rather than failing when someone presses Play.
