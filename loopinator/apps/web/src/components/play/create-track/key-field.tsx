import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@loopinator/ui/components/select";

import {
  KEY_CENTERS,
  KEY_SCALES,
  type KeyCenter,
  type KeyScale,
  type TrackKey,
} from "@/lib/play-types";
import { AutoDetectedIcon } from "@/components/play/auto-detected-icon";

type KeyFieldProps = {
  value: TrackKey;
  autoDetected: boolean;
  onChange: (value: TrackKey) => void;
};

/** Metadata only. Defaults to No Key. v1 does not transpose. High-confidence Key detection may fill this as Auto-detected Key; otherwise it stays No Key. Future key-change UI does not apply while Key is No Key. */
export function KeyField({ value, autoDetected, onChange }: KeyFieldProps) {
  const scaleDisabled = value.center === "No Key";

  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-1 text-sm font-medium">
        Key
        {autoDetected ? <AutoDetectedIcon kind="key" /> : null}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {/* <Label htmlFor="track-key-center">Key centre</Label> */}
          <Select
            value={value.center}
            onValueChange={(center) =>
              onChange({
                center: center as KeyCenter,
                scale: center === "No Key" ? "major" : value.scale,
              })
            }
          >
            <SelectTrigger id="track-key-center" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KEY_CENTERS.map((center) => (
                <SelectItem key={center} value={center}>
                  {center}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {/* <Label htmlFor="track-key-scale">Key scale</Label> */}
          <Select
            value={value.scale}
            disabled={scaleDisabled}
            onValueChange={(scale) => onChange({ ...value, scale: scale as KeyScale })}
          >
            <SelectTrigger id="track-key-scale" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KEY_SCALES.map((scale) => (
                <SelectItem key={scale} value={scale}>
                  {scale === "major" ? "Major" : "Minor"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </fieldset>
  );
}
