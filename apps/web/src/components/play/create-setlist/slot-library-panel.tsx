import { useCallback, useState } from "react";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";
import { XIcon } from "lucide-react";

import type { Track } from "@/lib/play-types";

import { LibraryTracksTab } from "../library-tracks-tab";
import { DiscardProgressDialog } from "../discard-progress-dialog";
import { SlotCreateTrackPanel } from "./slot-create-track-panel";

type SlotLibraryView = "browse" | "create";
type PendingLeave = "browse" | "close";

type SlotLibraryPanelProps = {
  activeTrackId?: string;
  onAssign: (track: Track) => void;
  onClose: () => void;
};

export function SlotLibraryPanel({
  activeTrackId,
  onAssign,
  onClose,
}: SlotLibraryPanelProps) {
  const [view, setView] = useState<SlotLibraryView>("browse");
  const [hasProgress, setHasProgress] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null);

  const creating = view === "create";

  const returnToBrowse = useCallback(() => {
    setView("browse");
    setHasProgress(false);
    setPendingLeave(null);
  }, []);

  const requestLeave = (leave: PendingLeave) => {
    if (creating && hasProgress) {
      setPendingLeave(leave);
      return;
    }

    if (leave === "close") {
      onClose();
      return;
    }

    returnToBrowse();
  };

  const handleDiscard = () => {
    if (pendingLeave === "close") {
      onClose();
      return;
    }

    returnToBrowse();
  };

  return (
    <div className="border-x border-b border-border bg-background px-3 py-3">
      <div className="flex items-center justify-between gap-3 pb-3">
        <h3 className="text-sm font-medium">
          {creating ? "Create New Track" : "Choose a Track"}
        </h3>
        <div className="flex items-center gap-1.5">
          {creating ? (
            <Button variant="outline" size="sm" onClick={() => requestLeave("browse")}>
              Back to Library
            </Button>
          ) : (
            <HoverButton
              variant="outline"
              size="sm"
              onClick={() => setView("create")}
              simpleView="Create New"
              expandedView="Track"
              expandedClassName="pl-1"
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Close library"
            onClick={() => requestLeave("close")}
          >
            <XIcon />
          </Button>
        </div>
      </div>

      {creating ? (
        <SlotCreateTrackPanel onProgressChange={setHasProgress} />
      ) : (
        <LibraryTracksTab activeTrackId={activeTrackId} onSelectTrack={onAssign} />
      )}

      <DiscardProgressDialog
        open={pendingLeave !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLeave(null);
          }
        }}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
