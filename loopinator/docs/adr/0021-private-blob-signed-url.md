# Private Blob, short-lived URL, then Offline cache

Audio stays in a private Vercel Blob. A public Play link never carries a lasting file URL. The first open calls tRPC with the Track short id, gets a short-lived Blob URL, fetches the file, and stores it in Offline cache. Later opens on that browser use the stored file.

A public Blob pathname would work, and would be simpler, but then a leaked URL stays valid forever. Streaming the file through Express would keep Blob hidden, but it puts 40MB WAVs on the API and fights the client-side upload we already picked. Signed URLs expire, so they cannot be the cache. The cached bytes are.
