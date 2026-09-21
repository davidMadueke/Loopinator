"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@loopinator/ui/lib/utils";

type PlayheadCircleProps = {
  /** Loop fraction from advanceFileTime. 0 is empty, 1 is the full ring. */
  progress: number;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

/** How long the stroke takes to finish the last sliver before the seam clears. */
const SEAM_MS = 80;

/** True when Playhead crossed the loop seam. A smaller drop is a backward seek. */
function isSeamWrap(previous: number, next: number): boolean {
  return previous - next > 0.5;
}

function PlayheadCircle({
  progress,
  className,
  size = 350,
  strokeWidth = 10,
}: PlayheadCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const [rendered, setRendered] = useState(clamped);
  const [motion, setMotion] = useState(true);
  const previous = useRef(clamped);
  const latest = useRef(clamped);
  const resetting = useRef(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    latest.current = clamped;

    if (resetting.current) {
      return;
    }

    if (isSeamWrap(previous.current, clamped)) {
      resetting.current = true;
      previous.current = clamped;
      setMotion(true);
      setRendered(1);
      resetTimer.current = window.setTimeout(() => {
        resetTimer.current = null;
        const next = latest.current;
        previous.current = next;
        setMotion(false);
        setRendered(next);
        requestAnimationFrame(() => {
          setMotion(true);
          resetting.current = false;
        });
      }, SEAM_MS);
      return;
    }

    previous.current = clamped;
    setRendered(clamped);
  }, [clamped]);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const offset = circumference * (1 - rendered);

  return (
    <svg
      data-slot="playhead-circle"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0 -rotate-90", className)}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/35"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-playhead"
        style={
          motion
            ? { transition: `stroke-dashoffset ${SEAM_MS}ms linear` }
            : undefined
        }
      />
    </svg>
  );
}

export { PlayheadCircle };
