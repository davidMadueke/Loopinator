import { useEffect, useState } from "react";

import { subscribeAudioCache } from "@/lib/offline-cache/audio-cache";

export function useAudioCacheRevision() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    return subscribeAudioCache(() => {
      setRevision((current) => current + 1);
    });
  }, []);

  return revision;
}
