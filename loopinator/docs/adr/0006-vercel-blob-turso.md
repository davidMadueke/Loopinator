# Vercel Blob for audio, Turso for metadata

Tracks are large binaries. Setlists and metadata are small rows. Turso (SQLite), already in the project, stores Track and Setlist records. Audio goes to Vercel Blob, which keeps WAV and MP3 out of the database and avoids a second cloud account we do not need yet. Opening a Setlist caches its audio on the device.
