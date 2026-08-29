import { Button } from "@loopinator/ui/components/button";

type AdvancedOptionsPanelProps = {
  onResetDevice: () => void;
};

export function AdvancedOptionsPanel({ onResetDevice }: AdvancedOptionsPanelProps) {
  return (
    <div className="flex w-full border-[5px] border-playhead">
      <div className="mx-auto flex  w-full flex-1 flex-col max-w-[860px]  bg-background px-4 py-4">
        <h2 className="text-2xl font-medium text-primary pb-2">Advanced Options</h2>
        <p className="text-sm text-neutral-400">
          Region editor, transport fade, and Save for everyone will ship in a later pass. This
          prototype covers layout and playback controls only.
        </p>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <Button variant="destructive" onClick={onResetDevice}>
            Reset this track
          </Button>
          <Button variant="secondary" disabled>
            Save for everyone
          </Button>
        </div>
      </div>
    </div>
  );
}
