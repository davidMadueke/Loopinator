import type { ComponentProps } from "react";

import { Button } from "@loopinator/ui/components/button";
import { cn } from "@loopinator/ui/lib/utils";
import { PauseIcon, PlayIcon, SkipBackIcon } from "lucide-react";

import type { PlaybackMode } from "@/lib/play-types";

type TransportTone = "idle" | "engaged" | "disabled";

const TRANSPORT_TONES: Record<TransportTone, string> = {
  idle: "bg-background text-foreground hover:bg-background",
  engaged: "bg-primary text-primary-foreground hover:bg-primary",
  disabled: "pointer-events-none bg-muted text-muted-foreground",
};

type TransportBarProps = {
  mode: PlaybackMode;
  playhead: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
};

export function TransportBar({ mode, playhead, onPlay, onPause, onRestart }: TransportBarProps) {
  const playing = mode === "playing";
  const canRestart = !playing && playhead > 0;

  return (
    <div className="flex h-fit w-full items-center justify-center gap-0.5 p-3">
      <TransportButton
        tone={playing ? "engaged" : "idle"}
        aria-label={playing ? "Pause" : "Play"}
        aria-pressed={playing}
        onClick={playing ? onPause : onPlay}
      >
        {playing ? (
          <PauseIcon className="size-10 fill-current" />
        ) : (
          <PlayIcon className="size-10 fill-current" />
        )}
      </TransportButton>
      <TransportButton
        tone={canRestart ? "idle" : "disabled"}
        aria-label="Restart"
        disabled={!canRestart}
        onClick={onRestart}
      >
        <SkipBackIcon className="size-10" strokeWidth={2.5} />
      </TransportButton>
    </div>
  );
}

function TransportButton({
  tone,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & { tone: TransportTone }) {
  return (
    <Button
      variant="default"
      className={cn(
        "box-content h-20 w-full flex-1 align-middle rounded-none border-2 border-border disabled:opacity-100",
        TRANSPORT_TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
