import { Button } from "@loopinator/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@loopinator/ui/components/dropdown-menu";
import { Input } from "@loopinator/ui/components/input";
import { Label } from "@loopinator/ui/components/label";
import { Separator } from "@loopinator/ui/components/separator";
import { cn } from "@loopinator/ui/lib/utils";
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
import type { Track, TrackKey } from "@/lib/play-types";

import type { CreateSetlistSlotState } from "../create-form-state";
import { SlotKey } from "./slot-key";
import { SlotTempo } from "./slot-tempo";
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
  onTargetBpmChange: (targetBpm: number) => void;
  onKeyChange: (key: TrackKey) => void;
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
  onTargetBpmChange,
  onKeyChange,
  onDuplicateBelow,
  onRemove,
  onAdvancedEdit,
  onMoveUpOneSlot,
  onMoveDownOneSlot,
}: SlotRowProps) {
  const labelId = `slot-label-${slot.id}`;

  return (
    <SortableItem value={slot.id}>
      <div className="flex items-stretch gap-3 border border-border bg-background px-3 py-3">
        <SortableItemHandle
          render={<button type="button" aria-label={`Reorder ${slot.slotLabel || `slot ${arrayIndex + 1}`}`} />}
          className="inline-flex size-4 shrink-0 self-center items-center justify-center p-0 leading-none text-muted-foreground hover:text-foreground"
        >
          <GripVerticalIcon className="size-4" />
        </SortableItemHandle>
        <div className="flex w-fit flex-col items-center gap-0.5 self-center">
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
        <div className="inline-flex min-w-0 max-w-80 flex-col items-stretch justify-center">
          <Input
            id={labelId}
            aria-label="Slot label"
            value={slot.slotLabel}
            onChange={(event) => onSlotLabelChange(event.target.value)}
            className={cn(
              "h-8 w-auto min-w-0 field-sizing-content border-0 bg-transparent px-2 py-0 text-xl font-medium md:text-lg",
              "shadow-none focus-visible:border-transparent focus-visible:ring-0",
            )}
          />
          <SlotTrackPicker
            slotId={slot.id}
            track={track}
            tracks={tracks}
            onAssign={onAssignTrack}
          />
        </div>

        <div className="ml-auto flex items-stretch gap-3">
          <div className="self-stretch">
            <Separator orientation="vertical" className="h-full" />
          </div>

          <div className="flex w-34 shrink-0 flex-col items-center justify-center gap-1">
            {track && slot.targetBpm !== null ? (
              <>
                <SlotTempo
                  slotId={slot.id}
                  targetBpm={slot.targetBpm}
                  originalBpm={track.originalBpm}
                  autoDetected={slot.bpmAutoDetected}
                  onChange={onTargetBpmChange}
                />
                <SlotKey
                  slotId={slot.id}
                  value={slot.key}
                  track={track}
                  autoDetected={slot.keyAutoDetected}
                  onChange={onKeyChange}
                />
              </>
            ) : null}
          </div>

          <div className="self-stretch">
            <Separator orientation="vertical" className="h-full" />
          </div>

          <div className="flex h-full w-29 shrink-0 items-center justify-center self-center">
            <Button type="button" variant="ghost" size="xs" disabled onClick={onAdvancedEdit}>
              <PencilIcon aria-hidden="true" />
              Advanced Edit
            </Button>
          </div>

          <div className="self-center">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline" size="icon-sm">
                  <EllipsisVerticalIcon className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
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
        </div>
      </div>
    </SortableItem>
  );
}
