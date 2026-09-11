import { clampOriginalBpm, type TrackKey } from "@/lib/play-types";

import type { TrackAnalysisResult } from "./engine/types";

export type DetectionFormSlice = {
  originalBpm: string;
  bpmUnconfirmed: boolean;
  key: TrackKey;
  audioFile: File | null;
  inPoint: string;
  outPoint: string;
};

export function shouldWriteDetectedBpm(
  originalBpm: string,
  bpmUnconfirmed: boolean,
): boolean {
  return originalBpm.trim() === "" || bpmUnconfirmed;
}

export function shouldWriteDetectedKey(key: TrackKey): boolean {
  return key.center === "No Key";
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
    shouldWriteDetectedBpm(form.originalBpm, form.bpmUnconfirmed)
  ) {
    next = {
      ...next,
      originalBpm: String(clampOriginalBpm(detected.bpm.bpm)),
      bpmUnconfirmed: true,
    };
  }

  if (detected.key && shouldWriteDetectedKey(next.key)) {
    next = { ...next, key: detected.key.key };
  }

  return next;
}

export function resetAnalysisForNewFile<T extends DetectionFormSlice>(
  form: T,
  audioFile: File | null,
): WithDetectionSlice<T> {
  const rewriteBpm = shouldWriteDetectedBpm(
    form.originalBpm,
    form.bpmUnconfirmed,
  );

  return {
    ...form,
    audioFile,
    inPoint: "",
    outPoint: "",
    originalBpm: rewriteBpm ? "" : form.originalBpm,
    bpmUnconfirmed: rewriteBpm ? false : form.bpmUnconfirmed,
  };
}
