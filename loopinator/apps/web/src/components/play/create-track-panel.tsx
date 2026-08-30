import { useEffect, useState } from "react";
import { Button } from "@loopinator/ui/components/button";

import { AudioUploadField } from "./create-track/audio-upload-field";
import { DisplayNameField } from "./create-track/display-name-field";
import { KeyField } from "./create-track/key-field";
import { OriginalBpmField } from "./create-track/original-bpm-field";
import { SongTitleField } from "./create-track/song-title-field";
import { TimeSignatureField } from "./create-track/time-signature-field";
import {
  hasCreateTrackProgress,
  INITIAL_CREATE_TRACK_FORM,
  type CreateTrackFormState,
} from "./create-form-state";

type CreateTrackPanelProps = {
  onProgressChange: (hasProgress: boolean) => void;
};

export function CreateTrackPanel({ onProgressChange }: CreateTrackPanelProps) {
  const [form, setForm] = useState<CreateTrackFormState>(INITIAL_CREATE_TRACK_FORM);

  useEffect(() => {
    onProgressChange(hasCreateTrackProgress(form));
  }, [form, onProgressChange]);

  return (
    <div className="pt-4">
      <div className="space-y-1 pb-4">
        <p className="text-sm text-muted-foreground text-center">
          Upload a WAV or MP3 and set the Track default Loop region and metadata.
        </p>
      </div>

      <div className="space-y-5">
        <AudioUploadField
          file={form.audioFile}
          inPoint={form.inPoint}
          outPoint={form.outPoint}
          onFileChange={(audioFile) =>
            setForm((current) => ({
              ...current,
              audioFile,
              inPoint: "",
              outPoint: "",
            }))
          }
          onInPointChange={(inPoint) => setForm((current) => ({ ...current, inPoint }))}
          onOutPointChange={(outPoint) => setForm((current) => ({ ...current, outPoint }))}
        />
        <DisplayNameField
          value={form.displayName}
          onChange={(displayName) => setForm((current) => ({ ...current, displayName }))}
        />
        <SongTitleField
          value={form.songTitle}
          onChange={(songTitle) => setForm((current) => ({ ...current, songTitle }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <OriginalBpmField
            value={form.originalBpm}
            onChange={(originalBpm) => setForm((current) => ({ ...current, originalBpm }))}
          />
          <TimeSignatureField
            value={form.timeSignature}
            onChange={(timeSignature) => setForm((current) => ({ ...current, timeSignature }))}
          />
        </div>
        <KeyField
          value={form.key}
          onChange={(key) => setForm((current) => ({ ...current, key }))}
        />
      </div>

      <div className="flex justify-end pt-6">
        <Button disabled>Upload Track</Button>
      </div>
    </div>
  );
}
