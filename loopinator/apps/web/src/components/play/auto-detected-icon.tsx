"use client";

import { AlertTriangleIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@loopinator/ui/components/tooltip";

type AutoDetectedKind = "bpm" | "key";

type AutoDetectedIconProps = {
  kind: AutoDetectedKind;
};

const COPY: Record<
  AutoDetectedKind,
  { label: string; description: string }
> = {
  bpm: {
    label: "Auto-detected BPM",
    description: "This Original BPM was auto-detected.",
  },
  key: {
    label: "Auto-detected Key",
    description: "This Key was auto-detected.",
  },
};

/** Amber mark for an Original BPM or Key that came from detection. */
export function AutoDetectedIcon({ kind }: AutoDetectedIconProps) {
  const { label, description } = COPY[kind];

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={label}
              className="inline-flex cursor-help items-center"
            >
              <AlertTriangleIcon className="size-3 text-amber-500" />
            </button>
          }
        />
        <TooltipContent side="top">{description}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
