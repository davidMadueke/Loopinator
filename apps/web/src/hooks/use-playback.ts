import { useCallback, useEffect, useRef, useState } from "react";

import { clampTargetBpm, type PlaybackState } from "@/lib/play-types";
import { usePlaybackEngine } from "@/lib/playback/use-playback-engine";

type UsePlaybackOptions = {
  originalBpm: number;
  initialTargetBpm: number;
};

export function usePlayback({ originalBpm, initialTargetBpm }: UsePlaybackOptions) {
  const [targetBpm, setTargetBpm] = useState(initialTargetBpm);
  const [hasLocalOverride, setHasLocalOverride] = useState(false);

  const playback = usePlaybackEngine({
    originalBpm,
    targetBpm,
    stretch: true,
    restartResumes: false,
    loopEnabled: true,
  });

  useEffect(() => {
    setTargetBpm(initialTargetBpm);
    setHasLocalOverride(false);
    void playback.restart();
  }, [initialTargetBpm, playback.restart]);

  const adjustTargetBpm = useCallback(
    (delta: number) => {
      setTargetBpm((current) => clampTargetBpm(originalBpm, current + delta));
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
