import * as React from "react";

import { mixToMono } from "@/lib/loop-analysis/mono-mix";

import type { TrackAnalysisResult } from "./engine/types";
import type {
  TrackAnalysisRequest,
  TrackAnalysisResponse,
} from "./track-analysis-messages";

let nextRequestId = 1;
let workerInstance: Worker | null = null;
let workerLoad: Promise<Worker> | null = null;

function loadAnalysisWorker(): Promise<Worker> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Track analysis runs in the browser"));
  }

  if (workerInstance) {
    return Promise.resolve(workerInstance);
  }

  workerLoad ??= import("./track-analysis.worker.ts?worker").then((mod) => {
    workerInstance = new mod.default();
    return workerInstance;
  });

  return workerLoad;
}

async function analyzeDecodedBuffer(
  buffer: AudioBuffer,
): Promise<TrackAnalysisResult> {
  const worker = await loadAnalysisWorker();
  const requestId = nextRequestId;
  nextRequestId += 1;
  const samples = mixToMono(buffer);

  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<TrackAnalysisResponse>) => {
      if (event.data.requestId !== requestId) {
        return;
      }
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }
      resolve({ bpm: event.data.bpm, key: event.data.key });
    };

    const onError = (event: ErrorEvent) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      reject(
        event.error instanceof Error ? event.error : new Error(event.message),
      );
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);

    const request: TrackAnalysisRequest = {
      requestId,
      samples,
      sampleRate: buffer.sampleRate,
    };
    worker.postMessage(request, [samples.buffer]);
  });
}

export function useTrackAnalysis(buffer: AudioBuffer | null): {
  result: TrackAnalysisResult | null;
  isAnalyzing: boolean;
} {
  const [result, setResult] = React.useState<TrackAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  React.useEffect(() => {
    if (!buffer) {
      setResult(null);
      setIsAnalyzing(false);
      return;
    }

    let cancelled = false;
    setIsAnalyzing(true);
    setResult(null);

    void analyzeDecodedBuffer(buffer)
      .then((next) => {
        if (!cancelled) {
          setResult(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ bpm: null, key: null });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAnalyzing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [buffer]);

  return { result, isAnalyzing };
}
