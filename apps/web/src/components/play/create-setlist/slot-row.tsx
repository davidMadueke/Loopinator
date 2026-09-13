import { Button } from "@loopinator/ui/components/button";
import { Input } from "@loopinator/ui/components/input";
import { Label } from "@loopinator/ui/components/label";

import type { CreateSetlistSlotState } from "../create-form-state";
import { isSlotFilled } from "../create-form-state";
import type { Track } from "@/lib/play-types";

import { SlotTrackPicker } from "./slot-track-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@loopinator/ui/components/dropdown-menu";
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, EllipsisVerticalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { Separator } from "@base-ui/react";

type SlotRowProps = {
  slot: CreateSetlistSlotState;
  track: Track | undefined;
  tracks: Track[];
  canRemove: boolean;
  onSlotLabelChange: (slotLabel: string) => void;
  onAssignTrack: (track: Track) => void;
  onDuplicateBelow: () => void;
  onRemove: () => void;
  onAdvancedEdit: () => void;
  onMoveUpOneSlot: () => void;
  onMoveDownOneSlot: () => void;
};

export function SlotRow({
  slot,
  track,
  tracks,
  canRemove,
  onSlotLabelChange,
  onAssignTrack,
  onDuplicateBelow,
  onRemove,
  onAdvancedEdit,
  onMoveUpOneSlot,
  onMoveDownOneSlot,
}: SlotRowProps) {
  const filled = isSlotFilled(slot);
  const labelId = `slot-label-${slot.id}`;

  return (
    <li className="flex flex-col gap-3 border border-border px-3 py-3 sm:flex-row sm:items-end">
      <div className="min-w-0 max-w-56 flex-1 space-y-2">
        <Label htmlFor={labelId}>Slot label</Label>
        <Input
          id={labelId}
          value={slot.slotLabel}
          onChange={(event) => onSlotLabelChange(event.target.value)}
        />
      </div>

      <Separator orientation="vertical" className="h-full text-muted-foreground" />

      <SlotTrackPicker
        slotId={slot.id}
        track={track}
        tracks={tracks}
        onAssign={onAssignTrack}
      />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="icon-sm">
            <EllipsisVerticalIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>


        <DropdownMenuContent>
          <DropdownMenuItem disabled>
            <PencilIcon aria-hidden="true" />
            <span className={"min-w-0 truncate"}>
              Advanced Edit
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDuplicateBelow}>
            <CopyIcon aria-hidden="true" />
            <span className={"min-w-0 truncate"}>
              Duplicate Below
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem variant="destructive" onClick={onRemove}>
            <TrashIcon aria-hidden="true" />
            <span className={"min-w-0 truncate"}>
              Remove
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <div className="flex w-fit flex-col items-center gap-0.5">
        <Button variant="outline" size="icon-sm" onClick={onMoveUpOneSlot}>
          <ArrowUpIcon aria-hidden="true" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={onMoveDownOneSlot}>
          <ArrowDownIcon aria-hidden="true" />
        </Button>
      </div>

    </li>
  );
}
