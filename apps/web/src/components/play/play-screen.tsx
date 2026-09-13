import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { usePlayback } from "@/hooks/use-playback";
import { useSpacebarPlayPause } from "@/hooks/use-spacebar-play-pause";
import type { Setlist, Track } from "@/lib/play-types";
import { useLibraryCreateStore } from "@/stores/library-create-store";

import { AdvancedOptionsPanel } from "./advanced-options-panel";
import { DiscardProgressDialog } from "./discard-progress-dialog";
import { isReloadShortcut } from "./is-reload-shortcut";
import { LibraryPanel, type LibraryTab } from "./library-panel";
import { PlayScreenHeader } from "./play-screen-header";
import { PlayheadPanel } from "./playhead-panel";
import { RouteBreadcrumb } from "./route-breadcrumb";
import { SmallPlayheadTransport } from "./small-playhead-transport";
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
      onSlotChange: (index: number) => void;
    };

function modeTab(mode: PlayScreenProps["mode"]): LibraryTab {
  return mode === "setlist" ? "Setlist" : "Track";
}

export function PlayScreen(props: PlayScreenProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>(() => modeTab(props.mode));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [transportExpanded, setTransportExpanded] = useState(false);
  const navigate = useNavigate();

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

  useSpacebarPlayPause(() => {
    if (playback.state.mode === "playing") {
      playback.pause();
    } else {
      playback.play();
    }
  });

  const transportLabel =
    props.mode === "setlist"
      ? props.setlist.slots[props.slotIndex]?.slotLabel ?? props.track.displayName
      : props.track.displayName;

  const handleLibraryToggle = () => {
    if (!libraryOpen) {
      setLibraryTab(modeTab(props.mode));
      setLibraryOpen(true);
      return;
    }

    const result = requestDiscard("close-library");
    if (result === "proceeded") {
      setLibraryOpen(false);
    }
  };

  const handleOpenLibrary = (tab: LibraryTab) => {
    setLibraryTab(tab);
    if (!libraryOpen) {
      setLibraryOpen(true);
    }
    requestDiscard("return-to-browse");
  };

  const handleAccountNavigate = () => {
    const result = requestDiscard("leave-account");
    if (result === "proceeded") {
      void navigate({ to: "/dashboard" });
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
    if (intent === "leave-account") {
      void navigate({ to: "/dashboard" });
    }
    if (intent === "reload") {
      window.location.reload();
    }
  };

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!useLibraryCreateStore.getState().hasProgress) {
        return;
      }

      event.preventDefault();
      requestDiscard("reload");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!useLibraryCreateStore.getState().hasProgress || !isReloadShortcut(event)) {
        return;
      }

      event.preventDefault();
      requestDiscard("reload");
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [requestDiscard]);

  return (
    <div className="flex min-h-dvh flex-col font-[system-ui,-apple-system,BlinkMacSystemFont,sans-serif]">
      <PlayScreenHeader
        libraryOpen={libraryOpen}
        onLibraryToggle={handleLibraryToggle}
        onAccountNavigate={handleAccountNavigate}
        advancedOpen={advancedOpen}
        onAdvancedClose={() => setAdvancedOpen(false)}
        transportExpanded={transportExpanded}
        transport={
          <SmallPlayheadTransport
            label={transportLabel}
            mode={playback.state.mode}
            playhead={playback.state.playhead}
            onPlay={playback.play}
            onPause={playback.pause}
            onRestart={playback.restart}
            onExpandedChange={setTransportExpanded}
          />
        }
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {libraryOpen 
        ? <>
        <LibraryPanel
          tab={libraryTab}
          onTabChange={setLibraryTab}
          activeTrackId={props.mode === "track" ? props.track.id : undefined}
          activeSetlistId={props.mode === "setlist" ? props.setlist.id : undefined}
        />
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
          {props.mode === "setlist" ? (
            <RouteBreadcrumb
              variant="setlist"
              setlist={props.setlist}
              slotIndex={props.slotIndex}
              onSlotChange={props.onSlotChange}
              onOpenLibrary={handleOpenLibrary}
            />
          ) : (
            <RouteBreadcrumb variant="track" track={props.track} onOpenLibrary={handleOpenLibrary} />
          )}

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
            playhead={playback.state.playhead}
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
