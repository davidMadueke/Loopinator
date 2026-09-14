import { SLOT_TIME_SIGNATURE_FIELDS } from "@/components/play/filters";
import { timeSignatureFromSlotFilterValue } from "@/lib/play-filter-choice";
import { type TimeSignature } from "@/lib/play-types";

import { SlotChoiceChip } from "./slot-choice-chip";

type SlotTimeSignatureProps = {
  slotId: string;
  value: TimeSignature;
  onChange: (value: TimeSignature) => void;
};

export function SlotTimeSignature({ slotId, value, onChange }: SlotTimeSignatureProps) {
  return (
    <SlotChoiceChip
      slotId={slotId}
      fieldId="timeSignature"
      fields={SLOT_TIME_SIGNATURE_FIELDS}
      value={value}
      isComplete={(next) => timeSignatureFromSlotFilterValue(next) !== null}
      onCommit={(next) => {
        const parsed = timeSignatureFromSlotFilterValue(next);
        if (parsed) onChange(parsed);
      }}
    />
  );
}
