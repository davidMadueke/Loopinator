import { describe, expect, it } from "bun:test";

import { DEMO_TRACKS } from "@/lib/mock-data";

import {
  addEmptySlot,
  assignSlotTrack,
  canCreateSetlist,
  duplicateSlotBelow,
  hasCreateSetlistProgress,
  INITIAL_CREATE_SETLIST_FORM,
  INITIAL_CREATE_SETLIST_SLOT_ID,
  INITIAL_CREATE_TRACK_FORM,
  moveSlotDown,
  moveSlotUp,
  removeSlot,
  reorderSlots,
  resetCreateTrackForm,
  updateSlotKey,
  updateSlotLabel,
  updateSlotTargetBpm,
  updateSlotTimeSignature,
} from "./create-form-state";

describe("resetCreateTrackForm", () => {
  it("wipes every field and keeps only the next audio file", () => {
    const file = new File(["x"], "next.wav", { type: "audio/wav" });
    const next = resetCreateTrackForm(file);

    expect(next).toEqual({
      ...INITIAL_CREATE_TRACK_FORM,
      audioFile: file,
    });
  });

  it("returns the empty form when the file is removed", () => {
    expect(resetCreateTrackForm(null)).toEqual(INITIAL_CREATE_TRACK_FORM);
  });
});

const firstTrack = DEMO_TRACKS[0];
const secondTrack = DEMO_TRACKS[1];

if (!firstTrack || !secondTrack) {
  throw new Error("DEMO_TRACKS needs at least two tracks for Create Setlist tests");
}

describe("hasCreateSetlistProgress", () => {
  it("is empty on the initial form", () => {
    expect(hasCreateSetlistProgress(INITIAL_CREATE_SETLIST_FORM)).toBe(false);
  });

  it("counts a Setlist name", () => {
    expect(hasCreateSetlistProgress({ ...INITIAL_CREATE_SETLIST_FORM, name: "Sunday" })).toBe(true);
  });

  it("counts a picked Track", () => {
    expect(
      hasCreateSetlistProgress(assignSlotTrack(INITIAL_CREATE_SETLIST_FORM, INITIAL_CREATE_SETLIST_SLOT_ID, firstTrack)),
    ).toBe(true);
  });

  it("counts an extra slot", () => {
    expect(hasCreateSetlistProgress(addEmptySlot(INITIAL_CREATE_SETLIST_FORM, "draft-slot-2"))).toBe(
      true,
    );
  });
});

describe("canCreateSetlist", () => {
  it("stays false until the name is set and every slot has a Track", () => {
    expect(canCreateSetlist(INITIAL_CREATE_SETLIST_FORM)).toBe(false);

    const named = { ...INITIAL_CREATE_SETLIST_FORM, name: "Sunday" };
    expect(canCreateSetlist(named)).toBe(false);

    const filled = assignSlotTrack(named, INITIAL_CREATE_SETLIST_SLOT_ID, firstTrack);
    expect(canCreateSetlist(filled)).toBe(true);

    const withEmpty = addEmptySlot(filled, "draft-slot-2");
    expect(canCreateSetlist(withEmpty)).toBe(false);
  });
});

describe("assignSlotTrack", () => {
  it("inherits Target BPM, Key, and Time signature from the Track", () => {
    const next = assignSlotTrack(INITIAL_CREATE_SETLIST_FORM, INITIAL_CREATE_SETLIST_SLOT_ID, firstTrack);
    const slot = next.slots[0];

    expect(slot?.trackId).toBe(firstTrack.id);
    expect(slot?.targetBpm).toBe(firstTrack.originalBpm);
    expect(slot?.key).toEqual({ center: firstTrack.key, scale: firstTrack.keyMode });
    expect(slot?.timeSignature).toBe(firstTrack.timeSignature);
    expect(slot?.slotLabel).toBe("Track 1");
  });

  it("resets copies when the Track is replaced and keeps the Slot label", () => {
    const named = updateSlotLabel(
      assignSlotTrack(INITIAL_CREATE_SETLIST_FORM, INITIAL_CREATE_SETLIST_SLOT_ID, firstTrack),
      INITIAL_CREATE_SETLIST_SLOT_ID,
      "Opening",
    );
    const replaced = assignSlotTrack(named, INITIAL_CREATE_SETLIST_SLOT_ID, secondTrack);
    const slot = replaced.slots[0];

    expect(slot?.slotLabel).toBe("Opening");
    expect(slot?.trackId).toBe(secondTrack.id);
    expect(slot?.targetBpm).toBe(secondTrack.originalBpm);
    expect(slot?.timeSignature).toBe(secondTrack.timeSignature);
  });
});

describe("updateSlotTargetBpm", () => {
  it("writes Target BPM and clears Auto-detected BPM", () => {
    const filled = assignSlotTrack(INITIAL_CREATE_SETLIST_FORM, INITIAL_CREATE_SETLIST_SLOT_ID, firstTrack);
    const next = updateSlotTargetBpm(filled, INITIAL_CREATE_SETLIST_SLOT_ID, 128);
    const slot = next.slots[0];

    expect(slot?.targetBpm).toBe(128);
    expect(slot?.bpmAutoDetected).toBe(false);
    expect(slot?.slotLabel).toBe("Track 1");
  });
});

