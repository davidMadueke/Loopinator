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
  bpmAutoDetected: false,
  key: DEFAULT_TRACK_KEY,
  keyAutoDetected: false,
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

  it("overwrites an Auto-detected BPM", () => {
    expect(shouldWriteDetectedBpm("120", true)).toBe(true);
  });

  it("keeps an Editor-set value", () => {
    expect(shouldWriteDetectedBpm("120", false)).toBe(false);
  });
});

describe("shouldWriteDetectedKey", () => {
  it("fills No Key", () => {
    expect(shouldWriteDetectedKey(DEFAULT_TRACK_KEY, false)).toBe(true);
  });

  it("overwrites an Auto-detected Key", () => {
    expect(shouldWriteDetectedKey({ center: "C", scale: "minor" }, true)).toBe(true);
  });

  it("does not overwrite an Editor-set Key", () => {
    expect(shouldWriteDetectedKey({ center: "C", scale: "minor" }, false)).toBe(false);
  });
});

describe("applyDetectedAnalysis", () => {
  it("saves a low-confidence BPM as Auto-detected BPM", () => {
    const next = applyDetectedAnalysis(emptyForm, {
      bpm: detectedBpm,
      key: null,
    });
    expect(next.originalBpm).toBe("128");
    expect(next.bpmAutoDetected).toBe(true);
  });

  it("fills Key as Auto-detected Key while it is No Key", () => {
    const filled = applyDetectedAnalysis(emptyForm, {
      bpm: null,
      key: detectedKey,
    });
    expect(filled.key).toEqual({ center: "G", scale: "major" });
    expect(filled.keyAutoDetected).toBe(true);

    const kept = applyDetectedAnalysis(
      {
        ...emptyForm,
        key: { center: "D", scale: "minor" },
        keyAutoDetected: false,
      },
      { bpm: null, key: detectedKey },
    );
    expect(kept.key).toEqual({ center: "D", scale: "minor" });
    expect(kept.keyAutoDetected).toBe(false);
  });

  it("does not overwrite an Editor-set Original BPM", () => {
    const next = applyDetectedAnalysis(
      { ...emptyForm, originalBpm: "90", bpmAutoDetected: false },
      { bpm: detectedBpm, key: null },
    );
    expect(next.originalBpm).toBe("90");
    expect(next.bpmAutoDetected).toBe(false);
  });
});

describe("resetAnalysisForNewFile", () => {
  it("clears Auto-detected BPM, Key, and loop points", () => {
    const next = resetAnalysisForNewFile(
      {
        ...emptyForm,
        originalBpm: "128",
        bpmAutoDetected: true,
        key: { center: "A", scale: "minor" },
        keyAutoDetected: true,
        inPoint: "0:01",
        outPoint: "0:04",
      },
      null,
    );
    expect(next.originalBpm).toBe("");
    expect(next.bpmAutoDetected).toBe(false);
    expect(next.key).toEqual(DEFAULT_TRACK_KEY);
    expect(next.keyAutoDetected).toBe(false);
    expect(next.inPoint).toBe("");
    expect(next.outPoint).toBe("");
  });

  it("clears an Editor-set Original BPM and Key on replace", () => {
    const file = new File(["x"], "loop.wav", { type: "audio/wav" });
    const next = resetAnalysisForNewFile(
      {
        ...emptyForm,
        originalBpm: "96",
        bpmAutoDetected: false,
        key: { center: "A", scale: "minor" },
        keyAutoDetected: false,
      },
      file,
    );
    expect(next.originalBpm).toBe("");
    expect(next.bpmAutoDetected).toBe(false);
    expect(next.key).toEqual(DEFAULT_TRACK_KEY);
    expect(next.keyAutoDetected).toBe(false);
    expect(next.audioFile).toBe(file);
  });
});
