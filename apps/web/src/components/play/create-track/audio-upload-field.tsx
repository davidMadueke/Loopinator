"use client";

import { Button } from "@loopinator/ui/components/button";
import { FileUpload } from "@loopinator/ui/components/file-upload";

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
  onFileChange: (file: File | null) => void;
};

/** WAV or MP3 upload. Filename comes from the file; Display name is separate. */
export function AudioUploadField({ file, onFileChange }: AudioUploadFieldProps) {
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
              <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3">
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
            </div>
          );
        }}
      />
    </div>
  );
}
