import * as React from "react";
import { Button } from "@loopinator/ui/components/button";
import { ButtonGroup } from "@loopinator/ui/components/button-group";
import { Input } from "@loopinator/ui/components/input";
import { cn } from "@loopinator/ui/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";

import { AutoDetectedIcon } from "@/components/play/auto-detected-icon";
import { useHoldStepper } from "@/hooks/use-playback";
import { bpmFromTaps, recordTap } from "@/lib/loop-analysis/tap-tempo";
import {
  commitTargetBpmInput,
  sanitizeOriginalBpmDraft,
  scaleTargetBpm,
  stepTargetBpm,
} from "@/lib/play-types";

type SlotTempoProps = {
  slotId: string;
  targetBpm: number;
  originalBpm: number;
  autoDetected: boolean;
  onChange: (targetBpm: number) => void;
};

const BLOCKED_KEYS = new Set(["e", "E", "+", "-", ".", ","]);

export function SlotTempo({
  slotId,
  targetBpm,
  originalBpm,
  autoDetected,
  onChange,
}: SlotTempoProps) {
  const tapsRef = React.useRef<number[]>([]);
  const [draft, setDraft] = React.useState(String(targetBpm));
  const inputId = `slot-target-bpm-${slotId}`;
  const bind = useHoldStepper((delta) => {
    onChange(stepTargetBpm(originalBpm, targetBpm, delta));
  });

  React.useEffect(() => {
    setDraft(String(targetBpm));
  }, [targetBpm]);

  const showAutoDetected = autoDetected && targetBpm === originalBpm;

  return (
    <div className="flex w-fit min-w-0 flex-col items-center gap-1">
      <div className="flex w-fit min-w-0 items-center justify-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Decrease Target BPM"
          {...bind(-1)}
        >
          <MinusIcon aria-hidden="true" />
        </Button>

        <div className="flex min-w-0 flex-col items-center">
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          size={3}
          aria-label="Target BPM"
          className={cn(
            "h-fit w-[3ch] min-w-0 items-center justify-center border-0 bg-transparent px-0 py-0 text-center text-lg tabular-nums md:text-sm",
            "[appearance:textfield] shadow-none focus-visible:border-transparent focus-visible:ring-0",
            "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
          value={draft}
          onKeyDown={(event) => {
            if (BLOCKED_KEYS.has(event.key)) {
              event.preventDefault();
              return;
            }
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
              return;
            }
            event.preventDefault();
            onChange(stepTargetBpm(originalBpm, targetBpm, event.key === "ArrowUp" ? 1 : -1));
          }}
          onChange={(event) => {
            const next = sanitizeOriginalBpmDraft(event.target.value);
            if (next === null) {
              return;
            }
            setDraft(next);
          }}
          onBlur={(event) => {
            onChange(commitTargetBpmInput(originalBpm, targetBpm, event.target.value));
          }}
        />

        <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-muted-foreground">BPM</span>
          {showAutoDetected ? <AutoDetectedIcon kind="bpm" /> : null}
        </div>
        
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Increase Target BPM"
          {...bind(1)}
        >
          <PlusIcon aria-hidden="true" />
        </Button>

        
      </div>
      
    </div>
  );
}
