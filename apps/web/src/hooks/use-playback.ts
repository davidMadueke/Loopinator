import { useCallback, useEffect, useRef, useState } from "react";

import { DEV_SILENT_FIXTURE, getAudioFixture } from "@/lib/audio-fixtures";
import { decodeAudioArrayBuffer, decodeAudioUrl } from "@/lib/loop-analysis/decode-audio";
import { snapLoopPointToZeroCrossing } from "@/lib/loop-analysis/snap-loop-point";
import {
  storedValueToSeconds,
  toStoredLoopRegion,
} from "@/lib/loop-region-time";
import {
  ensureTrackAudio,
  readTrackAudio,
} from "@/lib/offline-cache/audio-cache";
import { uniqueLiveTracks } from "@/lib/play-payload";
import { stepTargetBpm, type PlaybackState, type Setlist } from "@/lib/play-types";
import { standInLoopDurationSec } from "@/lib/playback/playhead";
import { usePlaybackEngine } from "@/lib/playback/use-playback-engine";
import {
  getEnableMockData,
  resolvePlaySource,
  usePlaySourceStore,
} from "@/stores/play-source-store";
import { useTRPCClient } from "@/utils/trpc";

type UsePlaybackOptions = {
  originalBpm: number;
  initialTargetBpm: number;
  trackId?: string;
  dev?: boolean;
  blobVersion?: number;
  setlistId?: string;
  setlist?: Setlist;
  loopInPoint?: string;
  loopOutPoint?: string;
  removed?: boolean;
};

function applyDecodedLoop(
  decoded: AudioBuffer,
  inPoint: string,
  outPoint: string,
  originalBpm: number,
  fixture: boolean,
) {
  const duration = decoded.duration;
  if (!fixture && inPoint === "" && outPoint === "") {
    const loopSec = Math.min(standInLoopDurationSec(originalBpm), duration);
    return toStoredLoopRegion(0, loopSec, duration);
  }
  const inSec = storedValueToSeconds(inPoint, duration, "in");
  const outSec = storedValueToSeconds(outPoint, duration, "out");
  return toStoredLoopRegion(
    snapLoopPointToZeroCrossing(inSec, decoded),
    snapLoopPointToZeroCrossing(outSec, decoded),
    duration,
  );
}

export function usePlayback({
  originalBpm,
  initialTargetBpm,
  trackId,
  dev = false,
  blobVersion,
  setlistId,
  setlist,
  loopInPoint = "",
  loopOutPoint = "",
  removed = false,
}: UsePlaybackOptions) {
  const [targetBpm, setTargetBpm] = useState(initialTargetBpm);
  const [hasLocalOverride, setHasLocalOverride] = useState(false);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [inPoint, setInPoint] = useState("");
  const [outPoint, setOutPoint] = useState("");
  const playSource = usePlaySourceStore((state) => resolvePlaySource(state.source));
  const client = useTRPCClient();

  const playback = usePlaybackEngine({
    originalBpm,
    targetBpm,
    stretch: true,
    restartResumes: false,
    loopEnabled: true,
    buffer,
    inPoint,
    outPoint,
  });

  useEffect(() => {
    if (!trackId || removed) {
      setBuffer(null);
      setInPoint("");
      setOutPoint("");
      return;
    }

    let cancelled = false;

    const clear = () => {
      setBuffer(null);
      setInPoint("");
      setOutPoint("");
    };

    const applyBuffer = (decoded: AudioBuffer, storedIn: string, storedOut: string, fixture: boolean) => {
      const stored = applyDecodedLoop(decoded, storedIn, storedOut, originalBpm, fixture);
      setBuffer(decoded);
      setInPoint(stored.inPoint);
      setOutPoint(stored.outPoint);
    };

    async function loadMock() {
      const fixture = getAudioFixture(trackId!);
      const url = fixture?.url ?? (dev ? DEV_SILENT_FIXTURE.url : undefined);
      if (!url) {
        clear();
        return;
      }
      const decoded = await decodeAudioUrl(url);
      if (cancelled) {
        return;
      }
      if (!fixture) {
        applyBuffer(decoded, "", "", false);
        return;
      }
      applyBuffer(decoded, fixture.inPoint, fixture.outPoint, true);
    }

    async function loadApi() {
      if (blobVersion == null) {
        clear();
        return;
      }

      const fetchUrl = setlistId
        ? (id: string) => client.audio.forSetlistTrack.query({ setlistId, trackId: id })
        : (id: string) => client.audio.forTrack.query({ trackId: id });

      try {
        await ensureTrackAudio(trackId!, blobVersion, fetchUrl);
      } catch {
        // Unavailable Track: Play still opens on the empty clock.
      }
      if (cancelled) {
        return;
      }

      const bytes = await readTrackAudio(trackId!, blobVersion);
      if (cancelled) {
        return;
      }
      if (!bytes) {
        clear();
      } else {
        const decoded = await decodeAudioArrayBuffer(bytes);
        if (cancelled) {
          return;
        }
        applyBuffer(decoded, loopInPoint, loopOutPoint, true);
      }

      if (!setlist) {
        return;
      }
      const rest = uniqueLiveTracks(setlist).filter(
        (track) => !(track.trackId === trackId && track.blobVersion === blobVersion),
      );
      for (const next of rest) {
        if (cancelled) {
          return;
        }
        try {
          await ensureTrackAudio(next.trackId, next.blobVersion, fetchUrl);
        } catch {
          // Unavailable Track: skip and keep walking the rest one at a time.
        }
      }
    }

    const load = getEnableMockData() ? loadMock : loadApi;
    void load().catch(() => {
      if (!cancelled) {
        clear();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    trackId,
    dev,
    originalBpm,
    blobVersion,
    setlistId,
    setlist,
    loopInPoint,
    loopOutPoint,
    removed,
    playSource,
    client,
  ]);

  useEffect(() => {
    setTargetBpm(initialTargetBpm);
    setHasLocalOverride(false);
    void playback.restart();
  }, [initialTargetBpm, trackId, playback.restart]);

  const adjustTargetBpm = useCallback(
    (delta: number) => {
      setTargetBpm((current) => stepTargetBpm(originalBpm, current, delta));
      setHasLocalOverride(true);
    },
    [originalBpm],
  );

  const resetDevice = useCallback(() => {
    setTargetBpm(initialTargetBpm);
    setHasLocalOverride(false);
    void playback.restart();
  }, [initialTargetBpm, playback.restart]);

  const state: PlaybackState = {
    mode: playback.mode,
    playhead: playback.playhead,
    targetBpm,
    hasLocalOverride,
  };

  return {
    state,
    adjustTargetBpm,
    resetDevice,
    play: playback.play,
    pause: playback.pause,
    restart: playback.restart,
  };
}

export function useHoldStepper(onStep: (delta: number) => void) {
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const bind = useCallback(
    (delta: number) => ({
      onPointerDown: () => {
        onStep(delta);
        holdTimerRef.current = window.setTimeout(() => {
          holdIntervalRef.current = window.setInterval(() => onStep(delta * 3), 120);
        }, 350);
      },
      onPointerUp: clearHold,
      onPointerLeave: clearHold,
      onPointerCancel: clearHold,
    }),
    [clearHold, onStep],
  );

  return bind;
}
