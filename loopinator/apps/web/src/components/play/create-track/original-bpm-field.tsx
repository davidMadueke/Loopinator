import { Label } from "@loopinator/ui/components/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@loopinator/ui/components/input-group";
import { Button } from "@loopinator/ui/components/button";
import { cn } from "@loopinator/ui/lib/utils";
import {
  DEFAULT_ORIGINAL_BPM,
  MAX_ORIGINAL_BPM,
  MIN_ORIGINAL_BPM,
  clampOriginalBpm,
  commitOriginalBpmInput,
  sanitizeOriginalBpmDraft,
  stepOriginalBpm,
} from "@/lib/play-types";

type OriginalBpmFieldProps = {
  value: string;
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
 * Source tempo for time-stretch. Detection can save as Unconfirmed BPM
 * until an Editor confirms it.
 */
export function OriginalBpmField({ value, onChange }: OriginalBpmFieldProps) {
  const numericValue = value === "" ? Number.NaN : Number(value);
  const isInvalid =
    value !== "" &&
    (!Number.isFinite(numericValue) ||
      numericValue < MIN_ORIGINAL_BPM ||
      numericValue > MAX_ORIGINAL_BPM);

  return (
    <div className={cn(/* "space-y-2" */)}>
      <div className="flex gap-4 items-center">
        <Label htmlFor="track-original-bpm">Original BPM</Label>
        <Button variant="outline" className={cn("border-primary text-primary","hover:text-primary-foreground hover:bg-primary","dark:hover:text-primary-foreground dark:hover:bg-primary", "px-1.5 py-1")} size="xs">
          TAP
        </Button>
      </div>
      

      <div className="flex gap-4 items-center">
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
            onChange(commitOriginalBpmInput(event.target.value));
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>BPM</InputGroupText>
        </InputGroupAddon>
      </InputGroup>

      
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        Unconfirmed BPM from detection still saves and still plays. The Library flags the row until confirmed.
      </p>
    </div>
  );
}
