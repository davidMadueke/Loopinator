import {
  DEFAULT_TRACK_KEY,
  KEY_CENTERS,
  type KeyCenter,
  type TimeSignature,
  type Track,
  type TrackKey,
} from "@/lib/play-types";
import { defaultSlotLabel, nextDuplicateSlotLabel } from "@/lib/slot-label";

export type CreateTrackFormState = {
  audioFile: File | null;
  displayName: string;
  originalBpm: string;
  bpmAutoDetected: boolean;
  key: TrackKey;
  keyAutoDetected: boolean;
  timeSignature: TimeSignature;
  inPoint: string;
  outPoint: string;
};

export const INITIAL_CREATE_TRACK_FORM: CreateTrackFormState = {
  audioFile: null,
  displayName: "",
  originalBpm: "",
  bpmAutoDetected: false,
  key: DEFAULT_TRACK_KEY,
  keyAutoDetected: false,
  timeSignature: "4/4",
  inPoint: "",
  outPoint: "",
};

export function resetCreateTrackForm(audioFile: File | null): CreateTrackFormState {
  return { ...INITIAL_CREATE_TRACK_FORM, audioFile };
}

export function hasCreateTrackProgress(form: CreateTrackFormState) {
  return (
    form.audioFile !== null ||
    form.displayName.trim() !== "" ||
    form.originalBpm.trim() !== "" ||
    form.key.center !== "No Key" ||
    form.key.scale !== "major" ||
    form.timeSignature !== "4/4" ||
    form.inPoint.trim() !== "" ||
    form.outPoint.trim() !== ""
  );
}

export type CreateSetlistSlotState = {
  id: string;
  isSelected: boolean;
  trackId: string | null;
  slotLabel: string;
  targetBpm: number | null;
  bpmAutoDetected: boolean;
  key: TrackKey;
  keyAutoDetected: boolean;
  timeSignature: TimeSignature;
};

export type CreateSetlistFormState = {
  name: string;
  slots: CreateSetlistSlotState[];
};

export const INITIAL_CREATE_SETLIST_SLOT_ID = "draft-slot-1";

export function createEmptySlot(insertIndex: number, id?: string): CreateSetlistSlotState {
  return {
    id: id ?? crypto.randomUUID(),
    isSelected: false,
    trackId: null,
    slotLabel: defaultSlotLabel(insertIndex),
    targetBpm: null,
    bpmAutoDetected: false,
    key: DEFAULT_TRACK_KEY,
    keyAutoDetected: false,
    timeSignature: "4/4",
  };
}

export const INITIAL_CREATE_SETLIST_FORM: CreateSetlistFormState = {
  name: "",
  slots: [createEmptySlot(0, INITIAL_CREATE_SETLIST_SLOT_ID)],
};

export function isSlotFilled(slot: CreateSetlistSlotState) {
  return slot.trackId !== null;
}

export function hasCreateSetlistProgress(form: CreateSetlistFormState) {
  if (form.name.trim() !== "") {
    return true;
  }
  if (form.slots.length !== 1) {
    return true;
  }
  const [slot] = form.slots;
  if (!slot) {
    return false;
  }
  return isSlotFilled(slot) || slot.slotLabel !== defaultSlotLabel(0);
}

export function canCreateSetlist(form: CreateSetlistFormState) {
  return form.name.trim() !== "" && form.slots.length >= 1 && form.slots.every(isSlotFilled);
}

export function addEmptySlot(form: CreateSetlistFormState, id?: string): CreateSetlistFormState {
  return {
    ...form,
    slots: [...form.slots, createEmptySlot(form.slots.length, id)],
  };
}

export function removeSlot(form: CreateSetlistFormState, slotId: string): CreateSetlistFormState {
  if (form.slots.length <= 1) {
    return form;
  }
  return {
    ...form,
    slots: form.slots.filter((slot) => slot.id !== slotId),
  };
}

export function selectSlot(state: boolean, form: CreateSetlistFormState, slotId: string): CreateSetlistFormState {
  if (form.slots.length <= 1) {
    return form;
  }
  return state ? {
    ...form,
    slots: form.slots.map((slot) => (slot.id === slotId ? { ...slot, isSelected: true } : slot ))
  } : {
    ...form,
    slots: form.slots.map((slot) => (slot.id === slotId ? { ...slot, isSelected: false } : slot ))
  }
}

