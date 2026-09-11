import { describe, expect, it } from "bun:test";

import {
  applyDetectedAnalysis,
  resetAnalysisForNewFile,
  shouldWriteDetectedBpm,
  shouldWriteDetectedKey,
  type DetectionFormSlice,
} from "@/lib/loop-analysis/apply-detection";
import { DEFAULT_TRACK_KEY, type TrackKey } from "@/lib/play-types";

const emptyForm: DetectionFormSlice = {
  audioFile: null,
  originalBpm: "",
  bpmUnconfirmed: false,
  key: DEFAULT_TRACK_KEY,
  inPoint: "",
  outPoint: "",
};

const detectedBpm = {
  bpm: 128.4,
  confidence: 0.4,
  beatTimes: [0, 0.47],
  onsetTimes: [0],
};

const detectedKey: { key: TrackKey; confidence: number } = {
  key: { center: "G", scale: "major" },
  confidence: 0.82,
};

describe("shouldWriteDetectedBpm", () => {
  it("writes into an empty field", () => {
    expect(shouldWriteDetectedBpm("", false)).toBe(true);
  });

  it("overwrites an Unconfirmed BPM", () => {
    expect(shouldWriteDetectedBpm("120", true)).toBe(true);
  });

  it("keeps a confirmed value", () => {
    expect(shouldWriteDetectedBpm("120", false)).toBe(false);
  });
});

describe("shouldWriteDetectedKey", () => {
  it("fills No Key", () => {
    expect(shouldWriteDetectedKey(DEFAULT_TRACK_KEY)).toBe(true);
  });

  it("does not overwrite a filled Key", () => {
    expect(shouldWriteDetectedKey({ center: "C", scale: "minor" })).toBe(false);
  });
});

describe("applyDetectedAnalysis", () => {
  it("saves a low-confidence BPM as Unconfirmed BPM", () => {
    const next = applyDetectedAnalysis(emptyForm, {
      bpm: detectedBpm,
      key: null,
    });
    expect(next.originalBpm).toBe("128");
    expect(next.bpmUnconfirmed).toBe(true);
  });

  it("fills Key only while it is No Key", () => {
    const filled = applyDetectedAnalysis(emptyForm, {
      bpm: null,
      key: detectedKey,
    });
    expect(filled.key).toEqual({ center: "G", scale: "major" });

    const kept = applyDetectedAnalysis(
      { ...emptyForm, key: { center: "D", scale: "minor" } },
      { bpm: null, key: detectedKey },
    );
    expect(kept.key).toEqual({ center: "D", scale: "minor" });
  });

  it("does not overwrite a confirmed Original BPM", () => {
    const next = applyDetectedAnalysis(
      { ...emptyForm, originalBpm: "90", bpmUnconfirmed: false },
      { bpm: detectedBpm, key: null },
    );
    expect(next.originalBpm).toBe("90");
    expect(next.bpmUnconfirmed).toBe(false);
  });
});

describe("resetAnalysisForNewFile", () => {
  it("clears Unconfirmed BPM so the next pass can fill it", () => {
    const next = resetAnalysisForNewFile(
      {
        ...emptyForm,
        originalBpm: "128",
        bpmUnconfirmed: true,
        inPoint: "0:01",
        outPoint: "0:04",
      },
      null,
    );
    expect(next.originalBpm).toBe("");
    expect(next.bpmUnconfirmed).toBe(false);
    expect(next.inPoint).toBe("");
    expect(next.outPoint).toBe("");
  });

  it("keeps a confirmed Original BPM and a filled Key", () => {
    const file = new File(["x"], "loop.wav", { type: "audio/wav" });
    const next = resetAnalysisForNewFile(
      {
        ...emptyForm,
        originalBpm: "96",
        bpmUnconfirmed: false,
        key: { center: "A", scale: "minor" },
      },
      file,
    );
    expect(next.originalBpm).toBe("96");
    expect(next.bpmUnconfirmed).toBe(false);
    expect(next.key).toEqual({ center: "A", scale: "minor" });
    expect(next.audioFile).toBe(file);
  });
});
