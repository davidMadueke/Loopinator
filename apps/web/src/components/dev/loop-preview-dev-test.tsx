"use client";

import * as React from "react";
import { Button } from "@loopinator/ui/components/button";
import { Input } from "@loopinator/ui/components/input";
import { Label } from "@loopinator/ui/components/label";
import { WavePlayer } from "@/components/waves-cn/wave-player";
import {
  formatLoopTime,
  storedValueToSeconds,
} from "@/lib/loop-region-time";
import { getLoopBounds } from "@/lib/loop-playback";

/** Sample in apps/web/public — upload manually if the file is missing. */
export const DEV_LOOP_SAMPLE_FILENAME =
  "25082026_01_RNB_TRAP_SAMPLE [DAVID - THINK ABOUT US] B MIN 136 BPM mk2.mp3";

export const DEV_LOOP_SAMPLE_URL = `/${encodeURI(DEV_LOOP_SAMPLE_FILENAME)}`;

const LOG_INTERVAL_MS = 100;
const DEFAULT_IN_POINT = "0:10";
/** Three-second loop starting at in-point (0:10 → 0:13). */
const DEFAULT_OUT_POINT = "0:13";

type LogEntry = {
  at: string;
  time: number;
  loopIn: number;
  loopOut: number;
  playing: boolean;
  note?: string;
};

export function LoopPreviewDevTest() {
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [usePublicSample, setUsePublicSample] = React.useState(true);
  const [inPoint, setInPoint] = React.useState(DEFAULT_IN_POINT);
  const [outPoint, setOutPoint] = React.useState(DEFAULT_OUT_POINT);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [wrapCount, setWrapCount] = React.useState(0);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);

  const lastTimeRef = React.useRef(0);
  const wrapCountRef = React.useRef(0);

  const loopIn = storedValueToSeconds(inPoint, duration, "in");
  const loopOut = storedValueToSeconds(outPoint, duration, "out");

  const appendLog = React.useCallback(
    (time: number, note?: string) => {
      const entry: LogEntry = {
        at: new Date().toISOString().slice(11, 23),
        time,
        loopIn,
        loopOut,
        playing: isPlaying,
        note,
      };

      const line = `[loop-dev] t=${formatLoopTime(time)} (${time.toFixed(3)}s) in=${formatLoopTime(loopIn)} out=${formatLoopTime(loopOut)}${note ? ` | ${note}` : ""}`;
      console.log(line);

      setLogs((current) => [entry, ...current].slice(0, 80));
    },
    [isPlaying, loopIn, loopOut],
  );

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const time = currentTime;
      const bounds = duration > 0 ? getLoopBounds(inPoint, outPoint, duration) : null;

      if (bounds && time < lastTimeRef.current - 0.5 && lastTimeRef.current >= bounds.out - 0.1) {
        wrapCountRef.current += 1;
        setWrapCount(wrapCountRef.current);
        appendLog(time, `WRAP detected → ${formatLoopTime(bounds.in)} (count=${wrapCountRef.current})`);
      }

      lastTimeRef.current = time;
      appendLog(time);
    }, LOG_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [appendLog, currentTime, duration, inPoint, outPoint]);

  const audioSrc = usePublicSample && !audioFile ? DEV_LOOP_SAMPLE_URL : audioFile;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-lg font-semibold">Loop preview dev test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Logs playhead every {LOG_INTERVAL_MS}ms to the console. Default loop: in{" "}
          <code>{DEFAULT_IN_POINT}</code>, out <code>{DEFAULT_OUT_POINT}</code> (3s region).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={usePublicSample && !audioFile ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setAudioFile(null);
            setUsePublicSample(true);
            setWrapCount(0);
            wrapCountRef.current = 0;
            setLogs([]);
          }}
        >
          Use public sample
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <span className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
            Upload audio
          </span>
          <input
            type="file"
            accept="audio/mpeg,audio/wav"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setAudioFile(file);
              setUsePublicSample(false);
              setWrapCount(0);
              wrapCountRef.current = 0;
              setLogs([]);
            }}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setLogs([]);
            setWrapCount(0);
            wrapCountRef.current = 0;
          }}
        >
          Clear log
        </Button>
      </div>

      <p className="text-xs text-muted-foreground break-all">
        Public URL: <code>{DEV_LOOP_SAMPLE_URL}</code>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dev-in">In-point (m:ss)</Label>
          <Input
            id="dev-in"
            value={inPoint}
            onChange={(event) => setInPoint(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dev-out">Out-point (m:ss)</Label>
          <Input
            id="dev-out"
            value={outPoint}
            onChange={(event) => setOutPoint(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/20 p-3 text-xs font-mono space-y-1">
        <p>Duration: {duration > 0 ? `${formatLoopTime(duration)} (${duration.toFixed(3)}s)` : "—"}</p>
        <p>
          Resolved bounds: in {loopIn.toFixed(3)}s · out {loopOut.toFixed(3)}s · length{" "}
          {(loopOut - loopIn).toFixed(3)}s
        </p>
        <p>Wraps detected (playhead jumped back near out): {wrapCount}</p>
        <p className={wrapCount > 0 ? "text-green-500" : "text-amber-500"}>
          {wrapCount > 0
            ? "Loop wrap observed — check console for [loop-dev] lines."
            : "No wrap yet — press Play with Loop preview ON and wait past out-point."}
        </p>
      </div>

      {audioSrc ? (
        <WavePlayer
          src={audioSrc}
          title={audioFile?.name ?? DEV_LOOP_SAMPLE_FILENAME}
          onDurationChange={setDuration}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(time) => setCurrentTime(time)}
          loopRegion={{
            inPoint,
            outPoint,
            onInPointChange: setInPoint,
            onOutPointChange: setOutPoint,
          }}
        />
      ) : (
        <p className="text-sm text-destructive">No audio source — upload a file or add the sample to public/.</p>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Recent log (newest first)</h2>
        <div className="max-h-64 overflow-y-auto rounded-md border bg-background p-2 font-mono text-[10px] leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">Waiting for interval logs…</p>
          ) : (
            logs.map((entry, index) => (
              <div key={`${entry.at}-${index}`} className={entry.note ? "text-green-500" : undefined}>
                {entry.at} t={entry.time.toFixed(3)}s in={entry.loopIn.toFixed(1)} out=
                {entry.loopOut.toFixed(1)}
                {entry.note ? ` — ${entry.note}` : ""}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
