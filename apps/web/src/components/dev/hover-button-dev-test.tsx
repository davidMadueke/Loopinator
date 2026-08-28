"use client";

import * as React from "react";
import { ArrowRight, Repeat } from "lucide-react";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";

/** Reveal transition is 300ms, so wait past it before measuring the settled size. */
const SETTLE_MS = 450;

type Axis = "width" | "height";

type Measurement = {
  axis: Axis;
  collapsed: number;
  expanded: number;
  baseline: number;
};

function settle() {
  return new Promise((resolve) => window.setTimeout(resolve, SETTLE_MS));
}

/** Measures along the layout axis: main size grows sideways unless the button stacks. */
function measure(element: HTMLElement): { axis: Axis; size: number } {
  const column = window
    .getComputedStyle(element)
    .flexDirection.startsWith("column");

  return column
    ? { axis: "height", size: element.offsetHeight }
    : { axis: "width", size: element.offsetWidth };
}

export function HoverButtonDevTest() {
  const [hovered, setHovered] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<Measurement | null>(null);

  const hoverButtonRef = React.useRef<HTMLButtonElement>(null);
  const plainButtonRef = React.useRef<HTMLButtonElement>(null);

  const runCheck = React.useCallback(async () => {
    const hoverButton = hoverButtonRef.current;
    const plainButton = plainButtonRef.current;
    if (!hoverButton || !plainButton) {
      return;
    }

    setRunning(true);

    setHovered(false);
    await settle();
    const collapsed = measure(hoverButton);

    setHovered(true);
    await settle();
    const expanded = measure(hoverButton);

    const baseline = measure(plainButton).size;

    console.log(
      `[hover-button-dev] collapsed ${collapsed.axis}=${collapsed.size}px`,
    );
    console.log(
      `[hover-button-dev] expanded ${expanded.axis}=${expanded.size}px`,
    );
    console.log(
      `[hover-button-dev] icon-only reference ${collapsed.axis}=${baseline}px`,
    );

    if (expanded.size <= collapsed.size) {
      console.error(
        `[hover-button-dev] FAIL expandedView does not change layout (${collapsed.size}px both states)`,
      );
    } else if (Math.abs(collapsed.size - baseline) > 1) {
      console.error(
        `[hover-button-dev] FAIL collapsed state leaks ${collapsed.size - baseline}px past the icon-only reference`,
      );
    } else {
      console.log(
        `[hover-button-dev] PASS ${collapsed.size}px collapsed, ${expanded.size}px expanded (+${expanded.size - collapsed.size}px)`,
      );
    }

    setResult({
      axis: collapsed.axis,
      collapsed: collapsed.size,
      expanded: expanded.size,
      baseline,
    });
    setRunning(false);
  }, []);

  React.useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const grows = result ? result.expanded > result.collapsed : false;
  const leak = result ? Math.abs(result.collapsed - result.baseline) <= 1 : false;
  const status = !result ? "running" : grows && leak ? "pass" : "fail";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-lg font-semibold">Hover button dev test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Measures the button along its layout axis with <code>hovered</code> set to
          false, then true, and logs both sizes to the console as{" "}
          <code>[hover-button-dev]</code>. Runs once on mount.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <HoverButton
          ref={hoverButtonRef}
          type="button"
          size="sm"
          variant="secondary"
          hovered={hovered}
          simpleView={<Repeat size={14} />}
          expandedView={<ArrowRight size={14} />}
          aria-label="Hover button under test"
        />
        <Button
          ref={plainButtonRef}
          type="button"
          size="sm"
          variant="secondary"
          aria-label="Icon-only reference"
        >
          <Repeat size={14} />
        </Button>
        <span className="text-xs text-muted-foreground">
          Left: under test (hovered = {String(hovered)}). Right: icon-only reference.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={running} onClick={() => void runCheck()}>
          {running ? "Measuring…" : "Re-run measurement"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setHovered((current) => !current)}
        >
          Toggle hovered manually
        </Button>
      </div>

      <div
        data-testid="hover-button-dev-result"
        data-status={status}
        className="space-y-1 rounded-lg border bg-muted/20 p-3 font-mono text-xs"
      >
        {result ? (
          <>
            <p>axis: {result.axis}</p>
            <p>collapsed: {result.collapsed}px</p>
            <p>expanded: {result.expanded}px</p>
            <p>icon-only reference: {result.baseline}px</p>
            <p className={status === "pass" ? "text-green-500" : "text-red-500"}>
              {status === "pass"
                ? `PASS grew by ${result.expanded - result.collapsed}px on hover`
                : grows
                  ? `FAIL collapsed state is ${result.collapsed - result.baseline}px wider than icon-only`
                  : "FAIL expandedView is always visible — size did not change"}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Measuring…</p>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">Real hover (no controlled prop)</h2>
        <HoverButton
          data-testid="hover-button-uncontrolled"
          type="button"
          size="sm"
          variant="ghost"
          className="text-xs"
          simpleView={<Repeat size={14} />}
          expandedView="Loop preview"
          aria-label="Uncontrolled hover button"
        />
      </div>
    </div>
  );
}
