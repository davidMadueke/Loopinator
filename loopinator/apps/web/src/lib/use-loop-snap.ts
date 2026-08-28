import * as React from "react";
import {
  decodeAudioFile,
  decodeAudioUrl,
} from "@/lib/loop-analysis/decode-audio";
import { snapLoopPointToZeroCrossing } from "@/lib/loop-analysis/snap-loop-point";

type UseLoopSnapResult = {
  audioBuffer: AudioBuffer | null;
  isDecoding: boolean;
  decodeError: string | null;
  snapLoopPoint: ((seconds: number) => number) | null;
};

export function useLoopSnap(src: string | File | null): UseLoopSnapResult {
  const [audioBuffer, setAudioBuffer] = React.useState<AudioBuffer | null>(
    null,
  );
  const [isDecoding, setIsDecoding] = React.useState(false);
  const [decodeError, setDecodeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!src) {
      setAudioBuffer(null);
      setDecodeError(null);
      setIsDecoding(false);
      return;
    }

    let cancelled = false;
    setIsDecoding(true);
    setDecodeError(null);
    setAudioBuffer(null);

    const load = async () => {
      try {
        const buffer =
          typeof src === "string"
            ? await decodeAudioUrl(src)
            : await decodeAudioFile(src);

        if (!cancelled) {
          setAudioBuffer(buffer);
        }
      } catch (error) {
        if (!cancelled) {
          setDecodeError(
            error instanceof Error ? error.message : "Failed to decode audio",
          );
          setAudioBuffer(null);
        }
      } finally {
        if (!cancelled) {
          setIsDecoding(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [src]);

  const snapLoopPoint = React.useMemo(() => {
    if (!audioBuffer) {
      return null;
    }

    return (seconds: number) =>
      snapLoopPointToZeroCrossing(seconds, audioBuffer);
  }, [audioBuffer]);

  return {
    audioBuffer,
    isDecoding,
    decodeError,
    snapLoopPoint,
  };
}
