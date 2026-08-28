import { Label } from "@loopinator/ui/components/label";
import { Input } from "@loopinator/ui/components/input";

type OriginalBpmFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Source tempo for time-stretch. Detection can save as Unconfirmed BPM
 * until an Editor confirms it.
 */
export function OriginalBpmField({ value, onChange }: OriginalBpmFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="track-original-bpm">Original BPM</Label>
      <Input
        id="track-original-bpm"
        type="number"
        placeholder="Detected on upload"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Unconfirmed BPM from detection still saves and still plays. The Library flags the row until confirmed.
      </p>
    </div>
  );
}
