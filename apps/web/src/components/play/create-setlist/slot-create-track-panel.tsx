import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@loopinator/ui/components/button";

import { WavePlayer } from "@/components/waves-cn/wave-player";
import { applyDetectedAnalysis } from "@/lib/loop-analysis/apply-detection";
import { useTrackAnalysis } from "@/lib/loop-analysis/use-track-analysis";
import { storedValueToSeconds } from "@/lib/loop-region-time";
import { useLoopSnap } from "@/lib/use-loop-snap";

import { AudioUploadField } from "../create-track/audio-upload-field";
import { DisplayNameField } from "../create-track/display-name-field";
import { KeyField } from "../create-track/key-field";
import { LoopRegionField } from "../create-track/loop-region-field";
import { OriginalBpmField } from "../create-track/original-bpm-field";
import { TimeSignatureField } from "../create-track/time-signature-field";
import {
  hasCreateTrackProgress,
  INITIAL_CREATE_TRACK_FORM,
  resetCreateTrackForm,
  type CreateTrackFormState,
} from "../create-form-state";

type SlotCreateTrackPanelProps = {
  onProgressChange: (hasProgress: boolean) => void;
};

export function SlotCreateTrackPanel({ onProgressChange }: SlotCreateTrackPanelProps) {
  const [form, setForm] = useState<CreateTrackFormState>(INITIAL_CREATE_TRACK_FORM);
  const [duration, setDuration] = useState(0);
  const { snapLoopPoint, audioBuffer } = useLoopSnap(form.audioFile);
  const { result, isAnalyzing } = useTrackAnalysis(audioBuffer);

  const handleInPointChange = useCallback((inPoint: string) => {
    setForm((current) => ({ ...current, inPoint }));
  }, []);

  const handleOutPointChange = useCallback((outPoint: string) => {
    setForm((current) => ({ ...current, outPoint }));
  }, []);

  const handleOriginalBpmChange = useCallback((originalBpm: string) => {
    setForm((current) => ({
      ...current,
      originalBpm,
      bpmAutoDetected: false,
    }));
  }, []);

  const handleKeyChange = useCallback((key: CreateTrackFormState["key"]) => {
    setForm((current) => ({
      ...current,
      key,
      keyAutoDetected: false,
    }));
  }, []);

  useEffect(() => {
    onProgressChange(hasCreateTrackProgress(form));
  }, [form, onProgressChange]);

  useEffect(() => {
    if (!result) {
      return;
    }
    setForm((current) => applyDetectedAnalysis(current, result));
  }, [result]);

  useEffect(() => {
    setDuration(0);
  }, [form.audioFile]);

  useLayoutEffect(() => {
    if (duration <= 0) {
      return;
    }

    const inSeconds = storedValueToSeconds(form.inPoint, duration, "in");
    const outSeconds = storedValueToSeconds(form.outPoint, duration, "out");
    if (inSeconds <= outSeconds) {
      return;
    }

    handleInPointChange(form.outPoint);
    handleOutPointChange(form.inPoint);
  }, [
    duration,
    form.inPoint,
    form.outPoint,
    handleInPointChange,
    handleOutPointChange,
  ]);

  return (
    <div className="flex flex-col gap-5 pt-4 pb-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground text-center">
          Upload a WAV or MP3 and set the Track default Loop region and metadata.
        </p>
      </div>

      <AudioUploadField
        file={form.audioFile}
        onFileChange={(audioFile) => setForm(resetCreateTrackForm(audioFile))}
      />

      {form.audioFile ? (
        <div className="sticky top-0 z-10 bg-background py-2">
          <WavePlayer
            className="p-2"
            waveColor="var(--muted-foreground)"
            progressColor="var(--primary)"
            waveHeight={144}
            src={form.audioFile}
            audioBuffer={audioBuffer}
            displayName={form.displayName}
            timeSignature={form.timeSignature}
            bpm={form.originalBpm}
            bpmAutoDetected={form.bpmAutoDetected}
            trackKey={form.key}
            keyAutoDetected={form.keyAutoDetected}
            onDurationChange={setDuration}
            loopRegion={{
              inPoint: form.inPoint,
              outPoint: form.outPoint,
              snapLoopPoint,
              onInPointChange: handleInPointChange,
              onOutPointChange: handleOutPointChange,
            }}
          />
        </div>
      ) : null}

      {form.audioFile ? (
        <div className="space-y-3">
          <LoopRegionField
            inPoint={form.inPoint}
            outPoint={form.outPoint}
            duration={duration}
            snapLoopPoint={snapLoopPoint}
            onInPointChange={handleInPointChange}
            onOutPointChange={handleOutPointChange}
          />
          <p className="text-xs text-muted-foreground">
            Filename is kept for Advanced Options and the Library.
          </p>
        </div>
      ) : null}

      <DisplayNameField
        value={form.displayName}
        onChange={(displayName) => setForm((current) => ({ ...current, displayName }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <OriginalBpmField
          value={form.originalBpm}
          autoDetected={form.bpmAutoDetected}
          detecting={isAnalyzing}
          onChange={handleOriginalBpmChange}
        />
        <TimeSignatureField
          value={form.timeSignature}
          onChange={(timeSignature) => setForm((current) => ({ ...current, timeSignature }))}
        />
      </div>
      <KeyField
        value={form.key}
        autoDetected={form.keyAutoDetected}
        onChange={handleKeyChange}
      />

      <div className="flex justify-end">
        <Button disabled>Upload Track</Button>
      </div>
    </div>
  );
}
