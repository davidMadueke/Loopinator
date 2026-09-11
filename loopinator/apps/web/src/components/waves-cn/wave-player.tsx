"use client";

import * as React from "react";
import { cn } from "@loopinator/ui/lib/utils";
import { Card, CardContent } from "@loopinator/ui/components/card";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";
import { Slider } from "@loopinator/ui/components/slider";
import {
  Play,
  Pause,
  Loader2,
  LocateFixed,
  RotateCcw,
  Repeat,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import WavesurferPlayer from "@/lib/wave-cn";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";
import type { Region } from "wavesurfer.js/dist/plugins/regions.js";
import {
  commitLoopPointSeconds,
  LOOP_MIN_GAP_SEC,
  storedValueToSeconds,
  toStoredLoopRegion,
} from "@/lib/loop-region-time";
import { wrapLoopPlayback } from "@/lib/loop-playback";
import { useSpacebarPlayPause } from "@/hooks/use-spacebar-play-pause";

const LOOP_REGION_ID = "loop";
const LOOP_REGION_ACTIVE_COLOR = "var(--loop-region)";
const LOOP_REGION_INACTIVE_COLOR =
  "color-mix(in oklch, var(--muted-foreground) 12%, transparent)";
const LOOP_HANDLE_INACTIVE_COLOR =
  "color-mix(in oklch, var(--muted-foreground) 40%, transparent)";
/** Vertical inset so the horizontal scrollbar sits in padding instead of the canvas. */
const WAVEFORM_PAD_Y_PX = 4;
/** WaveSurfer's default 8 kHz peaks cannot show real zero crossings. */
const WAVEFORM_DECODE_SAMPLE_RATE = 44100;
/** At max zoom, each decoded sample is this many pixels wide. */
const ZERO_CROSS_PX_PER_SAMPLE = 8;

function getWaveformScroller(ws: WaveSurfer) {
  return ws.getWrapper().parentElement;
}

/** Pixels per second that draws the whole duration in the visible scroller.
 *  Floored so WaveSurfer's `Math.ceil(duration * minPxPerSec)` cannot overflow by 1px. */
function getFitZoomPxPerSec(ws: WaveSurfer): number {
  const total = ws.getDuration();
  const scroller = getWaveformScroller(ws);
  if (total <= 0 || !scroller) {
    return 0;
  }

  const style = getComputedStyle(scroller);
  const padding =
    (Number.parseFloat(style.paddingLeft) || 0) +
    (Number.parseFloat(style.paddingRight) || 0);
  const width = Math.floor(scroller.clientWidth - padding);
  if (width <= 0) {
    return 0;
  }

  return width / total;
}

function clampZoom(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function maxZoomForSampleRate(sampleRate: number, fallback: number) {
  if (sampleRate <= 0) {
    return fallback;
  }

  return sampleRate * ZERO_CROSS_PX_PER_SAMPLE;
}

function zoomToSliderValue(zoom: number, min: number, max: number) {
  if (max <= min) {
    return 0;
  }

  const clamped = clampZoom(zoom, min, max);
  return (
    (Math.log(clamped) - Math.log(min)) / (Math.log(max) - Math.log(min))
  );
}

function sliderValueToZoom(value: number, min: number, max: number) {
  if (max <= min) {
    return min;
  }

  return Math.exp(Math.log(min) + value * (Math.log(max) - Math.log(min)));
}

function padWaveformScroller(ws: WaveSurfer) {
  const scroller = getWaveformScroller(ws);
  if (!scroller) {
    return;
  }

  scroller.style.paddingTop = `${WAVEFORM_PAD_Y_PX}px`;
  scroller.style.paddingBottom = `${WAVEFORM_PAD_Y_PX}px`;
  scroller.style.boxSizing = "content-box";
  scroller.style.scrollbarGutter = "stable";
}

/** Mutates options in place. `setOptions` re-renders and recenters on the cursor. */
function setSnapViewToPlayhead(ws: WaveSurfer, enabled: boolean) {
  ws.options.autoScroll = enabled;
  ws.options.autoCenter = enabled;

  if (!enabled) {
    return;
  }

  const duration = ws.getDuration();
  const scroller = getWaveformScroller(ws);
  if (duration <= 0 || !scroller) {
    return;
  }

  const playheadPx = (ws.getCurrentTime() / duration) * scroller.scrollWidth;
  scroller.scrollLeft = playheadPx - scroller.clientWidth / 2;
}

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
  /** Waveform height in px @default 80 */
  waveHeight?: number;
  /** Initial zoom in pixels per second. `minPxPerSec` overrides this when set. @default 50 */
  defaultZoom?: number;
  /** Fallback minimum zoom before the waveform can measure a fit-to-track zoom. @default 10 */
  minZoom?: number;
  /** Fallback maximum zoom before sample rate is known. Live max is sample-rate × 8 px. @default 500 */
  maxZoom?: number;
  /** Initial zoom in pixels per second. Prefer `defaultZoom`. */
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

function paintLoopRegionHandles(region: Region, active: boolean) {
  const element = region.element;
  if (!element) {
    return;
  }

  const handleColor = active ? "var(--primary)" : LOOP_HANDLE_INACTIVE_COLOR;
  const left = element.querySelector<HTMLElement>(
    '[part~="region-handle-left"]',
  );
  const right = element.querySelector<HTMLElement>(
    '[part~="region-handle-right"]',
  );

  const paint = (handle: HTMLElement | null, edge: "left" | "right") => {
    if (!handle) {
      return;
    }

    handle.style.width = "10px";
    handle.style.background = "transparent";
    handle.style.borderRadius = "0";
    handle.style.borderLeft =
      edge === "left" ? `6px solid ${handleColor}` : "none";
    handle.style.borderRight =
      edge === "right" ? `6px solid ${handleColor}` : "none";
    handle.style.left = edge === "left" ? "-5px" : "";
    handle.style.right = edge === "right" ? "-5px" : "";
  };

  paint(left, "left");
  paint(right, "right");
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
  pluginKey: string,
) {
  const plugin = React.useMemo(() => {
    if (!enabled) {
      return null;
    }
    return RegionsPlugin.create();
  }, [enabled, pluginKey]);

  const plugins = React.useMemo(
    () => (plugin ? [plugin] : undefined),
    [plugin],
  );

  const regionRef = React.useRef<Region | null>(null);
  const draggingRef = React.useRef(false);
  const snapLoopPointRef = React.useRef(snapLoopPoint);
  const loopRegionRef = React.useRef(loopRegion);
  const durationRef = React.useRef(duration);

  snapLoopPointRef.current = snapLoopPoint;
  loopRegionRef.current = loopRegion;
  durationRef.current = duration;

  React.useEffect(() => {
    regionRef.current = null;
  }, [plugin]);

  const emitFromRegion = React.useCallback(
    (region: Region, side: "start" | "end" | undefined, snap: boolean) => {
      const controls = loopRegionRef.current;
      const total = durationRef.current;
      if (!controls || region.id !== LOOP_REGION_ID || total <= 0 || !side) {
        return;
      }

      const snapFn = snapLoopPointRef.current;
      const ordered = commitLoopPointSeconds(
        side === "start" ? region.start : region.end,
        side === "start" ? region.end : region.start,
        total,
        side === "start" ? "in" : "out",
        {
          snap: snap && Boolean(snapFn),
          snapLoopPoint: snapFn,
        },
      );
      const stored = toStoredLoopRegion(
        ordered.inSeconds,
        ordered.outSeconds,
        total,
      );
      controls.onInPointChange(stored.inPoint);
      controls.onOutPointChange(stored.outPoint);
    },
    [],
  );

  React.useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!enabled || !plugin || !wavesurfer || !isReady || duration <= 0) {
      return;
    }

    if (draggingRef.current) {
      return;
    }

    const regionColor = loopPreviewEnabled
      ? LOOP_REGION_ACTIVE_COLOR
      : LOOP_REGION_INACTIVE_COLOR;

    let region = regionRef.current;
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

    paintLoopRegionHandles(region, loopPreviewEnabled);
  }, [
    enabled,
    plugin,
    wavesurferRef,
    isReady,
    duration,
    inSeconds,
    outSeconds,
    loopPreviewEnabled,
  ]);

  React.useEffect(() => {
    if (!enabled || !plugin) {
      return;
    }

    const onUpdate = (region: Region, side?: "start" | "end") => {
      draggingRef.current = true;
      emitFromRegion(region, side, false);
    };

    const onUpdated = (region: Region, side?: "start" | "end") => {
      emitFromRegion(region, side, true);
      draggingRef.current = false;
    };

    plugin.on("region-update", onUpdate);
    plugin.on("region-updated", onUpdated);
    return () => {
      plugin.un("region-update", onUpdate);
      plugin.un("region-updated", onUpdated);
    };
  }, [enabled, plugin, emitFromRegion]);

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
  waveHeight = 80,
  defaultZoom = 50,
  minZoom = 10,
  maxZoom = 500,
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

  const initialZoom = minPxPerSec ?? defaultZoom;
  const [isReady, setIsReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [zoom, setZoom] = React.useState(initialZoom);
  const [fitZoom, setFitZoom] = React.useState(0);
  const [waveformSampleRate, setWaveformSampleRate] = React.useState(0);
  const [loopPreviewEnabled, setLoopPreviewEnabled] = React.useState(true);
  const [snapToPlayhead, setSnapToPlayhead] = React.useState(true);
  const snapToPlayheadRef = React.useRef(snapToPlayhead);
  const zoomRef = React.useRef(zoom);
  zoomRef.current = zoom;

  const effectiveMinZoom = fitZoom > 0 ? fitZoom : minZoom;
  const effectiveMaxZoom = Math.max(
    maxZoomForSampleRate(waveformSampleRate, maxZoom),
    effectiveMinZoom,
  );
  const effectiveMaxZoomRef = React.useRef(effectiveMaxZoom);
  effectiveMaxZoomRef.current = effectiveMaxZoom;

  loopPreviewRef.current = loopPreviewEnabled;
  loopRegionRef.current = loopRegion;
  snapToPlayheadRef.current = snapToPlayhead;

  const inSeconds = loopRegion
    ? storedValueToSeconds(loopRegion.inPoint, duration, "in")
    : 0;
  const outSeconds = loopRegion
    ? storedValueToSeconds(loopRegion.outPoint, duration, "out")
    : 0;

  const snapLoopPoint = loopRegion?.snapLoopPoint ?? null;

  const regionPlugins = useRegionsLoopRegion(
    Boolean(loopRegion) && Boolean(audioUrl),
    wavesurferRef,
    isReady,
    duration,
    inSeconds,
    outSeconds,
    loopPreviewEnabled,
    loopRegion,
    snapLoopPoint,
    audioUrl,
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

  useSpacebarPlayPause(togglePlay, isReady);

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

  const applyZoom = React.useCallback(
    (next: number) => {
      const clamped = clampZoom(next, effectiveMinZoom, effectiveMaxZoom);
      zoomRef.current = clamped;
      setZoom(clamped);
      wavesurferRef.current?.zoom(clamped);
    },
    [effectiveMinZoom, effectiveMaxZoom],
  );

  const handleZoom = React.useCallback(
    (value: number | readonly number[]) => {
      const next = Array.isArray(value) ? value[0] : value;
      if (next === undefined) return;
      applyZoom(sliderValueToZoom(next, effectiveMinZoom, effectiveMaxZoom));
    },
    [applyZoom, effectiveMaxZoom, effectiveMinZoom],
  );

  const zoomIn = React.useCallback(() => {
    applyZoom(zoom * 1.5);
  }, [applyZoom, zoom]);

  const zoomOut = React.useCallback(() => {
    applyZoom(zoom / 1.5);
  }, [applyZoom, zoom]);

  const toggleSnapToPlayhead = React.useCallback(() => {
    const next = !snapToPlayheadRef.current;
    setSnapToPlayhead(next);
    const ws = wavesurferRef.current;
    if (ws) {
      setSnapViewToPlayhead(ws, next);
    }
  }, []);

  const handleReady = React.useCallback(
    (ws: WaveSurfer) => {
      wavesurferRef.current = ws;
      padWaveformScroller(ws);
      setSnapViewToPlayhead(ws, snapToPlayheadRef.current);
      const nextDuration = ws.getDuration();
      const nextFit = getFitZoomPxPerSec(ws);
      const nextRate =
        ws.getDecodedData()?.sampleRate ?? WAVEFORM_DECODE_SAMPLE_RATE;
      setFitZoom(nextFit);
      setWaveformSampleRate(nextRate);
      if (nextFit > 0) {
        const nextMax = Math.max(
          maxZoomForSampleRate(nextRate, maxZoom),
          nextFit,
        );
        const clamped = clampZoom(zoomRef.current, nextFit, nextMax);
        if (clamped !== zoomRef.current) {
          zoomRef.current = clamped;
          setZoom(clamped);
          ws.zoom(clamped);
        }
      }
      if (autoPlay) ws.play();
      setDuration(nextDuration);
      onDurationChange?.(nextDuration);
      setIsReady(true);
    },
    [autoPlay, maxZoom, onDurationChange],
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
    setZoom(initialZoom);
    setFitZoom(0);
    setWaveformSampleRate(0);
    onDurationChange?.(0);
  }, [initialZoom, onDurationChange]);

  React.useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) {
      return;
    }

    const syncFitZoom = () => {
      const nextFit = getFitZoomPxPerSec(ws);
      setFitZoom(nextFit);
      if (nextFit <= 0) {
        return;
      }

      const clamped = clampZoom(
        zoomRef.current,
        nextFit,
        Math.max(effectiveMaxZoomRef.current, nextFit),
      );
      if (clamped === zoomRef.current) {
        return;
      }

      zoomRef.current = clamped;
      setZoom(clamped);
      ws.zoom(clamped);
    };

    syncFitZoom();
    const scroller = getWaveformScroller(ws);
    if (!scroller) {
      return;
    }

    const observer = new ResizeObserver(syncFitZoom);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [duration, isReady]);

  const progress = duration > 0 ? currentTime / duration : 0;

  if (!audioUrl) {
    return null;
  }

  return (
    <Card
      className={cn(
        "isolate w-full px-0 py-0 border-0 rounded-none bg-transparent",
        className,
      )}
    >
      <CardContent className=" border-0 px-0 space-y-3">
        {title ? (
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
        ) : null}

        <div className="space-y-1">
          <div className="flex items-center justify-end">
            <HoverButton
              type="button"
              size="sm"
              variant={snapToPlayhead ? "default" : "ghost"}
              className="h-8 text-xs"
              disabled={!isReady}
              onClick={toggleSnapToPlayhead}
              aria-pressed={snapToPlayhead}
              aria-label={
                snapToPlayhead
                  ? "Disable snap to playhead"
                  : "Enable snap to playhead"
              }
              simpleView={<LocateFixed size={14} />}
              expandedView="Follow Playhead"
            />
          </div>
          <div className="flex items-center gap-2 w-full">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={!isReady || zoom <= effectiveMinZoom}
              onClick={zoomOut}
              aria-label="Zoom out"
            >
              <ZoomOut size={15} />
            </Button>
            <Slider
              className="flex-1 [&_[data-slot=slider-range]]:bg-[color-mix(in_oklch,var(--primary)_45%,white)]"
              value={[zoomToSliderValue(zoom, effectiveMinZoom, effectiveMaxZoom)]}
              min={0}
              max={1}
              step={0.001}
              disabled={!isReady}
              onValueChange={handleZoom}
              aria-label="Zoom"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={!isReady || zoom >= effectiveMaxZoom}
              onClick={zoomIn}
              aria-label="Zoom in"
            >
              <ZoomIn size={15} />
            </Button>
          </div>
          <div className="relative w-full overflow-hidden rounded-sm bg-muted/40 py-1">
            {!isReady ? (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-[2px]"
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
              minPxPerSec={initialZoom}
              sampleRate={WAVEFORM_DECODE_SAMPLE_RATE}
              fillParent
              dragToSeek={!loopRegion}
              hideScrollbar={false}
              plugins={regionPlugins}
              onReady={handleReady}
              onPlay={handlePlay}
              onPause={handlePause}
              onFinish={handleFinish}
              onTimeupdate={handleTimeupdate}
              onSeeking={handleSeeking}
              onDestroy={handleDestroy}
            />
          </div>
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

        <div className="flex items-center justify-between gap-3">
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
              aria-keyshortcuts="Space"
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
