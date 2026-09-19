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
import { usePlaybackEngine } from "@/lib/playback/use-playback-engine";
import { useLoopSnap } from "@/lib/use-loop-snap";
import { useSpacebarPlayPause } from "@/hooks/use-spacebar-play-pause";
import { AutoDetectedIcon } from "@/components/play/auto-detected-icon";
import type { TrackKey } from "@/lib/play-types";

const LOOP_REGION_ID = "loop";
const LOOP_REGION_ACTIVE_COLOR = "var(--loop-region)";
const LOOP_REGION_INACTIVE_COLOR =
  "color-mix(in oklch, var(--muted-foreground) 12%, transparent)";
const LOOP_HANDLE_INACTIVE_COLOR =
  "color-mix(in oklch, var(--muted-foreground) 40%, transparent)";
/** Treat the playhead as at file end so Play can disable without a 1-frame flicker. */
const FILE_END_EPSILON_SEC = 0.01;
/** Vertical inset so the horizontal scrollbar sits in padding instead of the canvas. */
const WAVEFORM_PAD_Y_PX = 4;
/** WaveSurfer's default 8 kHz peaks cannot show real zero crossings. */
const WAVEFORM_DECODE_SAMPLE_RATE = 44100;
/** At max zoom, each decoded sample is this many pixels wide. */
const ZERO_CROSS_PX_PER_SAMPLE = 2;
/** Zoom in/out buttons and one mouse-wheel notch (deltaY ≈ 100). */
const ZOOM_STEP_FACTOR = 1.5;
const WHEEL_ZOOM_NOTCH = 100;

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

/** Zoom then restore scroll so `clientX` still sits on the same audio time.
 *  WaveSurfer's `zoom()` keeps the playhead still, which is the wrong anchor. */
