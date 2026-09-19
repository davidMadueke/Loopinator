import { Button } from "@loopinator/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@loopinator/ui/components/dropdown-menu";
import { cn } from "@loopinator/ui/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import type { Track } from "@/lib/play-types";

type SlotTrackPickerProps = {
  slotId: string;
  track: Track | undefined;
  tracks: Track[];
  onAssign: (track: Track) => void;
  onOpenFullLibrary: () => void;
};

export function SlotTrackPicker({
  slotId,
  track,
  tracks,
  onAssign,
  onOpenFullLibrary,
}: SlotTrackPickerProps) {
  const label = track?.displayName ?? "Pick a Track";
  const triggerId = `slot-track-${slotId}`;

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              id={triggerId}
              variant="ghost"
              className={cn(
                "flex h-8 w-full min-w-0 max-w-full shrink justify-start overflow-hidden px-2 text-medium text-primary",
                "hover:text-primary-on-muted aria-expanded:text-primary-on-muted",
                !track && "text-muted-foreground hover:text-muted-foreground",
              )}
              title={label}
            >
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <ChevronDownIcon data-icon="inline-end" className="size-3.5 shrink-0" />
            </Button>
          }
        />
        <DropdownMenuContent
          align="start"
          className="flex max-h-[min(20rem,var(--available-height))] w-full flex-col overflow-y-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DropdownMenuGroup>
              {tracks.map((option) => {
                const current = option.id === track?.id;

                return (
                  <DropdownMenuItem key={option.id} onClick={() => onAssign(option)}>
                    <CheckIcon
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground",
                        current ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate" title={option.displayName}>
                      {option.displayName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {option.originalBpm} BPM · {option.timeSignature}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </div>
          <div className="bg-popover">
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenFullLibrary}>Open full Library</DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
