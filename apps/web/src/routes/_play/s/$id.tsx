import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import Loader from "@/components/loader";
import { PlayScreen } from "@/components/play/play-screen";
import { usePlaySetlist, usePlayTrackForSlot } from "@/lib/audio";
import type { Setlist } from "@/lib/play-types";

export const Route = createFileRoute("/_play/s/$id")({
  component: SetlistPlayRoute,
});

function SetlistPlayRoute() {
  const { id } = Route.useParams();
  const { data: setlist, isPending } = usePlaySetlist(id);

  if (isPending) {
    return <Loader />;
  }

  if (!setlist) {
    return <div>Not Found</div>;
  }

  // Keyed so the Setlist picker cannot carry a slot index into a shorter Setlist.
  return <SetlistPlayScreen key={setlist.id} setlist={setlist} />;
}

function SetlistPlayScreen({ setlist }: { setlist: Setlist }) {
  const [slotIndex, setSlotIndex] = useState(0);
  const { data: track, isPending } = usePlayTrackForSlot(setlist, slotIndex);



  return (
    <PlayScreen
      mode="setlist"
      setlist={setlist}
      loadState={isPending ? "pending" : track ? "ready" : "not-found"}
      track={track ?? undefined}
      slotIndex={slotIndex}
      onSlotChange={setSlotIndex}
    />
  );
}
