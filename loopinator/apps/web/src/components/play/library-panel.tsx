import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopinator/ui/components/tabs";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";

import { useLibraryCreateStore } from "@/stores/library-create-store";

import { CreateSetlistPanel } from "./create-setlist-panel";
import { CreateTrackPanel } from "./create-track-panel";
import { LibrarySetlistsTab } from "./library-setlists-tab";
import { LibraryTracksTab } from "./library-tracks-tab";

type LibraryTab = "Track" | "Setlist";
type LibraryView = "browse" | "create";

function createLabel(tab: LibraryTab) {
  return `Create New ${tab}`;
}

type LibraryPanelScrollAreaProps = {
  children: ReactNode;
};

function LibraryPanelScrollArea({ children }: LibraryPanelScrollAreaProps) {
  return (
    <div className="mx-auto min-h-0 w-full max-w-215 flex-1 overflow-y-auto overscroll-contain">
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

type LibraryPanelProps = {
  defaultTab: LibraryTab;
  activeTrackId?: string;
  activeSetlistId?: string;
};

export function LibraryPanel({ defaultTab, activeTrackId, activeSetlistId }: LibraryPanelProps) {
  const [tab, setTab] = useState<LibraryTab>(defaultTab);
  const [view, setView] = useState<LibraryView>("browse");

  const browseResetKey = useLibraryCreateStore((state) => state.browseResetKey);
  const resetProgress = useLibraryCreateStore((state) => state.resetProgress);
  const setHasProgress = useLibraryCreateStore((state) => state.setHasProgress);
  const requestDiscard = useLibraryCreateStore((state) => state.requestDiscard);

  const creating = view === "create";

  useEffect(() => {
    setView("browse");
  }, [browseResetKey]);

  const returnToLibrary = useCallback(() => {
    setView("browse");
    resetProgress();
  }, [resetProgress]);

  const handleBack = () => {
    const result = requestDiscard("return-to-browse");
    if (result === "proceeded") {
      returnToLibrary();
    }
  };

  const handleCreateOpen = () => {
    resetProgress();
    setView("create");
  };

  const handleProgressChange = useCallback(
    (nextHasProgress: boolean) => {
      setHasProgress(nextHasProgress);
    },
    [setHasProgress],
  );

  return (
    <section className="sticky top-0 z-20 flex max-h-[calc(100dvh-8.75rem)] flex-col overflow-hidden border-b border-border bg-card/40">
      <div className="mx-auto w-full max-w-215 shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between gap-4 pb-4">
          <h2 className="text-2xl font-medium">{creating ? createLabel(tab) : "Library"}</h2>
          {creating ? (
            <Button variant="outline" size="sm" onClick={handleBack}>
              Back to Library
            </Button>
          ) : null}
        </div>
      </div>

      {creating ? null : (
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as LibraryTab)}
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <div className="mx-auto w-full max-w-215 shrink-0 px-4">
            <div className="flex">
              <div className="flex w-full justify-start">
                <TabsList variant="default">
                  <TabsTrigger value="Track">Tracks</TabsTrigger>
                  <TabsTrigger value="Setlist">Setlists</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex w-full justify-center" />

              <div className="flex w-full justify-end">
                <HoverButton
                  variant="outline"
                  size="sm"
                  onClick={handleCreateOpen}
                  simpleView="Create New"
                  expandedView={tab}
                  expandedClassName="pl-1"
                />
              </div>
            </div>
          </div>

          <LibraryPanelScrollArea>
            <TabsContent value="Track" className="pt-4">
              <LibraryTracksTab activeTrackId={activeTrackId} />
            </TabsContent>
            <TabsContent value="Setlist" className="pt-4">
              <LibrarySetlistsTab activeSetlistId={activeSetlistId} />
            </TabsContent>
          </LibraryPanelScrollArea>
        </Tabs>
      )}

      {creating && tab === "Track" && (
        <LibraryPanelScrollArea>
          <CreateTrackPanel onProgressChange={handleProgressChange} />
        </LibraryPanelScrollArea>
      )}

      {creating && tab === "Setlist" && (
        <LibraryPanelScrollArea>
          <CreateSetlistPanel onProgressChange={handleProgressChange} />
        </LibraryPanelScrollArea>
      )}
    </section>
  );
}
