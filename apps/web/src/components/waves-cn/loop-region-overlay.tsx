"use client";

import * as React from "react";
import { cn } from "@loopinator/ui/lib/utils";
import {
  commitLoopPointSeconds,
  timeToStoredValue,
} from "@/lib/loop-region-time";

type LoopRegionOverlayProps = {
  duration: number;
  inSeconds: number;
  outSeconds: number;
  height: number;
  active: boolean;
  snapLoopPoint?: ((seconds: number) => number) | null;
  onInPointChange: (value: string) => void;
  onOutPointChange: (value: string) => void;
};

type DragTarget = "in" | "out";

function timeFromClientX(
  clientX: number,
  rect: DOMRect,
  duration: number,
): number {
  const ratio = Math.min(Math.max(0, (clientX - rect.left) / rect.width), 1);
  return ratio * duration;
}

export function LoopRegionOverlay({
  duration,
  inSeconds,
  outSeconds,
  height,
  active,
  snapLoopPoint,
  onInPointChange,
  onOutPointChange,
}: LoopRegionOverlayProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<DragTarget | null>(null);
  const snapLoopPointRef = React.useRef(snapLoopPoint);
  const inSecondsRef = React.useRef(inSeconds);
  const outSecondsRef = React.useRef(outSeconds);

  snapLoopPointRef.current = snapLoopPoint;
  inSecondsRef.current = inSeconds;
  outSecondsRef.current = outSeconds;

  const inRatio = duration > 0 ? inSeconds / duration : 0;
  const outRatio = duration > 0 ? outSeconds / duration : 1;

  const commitDrag = React.useCallback(
    (
      target: DragTarget,
      nextIn: number,
      nextOut: number,
      snap: boolean,
    ) => {
      const clamped = commitLoopPointSeconds(
        target === "in" ? nextIn : nextOut,
        target === "in" ? nextOut : nextIn,
        duration,
        target === "in" ? "in" : "out",
        {
          snap,
          snapLoopPoint: snapLoopPointRef.current,
        },
      );

      if (target === "in") {
        onInPointChange(
          timeToStoredValue(clamped.inSeconds, duration, "in"),
        );
      } else {
        onOutPointChange(
          timeToStoredValue(clamped.outSeconds, duration, "out"),
        );
      }
    },
    [duration, onInPointChange, onOutPointChange],
  );

  React.useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const target = dragRef.current;
      const container = containerRef.current;
      if (!target || !container || duration <= 0) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextTime = timeFromClientX(event.clientX, rect, duration);

      if (target === "in") {
        commitDrag("in", nextTime, outSecondsRef.current, false);
      } else {
        commitDrag("out", inSecondsRef.current, nextTime, false);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const target = dragRef.current;
      const container = containerRef.current;
      if (target && container && duration > 0) {
        const rect = container.getBoundingClientRect();
        const nextTime = timeFromClientX(event.clientX, rect, duration);

        if (target === "in") {
          commitDrag("in", nextTime, outSecondsRef.current, true);
        } else {
          commitDrag("out", inSecondsRef.current, nextTime, true);
        }
      }

      dragRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [commitDrag, duration]);

  const startDrag = (target: DragTarget) => (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = target;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  if (duration <= 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ height }}
    >
      <div
        className={cn(
          "absolute inset-y-0 transition-colors duration-150",
          active ? "bg-primary/25" : "bg-muted-foreground/10",
        )}
        style={{
          left: `${inRatio * 100}%`,
          width: `${Math.max(0, outRatio - inRatio) * 100}%`,
        }}
      />
      <LoopHandle
        ariaLabel="Loop in-point"
        positionRatio={inRatio}
        active={active}
        onPointerDown={startDrag("in")}
      />
      <LoopHandle
        ariaLabel="Loop out-point"
        positionRatio={outRatio}
        active={active}
        onPointerDown={startDrag("out")}
      />
    </div>
  );
}

type LoopHandleProps = {
  ariaLabel: string;
  positionRatio: number;
  active: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
};

function LoopHandle({
  ariaLabel,
  positionRatio,
  active,
  onPointerDown,
}: LoopHandleProps) {
  return (
    <div
      className="absolute inset-y-0 -translate-x-1/2 pointer-events-auto touch-none cursor-ew-resize"
      style={{ left: `${positionRatio * 100}%`, width: 20 }}
      onPointerDown={onPointerDown}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(positionRatio * 100)}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors duration-150",
          active ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
    </div>
  );
}
