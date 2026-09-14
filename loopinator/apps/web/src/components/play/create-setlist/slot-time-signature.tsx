import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@loopinator/ui/components/select";

import { TIME_SIGNATURES, type TimeSignature } from "@/lib/play-types";

type SlotTimeSignatureProps = {
  slotId: string;
  value: TimeSignature;
  onChange: (value: TimeSignature) => void;
};

export function SlotTimeSignature({ slotId, value, onChange }: SlotTimeSignatureProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TimeSignature)}>
      <SelectTrigger
        id={`slot-time-signature-${slotId}`}
        size="sm"
        aria-label="Time signature"
        className="h-8 border-transparent bg-transparent px-0.5 shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_SIGNATURES.map((signature) => (
          <SelectItem key={signature} value={signature}>
            {signature}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
