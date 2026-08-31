"use client";

import { cn } from "@loopinator/ui/lib/utils";

type PlayheadCircleProps = {
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
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);

  return (
    <svg
      data-slot="playhead-circle"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0 -rotate-90", className)}
      aria-hidden
    >
      {<circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/35"
      />}
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
        className="text-playhead transition-[stroke-dashoffset] duration-75"
      />
    </svg>
  );
}

export { PlayheadCircle };
