"use client";

import { cn } from "@loopinator/ui/lib/utils";

type PlayheadCircleProps = {
  /** Loop fraction from advanceFileTime. 0 is empty, 1 is the full ring. */
  progress: number;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

function PlayheadCircle({
  progress,
  className,
  size = 350,
  strokeWidth = 10,
}: PlayheadCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const clamped = Math.min(1, Math.max(0, progress));
  const circumference =  "50%";

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
        cx={circumference}
        cy={circumference}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/35"
      />
      <circle
        cx={circumference}
        cy={circumference}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={"100 200"}
        strokeDashoffset={100 - clamped * 100}
        className="text-playhead"
      />
    </svg>
  );
}
export { PlayheadCircle };
