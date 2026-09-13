import { useCallback, useEffect, useState } from "react";
import { Button } from "@loopinator/ui/components/button";
import { Input } from "@loopinator/ui/components/input";
import { Label } from "@loopinator/ui/components/label";

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
  updateSlotLabel,
  type CreateSetlistFormState,
} from "./create-form-state";
import { SlotRow } from "./create-setlist/slot-row";
import { PlusIcon } from "lucide-react";
import { cn } from "@loopinator/ui/lib/utils";

type CreateSetlistPanelProps = {
  onProgressChange: (hasProgress: boolean) => void;
};

export function CreateSetlistPanel({ onProgressChange }: CreateSetlistPanelProps) {
  const [form, setForm] = useState<CreateSetlistFormState>(INITIAL_CREATE_SETLIST_FORM);
  const canCreate = canCreateSetlist(form);

  useEffect(() => {
    onProgressChange(hasCreateSetlistProgress(form));
  }, [form, onProgressChange]);

  const handleAssignTrack = useCallback((slotId: string, track: Track) => {
    setForm((current) => assignSlotTrack(current, slotId, track));
  }, []);

  return (
    <div className="pt-4">
      <div className="space-y-1 pb-4">
        <p className="text-sm text-muted-foreground text-center">
          Name the Setlist and pick a Track for every slot.
        </p>
      </div>

      <div className="flex flex-col gap-5 pb-4">
        <div className="space-y-2">
          <Label htmlFor="setlist-name">Setlist name</Label>
          <Input
            id="setlist-name"
            placeholder="e.g. Sunday 14 Sep"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </div>

        <div className="space-y-3">
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Add slot"
            className={cn("dark:hover:bg-primary dark:hover:text-primary-foreground", "hover:bg-primary hover:text-primary-foreground")}
            onClick={() => setForm((current) => addEmptySlot(current))}
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
          <ul className="flex flex-col gap-3">
            {form.slots.map((slot) => {
              const track = slot.trackId
                ? DEMO_TRACKS.find((item) => item.id === slot.trackId)
                : undefined;

              return (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  track={track}
                  tracks={DEMO_TRACKS}
                  canRemove={form.slots.length > 1}
                  onSlotLabelChange={(slotLabel) =>
                    setForm((current) => updateSlotLabel(current, slot.id, slotLabel))
                  }
                  onAssignTrack={(nextTrack) => handleAssignTrack(slot.id, nextTrack)}
                  onDuplicateBelow={() =>
                    setForm((current) => duplicateSlotBelow(current, slot.id))
                  }
                  onRemove={() => setForm((current) => removeSlot(current, slot.id))}
                  onAdvancedEdit={() => {}}
                  onMoveUpOneSlot={() => setForm((current) => moveSlotUp(current, slot.id))}
                  onMoveDownOneSlot={() => setForm((current) => moveSlotDown(current, slot.id))}
                />
              );
            })}
          </ul>

          
        </div>

        <div className="flex justify-end">
          <Button type="button" disabled={!canCreate}>
            Create Setlist
          </Button>
        </div>
      </div>
    </div>
  );
}
