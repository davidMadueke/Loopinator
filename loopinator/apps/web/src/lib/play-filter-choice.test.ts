import { describe, expect, it } from "bun:test";

import {
  slotKeyFilterValue,
  timeSignatureFromSlotFilterValue,
  trackKeyFromSlotFilterValue,
} from "./play-filter-choice";

const C_MAJOR = { center: "C" as const, scale: "major" as const };

describe("slotKeyFilterValue", () => {
  it("writes a centre plus scale", () => {
    expect(slotKeyFilterValue({ center: "D", scale: "minor" })).toBe("D minor");
  });

  it("drops scale for No Key", () => {
    expect(slotKeyFilterValue({ center: "No Key", scale: "major" })).toBe("No Key");
  });
});

describe("trackKeyFromSlotFilterValue", () => {
  it("reads a centre plus scale", () => {
    expect(trackKeyFromSlotFilterValue("G minor", C_MAJOR)).toEqual({
      center: "G",
      scale: "minor",
    });
  });

  it("keeps the current scale when the toggle has none", () => {
    expect(trackKeyFromSlotFilterValue("E", { center: "C", scale: "minor" })).toEqual({
      center: "E",
      scale: "minor",
    });
  });

  it("refuses an empty or scale-only value", () => {
    expect(trackKeyFromSlotFilterValue("", C_MAJOR)).toBeNull();
    expect(trackKeyFromSlotFilterValue("major", C_MAJOR)).toBeNull();
    expect(trackKeyFromSlotFilterValue([], C_MAJOR)).toBeNull();
  });

  it("forces major on No Key", () => {
    expect(trackKeyFromSlotFilterValue("No Key", { center: "C", scale: "minor" })).toEqual({
      center: "No Key",
      scale: "major",
    });
  });
});

describe("timeSignatureFromSlotFilterValue", () => {
  it("accepts a catalog meter", () => {
    expect(timeSignatureFromSlotFilterValue("6/8")).toBe("6/8");
  });

  it("refuses anything else", () => {
    expect(timeSignatureFromSlotFilterValue("5/4")).toBeNull();
    expect(timeSignatureFromSlotFilterValue(["4/4"])).toBeNull();
  });
});
