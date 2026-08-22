import { Link } from "@tanstack/react-router";
import { Button } from "@loopinator/ui/components/button";
import { PlayIcon } from "lucide-react";

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

export function LibraryTracksTab() {
  const bands = groupTracksByBand();

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
              {tracks.map((track) => (
                <li key={track.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <Link
                      to="/t/$id"
                      params={{ id: track.id }}
                      className="block truncate text-sm hover:underline"
                    >
                      {track.displayName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{track.filename}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Preview ${track.displayName}`}>
                    <PlayIcon />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
