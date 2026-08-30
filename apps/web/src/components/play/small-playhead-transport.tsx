import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@loopinator/ui/components/button";
import {
  damping,
  DynamicIsland,
  DynamicIslandProvider,
  SIZE_PRESETS,
  stiffness,
  useDynamicIslandSize,
  type Preset,
  type SizePresets,
} from "@loopinator/ui/components/dynamic-island";
import { PlayheadCircle } from "@loopinator/ui/components/playhead-circle";
import { PauseIcon, PlayIcon, SkipBackIcon } from "lucide-react";

import type { PlaybackMode } from "@/lib/play-types";

const HOVER_DELAY_MS = 2000;
/* Touch fires no pointerleave, so a tap-driven expansion has to time itself out. */
const PRESS_EXPAND_MS = 3000;

const ISLAND_HEIGHT = 36;
const ISLAND_PADDING = 2;
const ISLAND_GAP = 4;
const RING_SIZE = ISLAND_HEIGHT - ISLAND_PADDING * 2;
const RING_STROKE = 2.5;
const PLAY_SIZE = 24;
const RESTART_SIZE = 28;

const COLLAPSED_WIDTH = RING_SIZE + ISLAND_PADDING * 2;
const WITH_RESTART_WIDTH = COLLAPSED_WIDTH + ISLAND_GAP + RESTART_SIZE;

function pill(width: number): Preset {
  return { width, height: ISLAND_HEIGHT, borderRadius: ISLAND_HEIGHT / 2 };
}

type SmallPlayheadTransportProps = {
  label: string;
  mode: PlaybackMode;
  playhead: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onExpandedChange: (expanded: boolean) => void;
};

export function SmallPlayheadTransport(props: SmallPlayheadTransportProps) {
  const [slotWidth, setSlotWidth] = useState(WITH_RESTART_WIDTH);

  const presets = useMemo<Partial<Record<SizePresets, Preset>>>(
    () => ({
      [SIZE_PRESETS.MINIMAL_LEADING]: pill(COLLAPSED_WIDTH),
      [SIZE_PRESETS.COMPACT]: pill(WITH_RESTART_WIDTH),
      [SIZE_PRESETS.LONG]: pill(Math.max(slotWidth, WITH_RESTART_WIDTH)),
    }),
    [slotWidth],
  );

  return (
    <DynamicIslandProvider initialSize={SIZE_PRESETS.MINIMAL_LEADING} presets={presets}>
      <TransportIsland {...props} onSlotWidthChange={setSlotWidth} />
    </DynamicIslandProvider>
  );
}

function TransportIsland({
  label,
  mode,
  playhead,
  onPlay,
  onPause,
  onRestart,
  onExpandedChange,
  onSlotWidthChange,
}: SmallPlayheadTransportProps & { onSlotWidthChange: (width: number) => void }) {
  const { setSize } = useDynamicIslandSize();
  const [expanded, setExpanded] = useState(false);

  const islandRef = useRef<HTMLDivElement | null>(null);
  const hoveringRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const playing = mode === "playing";
  const canRestart = !playing && playhead > 0;

  /* The expanded width is measured off the header row rather than set to 100%: motion
     can only spring between lengths in the same unit. The row is min-w-0, so its width
     comes from the header's free space and doesn't chase the island's own growth. */
  useEffect(() => {
    const row = islandRef.current?.parentElement;
    if (!row) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        onSlotWidthChange(entry.contentRect.width);
      }
    });

    observer.observe(row);
    return () => observer.disconnect();
  }, [onSlotWidthChange]);

  useEffect(() => {
    if (expanded) {
      setSize(SIZE_PRESETS.LONG);
      return;
    }

    setSize(canRestart ? SIZE_PRESETS.COMPACT : SIZE_PRESETS.MINIMAL_LEADING);
  }, [canRestart, expanded, setSize]);

  useEffect(() => {
    onExpandedChange(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => () => onExpandedChange(false), [onExpandedChange]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const scheduleExpanded = useCallback(
    (next: boolean, delayMs: number) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => setExpanded(next), delayMs);
    },
    [clearTimer],
  );

  const handlePointerEnter = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      return;
    }

    hoveringRef.current = true;
    scheduleExpanded(true, HOVER_DELAY_MS);
  };

  const handlePointerLeave = () => {
    hoveringRef.current = false;
    scheduleExpanded(false, HOVER_DELAY_MS);
  };

  const expandFromPress = () => {
    clearTimer();
    setExpanded(true);

    if (!hoveringRef.current) {
      scheduleExpanded(false, PRESS_EXPAND_MS);
    }
  };

  const handlePlayPause = () => {
    expandFromPress();
    if (playing) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleRestart = () => {
    expandFromPress();
    onRestart();
  };

  return (
    <DynamicIsland
      id="small-playhead-transport"
      ref={islandRef}
      withContainer={false}
      className="flex bg-card w-auto h-auto"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className="flex h-full w-full items-center py-4"
        style={{ gap: ISLAND_GAP, paddingInline: ISLAND_PADDING }}
      >
        <span
          className="relative grid shrink-0 place-items-center"
          style={{ width: RING_SIZE, height: RING_SIZE }}
        >
          <PlayheadCircle
            progress={playhead}
            size={RING_SIZE}
            strokeWidth={RING_STROKE}
            className="absolute inset-0"
          />
          <Button
            variant="ghost_hover"
            size="icon-sm"
            className="relative p-0"
            style={{ width: PLAY_SIZE, height: PLAY_SIZE }}
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            onClick={handlePlayPause}
          >
            {playing ? (
              <PauseIcon className="size-3 fill-current text-primary hover:text-primary" />
            ) : (
              <PlayIcon className="size-3 fill-current hover:text-primary" />
            )}
          </Button>
        </span>

        <AnimatePresence initial={false}>
          {canRestart ? (
            <motion.div
              key="restart"
              className="shrink-0 overflow-hidden"
              initial={{ width: 0, opacity: 0, scale: 0.6 }}
              animate={{ width: RESTART_SIZE, opacity: 1, scale: 1 }}
              exit={{ width: 0, opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness, damping }}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 p-0"
                style={{ width: RESTART_SIZE, height: RESTART_SIZE }}
                aria-label="Restart"
                onClick={handleRestart}
              >
                <SkipBackIcon className="size-3" strokeWidth={2.5} />
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.span
              key="label"
              className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium text-primary"
              title={label}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ type: "spring", stiffness, damping }}
            >
              {label}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </DynamicIsland>
  );
}
