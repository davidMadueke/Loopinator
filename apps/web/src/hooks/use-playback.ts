import { useCallback, useEffect, useRef, useState } from "react";

import { clampTargetBpm, type PlaybackState } from "@/lib/play-types";

type UsePlaybackOptions = {
  originalBpm: number;
  initialTargetBpm: number;
};

export function usePlayback({ originalBpm, initialTargetBpm }: UsePlaybackOptions) {
  const [state, setState] = useState<PlaybackState>({
    mode: "stopped",
    playhead: 0,
    targetBpm: initialTargetBpm,
    hasLocalOverride: false,
  });

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTickRef.current = null;
  }, []);

  useEffect(() => {
    setState((current) => ({
      ...current,
      targetBpm: initialTargetBpm,
      playhead: 0,
      mode: "stopped",
      hasLocalOverride: false,
    }));
    stopLoop();
  }, [initialTargetBpm, stopLoop]);

  useEffect(() => {
    if (state.mode !== "playing") {
      stopLoop();
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTickRef.current === null) {
        lastTickRef.current = timestamp;
      }

      const elapsedMs = timestamp - lastTickRef.current;
      lastTickRef.current = timestamp;
      const cycleMs = (60_000 / state.targetBpm) * 4;

      setState((current) => ({
        ...current,
        playhead: (current.playhead + elapsedMs / cycleMs) % 1,
      }));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return stopLoop;
  }, [state.mode, state.targetBpm, stopLoop]);

  const adjustTargetBpm = useCallback(
    (delta: number) => {
      setState((current) => ({
        ...current,
        targetBpm: clampTargetBpm(originalBpm, current.targetBpm + delta),
        hasLocalOverride: true,
      }));
    },
    [originalBpm],
  );

  const resetDevice = useCallback(() => {
    stopLoop();
    setState({
      mode: "stopped",
      playhead: 0,
      targetBpm: initialTargetBpm,
      hasLocalOverride: false,
    });
  }, [initialTargetBpm, stopLoop]);

  const play = useCallback(() => {
    setState((current) => {
      if (current.mode === "stopped" || current.mode === "paused") {
        return { ...current, mode: "playing" };
      }
      return current;
    });
  }, []);

  const pause = useCallback(() => {
    setState((current) => {
      if (current.mode !== "playing") {
        return current;
      }
      stopLoop();
      return { ...current, mode: "paused" };
    });
  }, [stopLoop]);

  const restart = useCallback(() => {
    stopLoop();
    setState((current) => ({
      ...current,
      mode: "stopped",
      playhead: 0,
    }));
  }, [stopLoop]);

  return {
    state,
    adjustTargetBpm,
    resetDevice,
    play,
    pause,
    restart,
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
