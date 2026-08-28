import { Label } from "@loopinator/ui/components/label";
import { Input } from "@loopinator/ui/components/input";

type SongTitleFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Free text for a related song. Not a Church OS Song record. */
export function SongTitleField({ value, onChange }: SongTitleFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="track-song-title">Song title</Label>
      <Input
        id="track-song-title"
        placeholder="Optional"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
