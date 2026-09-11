import { Label } from "@loopinator/ui/components/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@loopinator/ui/components/input-group";
import { AirVent } from "lucide-react";
import { Button } from "@loopinator/ui/components/button";
import { cn } from "@loopinator/ui/lib/utils";

type OriginalBpmFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Source tempo for time-stretch. Detection can save as Unconfirmed BPM
 * until an Editor confirms it.
 */
export function OriginalBpmField({ value, onChange }: OriginalBpmFieldProps) {
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
          defaultValue={120}
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
