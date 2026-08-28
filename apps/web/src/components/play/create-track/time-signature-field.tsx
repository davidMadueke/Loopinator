import { Label } from "@loopinator/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@loopinator/ui/components/select";

import type { TimeSignature } from "@/lib/play-types";

const TIME_SIGNATURES: TimeSignature[] = ["4/4", "3/4", "6/8", "12/8", "2/4"];

type TimeSignatureFieldProps = {
  value: TimeSignature;
  onChange: (value: TimeSignature) => void;
};

/** Meter on the Track. Defaults to 4/4. */
export function TimeSignatureField({ value, onChange }: TimeSignatureFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="track-time-signature">Time signature</Label>
      <Select value={value} onValueChange={(next) => onChange(next as TimeSignature)}>
        <SelectTrigger id="track-time-signature" className="w-full">
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
    </div>
  );
}
