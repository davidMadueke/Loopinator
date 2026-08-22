import { createFileRoute, notFound } from "@tanstack/react-router";

import { PlayScreen } from "@/components/play/play-screen";
import { getTrackById } from "@/lib/mock-data";

export const Route = createFileRoute("/_play/t/$id")({
  component: TrackPlayRoute,
});

function TrackPlayRoute() {
  const { id } = Route.useParams();
  const track = getTrackById(id);

  if (!track) {
    throw notFound();
  }

  return <PlayScreen mode="track" track={track} />;
}
