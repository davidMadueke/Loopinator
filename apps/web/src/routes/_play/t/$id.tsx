import { createFileRoute } from "@tanstack/react-router";

import { PlayScreen } from "@/components/play/play-screen";
import { usePlayTrack } from "@/lib/audio";

export const Route = createFileRoute("/_play/t/$id")({
  component: TrackPlayRoute,
});

function TrackPlayRoute() {
  const { id } = Route.useParams();
  const { data: track, loadState } = usePlayTrack(id);

  // Keyed so the Track picker starts the next Track stopped, even when both share an Original BPM.
  return (
    <PlayScreen
      key={id}
      mode="track"
      loadState={loadState}
      track={track ?? undefined}
    />
  );
}
