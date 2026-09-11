import * as React from "react";
import { Label } from "@loopinator/ui/components/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@loopinator/ui/components/input-group";
import { Button } from "@loopinator/ui/components/button";
import { ButtonGroup } from "@loopinator/ui/components/button-group";
import { cn } from "@loopinator/ui/lib/utils";
import {
  DEFAULT_ORIGINAL_BPM,
  MAX_ORIGINAL_BPM,
  MIN_ORIGINAL_BPM,
  clampOriginalBpm,
  commitOriginalBpmInput,
  sanitizeOriginalBpmDraft,
  scaleOriginalBpm,
  stepOriginalBpm,
} from "@/lib/play-types";
import { bpmFromTaps, recordTap } from "@/lib/loop-analysis/tap-tempo";

type OriginalBpmFieldProps = {
  value: string;
  unconfirmed: boolean;
  detecting?: boolean;
  onChange: (value: string) => void;
};

const NATIVE_NUMBER_SPINNER_WIDTH_PX = 32;
const ORIGINAL_BPM_BLOCKED_KEYS = new Set(["e", "E", "+", "-", ".", ","]);

function isNativeNumberSpinnerPointer(event: {
  clientX: number;
  currentTarget: HTMLInputElement;
}) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientX >= rect.right - NATIVE_NUMBER_SPINNER_WIDTH_PX;
}

function seedStepperOrigin(input: HTMLInputElement) {
  if (input.value !== "") return;
  input.value = String(clampOriginalBpm(DEFAULT_ORIGINAL_BPM));
}

/**
 * Source tempo for Time-stretch. Detection can save as Unconfirmed BPM
 * until an Editor confirms it by typing, Tap tempo, or Half/double.
 */
export function OriginalBpmField({
  value,
  unconfirmed,
  detecting = false,
  onChange,
}: OriginalBpmFieldProps) {
  const tapsRef = React.useRef<number[]>([]);
  const numericValue = value === "" ? Number.NaN : Number(value);
  const isInvalid =
    value !== "" &&
    (!Number.isFinite(numericValue) ||
      numericValue < MIN_ORIGINAL_BPM ||
      numericValue > MAX_ORIGINAL_BPM);
  const showHalfDouble = value !== "" && Number.isFinite(numericValue);

  return (
    <div>
      <div className="flex items-center gap-4">
        <Label htmlFor="track-original-bpm">Original BPM</Label>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className={cn(
            "border-primary px-1.5 py-1 text-primary",
            "hover:bg-primary hover:text-primary-foreground",
            "dark:hover:bg-primary dark:hover:text-primary-foreground",
          )}
          aria-label="Tap tempo"
          onClick={() => {
            const taps = recordTap(tapsRef.current, performance.now());
            tapsRef.current = taps;
            const tapped = bpmFromTaps(taps);
            if (tapped !== null) {
              onChange(String(tapped));
            }
          }}
        >
          TAP
        </Button>
        {showHalfDouble ? (
          <ButtonGroup>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Double Original BPM"
              onClick={() => onChange(scaleOriginalBpm(value, 2))}
            >
              ×2
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Halve Original BPM"
              onClick={() => onChange(scaleOriginalBpm(value, 0.5))}
            >
              ÷2
            </Button>
          </ButtonGroup>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <InputGroup className="rounded-3xl">
          <InputGroupInput
            id="track-original-bpm"
            type="number"
            placeholder="Detected on upload"
            min={MIN_ORIGINAL_BPM}
            max={MAX_ORIGINAL_BPM}
            step={1}
            value={value}
            aria-invalid={isInvalid || undefined}
            aria-busy={detecting || undefined}
            onPointerDown={(event) => {
              if (isNativeNumberSpinnerPointer(event)) {
                seedStepperOrigin(event.currentTarget);
              }
            }}
            onKeyDown={(event) => {
              if (ORIGINAL_BPM_BLOCKED_KEYS.has(event.key)) {
                event.preventDefault();
                return;
              }
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              onChange(stepOriginalBpm(value, event.key === "ArrowUp" ? 1 : -1));
            }}
            onChange={(event) => {
              const next = sanitizeOriginalBpmDraft(event.target.value);
              if (next === null) return;
              onChange(next);
            }}
            onBlur={(event) => {
              const next = commitOriginalBpmInput(event.target.value);
              if (next === value) return;
              onChange(next);
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>BPM</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <p className="pt-2 text-xs text-muted-foreground">
        Unconfirmed BPM from detection still saves and still plays. The Library
        flags the row until confirmed.
      </p>
    </div>
  );
}
