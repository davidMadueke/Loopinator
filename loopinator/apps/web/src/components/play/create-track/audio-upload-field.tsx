"use client";

import * as React from "react";
import { Button } from "@loopinator/ui/components/button";
import { FileUpload } from "@loopinator/ui/components/file-upload";
import { WavePlayer } from "@/components/waves-cn/wave-player";
import { LoopRegionField } from "./loop-region-field";
import { useLoopSnap } from "@/lib/use-loop-snap";
import { storedValueToSeconds } from "@/lib/loop-region-time";

const AUDIO_ACCEPT = {
  "audio/wav": [".wav"],
  "audio/mpeg": [".mp3"],
  "audio/x-wav": [".wav"],
} as const;

const MAX_AUDIO_FILE_SIZE = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type AudioUploadFieldProps = {
  file: File | null;
  inPoint: string;
  outPoint: string;
  onFileChange: (file: File | null) => void;
  onInPointChange: (value: string) => void;
  onOutPointChange: (value: string) => void;
};

/** WAV or MP3 upload. Filename comes from the file; Display name is separate. */
export function AudioUploadField({
  file,
  inPoint,
  outPoint,
  onFileChange,
  onInPointChange,
  onOutPointChange,
}: AudioUploadFieldProps) {
  const [duration, setDuration] = React.useState(0);
  const { snapLoopPoint } = useLoopSnap(file);

  React.useLayoutEffect(() => {
    if (duration <= 0) {
      return;
    }

    const inSeconds = storedValueToSeconds(inPoint, duration, "in");
    const outSeconds = storedValueToSeconds(outPoint, duration, "out");
    if (inSeconds <= outSeconds) {
      return;
    }

    onInPointChange(outPoint);
    onOutPointChange(inPoint);
  }, [duration, inPoint, onInPointChange, onOutPointChange, outPoint]);

  return (
    <div className="space-y-2">
      <FileUpload
        inputId="track-audio"
        accept={AUDIO_ACCEPT}
        value={file ? [file] : []}
        maxFiles={1}
        maxSize={MAX_AUDIO_FILE_SIZE}
        acceptedTypesLabel="WAV or MP3"
        onChange={(files) => onFileChange(files[0] ?? null)}
        renderOnSuccess={({ files, clear, open }) => {
          const audioFile = files[0];
          if (!audioFile) {
            return null;
          }

          return (
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {audioFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(audioFile.size)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={open}>
                    Replace
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clear}>
                    Remove
                  </Button>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <WavePlayer
                  className="p-2"
                  waveColor="var(--muted-foreground)"
                  progressColor="var(--primary)"
                  waveHeight={128}
                  src={audioFile}
                  onDurationChange={setDuration}
                  loopRegion={{
                    inPoint,
                    outPoint,
                    snapLoopPoint,
                    onInPointChange,
                    onOutPointChange,
                  }}
                />
                <LoopRegionField
                  inPoint={inPoint}
                  outPoint={outPoint}
                  duration={duration}
                  snapLoopPoint={snapLoopPoint}
                  onInPointChange={onInPointChange}
                  onOutPointChange={onOutPointChange}
                />
                <p className="text-xs text-muted-foreground">
                  Filename is kept for Advanced Options and the Library.
                </p>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
