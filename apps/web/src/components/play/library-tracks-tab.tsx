import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@loopinator/ui/components/accordion";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";
import { cn } from "@loopinator/ui/lib/utils";
import { LayersArrowDown, LayersArrowUp, PlayIcon, SquareIcon } from "lucide-react";

import { LibraryLoadMore, LIBRARY_PAGE_SIZE } from "@/components/play/library-load-more";
import { Filters, FiltersChips, FiltersTrigger } from "@/components/play/filters";
import { getLibraryTracks } from "@/lib/mock-data";
import { BPM_BANDS, BPM_BAND_LABELS, getBpmBand, type BpmBand, type Track } from "@/lib/play-types";
import { usePaginationFixturesStore } from "@/stores/pagination-fixtures-store";

function emptyVisibleByBand(): Record<BpmBand, number> {
  return {
    "under-80": LIBRARY_PAGE_SIZE,
    "80-99": LIBRARY_PAGE_SIZE,
    "100-129": LIBRARY_PAGE_SIZE,
    "130-159": LIBRARY_PAGE_SIZE,
    "160-plus": LIBRARY_PAGE_SIZE,
  };
}

function groupTracksByBand(tracks: Track[]) {
  const bands: Record<BpmBand, Track[]> = {
    "under-80": [],
    "80-99": [],
    "100-129": [],
    "130-159": [],
    "160-plus": [],
  };

  for (const track of tracks) {
    bands[getBpmBand(track.originalBpm)].push(track);
  }

  return bands;
}

function trackCountLabel(count: number) {
  return count === 1 ? "(1 track)" : `(${count} tracks)`;
}

type LibraryTracksTabProps = {
  activeTrackId?: string;
};

export function LibraryTracksTab({ activeTrackId }: LibraryTracksTabProps) {
  const fixturesEnabled = usePaginationFixturesStore((state) => state.enabled);
  const tracks = useMemo(() => getLibraryTracks(fixturesEnabled), [fixturesEnabled]);
  const bands = useMemo(() => groupTracksByBand(tracks), [tracks]);
  const populatedBands = useMemo(
    () => BPM_BANDS.filter((band) => bands[band].length > 0),
    [bands],
  );

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [visibleByBand, setVisibleByBand] = useState<Record<BpmBand, number>>(emptyVisibleByBand);
  const [openBands, setOpenBands] = useState<BpmBand[]>(populatedBands);

  useEffect(() => {
    setVisibleByBand(emptyVisibleByBand());
    setOpenBands(populatedBands);
  }, [fixturesEnabled, populatedBands]);

  return (
    <Filters>
      <div className="flex flex-col gap-2">
        <div className="sticky top-0 z-10 bg-background">
          <div className="flex items-center justify-between gap-1.5">
            <FiltersTrigger />
            <div className="flex items-center gap-1.5">
              <HoverButton
                variant="outline"
                size="sm"
                aria-label="Expand all"
                simpleView={<LayersArrowDown />}
                expandedView={"Expand all"}
                onClick={() => setOpenBands(populatedBands)}
              />
              <HoverButton
                variant="outline"
                size="sm"
                aria-label="Collapse all"
                simpleView={<LayersArrowUp />}
                expandedView="Collapse all"
                onClick={() => setOpenBands([])}
              />
            </div>
          </div>
          <FiltersChips />
        </div>
        <Accordion
          key={fixturesEnabled ? "fixtures" : "demo"}
          multiple
          value={openBands}
          onValueChange={(value) => setOpenBands(value as BpmBand[])}
          className="w-full"
        >
          {populatedBands.map((band) => {
            const bandTracks = bands[band];
            const visible = visibleByBand[band];

            return (
              <AccordionItem key={band} value={band}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="font-medium text-foreground">{BPM_BAND_LABELS[band]}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {trackCountLabel(bandTracks.length)}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="[&_a]:no-underline pb-0">
                  <div className="pt-3 pb-4">
                    <ul className="divide-y divide-border border border-border">
                      {bandTracks.slice(0, visible).map((track) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          isCurrent={track.id === activeTrackId}
                          isPreviewing={previewingId === track.id}
                          onPreviewToggle={() =>
                            setPreviewingId((current) => (current === track.id ? null : track.id))
                          }
                        />
                      ))}
                    </ul>
                    <LibraryLoadMore
                      total={bandTracks.length}
                      visible={visible}
                      onLoadMore={() =>
                        setVisibleByBand((current) => ({
                          ...current,
                          [band]: current[band] + LIBRARY_PAGE_SIZE,
                        }))
                      }
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </Filters>
  );
}

function TrackRow({
  track,
  isCurrent,
  isPreviewing,
  onPreviewToggle,
}: {
  track: Track;
  isCurrent: boolean;
  isPreviewing: boolean;
  onPreviewToggle: () => void;
}) {
  return (
    <li
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-3",
        isCurrent && "pointer-events-none opacity-50",
      )}
    >
      <div className="min-w-0 max-w-4/5 flex-1">
        {isCurrent ? (
          <span
            className="block truncate text-sm font-medium text-muted-foreground"
            title={track.displayName}
          >
            {track.displayName}
          </span>
        ) : (
          <Link
            to="/t/$id"
            params={{ id: track.id }}
            className="block truncate text-sm font-medium hover:underline"
            title={track.displayName}
          >
            {track.displayName}
          </Link>
        )}
        <p className="truncate text-xs text-muted-foreground">{track.filename}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={isPreviewing ? `Stop ${track.displayName}` : `Preview ${track.displayName}`}
        aria-pressed={isPreviewing}
        onClick={onPreviewToggle}
      >
        {isPreviewing ? <SquareIcon className="fill-current" /> : <PlayIcon />}
      </Button>
    </li>
  );
}
