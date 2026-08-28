"use client";

import * as React from "react";
import { cn } from "@loopinator/ui/lib/utils";
import { Card, CardContent } from "@loopinator/ui/components/card";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";
import { Slider } from "@loopinator/ui/components/slider";
import { Play, Pause, Loader2, RotateCcw, Repeat } from "lucide-react";
import WavesurferPlayer from "@/lib/wave-cn";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";
import type { Region } from "wavesurfer.js/dist/plugins/regions.js";
import { LoopRegionOverlay } from "./loop-region-overlay";
import {
  commitLoopPointSeconds,
  LOOP_MIN_GAP_SEC,
  storedValueToSeconds,
  timeToStoredValue,
} from "@/lib/loop-region-time";
import { wrapLoopPlayback } from "@/lib/loop-playback";

/** Switch loop-region rendering: custom React overlay vs Wavesurfer Regions plugin. */
export const LOOP_REGION_IMPL = "custom" as "custom" | "regions";

const LOOP_REGION_ID = "loop";
const LOOP_REGION_ACTIVE_COLOR =
  "color-mix(in oklch, var(--primary) 25%, transparent)";
const LOOP_REGION_INACTIVE_COLOR =
  "color-mix(in oklch, var(--muted-foreground) 12%, transparent)";

export type LoopRegionControlProps = {
  inPoint: string;
  outPoint: string;
  onInPointChange: (value: string) => void;
  onOutPointChange: (value: string) => void;
  /** Snaps marker times to zero crossings on drag release when set. */
  snapLoopPoint?: ((seconds: number) => number) | null;
};

export interface WavePlayerProps {
  /** Audio source URL or validated file */
  src: string | File;
  /** Optional title shown above the waveform */
  title?: string;
  /** Audio bar color. Accepts any CSS value including var(--*) tokens @default "var(--muted-foreground)" */
  waveColor?: string;
  /** Progress bar color. Accepts any CSS value including var(--*) tokens @default "var(--primary)" */
  progressColor?: string;
  /** Waveform bar width in px @default 3 */
  barWidth?: number;
  /** Waveform bar gap in px @default 2 */
  barGap?: number;
  /** Rounded borders for bars @default 2 */
  barRadius?: number;
  /** Waveform height in px @default 64 */
  waveHeight?: number;
  /** Minimum pixels per second (zoom level) @default 1 */
  minPxPerSec?: number;
  /** Autoplay on mount */
  autoPlay?: boolean;
  /** Called when playback starts */
  onPlay?: () => void;
  /** Called when playback pauses */
  onPause?: () => void;
  /** Called when playback finishes */
  onFinish?: () => void;
  /** Called with current time on every audio process tick */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Called when decoded duration is known */
  onDurationChange?: (duration: number) => void;
  /** Enables loop markers, shaded region, and preview loop toggle */
  loopRegion?: LoopRegionControlProps;
  className?: string;
}

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useAudioSource(src: string | File): string {
  const [audioUrl, setAudioUrl] = React.useState(() =>
    typeof src === "string" ? src : "",
  );

  React.useEffect(() => {
    if (typeof src === "string") {
      setAudioUrl(src);
      return;
    }

    const objectUrl = URL.createObjectURL(src);
    setAudioUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return audioUrl;
}

function useRegionsLoopRegion(
  enabled: boolean,
  wavesurferRef: React.RefObject<WaveSurfer | null>,
  isReady: boolean,
  duration: number,
  inSeconds: number,
  outSeconds: number,
  loopPreviewEnabled: boolean,
  loopRegion: LoopRegionControlProps | undefined,
  snapLoopPoint: ((seconds: number) => number) | null,
) {
  const regionsPluginRef = React.useRef(RegionsPlugin.create());
  const regionRef = React.useRef<Region | null>(null);
  const syncingRef = React.useRef(false);
  const snapLoopPointRef = React.useRef(snapLoopPoint);

  snapLoopPointRef.current = snapLoopPoint;

  const plugins = React.useMemo(
    () => (enabled ? [regionsPluginRef.current] : undefined),
    [enabled],
  );

  React.useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!enabled || !loopRegion || !wavesurfer || !isReady || duration <= 0) {
      return;
    }

    const plugin = regionsPluginRef.current;
    syncingRef.current = true;

    let region = regionRef.current;
    const regionColor = loopPreviewEnabled
      ? LOOP_REGION_ACTIVE_COLOR
      : LOOP_REGION_INACTIVE_COLOR;

    if (!region || region.isRemoved) {
      plugin.clearRegions();
      region = plugin.addRegion({
        id: LOOP_REGION_ID,
        start: inSeconds,
        end: outSeconds,
        drag: false,
        resize: true,
        resizeStart: true,
        resizeEnd: true,
        color: regionColor,
        minLength: LOOP_MIN_GAP_SEC,
      });
      regionRef.current = region;
    } else {
      region.setOptions({
        start: inSeconds,
        end: outSeconds,
        color: regionColor,
      });
    }

    queueMicrotask(() => {
      syncingRef.current = false;
    });
  }, [
    enabled,
    loopRegion,
    wavesurferRef,
    isReady,
    duration,
    inSeconds,
    outSeconds,
    loopPreviewEnabled,
  ]);

  React.useEffect(() => {
    if (!enabled || !loopRegion) {
      return;
    }

    const plugin = regionsPluginRef.current;

    const onUpdated = (region: Region, side?: "start" | "end") => {
      if (
        region.id !== LOOP_REGION_ID ||
        syncingRef.current ||
        duration <= 0 ||
        !side
      ) {
        return;
      }

      const snap = snapLoopPointRef.current;
      let nextIn = region.start;
      let nextOut = region.end;

      if (snap) {
        if (side === "start") {
          nextIn = commitLoopPointSeconds(
            region.start,
            region.end,
            duration,
            "in",
            { snap: true, snapLoopPoint: snap },
          ).inSeconds;
        }
        if (side === "end") {
          nextOut = commitLoopPointSeconds(
            region.end,
            nextIn,
            duration,
            "out",
            { snap: true, snapLoopPoint: snap },
          ).outSeconds;
        }
      }

      loopRegion.onInPointChange(
        timeToStoredValue(nextIn, duration, "in"),
      );
      loopRegion.onOutPointChange(
        timeToStoredValue(nextOut, duration, "out"),
      );
    };

    plugin.on("region-updated", onUpdated);
    return () => {
      plugin.un("region-updated", onUpdated);
    };
  }, [enabled, loopRegion, duration]);

  return plugins;
}

