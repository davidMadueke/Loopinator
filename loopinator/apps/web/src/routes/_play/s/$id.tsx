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

  return <SetlistPlayScreen setlist={setlist} />;
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
      slotLabel={slot.slotLabel}
      onSlotChange={setSlotIndex}
    />
  );
}
