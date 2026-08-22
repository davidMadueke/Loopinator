import type { ReactNode } from "react";

import { Button } from "@loopinator/ui/components/button";
import { cn } from "@loopinator/ui/lib/utils";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudIcon,
  CloudOffIcon,
} from "lucide-react";

type RouteBreadcrumbProps = {
  variant: "setlist" | "track";
  setlistName?: string;
  slotLabel?: string;
  trackName: string;
  cached: boolean;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
};

export function RouteBreadcrumb({
  variant,
  setlistName,
  slotLabel,
  trackName,
  cached,
  canGoPrev = false,
  canGoNext = false,
  onPrev,
  onNext,
}: RouteBreadcrumbProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {variant === "setlist" && setlistName ? (
        <>
          <BreadcrumbChip className="max-w-50">{setlistName}</BreadcrumbChip>
          <BreadcrumbChip className="w-auto min-w-[96px]">{slotLabel}</BreadcrumbChip>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canGoPrev}
              onClick={onPrev}
              aria-label="Previous track"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canGoNext}
              onClick={onNext}
              aria-label="Next track"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </>
      ) : (
        <>
          <BreadcrumbChip className="max-w-[280px]">{trackName}</BreadcrumbChip>
          <CacheIndicator cached={cached} />
        </>
      )}
    </div>
  );
}

function BreadcrumbChip({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-fit items-center justify-between gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-sm whitespace-nowrap",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

function CacheIndicator({ cached }: { cached: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      title={cached ? "Available offline" : "Not cached on this device"}
    >
      {cached ? <CloudIcon className="size-3.5" /> : <CloudOffIcon className="size-3.5" />}
      {cached ? "Cached" : "Online only"}
    </span>
  );
}
