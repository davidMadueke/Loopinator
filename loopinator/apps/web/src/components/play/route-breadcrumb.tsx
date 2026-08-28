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
        <Breadcrumb className="flex w-full ">
        <BreadcrumbList>

          <BreadcrumbItem>
          <BreadcrumbChip className="max-w-50 font-medium text-lg text-primary hover:text-primary" children={setlistName} />
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <SlashIcon className="size-6" />
          </BreadcrumbSeparator>

          <BreadcrumbItem >
          <BreadcrumbChip className="min-w-[96px] text-lg " children={slotLabel}/>
          </BreadcrumbItem>

        </BreadcrumbList>
          </Breadcrumb>
          
          <div className="flex w-full justify-end items-center gap-1">
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
        <Breadcrumb>
          <BreadcrumbItem >
          <BreadcrumbChip className="max-w-70 text-lg text-primary hover:text-primary" children={trackName}/>
          </BreadcrumbItem>
        </Breadcrumb>
        <CacheIndicator cached={cached} />
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
            <DropdownMenuTrigger render={<Button variant={"ghost"} className={`flex  ${className}`}>{children}
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
