import { describe, expect, it } from "bun:test";

import {
  DEFAULT_ORIGINAL_BPM,
  MAX_ORIGINAL_BPM,
  MIN_ORIGINAL_BPM,
  clampOriginalBpm,
  commitOriginalBpmInput,
  sanitizeOriginalBpmDraft,
  stepOriginalBpm,
} from "@/lib/play-types";

describe("clampOriginalBpm", () => {
  it("clamps to the inclusive bounds", () => {
    expect(clampOriginalBpm(MIN_ORIGINAL_BPM - 1)).toBe(MIN_ORIGINAL_BPM);
    expect(clampOriginalBpm(MAX_ORIGINAL_BPM + 1)).toBe(MAX_ORIGINAL_BPM);
    expect(clampOriginalBpm(120)).toBe(120);
  });

  it("rounds to an integer", () => {
    expect(clampOriginalBpm(120.4)).toBe(120);
    expect(clampOriginalBpm(120.6)).toBe(121);
  });
});

describe("sanitizeOriginalBpmDraft", () => {
  it("keeps an empty field empty", () => {
    expect(sanitizeOriginalBpmDraft("")).toBe("");
  });

  it("allows values below min while typing", () => {
    expect(sanitizeOriginalBpmDraft("5")).toBe("5");
  });

  it("caps values above max immediately", () => {
    expect(sanitizeOriginalBpmDraft(String(MAX_ORIGINAL_BPM + 1))).toBe(
      String(MAX_ORIGINAL_BPM),
    );
  });

  it("rejects non-numeric input", () => {
    expect(sanitizeOriginalBpmDraft("e")).toBe(null);
  });
});

describe("commitOriginalBpmInput", () => {
  it("leaves empty as empty", () => {
    expect(commitOriginalBpmInput("")).toBe("");
    expect(commitOriginalBpmInput("  ")).toBe("");
  });

  it("clamps on commit", () => {
    expect(commitOriginalBpmInput("5")).toBe(String(MIN_ORIGINAL_BPM));
    expect(commitOriginalBpmInput(String(MAX_ORIGINAL_BPM + 1))).toBe(
      String(MAX_ORIGINAL_BPM),
    );
  });

  it("clears invalid values", () => {
    expect(commitOriginalBpmInput("nope")).toBe("");
  });
});

describe("stepOriginalBpm", () => {
  it("steps from the default when empty", () => {
    expect(stepOriginalBpm("", 1)).toBe(String(DEFAULT_ORIGINAL_BPM + 1));
    expect(stepOriginalBpm("", -1)).toBe(String(DEFAULT_ORIGINAL_BPM - 1));
  });

  it("stops at the bounds", () => {
    expect(stepOriginalBpm(String(MIN_ORIGINAL_BPM), -1)).toBe(
      String(MIN_ORIGINAL_BPM),
    );
    expect(stepOriginalBpm(String(MAX_ORIGINAL_BPM), 1)).toBe(
      String(MAX_ORIGINAL_BPM),
    );
  });
});
