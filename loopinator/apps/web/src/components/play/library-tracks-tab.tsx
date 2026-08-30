import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@loopinator/ui/components/button";
import { cn } from "@loopinator/ui/lib/utils";
import { PlayIcon, SquareIcon } from "lucide-react";

import { DEMO_TRACKS } from "@/lib/mock-data";
import { BPM_BAND_LABELS, getBpmBand, type BpmBand } from "@/lib/play-types";

function groupTracksByBand() {
  const bands: Record<BpmBand, typeof DEMO_TRACKS> = {
    "under-80": [],
    "80-99": [],
    "100-129": [],
    "130-159": [],
    "160-plus": [],
  };

  for (const track of DEMO_TRACKS) {
    bands[getBpmBand(track.originalBpm)].push(track);
  }

  return bands;
}

type LibraryTracksTabProps = {
  activeTrackId?: string;
};

export function LibraryTracksTab({ activeTrackId }: LibraryTracksTabProps) {
  const bands = groupTracksByBand();
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {(Object.keys(bands) as Array<keyof typeof bands>).map((band) => {
        const tracks = bands[band];
        if (tracks.length === 0) {
          return null;
        }

        return (
          <section key={band}>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">{BPM_BAND_LABELS[band]}</h3>
            <ul className="divide-y divide-border border border-border">
              {tracks.map((track) => {
                const isPreviewing = previewingId === track.id;
                const isCurrent = track.id === activeTrackId;

                return (
                  <li
                    key={track.id}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2",
                      isCurrent && "pointer-events-none opacity-50",
                    )}
                  >
                    <div className="min-w-0 max-w-4/5 flex-1">
                      {isCurrent ? (
                        <span
                          className="block truncate font-medium text-sm text-muted-foreground"
                          title={track.displayName}
                        >
                          {track.displayName}
                        </span>
                      ) : (
                        <Link
                          to="/t/$id"
                          params={{ id: track.id }}
                          className="block truncate font-medium text-sm hover:underline"
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
                      onClick={() =>
                        setPreviewingId((current) => (current === track.id ? null : track.id))
                      }
                    >
                      {isPreviewing ? <SquareIcon className="fill-current" /> : <PlayIcon />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
