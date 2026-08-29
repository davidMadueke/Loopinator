import { useCallback, useEffect, useState } from "react";
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

export function LibraryPanel() {
  const [tab, setTab] = useState<LibraryTab>("Track");
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
    <section className="border-b border-border bg-card/40">
      <div className="mx-auto w-full max-w-[860px] px-4 py-4">
        <>
        <h2 className="text-2xl font-medium pb-2">Library</h2>
        {creating ? (
          <div className="flex">
            <h2 className="flex items-center w-full text-2xl font-medium">{createLabel(tab)}</h2>
            <div className="flex w-full justify-end">
              <Button variant="outline" size="sm" onClick={handleBack}>
                Back to Library
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(value) => setTab(value as LibraryTab)}>
            <div className="flex">
              <TabsList variant="default">
                <TabsTrigger value="Track">Tracks</TabsTrigger>
                <TabsTrigger value="Setlist">Setlists</TabsTrigger>
              </TabsList>

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

            <TabsContent value="Track" className="pt-4">
              <LibraryTracksTab />
            </TabsContent>
            <TabsContent value="Setlist" className="pt-4">
              <LibrarySetlistsTab />
            </TabsContent>
          </Tabs>
        )}
        </>
      </div>

      {creating && tab === "Track" && (
        <div className="mx-auto w-full max-w-[860px] px-4 pb-4">
          <CreateTrackPanel onProgressChange={handleProgressChange} />
        </div>
      )}

      {creating && tab === "Setlist" && (
        <div className="mx-auto w-full max-w-[860px] px-4 pb-4">
          <CreateSetlistPanel onProgressChange={handleProgressChange} />
        </div>
      )}
    </section>
  );
}
