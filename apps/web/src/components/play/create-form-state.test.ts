import { describe, expect, it } from "bun:test";

import {
  INITIAL_CREATE_TRACK_FORM,
  resetCreateTrackForm,
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
