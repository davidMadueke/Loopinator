import { useCallback, useEffect, useState } from "react";
import { Button } from "@loopinator/ui/components/button";
import { Input } from "@loopinator/ui/components/input";
import { Label } from "@loopinator/ui/components/label";
import { cn } from "@loopinator/ui/lib/utils";
import { PlusIcon } from "lucide-react";

import { Sortable } from "@/components/reui/sortable";
import { DEMO_TRACKS } from "@/lib/mock-data";
import type { Track } from "@/lib/play-types";

import {
  addEmptySlot,
  assignSlotTrack,
  canCreateSetlist,
  duplicateSlotBelow,
  hasCreateSetlistProgress,
  INITIAL_CREATE_SETLIST_FORM,
  moveSlotDown,
  moveSlotUp,
  removeSlot,
  reorderSlots,
  selectSlot,
  updateSlotKey,
  updateSlotLabel,
  updateSlotTargetBpm,
  updateSlotTimeSignature,
  type CreateSetlistFormState,
  type CreateSetlistSlotState,
} from "./create-form-state";
import { SlotRow } from "./create-setlist/slot-row";

type CreateSetlistPanelProps = {
  onProgressChange: (hasProgress: boolean) => void;
};

function slotId(slot: CreateSetlistSlotState) {
  return slot.id;
}

export function CreateSetlistPanel({ onProgressChange }: CreateSetlistPanelProps) {
  const [form, setForm] = useState<CreateSetlistFormState>(INITIAL_CREATE_SETLIST_FORM);
  const canCreate = canCreateSetlist(form);

  useEffect(() => {
    onProgressChange(hasCreateSetlistProgress(form));
  }, [form, onProgressChange]);

  const handleAssignTrack = useCallback((slotId: string, track: Track) => {
    setForm((current) => assignSlotTrack(current, slotId, track));
  }, []);

  const handleSlotsChange = useCallback((slots: CreateSetlistSlotState[]) => {
    setForm((current) => reorderSlots(current, slots));
  }, []);

  return (
    <div className="pt-4">
      <div className="space-y-1 pb-4">
        <p className="text-sm text-muted-foreground text-center">
          Name the Setlist and pick a Track for every slot.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        <div className="sticky top-0 z-20 flex flex-col gap-2 bg-background pb-0.5">
          <div className="space-y-2">
            <Label htmlFor="setlist-name">Setlist name</Label>
            <Input
              id="setlist-name"
              placeholder="e.g. Sunday 14 Sep"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Add slot"
              className={cn(
                "dark:hover:bg-primary dark:hover:text-primary-foreground",
                "hover:bg-primary hover:text-primary-foreground",
              )}
              onClick={() => setForm((current) => addEmptySlot(current))}
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Sortable
          value={form.slots}
          onValueChange={handleSlotsChange}
          getItemValue={slotId}
          strategy="vertical"
          className="flex flex-col gap-3"
        >
          {form.slots.map((slot, arrayIndex) => {
            const track = slot.trackId
              ? DEMO_TRACKS.find((item) => item.id === slot.trackId)
              : undefined;

            return (
              <SlotRow
                key={slot.id}
                arrayIndex={arrayIndex}
                totalSlots={form.slots.length}
                slot={slot}
                track={track}
                tracks={DEMO_TRACKS}
                canRemove={form.slots.length > 1}
                onSlotLabelChange={(slotLabel) =>
                  setForm((current) => updateSlotLabel(current, slot.id, slotLabel))
                }
                onAssignTrack={(nextTrack) => handleAssignTrack(slot.id, nextTrack)}
                onTargetBpmChange={(targetBpm) =>
                  setForm((current) => updateSlotTargetBpm(current, slot.id, targetBpm))
                }
                onKeyChange={(key) =>
                  setForm((current) => updateSlotKey(current, slot.id, key))
                }
                onTimeSignatureChange={(timeSignature) =>
                  setForm((current) => updateSlotTimeSignature(current, slot.id, timeSignature))
                }
                onDuplicateBelow={() =>
                  setForm((current) => duplicateSlotBelow(current, slot.id))
                }
                onRemove={() => setForm((current) => removeSlot(current, slot.id))}
                onMoveUpOneSlot={() => setForm((current) => moveSlotUp(current, slot.id))}
                onMoveDownOneSlot={() => setForm((current) => moveSlotDown(current, slot.id))}
                onSelectSlot={(state: boolean) => setForm((current) => selectSlot(state,current, slot.id))}
              />
            );
          })}
        </Sortable>

        <div className="flex justify-end">
          <Button type="button" disabled={!canCreate}>
            Create Setlist
          </Button>
        </div>
      </div>
    </div>
  );
}
