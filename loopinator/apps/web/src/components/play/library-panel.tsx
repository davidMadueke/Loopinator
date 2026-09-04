import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopinator/ui/components/tabs";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";
import { ChevronsDownIcon, ChevronsUpIcon } from "lucide-react";

import { useLibraryCreateStore } from "@/stores/library-create-store";

import { CreateSetlistPanel } from "./create-setlist-panel";
import { CreateTrackPanel } from "./create-track-panel";
import { Filters, FiltersChips, FiltersTrigger } from "./filters";
import { LibrarySetlistsTab } from "./library-setlists-tab";
import { LibraryTracksTab, type LibraryTracksTabHandle } from "./library-tracks-tab";

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
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  activeTrackId?: string;
  activeSetlistId?: string;
};

export type { LibraryTab };

export function LibraryPanel({ tab, onTabChange, activeTrackId, activeSetlistId }: LibraryPanelProps) {
  const [view, setView] = useState<LibraryView>("browse");
  const tracksTabRef = useRef<LibraryTracksTabHandle>(null);

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
        <Filters>
          <Tabs
            value={tab}
            onValueChange={(value) => onTabChange(value as LibraryTab)}
            className="flex min-h-0 flex-1 flex-col gap-2"
          >
            <div className="mx-auto w-full max-w-215 shrink-0 px-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start">
                  <div className="flex w-full justify-start">
                    <TabsList variant="default">
                      <TabsTrigger value="Track">Tracks</TabsTrigger>
                      <TabsTrigger value="Setlist">Setlists</TabsTrigger>
                    </TabsList>
                  </div>


                  { tab === "Track" && (
                    <div className="flex w-full justify-center">
                    <FiltersTrigger />
                    </div>
                  ) }

                  <div className="flex w-full flex-col items-end gap-1.5">
                    <HoverButton
                      variant="outline"
                      size="sm"
                      onClick={handleCreateOpen}
                      simpleView="Create New"
                      expandedView={tab}
                      expandedClassName="pl-1"
                    />
                    {tab === "Track" ? (
                      <div className="flex gap-1.5">
                        <HoverButton
                          variant="outline"
                          size="xs"
                          aria-label="Expand all"
                          simpleView={<ChevronsDownIcon />}
                          expandedView="Expand all"
                          onClick={() => tracksTabRef.current?.expandAll()}
                        />
                        <HoverButton
                          variant="outline"
                          size="xs"
                          aria-label="Collapse all"
                          simpleView={<ChevronsUpIcon />}
                          expandedView="Collapse all"
                          onClick={() => tracksTabRef.current?.collapseAll()}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                { tab === "Track" && (
                <FiltersChips />
                )}

              </div>
            </div>

            <LibraryPanelScrollArea>
              <TabsContent value="Track" className="pt-4">
                <LibraryTracksTab ref={tracksTabRef} activeTrackId={activeTrackId} />
              </TabsContent>
              <TabsContent value="Setlist" className="pt-4">
                <LibrarySetlistsTab activeSetlistId={activeSetlistId} />
              </TabsContent>
            </LibraryPanelScrollArea>
          </Tabs>
        </Filters>
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
