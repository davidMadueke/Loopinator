import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PlayScreen } from "@/components/play/play-screen";
import { usePlaySetlist, useSetlistTrack } from "@/lib/audio";
import type { PlayLoadState, Setlist } from "@/lib/play-types";

export const Route = createFileRoute("/_play/s/$id")({
  component: SetlistPlayRoute,
});

function SetlistPlayRoute() {
  const { id } = Route.useParams();
  const { data: setlist, loadState } = usePlaySetlist(id);

  // Keyed so the Setlist picker cannot carry a slot index into a shorter Setlist.
  return (
    <SetlistPlayScreen
      key={id}
      setlist={setlist ?? undefined}
      setlistLoadState={loadState}
    />
  );
}

function SetlistPlayScreen({
  setlist,
  setlistLoadState,
}: {
  setlist?: Setlist;
  setlistLoadState: PlayLoadState;
}) {
  const [slotIndex, setSlotIndex] = useState(0);
  const { data: track, loadState } = useSetlistTrack(setlist, slotIndex);

  return (
    <PlayScreen
      mode="setlist"
      setlist={setlist}
      setlistLoadState={setlistLoadState}
      loadState={loadState}
      track={track ?? undefined}
      slotIndex={slotIndex}
      onSlotChange={setSlotIndex}
    />
  );
}
