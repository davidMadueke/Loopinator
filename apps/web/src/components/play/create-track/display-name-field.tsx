import { Label } from "@loopinator/ui/components/label";
import { Input } from "@loopinator/ui/components/input";

type DisplayNameFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Human name shown on the Play screen. Not the Filename. */
export function DisplayNameField({ value, onChange }: DisplayNameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="track-display-name">Display name</Label>
      <Input
        id="track-display-name"
        placeholder="e.g. Driving kit A"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
