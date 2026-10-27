import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@loopinator/ui/components/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@loopinator/ui/components/breadcrumb"
import { cn } from "@loopinator/ui/lib/utils";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SlashIcon,
  CloudIcon,
  CloudOffIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@loopinator/ui/components/dropdown-menu";

import { isSetlistCached } from "@/lib/audio";
import { DEMO_SETLISTS, DEMO_TRACKS } from "@/lib/dev/mock-data";
import { isTrackAudioCached } from "@/lib/offline-cache/audio-cache";
import {
  PLAY_UNAVAILABLE_COPY,
  playUnavailableState,
  type PlayLoadState,
  type Setlist,
  type Track,
} from "@/lib/play-types";
import { useAudioCacheRevision } from "@/hooks/use-audio-cache-revision";
import {
  selectEnableApiData,
  usePlaySourceStore,
} from "@/stores/play-source-store";
import type { LibraryTab } from "./library-panel";

type RouteBreadcrumbProps =
  | {
      variant: "track";
      trackLoadState: PlayLoadState;
      track?: Track;
      onOpenLibrary: (tab: LibraryTab) => void;
    }
  | {
      variant: "setlist";
      setlistLoadState: PlayLoadState;
      setlist?: Setlist;
      trackLoadState: PlayLoadState;
      slotIndex: number;
      onSlotChange: (index: number) => void;
      onOpenLibrary: (tab: LibraryTab) => void;
    };

function pickerLabel(
  entity: "track" | "setlist",
  loadState: PlayLoadState,
  readyLabel?: string,
) {
  if (loadState === "ready" && readyLabel != null) {
    return readyLabel;
  }
  return PLAY_UNAVAILABLE_COPY[entity][playUnavailableState(loadState)];
}

function pickerLabelClass(loadState: PlayLoadState) {
  if (loadState === "not-found") {
    return "text-destructive hover:text-destructive aria-expanded:text-destructive";
  }
  else if (loadState === "pending" || loadState === "ready")
  { 
    return "text-primary hover:text-primary-on-muted aria-expanded:text-primary-on-muted";
}}

