import { useState } from "react";
import { Button } from "@loopinator/ui/components/button";
import { ButtonGroup } from "@loopinator/ui/components/button-group";
import { Separator } from "@loopinator/ui/components/separator";
import { Textarea } from "@loopinator/ui/components/textarea";
import { Toggle } from "@loopinator/ui/components/toggle";
import { cn } from "@loopinator/ui/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  GripVerticalIcon,
  TrashIcon,
} from "lucide-react";

import { SortableItem, SortableItemHandle } from "@/components/reui/sortable";
import type { TimeSignature, Track, TrackKey } from "@/lib/play-types";

import type { CreateSetlistSlotState } from "../create-form-state";
import { SlotKey } from "./slot-key";
import { SlotLibraryPanel } from "./slot-library-panel";
import { SlotTempo } from "./slot-tempo";
import { SlotTimeSignature } from "./slot-time-signature";
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
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  onDuplicateBelow: () => void;
  onRemove: () => void;
  onMoveUpOneSlot: () => void;
  onMoveDownOneSlot: () => void;
  onSelectSlot: (state: boolean) => void;
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
  onTimeSignatureChange,
  onDuplicateBelow,
  onRemove,
  onMoveUpOneSlot,
  onMoveDownOneSlot,
  onSelectSlot,
}: SlotRowProps) {
  const labelId = `slot-label-${slot.id}`;
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <SortableItem value={slot.id} className="flex flex-col gap-0">
      <div className="flex w-full min-w-0 items-stretch gap-3 border border-border bg-background px-3 py-3">
        <div className="flex items-center gap-3 self-center">
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
            {/* <div className="flex items-center rounded-md border border-primary bg-background px-2 py-1 text-sm text-primary">
              <Button >
                <Label htmlFor={labelId}>{arrayIndex + 1}</Label>
              </Button>
            </div> */}
            <Toggle
            className={cn(
              "items-center rounded-md border border-primary bg-background px-2 py-1 text-sm text-primary",
              "hover:bg-primary hover:text-primary-foreground",
              "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary",
              "aria-pressed:bg-primary/50 aria-pressed:text-foreground",
            )}
            onPressedChange={onSelectSlot}
          >
            {arrayIndex + 1}
          </Toggle>
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
        </div>
        <div
          data-slot="slot-label"
          className="flex w-64 shrink-0 flex-col items-stretch justify-center"
        >
          <Textarea
            id={labelId}
            aria-label="Slot label"
            rows={1}
            value={slot.slotLabel}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
            onChange={(event) => onSlotLabelChange(event.target.value.replace(/\n/g, " "))}
            className={cn(
              "min-h-8 w-full resize-none overflow-hidden wrap-break-word field-sizing-content border-0 bg-transparent px-2 py-0 leading-8 text-xl font-medium md:text-lg",
              "shadow-none focus-visible:border-transparent focus-visible:ring-0",
            )}
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 self-stretch">
          <div className="self-stretch">
            <Separator orientation="vertical" className="h-full" />
          </div>

          <div
            data-slot="slot-row-tempo"
            className="flex max-w-full flex-col items-stretch justify-center"
          >
            <SlotTrackPicker
              slotId={slot.id}
              track={track}
              tracks={tracks}
              onAssign={onAssignTrack}
              onOpenFullLibrary={() => setLibraryOpen(true)}
            />

            {track && slot.targetBpm !== null ? (
              <div className="flex w-max items-center justify-end gap-3 self-end">
                <SlotTempo
                  slotId={slot.id}
                  targetBpm={slot.targetBpm}
                  originalBpm={track.originalBpm}
                  autoDetected={slot.bpmAutoDetected}
                  onChange={onTargetBpmChange}
                />
                <div className="flex w-max shrink-0 flex-col items-stretch justify-center gap-0.5">
                  <SlotTimeSignature
                    slotId={slot.id}
                    value={slot.timeSignature}
                    onChange={onTimeSignatureChange}
                  />
                  <SlotKey
                    slotId={slot.id}
                    value={slot.key}
                    track={track}
                    autoDetected={slot.keyAutoDetected}
                    onChange={onKeyChange}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="self-stretch">
          <Separator orientation="vertical" className="h-full" />
        </div>

        <div className="flex shrink-0 items-center self-center">
          <ButtonGroup orientation="vertical">
            <Button
              type="button"
              variant="default"
              size="icon-sm"
              aria-label="Duplicate below"
              onClick={onDuplicateBelow}
            >
              <CopyIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label="Remove"
              disabled={!canRemove}
              onClick={onRemove}
            >
              <TrashIcon aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {libraryOpen ? (
        <SlotLibraryPanel
          activeTrackId={track?.id}
          onAssign={onAssignTrack}
          onClose={() => setLibraryOpen(false)}
        />
      ) : null}
    </SortableItem>
  );
}
