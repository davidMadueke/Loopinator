import { Button } from "@loopinator/ui/components/button";
import { Label } from "@loopinator/ui/components/label";
import { MinusIcon, PlusIcon } from "lucide-react";

import { useHoldStepper } from "@/hooks/use-playback";

type TempoStepperProps = {
  onAdjust: (delta: number) => void;
};

export function TempoStepper({ onAdjust }: TempoStepperProps) {
  const bind = useHoldStepper(onAdjust);

  return (
    <div className="flex flex-col items-center gap-2 pb-8">
      <Label>Tempo</Label>
      <div className="flex h-fit w-fit items-center border border-border">
        <Button variant="ghost" className="size-16" aria-label="Increase tempo" {...bind(1)}>
          <PlusIcon />
        </Button>
        <Button variant="ghost" className="size-16" aria-label="Decrease tempo" {...bind(-1)}>
          <MinusIcon />
        </Button>
      </div>
    </div>
  );
}
