"use client";

import * as React from "react";
import { Label } from "@loopinator/ui/components/label";
import { Input } from "@loopinator/ui/components/input";
import { cn } from "@loopinator/ui/lib/utils";
import {
  commitLoopPointSeconds,
  LOOP_AUTO_LABEL,
  isAutoPoint,
  parseLoopTimeInput,
  storedValueToSeconds,
  toStoredLoopRegion,
} from "@/lib/loop-region-time";

const SCRUB_PX_PER_SEC = 40;
const SCRUB_FINE_PX_PER_SEC = 160;
const SCRUB_THRESHOLD_PX = 3;

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

function emitLoopRegion(
  ordered: { inSeconds: number; outSeconds: number },
  duration: number,
  onInPointChange: (value: string) => void,
  onOutPointChange: (value: string) => void,
) {
  const stored = toStoredLoopRegion(
    ordered.inSeconds,
    ordered.outSeconds,
    duration,
  );
  onInPointChange(stored.inPoint);
  onOutPointChange(stored.outPoint);
}

type LoopPointInputProps = {
  id: string;
  label: string;
  storedValue: string;
  otherSeconds: number;
  duration: number;
  edge: "in" | "out";
  snapLoopPoint?: ((seconds: number) => number) | null;
  onInPointChange: (value: string) => void;
  onOutPointChange: (value: string) => void;
};

type ScrubState = {
  pointerId: number;
  startX: number;
  startSeconds: number;
  otherSeconds: number;
  moved: boolean;
};

function LoopPointInput({
  id,
  label,
  storedValue,
  otherSeconds,
  duration,
  edge,
  snapLoopPoint,
  onInPointChange,
  onOutPointChange,
}: LoopPointInputProps) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const skipCommitRef = React.useRef(false);
  const scrubRef = React.useRef<ScrubState | null>(null);
  const value = draft ?? displayValue(storedValue);

  const handleFocus = () => {
    setIsFocused(true);
    setDraft(displayValue(storedValue));
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      setDraft(null);
      return;
    }
    if (draft === null) {
      return;
    }

    const parsed = parseLoopTimeInput(draft);
    if (parsed === null) {
      setDraft(null);
      return;
    }

    if (parsed === "auto") {
      if (edge === "in") {
        onInPointChange("");
      } else {
        onOutPointChange("");
      }
    } else {
      emitLoopRegion(
        commitLoopPointSeconds(
          Math.min(Math.max(0, parsed), duration),
          otherSeconds,
          duration,
          edge,
          {
            snap: Boolean(snapLoopPoint),
            snapLoopPoint,
          },
        ),
        duration,
        onInPointChange,
        onOutPointChange,
      );
    }

    setDraft(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      skipCommitRef.current = true;
      setDraft(null);
      event.currentTarget.blur();
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    if (event.button !== 0 || duration <= 0 || isFocused) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startSeconds: storedValueToSeconds(storedValue, duration, edge),
      otherSeconds,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLInputElement>) => {
    const scrub = scrubRef.current;
    if (!scrub || event.pointerId !== scrub.pointerId) {
      return;
    }

    const dx = event.clientX - scrub.startX;
    if (!scrub.moved && Math.abs(dx) < SCRUB_THRESHOLD_PX) {
      return;
    }

    scrub.moved = true;
    const pxPerSec = event.shiftKey ? SCRUB_FINE_PX_PER_SEC : SCRUB_PX_PER_SEC;
    emitLoopRegion(
      commitLoopPointSeconds(
        scrub.startSeconds + dx / pxPerSec,
        scrub.otherSeconds,
        duration,
        edge,
        { snap: false },
      ),
      duration,
      onInPointChange,
      onOutPointChange,
    );
  };

  const endScrub = (event: React.PointerEvent<HTMLInputElement>) => {
    const scrub = scrubRef.current;
    if (!scrub || event.pointerId !== scrub.pointerId) {
      return;
    }

    scrubRef.current = null;

    if (scrub.moved) {
      const dx = event.clientX - scrub.startX;
      const pxPerSec = event.shiftKey
        ? SCRUB_FINE_PX_PER_SEC
        : SCRUB_PX_PER_SEC;
      emitLoopRegion(
        commitLoopPointSeconds(
          scrub.startSeconds + dx / pxPerSec,
          scrub.otherSeconds,
          duration,
          edge,
          { snap: Boolean(snapLoopPoint), snapLoopPoint },
        ),
        duration,
        onInPointChange,
        onOutPointChange,
      );
      return;
    }

    event.currentTarget.focus();
    event.currentTarget.select();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        placeholder={LOOP_AUTO_LABEL}
        value={value}
        className={cn(
          "touch-none",
          isFocused ? "cursor-text" : "cursor-ew-resize select-none",
        )}
        onFocus={handleFocus}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
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
        Drag the markers on the waveform, drag a time field, or type m:ss or
        m:ss.sss. If In-point would land after Out-point, the two values swap.
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
          onInPointChange={onInPointChange}
          onOutPointChange={onOutPointChange}
        />
        <LoopPointInput
          id="track-out-point"
          label="Out-point"
          storedValue={outPoint}
          otherSeconds={inSeconds}
          duration={duration}
          edge="out"
          snapLoopPoint={snapLoopPoint}
          onInPointChange={onInPointChange}
          onOutPointChange={onOutPointChange}
        />
      </div>
    </fieldset>
  );
}