export function RouteBreadcrumb(props: RouteBreadcrumbProps) {
  if (props.variant === "track") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 w-full">
        <Breadcrumb className="flex min-w-0 max-w-4/5 ">
          <BreadcrumbItem className="min-w-0">
          <TrackPicker
            currentTrack={props.track}
            loadState={props.trackLoadState}
            onOpenLibrary={props.onOpenLibrary}
          />
          </BreadcrumbItem>
        </Breadcrumb>
        {props.track ? (
          <CacheIndicator cached={props.track.cached} track={props.track} className="shrink-0" />
        ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 w-full">
        <div className="flex min-w-0 max-w-4/5 flex-1 items-center gap-4">
        <Breadcrumb className="flex min-w-0 ">
        <BreadcrumbList className="w-full flex-nowrap overflow-hidden">

          <BreadcrumbItem className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
          <SetlistPicker
            currentSetlist={props.setlist}
            loadState={props.setlistLoadState}
            onOpenLibrary={props.onOpenLibrary}
          />
          </div>
          </BreadcrumbItem>

          <BreadcrumbSeparator className="shrink-0">
            <SlashIcon className="size-6" />
          </BreadcrumbSeparator>

          <BreadcrumbItem className="min-w-0">
          <SlotPicker
            setlist={props.setlist}
            loadState={
              props.setlistLoadState === "ready"
                ? props.trackLoadState
                : props.setlistLoadState
            }
            slotIndex={props.slotIndex}
            onSlotChange={props.onSlotChange}
          />
          </BreadcrumbItem>

        </BreadcrumbList>
          </Breadcrumb>

          {props.setlist ? (
            <CacheIndicator cached={props.setlist.cached} setlist={props.setlist} className="shrink-0" />
          ) : null}
          </div>
          <SlotNavigator
            slotIndex={props.slotIndex}
            slotCount={props.setlist?.slots.length ?? 0}
            onSlotChange={props.onSlotChange}
          />
        </div>
    </div>
  );
}

function SetlistPicker({
  currentSetlist,
  loadState,
  onOpenLibrary,
}: {
  currentSetlist?: Setlist;
  loadState: PlayLoadState;
  onOpenLibrary: (tab: LibraryTab) => void;
}) {
  const unavailable = loadState !== "ready" || !currentSetlist;

  return (
    <PickerChip
      label={pickerLabel("setlist", loadState, currentSetlist?.name)}
      className={cn(
        "max-w-80 font-medium text-lg",
      pickerLabelClass(loadState),
      )}
      footer={
        <OpenFullLibraryItem onSelect={() => onOpenLibrary("Setlist")} />
      }
    >
      {DEMO_SETLISTS.map((setlist) => {
        const current = currentSetlist ? setlist.id === currentSetlist.id : false;

        return (
          <DropdownMenuItem
            key={setlist.id}
            render={<Link to="/s/$id" params={{ id: setlist.id }} />}
            aria-current={current ? "page" : undefined}
          >
            <CurrentMark current={current} />
            <span className="min-w-0 flex-1 truncate" title={setlist.name}>
              {setlist.name}
            </span>
          </DropdownMenuItem>
        );
      })}
    </PickerChip>
  );
}

function SlotPicker({
  setlist,
  loadState,
  slotIndex,
  onSlotChange,
}: {
  setlist?: Setlist;
  loadState: PlayLoadState;
  slotIndex: number;
  onSlotChange: (index: number) => void;
}) {
  const unavailable = loadState === "not-found";
  const slots = setlist?.slots ?? [];

  return (
    <PickerChip
      label={pickerLabel("track", loadState, slots[slotIndex]?.slotLabel)}
      className={cn(
        "min-w-24 max-w-56 text-lg",
        unavailable ? "text-destructive/50 hover:text-destructive aria-expanded:text-destructive" : null,
      )}
    >
      {slots.map((slot, index) => {
        const current = index === slotIndex;

        return (
          <DropdownMenuItem
            key={`${index}-${slot.trackId}`}
            onClick={() => onSlotChange(index)}
            aria-current={current ? "true" : undefined}
          >
            <CurrentMark current={current} />
            <span className="min-w-0 flex-1 truncate" title={slot.slotLabel}>
              {slot.slotLabel}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {slot.targetBpm} BPM · {slot.timeSignature}
            </span>
          </DropdownMenuItem>
        );
      })}
    </PickerChip>
  );
}

function TrackPicker({
  currentTrack,
  loadState,
  onOpenLibrary,
}: {
  currentTrack?: Track;
  loadState: PlayLoadState;
  onOpenLibrary: (tab: LibraryTab) => void;
}) {
  const unavailable = loadState !== "ready" || !currentTrack;

  return (
    <PickerChip
      label={pickerLabel("track", loadState, currentTrack?.displayName)}
      className={cn(
        "max-w-full font-medium text-lg",
        pickerLabelClass(loadState),
      )}
      footer={<OpenFullLibraryItem onSelect={() => onOpenLibrary("Track")} />}
    >
      {DEMO_TRACKS.map((track) => {
        const current = currentTrack ? track.id === currentTrack.id : false;

        return (
          <DropdownMenuItem
            key={track.id}
            render={<Link to="/t/$id" params={{ id: track.id }} />}
            aria-current={current ? "page" : undefined}
          >
            <CurrentMark current={current} />
            <span className="min-w-0 flex-1 truncate" title={track.displayName}>
              {track.displayName}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {track.originalBpm} BPM · {track.timeSignature}
            </span>
          </DropdownMenuItem>
        );
      })}
    </PickerChip>
  );
}

function SlotNavigator({
  slotIndex,
  slotCount,
  onSlotChange,
}: {
  slotIndex: number;
  slotCount: number;
  onSlotChange: (index: number) => void;
}) {
  return (
    <div className="flex shrink-0 ml-auto justify-end items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={slotIndex <= 0}
        onClick={() => onSlotChange(slotIndex - 1)}
        aria-label="Previous track"
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={slotIndex >= slotCount - 1}
        onClick={() => onSlotChange(slotIndex + 1)}
        aria-label="Next track"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

function PickerChip({
  label,
  className,
  contentClassName,
  children,
  footer,
}: {
  label: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button
                variant={"ghost"}
                className={cn("flex min-w-0 shrink max-w-80 ", className)}
                title={label}
              >
                <span className="min-w-0 truncate">{label}</span>
              <ChevronDownIcon data-icon="inline-end" className="size-3.5" /></Button>} />
            {/* The popup scrolls at --available-height already; capping at 20rem stops a
                long Library filling a tall viewport. */}
            <DropdownMenuContent
              align="start"
              className={cn(
                "flex max-h-[min(20rem,var(--available-height))] w-full flex-col overflow-y-hidden",
                contentClassName,
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DropdownMenuGroup>{children}</DropdownMenuGroup>
              </div>
              {footer}
            </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OpenFullLibraryItem({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="bg-popover">
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onSelect}>Open full Library</DropdownMenuItem>
    </div>
  );
}

function CurrentMark({ current }: { current: boolean }) {
  return (
    <CheckIcon
      aria-hidden
      className={cn("size-4 shrink-0 text-muted-foreground", current ? "opacity-100" : "opacity-0")}
    />
  );
}

function CacheIndicator({
  cached,
  className,
  track,
  setlist,
}: {
  cached: boolean;
  className?: string;
  track?: Track;
  setlist?: Setlist;
}) {
  const enableApi = usePlaySourceStore(selectEnableApiData);
  const revision = useAudioCacheRevision();
  const [liveCached, setLiveCached] = useState(cached);

  useEffect(() => {
    if (!enableApi) {
      setLiveCached(cached);
      return;
    }

    let cancelled = false;
    const check = setlist
      ? isSetlistCached(setlist)
      : track?.blobVersion != null
        ? isTrackAudioCached(track.id, track.blobVersion)
        : Promise.resolve(false);

    void check.then((value) => {
      if (!cancelled) {
        setLiveCached(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enableApi, cached, track, setlist, revision]);

  const shown = enableApi ? liveCached : cached;

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
      title={shown ? "Available offline" : "Not cached on this device"}
    >
      {shown ? <CloudIcon className="size-3.5" /> : <CloudOffIcon className="size-3.5" />}
      {shown ? "Cached" : "Online only"}
    </span>
  );
}
