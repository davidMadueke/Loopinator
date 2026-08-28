"use client";

import * as React from "react";
import { Label } from "@loopinator/ui/components/label";
import { Input } from "@loopinator/ui/components/input";
import {
  commitLoopPointSeconds,
  LOOP_AUTO_LABEL,
  isAutoPoint,
  parseLoopTimeInput,
  storedValueToSeconds,
  timeToStoredValue,
} from "@/lib/loop-region-time";

type LoopRegionFieldProps = {
  inPoint: string;
  outPoint: string;
  duration: number;
  snapLoopPoint?: ((seconds: number) => number) | null;
  onInPointChange: (value: string) => void;
  onOutPointChange: (value: string) => void;
};

function displayValue(stored: string): string {
  return isAutoPoint(stored) ? LOOP_AUTO_LABEL : stored;
}

type LoopPointInputProps = {
  id: string;
  label: string;
  storedValue: string;
  otherSeconds: number;
  duration: number;
  edge: "in" | "out";
  snapLoopPoint?: ((seconds: number) => number) | null;
  onChange: (value: string) => void;
};

function LoopPointInput({
  id,
  label,
  storedValue,
  otherSeconds,
  duration,
  edge,
  snapLoopPoint,
  onChange,
}: LoopPointInputProps) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const value = draft ?? displayValue(storedValue);

  const handleFocus = () => {
    setDraft(displayValue(storedValue));
  };

  const handleBlur = () => {
    if (draft === null) {
      return;
    }

    const parsed = parseLoopTimeInput(draft);
    if (parsed === null) {
      setDraft(null);
      return;
    }

    if (parsed === "auto") {
      onChange("");
    } else {
      const clamped = commitLoopPointSeconds(
        Math.min(Math.max(0, parsed), duration),
        otherSeconds,
        duration,
        edge,
        {
          snap: Boolean(snapLoopPoint),
          snapLoopPoint,
        },
      );
      const seconds = edge === "in" ? clamped.inSeconds : clamped.outSeconds;
      onChange(timeToStoredValue(seconds, duration, edge));
    }

    setDraft(null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        placeholder={LOOP_AUTO_LABEL}
        value={value}
        onFocus={handleFocus}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}

/**
 * In-point and Out-point for one Loop cycle. Values are m:ss or empty (auto).
 */
export function LoopRegionField({
  inPoint,
  outPoint,
  duration,
  snapLoopPoint,
  onInPointChange,
  onOutPointChange,
}: LoopRegionFieldProps) {
  const inSeconds = storedValueToSeconds(inPoint, duration, "in");
  const outSeconds = storedValueToSeconds(outPoint, duration, "out");

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Loop region</legend>
      <p className="text-xs text-muted-foreground">
        Drag the markers on the waveform or enter times as m:ss or m:ss.sss.
        Auto means the file start (in) or end (out). Markers snap to the
        nearest zero crossing when you release a drag or leave a text field.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <LoopPointInput
          id="track-in-point"
          label="In-point"
          storedValue={inPoint}
          otherSeconds={outSeconds}
          duration={duration}
          edge="in"
          snapLoopPoint={snapLoopPoint}
          onChange={onInPointChange}
        />
        <LoopPointInput
          id="track-out-point"
          label="Out-point"
          storedValue={outPoint}
          otherSeconds={inSeconds}
          duration={duration}
          edge="out"
          snapLoopPoint={snapLoopPoint}
          onChange={onOutPointChange}
        />
      </div>
    </fieldset>
  );
}