function zoomAroundClientX(ws: WaveSurfer, minPxPerSec: number, clientX: number) {
  const scroller = getWaveformScroller(ws);
  const duration = ws.getDuration();
  if (!scroller || duration <= 0) {
    ws.zoom(minPxPerSec);
    return;
  }

  const originX = clientX - scroller.getBoundingClientRect().left;
  const oldPxPerSec = scroller.scrollWidth / duration;
  const pointerTime =
    oldPxPerSec > 0 ? (scroller.scrollLeft + originX) / oldPxPerSec : 0;

  ws.zoom(minPxPerSec);

  const newPxPerSec = scroller.scrollWidth / duration;
  if (newPxPerSec * duration <= scroller.clientWidth) {
    scroller.scrollLeft = 0;
    return;
  }

  scroller.scrollLeft = pointerTime * newPxPerSec - originX;
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
  /** Decoded buffer from the parent. WavePlayer decodes `src` when omitted. */
  audioBuffer?: AudioBuffer | null;
  /** Optional title shown above the waveform */
  title?: string;
  /** Display name on the Follow Playhead row when filled */
  displayName?: string;
  /** Time signature on the Follow Playhead row */
  timeSignature?: string;
  /** Original BPM on the Follow Playhead row when filled */
  bpm?: string;
  /** Amber mark beside BPM when it came from detection */
  bpmAutoDetected?: boolean;
  /** Key on the Follow Playhead row */
  trackKey?: TrackKey;
  /** Amber mark beside Key when it came from detection */
  keyAutoDetected?: boolean;
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

function formatWavePlayerKey(key: TrackKey): string {
  if (key.center === "No Key") {
    return "No Key";
  }
  return `${key.center} ${key.scale === "minor" ? "Minor" : "Major"}`;
}

function WavePlayerMeta({
  displayName,
  timeSignature,
  bpm,
  bpmAutoDetected,
  trackKey,
  keyAutoDetected,
}: {
  displayName?: string;
  timeSignature?: string;
  bpm?: string;
  bpmAutoDetected?: boolean;
  trackKey?: TrackKey;
  keyAutoDetected?: boolean;
}) {
  const name = displayName?.trim() ?? "";
  const tempo = bpm?.trim() ?? "";
  const keyLabel = trackKey ? formatWavePlayerKey(trackKey) : "";
  const items = [
    timeSignature ? <span key="sig">{timeSignature}</span> : null,
    tempo ? (
      <span key="bpm" className="inline-flex items-center gap-1">
        {tempo} BPM
        {bpmAutoDetected ? <AutoDetectedIcon kind="bpm" /> : null}
      </span>
    ) : null,
    keyLabel ? (
      <span key="key" className="inline-flex items-center gap-1">
        {keyLabel}
        {keyAutoDetected ? <AutoDetectedIcon kind="key" /> : null}
      </span>
    ) : null,
  ].filter((item) => item !== null);

  if (!name && items.length === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0  items-center gap-2">
      {name ? (
        <span
          className="max-w-[67%] flex-1 truncate text-sm font-medium text-foreground"
          title={name}
        >
          {name}
        </span>
      ) : null}
      {items.length > 0 ? (
        <span className={cn("inline-flex", /* "shrink-0", */ "items-start gap-1.5", "tabular-nums text-xs text-muted-foreground")}>
          {items.flatMap((item, index) =>
            index === 0
              ? [item]
              : [
                  <span key={`sep-${index}`} aria-hidden>
                    ·
                  </span>,
                  item,
                ],
          )}
        </span>
      ) : null}
    </div>
  );
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

  /** Region body would otherwise swallow waveform clicks. Handles stay live. */
  element.style.pointerEvents = "none";

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

    handle.style.pointerEvents = "auto";
    if (!handle.dataset.seekGuard) {
      handle.dataset.seekGuard = "1";
      handle.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      handle.addEventListener("click", (event) => {
        event.stopPropagation();
      });
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
  waveformEpoch: number,
) {
  const pluginRef = React.useRef<RegionsPlugin | null>(null);
  const regionRef = React.useRef<Region | null>(null);
  const draggingRef = React.useRef(false);
  const lastEmittedRef = React.useRef({ in: inSeconds, out: outSeconds });
  const snapLoopPointRef = React.useRef(snapLoopPoint);
  const loopRegionRef = React.useRef(loopRegion);
  const durationRef = React.useRef(duration);

  snapLoopPointRef.current = snapLoopPoint;
  loopRegionRef.current = loopRegion;
  durationRef.current = duration;

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
      lastEmittedRef.current = {
        in: ordered.inSeconds,
        out: ordered.outSeconds,
      };
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
    if (!enabled || !wavesurfer || !isReady) {
      return;
    }

    let plugin = pluginRef.current;
    if (!plugin || !wavesurfer.getActivePlugins().includes(plugin)) {
      plugin = RegionsPlugin.create();
      wavesurfer.registerPlugin(plugin);
      pluginRef.current = plugin;
      regionRef.current = null;

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
    }

    const total = wavesurfer.getDuration() || duration;
    if (total <= 0) {
      return;
    }

    const echoesDrag =
      draggingRef.current &&
      Math.abs(lastEmittedRef.current.in - inSeconds) <= 1e-4 &&
      Math.abs(lastEmittedRef.current.out - outSeconds) <= 1e-4;
    if (echoesDrag) {
      return;
    }
    draggingRef.current = false;

    const regionColor = loopPreviewEnabled
      ? LOOP_REGION_ACTIVE_COLOR
      : LOOP_REGION_INACTIVE_COLOR;

    const regionOptions = {
      id: LOOP_REGION_ID,
      start: inSeconds,
      end: outSeconds,
      drag: false,
      resize: true,
      resizeStart: true,
      resizeEnd: true,
      color: regionColor,
      minLength: LOOP_MIN_GAP_SEC,
    };

    let region = regionRef.current;
    const timesMatch =
      region &&
      !region.isRemoved &&
      Math.abs(region.start - inSeconds) <= 1e-4 &&
      Math.abs(region.end - outSeconds) <= 1e-4;

    if (!region || region.isRemoved) {
      plugin.clearRegions();
      region = plugin.addRegion(regionOptions);
      regionRef.current = region;
    } else if (!timesMatch) {
      region.setOptions({
        start: inSeconds,
        end: outSeconds,
        color: regionColor,
      });
      if (
        Math.abs(region.start - inSeconds) > 1e-4 ||
        Math.abs(region.end - outSeconds) > 1e-4
      ) {
        plugin.clearRegions();
        region = plugin.addRegion(regionOptions);
        regionRef.current = region;
      }
    } else {
      region.setOptions({
        color: regionColor,
      });
    }

    paintLoopRegionHandles(region, loopPreviewEnabled);
  }, [
    enabled,
    wavesurferRef,
    isReady,
    duration,
    inSeconds,
    outSeconds,
    loopPreviewEnabled,
    waveformEpoch,
    emitFromRegion,
  ]);

  React.useEffect(() => {
    return () => {
      pluginRef.current = null;
      regionRef.current = null;
    };
  }, [waveformEpoch]);

  return { isHandleDraggingRef: draggingRef };
}

