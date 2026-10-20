import { createFileRoute } from "@tanstack/react-router";

import Loader from "@/components/loader";
import { PlayScreen } from "@/components/play/play-screen";
import { usePlayTrack } from "@/lib/audio";

export const Route = createFileRoute("/_play/t/$id")({
  component: TrackPlayRoute,
});

function TrackPlayRoute() {
  const { id } = Route.useParams();
  const { data: track, isPending } = usePlayTrack(id);

  if (isPending) {
    return <Loader />;
  }

  if (!track) {
    return <div>Not Found</div>;
  }

  // Keyed so the Track picker starts the next Track stopped, even when both share an Original BPM.
  return <PlayScreen key={track.id} mode="track" track={track} />;
}
