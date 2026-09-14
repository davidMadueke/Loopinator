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

  const centerSelect = (
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
        className="h-fit border-transparent bg-transparent px-0.5 shadow-none"
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
  );

  const scaleSelect = (
    <Select
      value={value.scale}
      onValueChange={(scale) => onChange({ ...value, scale: scale as KeyScale })}
    >
      <SelectTrigger
        id={`slot-key-scale-${slotId}`}
        size="sm"
        aria-label="Key scale"
        className="h-fit py-0.5 border-transparent bg-transparent px-0.5 shadow-none"
      >
        <SelectValue className="text-xs">
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
  );

  return (
    <div className="flex w-fit shrink-0 items-center justify-center gap-0">
      {scaleDisabled ? (
        centerSelect
      ) : (
        <div className="flex flex-col items-center gap-0">
          {centerSelect}
          {scaleSelect}
        </div>
      )}
      {showAutoDetected ? <AutoDetectedIcon kind="key" /> : null}
    </div>
  );
}