export function updateSlotLabel(
  form: CreateSetlistFormState,
  slotId: string,
  slotLabel: string,
): CreateSetlistFormState {
  return {
    ...form,
    slots: form.slots.map((slot) => (slot.id === slotId ? { ...slot, slotLabel } : slot)),
  };
}

export function updateSlotTargetBpm(
  form: CreateSetlistFormState,
  slotId: string,
  targetBpm: number,
): CreateSetlistFormState {
  return {
    ...form,
    slots: form.slots.map((slot) =>
      slot.id === slotId ? { ...slot, targetBpm, bpmAutoDetected: false } : slot,
    ),
  };
}

export function updateSlotKey(
  form: CreateSetlistFormState,
  slotId: string,
  key: TrackKey,
): CreateSetlistFormState {
  return {
    ...form,
    slots: form.slots.map((slot) =>
      slot.id === slotId ? { ...slot, key, keyAutoDetected: false } : slot,
    ),
  };
}

export function updateSlotTimeSignature(
  form: CreateSetlistFormState,
  slotId: string,
  timeSignature: TimeSignature,
): CreateSetlistFormState {
  return {
    ...form,
    slots: form.slots.map((slot) => (slot.id === slotId ? { ...slot, timeSignature } : slot)),
  };
}

export function assignSlotTrack(
  form: CreateSetlistFormState,
  slotId: string,
  track: Track,
): CreateSetlistFormState {
  return {
    ...form,
    slots: form.slots.map((slot) => {
      if (slot.id !== slotId || slot.trackId === track.id) {
        return slot;
      }
      return {
        ...slot,
        trackId: track.id,
        targetBpm: track.originalBpm,
        bpmAutoDetected: track.bpmAutoDetected,
        key: keyFromTrack(track),
        keyAutoDetected: track.keyAutoDetected,
        timeSignature: track.timeSignature,
      };
    }),
  };
}

function swapAdjacentSlots(
  form: CreateSetlistFormState,
  index: number,
  offset: -1 | 1,
): CreateSetlistFormState {
  const swapIndex = index + offset;
  if (index < 0 || swapIndex < 0 || swapIndex >= form.slots.length) {
    return form;
  }

  const slots = [...form.slots];
  const current = slots[index];
  const neighbor = slots[swapIndex];
  if (!current || !neighbor) {
    return form;
  }

  slots[index] = neighbor;
  slots[swapIndex] = current;
  return { ...form, slots };
}

export function moveSlotUp(form: CreateSetlistFormState, slotId: string): CreateSetlistFormState {
  return swapAdjacentSlots(
    form,
    form.slots.findIndex((slot) => slot.id === slotId),
    -1,
  );
}

export function moveSlotDown(form: CreateSetlistFormState, slotId: string): CreateSetlistFormState {
  return swapAdjacentSlots(
    form,
    form.slots.findIndex((slot) => slot.id === slotId),
    1,
  );
}

export function reorderSlots(
  form: CreateSetlistFormState,
  slots: CreateSetlistSlotState[],
): CreateSetlistFormState {
  if (slots.length !== form.slots.length) {
    return form;
  }

  const currentIds = new Set(form.slots.map((slot) => slot.id));
  if (slots.some((slot) => !currentIds.has(slot.id))) {
    return form;
  }

  return { ...form, slots };
}

export function duplicateSlotBelow(
  form: CreateSetlistFormState,
  slotId: string,
  newId?: string,
): CreateSetlistFormState {
  const index = form.slots.findIndex((slot) => slot.id === slotId);
  const source = form.slots[index];
  if (!source) {
    return form;
  }

  const copy: CreateSetlistSlotState = {
    ...source,
    id: newId ?? crypto.randomUUID(),
    slotLabel: nextDuplicateSlotLabel(
      source.slotLabel,
      form.slots.map((slot) => slot.slotLabel),
    ),
  };

  const slots = [...form.slots];
  slots.splice(index + 1, 0, copy);
  return { ...form, slots };
}

function keyFromTrack(track: Track): TrackKey {
  const center = KEY_CENTERS.includes(track.key as KeyCenter)
    ? (track.key as KeyCenter)
    : "No Key";
  return { center, scale: track.keyMode };
}
