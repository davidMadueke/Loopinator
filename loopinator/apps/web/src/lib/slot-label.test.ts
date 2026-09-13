import { describe, expect, it } from "bun:test";

import { defaultSlotLabel, nextDuplicateSlotLabel, parseSlotLabelCopy } from "./slot-label";

describe("defaultSlotLabel", () => {
  it("uses 1-based Track N from the insert index", () => {
    expect(defaultSlotLabel(0)).toBe("Track 1");
    expect(defaultSlotLabel(2)).toBe("Track 3");
  });
});

describe("parseSlotLabelCopy", () => {
  it("treats a bare stem as #1", () => {
    expect(parseSlotLabelCopy("Opening")).toEqual({ stem: "Opening", n: 1 });
  });

  it("reads a copy suffix of #2 or higher", () => {
    expect(parseSlotLabelCopy("Opening #2")).toEqual({ stem: "Opening", n: 2 });
    expect(parseSlotLabelCopy("Opening #3")).toEqual({ stem: "Opening", n: 3 });
  });

  it("keeps #1 in the stem because that is not the copy convention", () => {
    expect(parseSlotLabelCopy("Opening #1")).toEqual({ stem: "Opening #1", n: 1 });
  });
});

describe("nextDuplicateSlotLabel", () => {
  it("copies Opening to Opening #2", () => {
    expect(nextDuplicateSlotLabel("Opening", ["Opening"])).toBe("Opening #2");
  });

  it("skips a taken #n", () => {
    expect(nextDuplicateSlotLabel("Opening", ["Opening", "Opening #2"])).toBe("Opening #3");
  });

  it("uses the stem when the source is already a copy", () => {
    expect(nextDuplicateSlotLabel("Opening #2", ["Opening", "Opening #2"])).toBe("Opening #3");
  });

  it("treats Track 1 as a full stem", () => {
    expect(nextDuplicateSlotLabel("Track 1", ["Track 1"])).toBe("Track 1 #2");
  });

  it("falls back to Track when the source label is empty", () => {
    expect(nextDuplicateSlotLabel("", ["Track 1"])).toBe("Track #2");
  });
});
