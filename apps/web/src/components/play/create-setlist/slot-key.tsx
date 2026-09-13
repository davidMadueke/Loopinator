import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@loopinator/ui/components/select";

import { AutoDetectedIcon } from "@/components/play/auto-detected-icon";
import {
  KEY_CENTERS,
  KEY_SCALES,
  type KeyCenter,
  type KeyScale,
  type Track,
  type TrackKey,
} from "@/lib/play-types";

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
  const scaleDisabled = value.center === "No Key";
  const showAutoDetected = autoDetected && keysMatch(value, track);

  return (
    <div className="flex shrink-0 w-full justify-center items-center gap-0.5">
      <Select
        value={value.center}
        onValueChange={(center) =>
          onChange({
            center: center as KeyCenter,
            scale: center === "No Key" ? "major" : value.scale,
          })
        }
      >
        <SelectTrigger
          id={`slot-key-center-${slotId}`}
          size="sm"
          aria-label="Key"
          className="h-8 border-transparent bg-transparent px-0.5 shadow-none"
        >
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
      {scaleDisabled ? null : (
        <Select
          value={value.scale}
          onValueChange={(scale) => onChange({ ...value, scale: scale as KeyScale })}
        >
          <SelectTrigger
            id={`slot-key-scale-${slotId}`}
            size="sm"
            aria-label="Key scale"
            className="h-8 border-transparent bg-transparent px-0.5 shadow-none"
          >
            <SelectValue>
              {value.scale === "minor" ? "Minor" : "Major"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {KEY_SCALES.map((scale) => (
              <SelectItem key={scale} value={scale}>
                {scale === "major" ? "Major" : "Minor"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showAutoDetected ? <AutoDetectedIcon kind="key" /> : null}
    </div>
  );
}