export function WavePlayer({
  src,
  title,
  waveColor,
  progressColor,
  barWidth,
  barGap,
  barRadius,
  waveHeight = 64,
  minPxPerSec,
  autoPlay = false,
  onPlay,
  onPause,
  onFinish,
  onTimeUpdate,
  onDurationChange,
  loopRegion,
  className,
}: WavePlayerProps) {
  const audioUrl = useAudioSource(src);
  const wavesurferRef = React.useRef<WaveSurfer | null>(null);
  const loopUnsubsRef = React.useRef<Array<() => void>>([]);
  const loopPreviewRef = React.useRef(true);
  const loopRegionRef = React.useRef(loopRegion);

  const [isReady, setIsReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [loopPreviewEnabled, setLoopPreviewEnabled] = React.useState(true);

  loopPreviewRef.current = loopPreviewEnabled;
  loopRegionRef.current = loopRegion;

  const useRegionsImpl =
    Boolean(loopRegion) && LOOP_REGION_IMPL === "regions";

  const inSeconds = loopRegion
    ? storedValueToSeconds(loopRegion.inPoint, duration, "in")
    : 0;
  const outSeconds = loopRegion
    ? storedValueToSeconds(loopRegion.outPoint, duration, "out")
    : 0;

  const snapLoopPoint = loopRegion?.snapLoopPoint ?? null;

  const regionPlugins = useRegionsLoopRegion(
    useRegionsImpl,
    wavesurferRef,
    isReady,
    duration,
    inSeconds,
    outSeconds,
    loopPreviewEnabled,
    loopRegion,
    snapLoopPoint,
  );

  const runLoopWrap = React.useCallback(
    (ws: WaveSurfer, options?: { resume?: boolean }) => {
      const region = loopRegionRef.current;
      if (!loopPreviewRef.current || !region) {
        return false;
      }

      const result = wrapLoopPlayback(ws, region.inPoint, region.outPoint, options);
      if (result) {
        setCurrentTime(ws.getCurrentTime());
        if (import.meta.env.DEV) {
          console.log("[wave-player] loop wrap", {
            from: result.timeBefore.toFixed(3),
            to: result.timeAfter.toFixed(3),
            bounds: result.bounds,
          });
        }
        return true;
      }

      return false;
    },
    [],
  );

  const attachLoopListeners = React.useCallback(
    (ws: WaveSurfer) => {
      loopUnsubsRef.current.forEach((unsub) => unsub());
      loopUnsubsRef.current = [
        ws.on("audioprocess", () => {
          runLoopWrap(ws);
        }),
        ws.on("finish", () => {
          runLoopWrap(ws, { resume: true });
        }),
      ];
    },
    [runLoopWrap],
  );

  React.useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady || !loopRegion) {
      return;
    }

    attachLoopListeners(ws);
    return () => {
      loopUnsubsRef.current.forEach((unsub) => unsub());
      loopUnsubsRef.current = [];
    };
  }, [attachLoopListeners, isReady, loopRegion]);

  const ensurePlaybackInLoop = React.useCallback(
    (ws: WaveSurfer) => {
      if (!loopPreviewEnabled || !loopRegion) {
        return;
      }

      runLoopWrap(ws);
    },
    [loopPreviewEnabled, loopRegion, runLoopWrap],
  );

  React.useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady || !loopPreviewEnabled) {
      return;
    }
    runLoopWrap(ws);
  }, [isReady, loopPreviewEnabled, runLoopWrap, inSeconds, outSeconds]);

  const togglePlay = React.useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) {
      return;
    }

    if (!ws.isPlaying()) {
      ensurePlaybackInLoop(ws);
    }

    void ws.playPause();
  }, [ensurePlaybackInLoop]);

  const restart = React.useCallback(() => {
    if (!wavesurferRef.current || !isReady) return;
    if (!loopRegion) return;
    const restartAt = loopPreviewEnabled
      ? storedValueToSeconds(loopRegion?.inPoint ?? "", duration, "in")
      : 0;
    wavesurferRef.current.setTime(restartAt);
    wavesurferRef.current.play();
  }, [duration, isReady, loopRegion, loopPreviewEnabled]);

  const handleSeek = React.useCallback(
    (value: number | readonly number[]) => {
      const nextValue = Array.isArray(value) ? value[0] : value;
      if (!wavesurferRef.current || !isReady || nextValue === undefined) return;
      wavesurferRef.current.seekTo(nextValue);
    },
    [isReady],
  );

  const handleReady = React.useCallback(
    (ws: WaveSurfer) => {
      wavesurferRef.current = ws;
      const nextDuration = ws.getDuration();
      if (autoPlay) ws.play();
      setDuration(nextDuration);
      onDurationChange?.(nextDuration);
      setIsReady(true);
    },
    [autoPlay, onDurationChange],
  );

  const handlePlay = React.useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = React.useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleFinish = React.useCallback(
    (ws: WaveSurfer) => {
      if (loopRegion && loopPreviewEnabled && runLoopWrap(ws, { resume: true })) {
        return;
      }

      setIsPlaying(false);
      onFinish?.();
    },
    [loopPreviewEnabled, loopRegion, onFinish, runLoopWrap],
  );

  const handleTimeupdate = React.useCallback(
    (ws: WaveSurfer) => {
      const time = ws.getCurrentTime();
      setCurrentTime(time);
      onTimeUpdate?.(time, ws.getDuration());
    },
    [onTimeUpdate],
  );

  const handleSeeking = React.useCallback((ws: WaveSurfer) => {
    setCurrentTime(ws.getCurrentTime());
  }, []);

  const handleDestroy = React.useCallback(() => {
    loopUnsubsRef.current.forEach((unsub) => unsub());
    loopUnsubsRef.current = [];
    wavesurferRef.current = null;
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onDurationChange?.(0);
  }, [onDurationChange]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const showCustomOverlay =
    Boolean(loopRegion) && LOOP_REGION_IMPL === "custom" && isReady;

  if (!audioUrl) {
    return null;
  }

  return (
    <Card
      className={cn(
        "w-full px-0 border-0 rounded-none bg-transparent",
        className,
      )}
    >
      <CardContent className=" border-0 px-0 space-y-3">
        {title ? (
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
        ) : null}

        <div className="relative w-full rounded-sm overflow-hidden bg-muted/40">
          {!isReady ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-[2px]"
              style={{ height: waveHeight }}
            >
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          <WavesurferPlayer
            url={audioUrl}
            waveColor={waveColor}
            progressColor={progressColor}
            height={waveHeight}
            barWidth={barWidth}
            barGap={barGap}
            barRadius={barRadius}
            minPxPerSec={minPxPerSec}
            dragToSeek={!loopRegion}
            plugins={regionPlugins}
            onReady={handleReady}
            onPlay={handlePlay}
            onPause={handlePause}
            onFinish={handleFinish}
            onTimeupdate={handleTimeupdate}
            onSeeking={handleSeeking}
            onDestroy={handleDestroy}
          />
          {showCustomOverlay && loopRegion ? (
            <LoopRegionOverlay
              duration={duration}
              inSeconds={inSeconds}
              outSeconds={outSeconds}
              height={waveHeight}
              active={loopPreviewEnabled}
              snapLoopPoint={snapLoopPoint}
              onInPointChange={loopRegion.onInPointChange}
              onOutPointChange={loopRegion.onOutPointChange}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-muted-foreground w-10 text-right shrink-0">
            {formatTime(currentTime)}
          </span>
          <Slider
            className="flex-1"
            value={[progress]}
            min={0}
            max={1}
            step={0.001}
            disabled={!isReady}
            onValueChange={handleSeek}
          />
          <span className="text-[11px] tabular-nums text-muted-foreground w-10 shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={!isReady}
              onClick={restart}
              aria-label="Restart"
            >
              <RotateCcw size={15} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9"
              disabled={!isReady}
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            </Button>
          </div>
          {loopRegion ? (
            <HoverButton
              type="button"
              size="sm"
              variant={loopPreviewEnabled ? "default" : "ghost"}
              className="h-8 text-xs"
              disabled={!isReady}
              onClick={() => setLoopPreviewEnabled((current) => !current)}
              aria-pressed={loopPreviewEnabled}
              aria-label={
                loopPreviewEnabled ? "Disable loop preview" : "Enable loop preview"
              }
              simpleView={<Repeat size={14} />}
              expandedView="Loop preview"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default WavePlayer;