export function WavePlayer({
  src,
  audioBuffer: audioBufferProp,
  title,
  displayName,
  timeSignature,
  bpm,
  bpmAutoDetected,
  trackKey,
  keyAutoDetected,
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
  const decoded = useLoopSnap(audioBufferProp ? null : src);
  const audioBuffer = audioBufferProp ?? decoded.audioBuffer;
  const wavesurferRef = React.useRef<WaveSurfer | null>(null);
  const loopRegionRef = React.useRef(loopRegion);

  const initialZoom = minPxPerSec ?? defaultZoom;
  const [isReady, setIsReady] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [zoom, setZoom] = React.useState(initialZoom);
  const [fitZoom, setFitZoom] = React.useState(0);
  const [waveformSampleRate, setWaveformSampleRate] = React.useState(0);
  const [loopPreviewEnabled, setLoopPreviewEnabled] = React.useState(true);
  const [snapToPlayhead, setSnapToPlayhead] = React.useState(true);
  const [waveformEpoch, setWaveformEpoch] = React.useState(0);
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

  loopRegionRef.current = loopRegion;
  snapToPlayheadRef.current = snapToPlayhead;

  /** Callers pass inline arrows. Listing them as effect deps re-fires the effect on
   *  every parent render, and a callback that sets parent state then loops. */
  const callbacksRef = React.useRef({
    onPlay,
    onPause,
    onFinish,
    onTimeUpdate,
    onDurationChange,
  });
  callbacksRef.current = {
    onPlay,
    onPause,
    onFinish,
    onTimeUpdate,
    onDurationChange,
  };

  const loopEnabled = Boolean(loopRegion) && loopPreviewEnabled;
  const playback = usePlaybackEngine({
    buffer: audioBuffer,
    inPoint: loopRegion?.inPoint ?? "",
    outPoint: loopRegion?.outPoint ?? "",
    loopEnabled,
    stretch: false,
    restartResumes: true,
  });

  const durationSec = audioBuffer?.duration || duration || playback.duration;
  const currentTime = playback.fileTime;
  const isPlaying = playback.mode === "playing";
  const canPlay = Boolean(audioBuffer) && durationSec > 0;
  const isAtFileEnd =
    !loopEnabled &&
    !isPlaying &&
    durationSec > 0 &&
    currentTime >= durationSec - FILE_END_EPSILON_SEC;
  const canTogglePlay = canPlay && !isAtFileEnd;

  const inSeconds = loopRegion
    ? storedValueToSeconds(loopRegion.inPoint, durationSec, "in")
    : 0;
  const outSeconds = loopRegion
    ? storedValueToSeconds(loopRegion.outPoint, durationSec, "out")
    : 0;

  const snapLoopPoint = loopRegion?.snapLoopPoint ?? null;

  const { isHandleDraggingRef } = useRegionsLoopRegion(
    Boolean(loopRegion) && Boolean(audioUrl),
    wavesurferRef,
    isReady,
    durationSec,
    inSeconds,
    outSeconds,
    loopPreviewEnabled,
    loopRegion,
    snapLoopPoint,
    waveformEpoch,
  );

  const lastModeRef = React.useRef(playback.mode);
  const fileTimeRef = React.useRef(playback.fileTime);
  fileTimeRef.current = playback.fileTime;

  React.useEffect(() => {
    if (durationSec > 0 && durationSec !== duration) {
      setDuration(durationSec);
      callbacksRef.current.onDurationChange?.(durationSec);
    }
  }, [duration, durationSec]);

  React.useEffect(() => {
    callbacksRef.current.onTimeUpdate?.(playback.fileTime, durationSec);
  }, [durationSec, playback.fileTime]);

  React.useEffect(() => {
    const prev = lastModeRef.current;
    if (prev === playback.mode) {
      return;
    }
    lastModeRef.current = playback.mode;
    const { onPlay: play, onPause: pause, onFinish: finish } = callbacksRef.current;
    if (playback.mode === "playing") {
      play?.();
      return;
    }
    if (playback.mode === "paused") {
      pause?.();
      return;
    }
    if (prev === "playing") {
      if (
        durationSec > 0 &&
        fileTimeRef.current >= durationSec - FILE_END_EPSILON_SEC
      ) {
        finish?.();
        return;
      }
      pause?.();
    }
  }, [durationSec, playback.mode]);

  React.useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) {
      return;
    }
    if (Math.abs(ws.getCurrentTime() - playback.fileTime) > 0.008) {
      ws.setTime(playback.fileTime);
    }
  }, [isReady, playback.fileTime]);

  const togglePlay = React.useCallback(() => {
    if (playback.mode === "playing") {
      void playback.pause();
      return;
    }
    if (isAtFileEnd) {
      return;
    }
    void playback.play();
  }, [isAtFileEnd, playback.mode, playback.pause, playback.play]);

  useSpacebarPlayPause(togglePlay, canPlay);

  const restart = React.useCallback(() => {
    if (!canPlay) {
      return;
    }
    void playback.restart();
  }, [canPlay, playback.restart]);

  const handleSeek = React.useCallback(
    (value: number | readonly number[]) => {
      const nextValue = Array.isArray(value) ? value[0] : value;
      if (!canPlay || nextValue === undefined) {
        return;
      }
      playback.seekFileTime(nextValue * durationSec);
    },
    [canPlay, durationSec, playback.seekFileTime],
  );

  const applyZoom = React.useCallback(
    (next: number, originClientX?: number) => {
      const clamped = clampZoom(next, effectiveMinZoom, effectiveMaxZoom);
      const ws = wavesurferRef.current;
      if (clamped === zoomRef.current) {
        return;
      }
      zoomRef.current = clamped;
      setZoom(clamped);
      if (!ws) {
        return;
      }
      if (originClientX === undefined) {
        ws.zoom(clamped);
        return;
      }
      zoomAroundClientX(ws, clamped, originClientX);
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
    applyZoom(zoom * ZOOM_STEP_FACTOR);
  }, [applyZoom, zoom]);

  const zoomOut = React.useCallback(() => {
    applyZoom(zoom / ZOOM_STEP_FACTOR);
  }, [applyZoom, zoom]);

  const toggleSnapToPlayhead = React.useCallback(() => {
    const next = !snapToPlayheadRef.current;
    setSnapToPlayhead(next);
    const ws = wavesurferRef.current;
    if (ws) {
      setSnapViewToPlayhead(ws, next);
    }
  }, []);

  const seekFileTimeRef = React.useRef(playback.seekFileTime);
  seekFileTimeRef.current = playback.seekFileTime;

  const handleReady = React.useCallback(
    (ws: WaveSurfer) => {
      wavesurferRef.current = ws;
      setWaveformEpoch((epoch) => epoch + 1);
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
      if (nextDuration > 0) {
        setDuration(nextDuration);
        callbacksRef.current.onDurationChange?.(nextDuration);
      }
      setIsReady(true);
    },
    [maxZoom],
  );

  const autoPlayedRef = React.useRef(false);
  React.useEffect(() => {
    if (!autoPlay || !canPlay || autoPlayedRef.current) {
      return;
    }
    autoPlayedRef.current = true;
    void playback.play();
  }, [autoPlay, canPlay, playback.play]);

  React.useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) {
      return;
    }

    const wrapper = ws.getWrapper();
    const seekFromRatio = (ratio: number) => {
      if (isHandleDraggingRef.current) {
        return;
      }
      const duration = ws.getDuration();
      if (duration <= 0) {
        return;
      }
      seekFileTimeRef.current(
        Math.min(1, Math.max(0, ratio)) * duration,
      );
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[part~="region-handle"]')) {
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      seekFromRatio((event.clientX - rect.left) / rect.width);
    };

    wrapper.addEventListener("click", onClick);
    const unsubDrag = ws.on("drag", (ratio) => {
      seekFromRatio(ratio);
    });

    return () => {
      wrapper.removeEventListener("click", onClick);
      unsubDrag();
    };
  }, [isHandleDraggingRef, isReady, waveformEpoch]);

  React.useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) {
      return;
    }
    const scroller = getWaveformScroller(ws);
    if (!scroller) {
      return;
    }

    let pendingDeltaY = 0;
    let pendingClientX = 0;
    let frame = 0;

    const flushZoom = () => {
      frame = 0;
      const deltaY = pendingDeltaY;
      pendingDeltaY = 0;
      applyZoom(
        zoomRef.current *
          Math.pow(ZOOM_STEP_FACTOR, -deltaY / WHEEL_ZOOM_NOTCH),
        pendingClientX,
      );
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        return;
      }
      event.preventDefault();
      pendingDeltaY += event.deltaY;
      pendingClientX = event.clientX;
      if (frame === 0) {
        frame = requestAnimationFrame(flushZoom);
      }
    };

    scroller.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [applyZoom, isReady, waveformEpoch]);

  const handleDestroy = React.useCallback(() => {
    wavesurferRef.current = null;
    setIsReady(false);
    setDuration(0);
    setZoom(initialZoom);
    setFitZoom(0);
    setWaveformSampleRate(0);
    callbacksRef.current.onDurationChange?.(0);
  }, [initialZoom]);

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

  const progress = durationSec > 0 ? currentTime / durationSec : 0;

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
          <div className="flex items-center justify-between gap-3">
            <WavePlayerMeta
              displayName={displayName}
              timeSignature={timeSignature}
              bpm={bpm}
              bpmAutoDetected={bpmAutoDetected}
              trackKey={trackKey}
              keyAutoDetected={keyAutoDetected}
            />
            <HoverButton
              type="button"
              size="sm"
              variant={snapToPlayhead ? "default" : "ghost"}
              className="ml-auto h-8 shrink-0 text-xs"
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
              dragToSeek
              hideScrollbar={false}
              onReady={handleReady}
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
            disabled={!canPlay}
            onValueChange={handleSeek}
          />
          <span className="text-[11px] tabular-nums text-muted-foreground w-10 shrink-0">
            {formatTime(durationSec)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={!canPlay}
              onClick={restart}
              aria-label="Restart"
            >
              <RotateCcw size={15} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9"
              disabled={!canTogglePlay}
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
