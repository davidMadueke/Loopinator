import type { ComponentProps } from "react";

import { Button } from "@loopinator/ui/components/button";
import { cn } from "@loopinator/ui/lib/utils";
import { PauseIcon, PlayIcon, SkipBackIcon } from "lucide-react";

import type { PlaybackMode } from "@/lib/play-types";

type TransportBarProps = {
  mode: PlaybackMode;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
};

export function TransportBar({ mode, onPlay, onPause, onRestart }: TransportBarProps) {
  const playActive = mode === "stopped" || mode === "paused";
  const rightActive = mode === "playing" || mode === "paused";
  const showRestart = mode === "paused";

  return (
    <div className="flex h-fit w-full items-center justify-center gap-0.5 p-1">
      <TransportButton active={playActive} aria-label="Play" disabled={!playActive} onClick={onPlay}>
        <PlayIcon className="size-10 fill-current" />
      </TransportButton>
      <TransportButton
        active={rightActive}
        aria-label={showRestart ? "Restart" : "Pause"}
        disabled={!rightActive}
        onClick={showRestart ? onRestart : onPause}
        className="border-r-0"
      >
        {showRestart ? (
          <SkipBackIcon className="size-10" strokeWidth={2.5} />
        ) : (
          <PauseIcon className="size-10 fill-current" />
        )}
      </TransportButton>
    </div>
  );
}

function TransportButton({
  active,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & { active: boolean }) {
  return (
    <Button
      variant="default"
      className={cn(
        "h-20 flex-1 rounded-none border-0 border-r border-border disabled:opacity-100",
        active
          ? "bg-background text-foreground hover:bg-background"
          : "pointer-events-none bg-muted text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
