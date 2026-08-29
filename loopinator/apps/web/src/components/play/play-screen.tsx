import { useState } from "react";

import { usePlayback } from "@/hooks/use-playback";
import type { Setlist, Track } from "@/lib/play-types";
import { useLibraryCreateStore } from "@/stores/library-create-store";

import { AdvancedOptionsPanel } from "./advanced-options-panel";
import { DiscardProgressDialog } from "./discard-progress-dialog";
import { LibraryPanel } from "./library-panel";
import { PlayScreenHeader } from "./play-screen-header";
import { PlayheadPanel } from "./playhead-panel";
import { RouteBreadcrumb } from "./route-breadcrumb";
import { TempoStepper } from "./tempo-stepper";
import { TransportBar } from "./transport-bar";
import { Separator } from "@loopinator/ui/components/separator";

type PlayScreenProps =
  | {
      mode: "track";
      track: Track;
    }
  | {
      mode: "setlist";
      setlist: Setlist;
      track: Track;
      slotIndex: number;
      slotLabel: string;
      onSlotChange: (index: number) => void;
    };

export function PlayScreen(props: PlayScreenProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const discardDialogOpen = useLibraryCreateStore((state) => state.discardDialogOpen);
  const requestDiscard = useLibraryCreateStore((state) => state.requestDiscard);
  const confirmDiscard = useLibraryCreateStore((state) => state.confirmDiscard);
  const cancelDiscard = useLibraryCreateStore((state) => state.cancelDiscard);

  const initialTargetBpm =
    props.mode === "setlist"
      ? props.setlist.slots[props.slotIndex]?.targetBpm ?? props.track.originalBpm
      : props.track.originalBpm;

  const playback = usePlayback({
    originalBpm: props.track.originalBpm,
    initialTargetBpm,
  });

  const canGoPrev = props.mode === "setlist" && props.slotIndex > 0;
  const canGoNext =
    props.mode === "setlist" && props.slotIndex < props.setlist.slots.length - 1;

  const handleLibraryToggle = () => {
    if (!libraryOpen) {
      setLibraryOpen(true);
      return;
    }

    const result = requestDiscard("close-library");
    if (result === "proceeded") {
      setLibraryOpen(false);
    }
  };

  const handleDiscardDialogOpenChange = (open: boolean) => {
    if (!open) {
      cancelDiscard();
    }
  };

  const handleConfirmDiscard = () => {
    const intent = confirmDiscard();
    if (intent === "close-library") {
      setLibraryOpen(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col font-[system-ui,-apple-system,BlinkMacSystemFont,sans-serif]">
      <PlayScreenHeader
        libraryOpen={libraryOpen}
        onLibraryToggle={handleLibraryToggle}
        advancedOpen={advancedOpen}
        onAdvancedClose={() => setAdvancedOpen(false)}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {libraryOpen 
        ? <>
        <LibraryPanel />
        <div className="pb-2"></div>
        </> 
        
        : null}

        {advancedOpen ? (
          <div>
            <AdvancedOptionsPanel onResetDevice={playback.resetDevice} />
            <div className="pb-2"></div>
          </div>
        ) : null}
        
        <div className="mx-auto flex w-full max-w-215 flex-1 flex-col gap-5 px-4 py-4">
          <RouteBreadcrumb
            variant={props.mode}
            setlistName={props.mode === "setlist" ? props.setlist.name : undefined}
            slotLabel={props.mode === "setlist" ? props.slotLabel : undefined}
            trackName={props.track.displayName}
            cached={props.mode === "setlist" ? props.setlist.cached : props.track.cached}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrev={
              props.mode === "setlist" && canGoPrev
                ? () => props.onSlotChange(props.slotIndex - 1)
                : undefined
            }
            onNext={
              props.mode === "setlist" && canGoNext
                ? () => props.onSlotChange(props.slotIndex + 1)
                : undefined
            }
          />

          <PlayheadPanel
            track={props.track}
            targetBpm={playback.state.targetBpm}
            playhead={playback.state.playhead}
            hasLocalOverride={playback.state.hasLocalOverride}
            advancedOpen={advancedOpen}
            onAdvancedToggle={() => setAdvancedOpen((open) => !open)}
          />

          <TransportBar
            mode={playback.state.mode}
            onPlay={playback.play}
            onPause={playback.pause}
            onRestart={playback.restart}
          />
          <Separator className="my-3 w-full" />
          <TempoStepper
            onAdjust={playback.adjustTargetBpm}
          />
        </div>
      </main>

      <DiscardProgressDialog
        open={discardDialogOpen}
        onOpenChange={handleDiscardDialogOpenChange}
        onDiscard={handleConfirmDiscard}
      />
    </div>
  );
}
