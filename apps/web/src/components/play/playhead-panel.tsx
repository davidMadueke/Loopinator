import { PlayheadCircle } from "@loopinator/ui/components/playhead-circle";
import { Separator } from "@loopinator/ui/components/separator";
import { AlertTriangleIcon } from "lucide-react";

import type { Track } from "@/lib/play-types";

type PlayheadPanelProps = {
  track: Track;
  targetBpm: number;
  playhead: number;
  hasLocalOverride: boolean;
  advancedOpen: boolean;
  onAdvancedToggle: () => void;
};

export function PlayheadPanel({
  track,
  targetBpm,
  playhead,
  hasLocalOverride,
  advancedOpen,
  onAdvancedToggle,
}: PlayheadPanelProps) {
  return (
    <div className="relative flex flex-col items-center py-6">
      <div className="relative flex items-center justify-center">
        <PlayheadCircle progress={playhead} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <div className="flex h-fit w-fit items-center justify-center gap-2">
            <p className="h-full align-middle text-7xl font-bold tabular-nums">{Math.round(targetBpm)}</p>
            <p className="flex h-full w-fit flex-col items-center justify-center text-xs leading-tight ">
              <span></span>
              <span>B</span>
              <span>P</span>
              <span>M</span>
            </p>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {track.originalBpm} BPM original
            {track.bpmUnconfirmed ? (
              <AlertTriangleIcon className="size-3 text-amber-500" aria-label="Unconfirmed BPM" />
            ) : null}
          </p>
          <Separator className="my-3 w-24" />
          <p className=" text-medium font-medium">{track.displayName}</p>
          <div className="mt-3 flex items-center gap-1 w-fit">
            <div className="flex h-fit w-full items-end justify-start gap-1 p-1">
              <p className="text-sm text-muted-foreground">{track.key} </p>
              <p className="text-sm text-muted-foreground">
                {track.key === "No Key" ? "" : (track.keyMode === "minor" ? "Minor" : "Major") }
              </p>
            </div>
            <div className="flex h-fit w-full items-end justify-end">
              <p className="flex w-full items-center justify-end text-sm text-muted-foreground p-1">
                {track.timeSignature}
              </p>
            </div>
          </div>
          
          {/* {track.songTitle ? (
            <p className="text-xs text-muted-foreground">{track.songTitle}</p>
          ) : null} */}
          <div className="mt-4">
            <AdvancedOptionsEntry
              hasLocalOverride={hasLocalOverride}
              advancedOpen={advancedOpen}
              onToggle={onAdvancedToggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancedOptionsEntry({
  hasLocalOverride,
  advancedOpen,
  onToggle,
}: {
  hasLocalOverride: boolean;
  advancedOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={advancedOpen}
      className="relative inline-flex h-8 items-center border border-border px-3 text-xs hover:bg-muted"
    >
      Advanced Options
      {hasLocalOverride ? (
        <span
          className="absolute -top-1 -right-1 size-2 rounded-full bg-playhead"
          aria-label="Local override active"
        />
      ) : null}
    </button>
  );
}
