import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { PlayScreen } from "@/components/play/play-screen";
import { getSetlistById, getTrackForSlot } from "@/lib/mock-data";

export const Route = createFileRoute("/_play/s/$id")({
  component: SetlistPlayRoute,
});

function SetlistPlayRoute() {
  const { id } = Route.useParams();
  const setlist = getSetlistById(id);

  if (!setlist) {
    throw notFound();
  }

  // Keyed so the Setlist picker cannot carry a slot index into a shorter Setlist.
  return <SetlistPlayScreen key={setlist.id} setlist={setlist} />;
}

function SetlistPlayScreen({
  setlist,
}: {
  setlist: NonNullable<ReturnType<typeof getSetlistById>>;
}) {
  const [slotIndex, setSlotIndex] = useState(0);
  const slot = setlist.slots[slotIndex];
  const track = getTrackForSlot(setlist, slotIndex);

  if (!slot || !track) {
    throw notFound();
  }

  return (
    <PlayScreen
      mode="setlist"
      setlist={setlist}
      track={track}
      slotIndex={slotIndex}
      onSlotChange={setSlotIndex}
    />
  );
}
