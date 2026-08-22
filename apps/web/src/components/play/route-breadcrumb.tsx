import { Button } from "@loopinator/ui/components/button";
import { SelectTrigger } from "@loopinator/ui/components/select";
import { ChevronLeftIcon, ChevronRightIcon, CloudOffIcon, CloudIcon } from "lucide-react";

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
          <SelectTrigger className="max-w-50 pointer-events-none opacity-100">
            {setlistName}
          </SelectTrigger>
          <SelectTrigger className="w-auto min-w-[96px] pointer-events-none opacity-100">
            {slotLabel}
          </SelectTrigger>
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
          <SelectTrigger className="max-w-[280px] pointer-events-none opacity-100">
            {trackName}
          </SelectTrigger>
          <CacheIndicator cached={cached} />
        </>
      )}
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
