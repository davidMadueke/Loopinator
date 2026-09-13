import { Button } from "@loopinator/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@loopinator/ui/components/dropdown-menu";
import { Input } from "@loopinator/ui/components/input";
import { Label } from "@loopinator/ui/components/label";
import { Separator } from "@base-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  GripVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";

import { SortableItem, SortableItemHandle } from "@/components/reui/sortable";
import type { Track } from "@/lib/play-types";

import type { CreateSetlistSlotState } from "../create-form-state";
import { SlotTrackPicker } from "./slot-track-picker";

type SlotRowProps = {
  slot: CreateSetlistSlotState;
  arrayIndex: number;
  totalSlots: number;
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
  arrayIndex,
  totalSlots,
  track,
  tracks,
  canRemove,
  onSlotLabelChange,
  onAssignTrack,
  onDuplicateBelow,
  onRemove,
  onAdvancedEdit: _onAdvancedEdit,
  onMoveUpOneSlot,
  onMoveDownOneSlot,
}: SlotRowProps) {
  const labelId = `slot-label-${slot.id}`;

  return (
    <SortableItem value={slot.id}>
      <div className="flex items-center gap-3 border border-border bg-background px-3 py-3">
        <SortableItemHandle
          render={<button type="button" aria-label={`Reorder ${slot.slotLabel || `slot ${arrayIndex + 1}`}`} />}
          className="inline-flex size-4 shrink-0 items-center justify-center p-0 leading-none text-muted-foreground hover:text-foreground"
        >
          <GripVerticalIcon className="size-4" />
        </SortableItemHandle>
        <div className="flex w-fit flex-col items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={arrayIndex === 0}
            aria-label="Move up one slot"
            onClick={onMoveUpOneSlot}
          >
            <ArrowUpIcon aria-hidden="true" />
          </Button>
          <div className="flex items-center rounded-md border border-primary bg-background px-2 py-1 text-sm text-primary">
            <Label htmlFor={labelId}>{arrayIndex + 1}</Label>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={arrayIndex === totalSlots - 1}
            aria-label="Move down one slot"
            onClick={onMoveDownOneSlot}
          >
            <ArrowDownIcon aria-hidden="true" />
          </Button>
        </div>
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
              <span className="min-w-0 truncate">Advanced Edit</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDuplicateBelow}>
              <CopyIcon aria-hidden="true" />
              <span className="min-w-0 truncate">Duplicate Below</span>
            </DropdownMenuItem>

            <DropdownMenuItem variant="destructive" onClick={onRemove} disabled={!canRemove}>
              <TrashIcon aria-hidden="true" />
              <span className="min-w-0 truncate">Remove</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SortableItem>
  );
}
