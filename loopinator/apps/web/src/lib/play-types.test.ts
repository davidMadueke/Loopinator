import { describe, expect, it } from "bun:test";

import {
  DEFAULT_ORIGINAL_BPM,
  MAX_ORIGINAL_BPM,
  MIN_ORIGINAL_BPM,
  clampOriginalBpm,
  clampTargetBpmInBand,
  commitOriginalBpmInput,
  commitTargetBpmInput,
  resolveTargetBpmBand,
  sanitizeOriginalBpmDraft,
  scaleOriginalBpm,
  scaleTargetBpm,
  stepOriginalBpm,
  stepTargetBpm,
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

describe("scaleOriginalBpm", () => {
  it("doubles and halves inside the bounds", () => {
    expect(scaleOriginalBpm("60", 2)).toBe("120");
    expect(scaleOriginalBpm("120", 0.5)).toBe("60");
  });

  it("clamps Half/double at the bounds", () => {
    expect(scaleOriginalBpm(String(MAX_ORIGINAL_BPM), 2)).toBe(
      String(MAX_ORIGINAL_BPM),
    );
    expect(scaleOriginalBpm(String(MIN_ORIGINAL_BPM), 0.5)).toBe(
      String(MIN_ORIGINAL_BPM),
    );
  });
});

describe("three-band Target BPM", () => {
  it("resolves half, original, and double bands around Original BPM", () => {
    expect(resolveTargetBpmBand(120, 60)).toBe("half");
    expect(resolveTargetBpmBand(120, 120)).toBe("original");
    expect(resolveTargetBpmBand(120, 240)).toBe("double");
  });

  it("keeps typing and the stepper inside the current band", () => {
    expect(stepTargetBpm(120, 120, 30)).toBe(144);
    expect(stepTargetBpm(120, 144, 1)).toBe(144);
    expect(stepTargetBpm(120, 240, 50)).toBe(288);
    expect(commitTargetBpmInput(120, 120, "80")).toBe(96);
  });

  it("lets Half/double enter another band", () => {
    expect(scaleTargetBpm(120, 120, 2)).toBe(240);
    expect(scaleTargetBpm(120, 120, 0.5)).toBe(60);
    expect(scaleTargetBpm(120, 240, 0.5)).toBe(120);
    expect(clampTargetBpmInBand(120, 60, "half")).toBe(60);
  });
});
