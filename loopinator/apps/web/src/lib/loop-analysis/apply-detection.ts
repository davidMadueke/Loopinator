import { DEFAULT_TRACK_KEY, clampOriginalBpm, type TrackKey } from "@/lib/play-types";

import type { TrackAnalysisResult } from "./engine/types";

export type DetectionFormSlice = {
  originalBpm: string;
  bpmAutoDetected: boolean;
  key: TrackKey;
  keyAutoDetected: boolean;
  audioFile: File | null;
  inPoint: string;
  outPoint: string;
};

export function shouldWriteDetectedBpm(
  originalBpm: string,
  bpmAutoDetected: boolean,
): boolean {
  return originalBpm.trim() === "" || bpmAutoDetected;
}

export function shouldWriteDetectedKey(
  key: TrackKey,
  keyAutoDetected: boolean,
): boolean {
  return key.center === "No Key" || keyAutoDetected;
}

type WithDetectionSlice<T extends DetectionFormSlice> = Omit<
  T,
  keyof DetectionFormSlice
> &
  DetectionFormSlice;

export function applyDetectedAnalysis<T extends DetectionFormSlice>(
  form: T,
  detected: TrackAnalysisResult,
): WithDetectionSlice<T> {
  let next = form;

  if (
    detected.bpm &&
    shouldWriteDetectedBpm(form.originalBpm, form.bpmAutoDetected)
  ) {
    next = {
      ...next,
      originalBpm: String(clampOriginalBpm(detected.bpm.bpm)),
      bpmAutoDetected: true,
    };
  }

  if (detected.key && shouldWriteDetectedKey(next.key, next.keyAutoDetected)) {
    next = {
      ...next,
      key: detected.key.key,
      keyAutoDetected: true,
    };
  }

  return next;
}

export function resetAnalysisForNewFile<T extends DetectionFormSlice>(
  form: T,
  audioFile: File | null,
): WithDetectionSlice<T> {
  return {
    ...form,
    audioFile,
    inPoint: "",
    outPoint: "",
    originalBpm: "",
    bpmAutoDetected: false,
    key: DEFAULT_TRACK_KEY,
    keyAutoDetected: false,
  };
}