describe("updateSlotKey", () => {
  it("writes Key and clears Auto-detected Key", () => {
    const filled = assignSlotTrack(INITIAL_CREATE_SETLIST_FORM, INITIAL_CREATE_SETLIST_SLOT_ID, firstTrack);
    const next = updateSlotKey(filled, INITIAL_CREATE_SETLIST_SLOT_ID, { center: "A", scale: "minor" });
    const slot = next.slots[0];

    expect(slot?.key).toEqual({ center: "A", scale: "minor" });
    expect(slot?.keyAutoDetected).toBe(false);
  });
});

describe("updateSlotTimeSignature", () => {
  it("writes Time signature and keeps Target BPM", () => {
    const filled = assignSlotTrack(INITIAL_CREATE_SETLIST_FORM, INITIAL_CREATE_SETLIST_SLOT_ID, firstTrack);
    const next = updateSlotTimeSignature(filled, INITIAL_CREATE_SETLIST_SLOT_ID, "6/8");
    const slot = next.slots[0];

    expect(slot?.timeSignature).toBe("6/8");
    expect(slot?.targetBpm).toBe(firstTrack.originalBpm);
  });
});

describe("duplicateSlotBelow", () => {
  it("copies a filled slot and numbers the new Slot label", () => {
    const filled = assignSlotTrack(INITIAL_CREATE_SETLIST_FORM, INITIAL_CREATE_SETLIST_SLOT_ID, firstTrack);
    const next = duplicateSlotBelow(filled, INITIAL_CREATE_SETLIST_SLOT_ID, "draft-slot-copy");

    expect(next.slots).toHaveLength(2);
    expect(next.slots[1]?.id).toBe("draft-slot-copy");
    expect(next.slots[1]?.trackId).toBe(firstTrack.id);
    expect(next.slots[1]?.slotLabel).toBe("Track 1 #2");
  });

  it("copies an Empty slot and numbers the new Slot label", () => {
    const next = duplicateSlotBelow(
      INITIAL_CREATE_SETLIST_FORM,
      INITIAL_CREATE_SETLIST_SLOT_ID,
      "draft-slot-copy",
    );
    const copy = next.slots[1];

    expect(next.slots).toHaveLength(2);
    expect(copy?.id).toBe("draft-slot-copy");
    expect(copy?.trackId).toBeNull();
    expect(copy?.slotLabel).toBe("Track 1 #2");
    expect(copy?.targetBpm).toBeNull();
  });
});

describe("removeSlot", () => {
  it("keeps the last remaining slot", () => {
    expect(removeSlot(INITIAL_CREATE_SETLIST_FORM, INITIAL_CREATE_SETLIST_SLOT_ID)).toEqual(
      INITIAL_CREATE_SETLIST_FORM,
    );
  });

  it("drops an extra slot", () => {
    const two = addEmptySlot(INITIAL_CREATE_SETLIST_FORM, "draft-slot-2");
    expect(removeSlot(two, "draft-slot-2").slots).toHaveLength(1);
  });
});

describe("moveSlotUp", () => {
  it("swaps a slot with the one above and keeps Slot labels", () => {
    const two = addEmptySlot(INITIAL_CREATE_SETLIST_FORM, "draft-slot-2");
    const next = moveSlotUp(two, "draft-slot-2");

    expect(next.slots.map((slot) => slot.id)).toEqual(["draft-slot-2", INITIAL_CREATE_SETLIST_SLOT_ID]);
    expect(next.slots.map((slot) => slot.slotLabel)).toEqual(["Track 2", "Track 1"]);
  });

  it("does nothing on the first slot", () => {
    const two = addEmptySlot(INITIAL_CREATE_SETLIST_FORM, "draft-slot-2");
    expect(moveSlotUp(two, INITIAL_CREATE_SETLIST_SLOT_ID)).toEqual(two);
  });
});

describe("moveSlotDown", () => {
  it("swaps a slot with the one below", () => {
    const two = addEmptySlot(INITIAL_CREATE_SETLIST_FORM, "draft-slot-2");
    const next = moveSlotDown(two, INITIAL_CREATE_SETLIST_SLOT_ID);

    expect(next.slots.map((slot) => slot.id)).toEqual(["draft-slot-2", INITIAL_CREATE_SETLIST_SLOT_ID]);
  });

  it("does nothing on the last slot", () => {
    const two = addEmptySlot(INITIAL_CREATE_SETLIST_FORM, "draft-slot-2");
    expect(moveSlotDown(two, "draft-slot-2")).toEqual(two);
  });
});

describe("reorderSlots", () => {
  it("writes the new order and keeps Slot labels on the slots", () => {
    const two = addEmptySlot(INITIAL_CREATE_SETLIST_FORM, "draft-slot-2");
    const next = reorderSlots(two, [two.slots[1]!, two.slots[0]!]);

    expect(next.slots.map((slot) => slot.id)).toEqual(["draft-slot-2", INITIAL_CREATE_SETLIST_SLOT_ID]);
    expect(next.slots.map((slot) => slot.slotLabel)).toEqual(["Track 2", "Track 1"]);
  });

  it("rejects a list that does not match the current slots", () => {
    const two = addEmptySlot(INITIAL_CREATE_SETLIST_FORM, "draft-slot-2");
    expect(reorderSlots(two, [two.slots[0]!])).toEqual(two);
  });
});
