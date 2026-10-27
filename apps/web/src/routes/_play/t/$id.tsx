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


  // Keyed so the Track picker starts the next Track stopped, even when both share an Original BPM.
  return <PlayScreen 
  key={id} 
  mode="track" 
  loadState={isPending ? "pending" : track ? "ready" : "not-found"}
  track={track ?? undefined}
  />;
}
