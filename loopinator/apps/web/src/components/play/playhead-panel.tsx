import { Button } from "@loopinator/ui/components/button";
import { PlayheadCircle } from "@loopinator/ui/components/playhead-circle";
import { Separator } from "@loopinator/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@loopinator/ui/components/sheet";
import { cn } from "@loopinator/ui/lib/utils";
import { AlertTriangleIcon } from "lucide-react";

import type { Track } from "@/lib/play-types";

type PlayheadPanelProps = {
  track: Track;
  targetBpm: number;
  playhead: number;
  hasLocalOverride: boolean;
  onResetDevice: () => void;
};

export function PlayheadPanel({
  track,
  targetBpm,
  playhead,
  hasLocalOverride,
  onResetDevice,
}: PlayheadPanelProps) {
  return (
    <div className="relative flex flex-col items-center py-6">
      <div className="relative flex items-center justify-center">
        <PlayheadCircle progress={playhead} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <p className="text-3xl font-semibold tabular-nums">{Math.round(targetBpm)} BPM</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {track.originalBpm} BPM original
            {track.bpmUnconfirmed ? (
              <AlertTriangleIcon className="size-3 text-amber-500" aria-label="Unconfirmed BPM" />
            ) : null}
          </p>
          <Separator className="my-3 w-24" />
          <p className="text-xs text-muted-foreground">{track.key}</p>
          <p className="text-xs text-muted-foreground">{track.timeSignature}</p>
          <p className="mt-3 text-sm font-medium">{track.displayName}</p>
          {track.songTitle ? (
            <p className="text-xs text-muted-foreground">{track.songTitle}</p>
          ) : null}
          <div className="mt-4">
            <AdvancedOptionsEntry hasLocalOverride={hasLocalOverride} onResetDevice={onResetDevice} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancedOptionsEntry({
  hasLocalOverride,
  onResetDevice,
}: {
  hasLocalOverride: boolean;
  onResetDevice: () => void;
}) {
  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          "relative inline-flex h-8 items-center border border-border px-3 text-xs hover:bg-muted",
        )}
      >
        Advanced Options
        {hasLocalOverride ? (
          <span
            className="absolute -top-1 -right-1 size-2 rounded-full bg-chart-2"
            aria-label="Local override active"
          />
        ) : null}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Advanced Options</SheetTitle>
          <SheetDescription>
            Region editor, transport fade, and Save for everyone will ship in a later pass. This
            prototype covers layout and playback controls only.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 pt-2">
          <Button variant="outline" className="w-full" onClick={onResetDevice}>
            Reset this device
          </Button>
          <Button variant="secondary" className="w-full" disabled>
            Save for everyone
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
