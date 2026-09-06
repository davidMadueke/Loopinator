"use client";

import * as React from "react";

import { Button } from "@loopinator/ui/components/button";
import { cn } from "@loopinator/ui/lib/utils";

/* The dark: copies are not redundant. Several Button variants ship their own
   dark:hover: background, and the extra `:is(.dark *)` in that selector outweighs
   a bare hover: utility, so in dark mode the variant would win. Repeating the
   same modifiers lets tailwind-merge strip the variant's version instead. */
const HOVER_FILL =
  "hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground";

function useHovered() {
  const [hovered, setHovered] = React.useState(false);

  const onMouseEnter = React.useCallback(() => setHovered(true), []);
  const onMouseLeave = React.useCallback(() => setHovered(false), []);
  const onFocus = React.useCallback(() => setHovered(true), []);
  const onBlur = React.useCallback(() => setHovered(false), []);

  return { hovered, hoverProps: { onMouseEnter, onMouseLeave, onFocus, onBlur } };
}

type HoverButtonProps = React.ComponentProps<typeof Button> & {
  /** Always visible button content */
  simpleView: React.ReactNode;
  /** Content revealed beside the simple view while hovered or focused */
  expandedView: React.ReactNode;
  /** Classes for the revealed content, e.g. to change its leading gap */
  expandedClassName?: string;
  /** Overrides the internal hover state. For controlled use and dev tests. */
  hovered?: boolean;
};

function HoverButton({
  simpleView,
  expandedView,
  expandedClassName,
  hovered: hoveredProp,
  className,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...buttonProps
}: HoverButtonProps) {
  const { hovered: internalHovered, hoverProps } = useHovered();
  const hovered = hoveredProp ?? internalHovered;

  return (
    <Button
      data-slot="hover-button"
      data-hovered={hovered ? "" : undefined}
      {...buttonProps}
      className={cn(HOVER_FILL, "gap-0" , /* "h-fit", */ /* "py-1", */ className)}
      onMouseEnter={(event) => {
        hoverProps.onMouseEnter();
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        hoverProps.onMouseLeave();
        onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        hoverProps.onFocus();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        hoverProps.onBlur();
        onBlur?.(event);
      }}
    >
      <span data-slot="hover-button-simple" className="flex items-center self-stretch">
        {simpleView}
      </span>
      <span
        data-slot="hover-button-reveal"
        className={cn(
          "grid self-stretch transition-[grid-template-columns] duration-300 ease-out leading-none",
          hovered ? "grid-cols-[1fr]" : "grid-cols-[0fr]",
        )}
      >
        {/* The scroll container must be the grid item: a 0fr track resolves to the
            item's min-content width, and only overflow:hidden drives that to zero. */}
        <span className="h-full min-w-0 overflow-hidden">
          <span
            className={cn("flex h-full items-center whitespace-nowrap pl-1.5 ", expandedClassName)}
          >
            {expandedView}
          </span>
        </span>
      </span>
    </Button>
  );
}

export { HoverButton };
