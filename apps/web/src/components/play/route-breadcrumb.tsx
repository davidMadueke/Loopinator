import type { ReactNode } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@loopinator/ui/components/dropdown-menu";

import { DEMO_SETLISTS, DEMO_TRACKS } from "@/lib/mock-data";
import type { Setlist, Track } from "@/lib/play-types";

type RouteBreadcrumbProps =
  | {
      variant: "track";
      track: Track;
    }
  | {
      variant: "setlist";
      setlist: Setlist;
      slotIndex: number;
      onSlotChange: (index: number) => void;
    };

export function RouteBreadcrumb(props: RouteBreadcrumbProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.variant === "setlist" ? (
        <div className="flex items-center gap-2 w-full">
        <div className="flex min-w-0 max-w-4/5 flex-1 items-center gap-4">
        <Breadcrumb className="flex min-w-0 ">
        <BreadcrumbList className="w-full flex-nowrap overflow-hidden">

          <BreadcrumbItem className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
          <SetlistPicker currentSetlist={props.setlist} />
          </div>
          </BreadcrumbItem>

          <BreadcrumbSeparator className="shrink-0">
            <SlashIcon className="size-6" />
          </BreadcrumbSeparator>

          <BreadcrumbItem className="min-w-0">
          <SlotPicker
            setlist={props.setlist}
            slotIndex={props.slotIndex}
            onSlotChange={props.onSlotChange}
          />
          </BreadcrumbItem>

        </BreadcrumbList>
          </Breadcrumb>

          <CacheIndicator cached={props.setlist.cached} className="shrink-0" />
          </div>
          <SlotNavigator
            slotIndex={props.slotIndex}
            slotCount={props.setlist.slots.length}
            onSlotChange={props.onSlotChange}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 w-full">
        <Breadcrumb className="flex min-w-0 max-w-4/5 ">
          <BreadcrumbItem className="min-w-0">
          <TrackPicker currentTrack={props.track} />
          </BreadcrumbItem>
        </Breadcrumb>
        <CacheIndicator cached={props.track.cached} className="shrink-0" />
        </div>
      )}
    </div>
  );
}

function SetlistPicker({ currentSetlist }: { currentSetlist: Setlist }) {
  return (
    <PickerChip
      label={currentSetlist.name}
      className="max-w-80 font-medium text-lg text-primary hover:text-primary"
      contentClassName="w-72"
    >
      {DEMO_SETLISTS.map((setlist) => {
        const current = setlist.id === currentSetlist.id;

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
  slotIndex,
  onSlotChange,
}: {
  setlist: Setlist;
  slotIndex: number;
  onSlotChange: (index: number) => void;
}) {
  return (
    <PickerChip
      label={setlist.slots[slotIndex]?.slotLabel ?? ""}
      className="min-w-24 max-w-56 text-lg "
      contentClassName="w-72"
    >
      {setlist.slots.map((slot, index) => {
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
              {slot.targetBpm} BPM
            </span>
          </DropdownMenuItem>
        );
      })}
    </PickerChip>
  );
}

function TrackPicker({ currentTrack }: { currentTrack: Track }) {
  return (
    <PickerChip
      label={currentTrack.displayName}
      className="max-w-full text-lg text-primary hover:text-primary"
      contentClassName="w-80"
    >
      {DEMO_TRACKS.map((track) => {
        const current = track.id === currentTrack.id;

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
}: {
  label: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button
                variant={"ghost"}
                className={cn("flex min-w-0 shrink max-w-80 font-medium text-lg text-primary hover:text-primary-on-muted aria-expanded:text-primary-on-muted", className)}
                title={label}
              >
                <span className="min-w-0 truncate">{label}</span>
              <ChevronDownIcon data-icon="inline-end" className="size-3.5" /></Button>} />
            {/* The popup scrolls at --available-height already; capping at 20rem stops a
                long Library filling a tall viewport. */}
            <DropdownMenuContent
              align="start"
              className={cn("max-h-[min(20rem,var(--available-height))]", contentClassName)}
            >
              <DropdownMenuGroup>{children}</DropdownMenuGroup>
            </DropdownMenuContent>
    </DropdownMenu>
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

function CacheIndicator({ cached, className }: { cached: boolean; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
      title={cached ? "Available offline" : "Not cached on this device"}
    >
      {cached ? <CloudIcon className="size-3.5" /> : <CloudOffIcon className="size-3.5" />}
      {cached ? "Cached" : "Online only"}
    </span>
  );
}
