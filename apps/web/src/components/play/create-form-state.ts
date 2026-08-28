import { DEFAULT_TRACK_KEY, type TimeSignature, type TrackKey } from "@/lib/play-types";

export type CreateTrackFormState = {
  audioFile: File | null;
  displayName: string;
  songTitle: string;
  originalBpm: string;
  key: TrackKey;
  timeSignature: TimeSignature;
  inPoint: string;
  outPoint: string;
};

export const INITIAL_CREATE_TRACK_FORM: CreateTrackFormState = {
  audioFile: null,
  displayName: "",
  songTitle: "",
  originalBpm: "",
  key: DEFAULT_TRACK_KEY,
  timeSignature: "4/4",
  inPoint: "",
  outPoint: "",
};

export function hasCreateTrackProgress(form: CreateTrackFormState) {
  return (
    form.audioFile !== null ||
    form.displayName.trim() !== "" ||
    form.songTitle.trim() !== "" ||
    form.originalBpm.trim() !== "" ||
    form.key.center !== "No Key" ||
    form.key.scale !== "major" ||
    form.timeSignature !== "4/4" ||
    form.inPoint.trim() !== "" ||
    form.outPoint.trim() !== ""
  );
}

export type CreateSetlistFormState = {
  name: string;
};

export const INITIAL_CREATE_SETLIST_FORM: CreateSetlistFormState = {
  name: "",
};

export function hasCreateSetlistProgress(form: CreateSetlistFormState) {
  return form.name.trim() !== "";
}
