import { SLOT_KEY_FIELDS } from "@/components/play/filters";
import { slotKeyFilterValue, trackKeyFromSlotFilterValue } from "@/lib/play-filter-choice";
import type { Track, TrackKey } from "@/lib/play-types";

import { SlotChoiceChip } from "./slot-choice-chip";

type SlotKeyProps = {
  slotId: string;
  value: TrackKey;
  track: Track;
  autoDetected: boolean;
  onChange: (value: TrackKey) => void;
};

function keysMatch(value: TrackKey, track: Track) {
  return value.center === track.key && value.scale === track.keyMode;
}

export function SlotKey({ slotId, value, track, autoDetected, onChange }: SlotKeyProps) {
  const showAutoDetected = autoDetected && keysMatch(value, track);

  return (
    <SlotChoiceChip
      slotId={slotId}
      fieldId="key"
      fields={SLOT_KEY_FIELDS}
      value={slotKeyFilterValue(value)}
      autoDetected={showAutoDetected}
      isComplete={(next) => trackKeyFromSlotFilterValue(next, value) !== null}
      onCommit={(next) => {
        const parsed = trackKeyFromSlotFilterValue(next, value);
        if (parsed) onChange(parsed);
      }}
    />
  );
}
