import { useCallback, useEffect, useRef, useState } from "react";

import { getAudioFixture } from "@/lib/audio-fixtures";
import { decodeAudioUrl } from "@/lib/loop-analysis/decode-audio";
import { snapLoopPointToZeroCrossing } from "@/lib/loop-analysis/snap-loop-point";
import {
  storedValueToSeconds,
  toStoredLoopRegion,
} from "@/lib/loop-region-time";
import { stepTargetBpm, type PlaybackState } from "@/lib/play-types";
import { usePlaybackEngine } from "@/lib/playback/use-playback-engine";

type UsePlaybackOptions = {
  originalBpm: number;
  initialTargetBpm: number;
  trackId?: string;
};

export function usePlayback({
  originalBpm,
  initialTargetBpm,
  trackId,
}: UsePlaybackOptions) {
  const [targetBpm, setTargetBpm] = useState(initialTargetBpm);
  const [hasLocalOverride, setHasLocalOverride] = useState(false);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [inPoint, setInPoint] = useState("");
  const [outPoint, setOutPoint] = useState("");

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
    if (!trackId) {
      setBuffer(null);
      setInPoint("");
      setOutPoint("");
      return;
    }

    const fixture = getAudioFixture(trackId);
    if (!fixture) {
      setBuffer(null);
      setInPoint("");
      setOutPoint("");
      return;
    }

    let cancelled = false;
    decodeAudioUrl(fixture.url)
      .then((decoded) => {
        if (cancelled) {
          return;
        }
        const duration = decoded.duration;
        const inSec = storedValueToSeconds(fixture.inPoint, duration, "in");
        const outSec = storedValueToSeconds(fixture.outPoint, duration, "out");
        const stored = toStoredLoopRegion(
          snapLoopPointToZeroCrossing(inSec, decoded),
          snapLoopPointToZeroCrossing(outSec, decoded),
          duration,
        );
        setBuffer(decoded);
        setInPoint(stored.inPoint);
        setOutPoint(stored.outPoint);
      })
      .catch(() => {
        if (!cancelled) {
          setBuffer(null);
          setInPoint("");
          setOutPoint("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trackId]);

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
