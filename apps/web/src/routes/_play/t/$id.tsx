import { createFileRoute, notFound } from "@tanstack/react-router";

import { PlayScreen } from "@/components/play/play-screen";
import { getTrackById } from "@/lib/mock-data";
import { usePaginationFixturesStore } from "@/stores/pagination-fixtures-store";

export const Route = createFileRoute("/_play/t/$id")({
  component: TrackPlayRoute,
});

function TrackPlayRoute() {
  const { id } = Route.useParams();
  const fixturesEnabled = usePaginationFixturesStore((state) => state.enabled);
  const track = getTrackById(id, fixturesEnabled);

  if (!track) {
    throw notFound();
  }

  // Keyed so the Track picker starts the next Track stopped, even when both share an Original BPM.
  return <PlayScreen key={track.id} mode="track" track={track} />;
}
