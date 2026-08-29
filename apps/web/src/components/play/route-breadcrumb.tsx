import type { ReactNode } from "react";

import { Button } from "@loopinator/ui/components/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@loopinator/ui/components/breadcrumb"
import { cn } from "@loopinator/ui/lib/utils";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SlashIcon,
  CloudIcon,
  CloudOffIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@loopinator/ui/components/dropdown-menu";

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
        <div className="flex items-center gap-2 w-full">
        <div className="flex min-w-0 max-w-4/5 flex-1 items-center gap-4">
        <Breadcrumb className="flex min-w-0 flex-1">
        <BreadcrumbList className="w-full flex-nowrap overflow-hidden">

          <BreadcrumbItem className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
          <BreadcrumbChip className="max-w-80 font-medium text-lg text-primary hover:text-primary" children={setlistName} />
          </div>
          </BreadcrumbItem>

          <BreadcrumbSeparator className="shrink-0">
            <SlashIcon className="size-6" />
          </BreadcrumbSeparator>

          <BreadcrumbItem className="min-w-0">
          <BreadcrumbChip className="min-w-24 max-w-56 text-lg " children={slotLabel}/>
          </BreadcrumbItem>

        {/* <BreadcrumbItem className="shrink-0">
          <CacheIndicator cached={cached} />
        </BreadcrumbItem> */}

        </BreadcrumbList>
          </Breadcrumb>

          <CacheIndicator cached={cached} className="shrink-0" />
          </div>
          <div className="flex shrink-0 ml-auto justify-end items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!canGoPrev}
              onClick={onPrev}
              aria-label="Previous track"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              className={""}
              size="icon-sm"
              disabled={!canGoNext}
              onClick={onNext}
              aria-label="Next track"
            >
              <ChevronRightIcon className=""/>
            </Button>
          </div>

          
        </div>
      ) : (
        <div className="flex items-center gap-2 w-full">
        <Breadcrumb className="flex min-w-0 max-w-4/5 flex-1">
          <BreadcrumbItem className="min-w-0">
          <BreadcrumbChip className="max-w-full text-lg text-primary hover:text-primary" children={trackName}/>
          </BreadcrumbItem>
        </Breadcrumb>
        <CacheIndicator cached={cached} className="shrink-0" />
        </div>
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
    <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button
                variant={"ghost"}
                className={cn("flex min-w-0 shrink max-w-40", className)}
                title={typeof children === "string" ? children : undefined}
              >
                <span className="min-w-0 truncate">{children}</span>
              <ChevronDownIcon data-icon="inline-end" className="size-3.5" /></Button>} />
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuItem>Documentation</DropdownMenuItem>
                <DropdownMenuItem>Themes</DropdownMenuItem>
                <DropdownMenuItem>GitHub</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
    </DropdownMenu>
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
