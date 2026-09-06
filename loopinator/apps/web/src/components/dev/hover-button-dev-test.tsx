"use client";

import * as React from "react";
import { ArrowRight, LayersArrowDown, Repeat } from "lucide-react";
import { Button } from "@loopinator/ui/components/button";
import { HoverButton } from "@loopinator/ui/components/hover-button";

import {
  evaluateElementCenterAlignment,
  evaluateElementOpticalAlignment,
  type CenterAlignmentReport,
  type OpticalAlignmentReport,
} from "@/lib/center-alignment";

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

function formatChild(child: CenterAlignmentReport["children"][number]) {
  return `${child.label}: before=${child.before.toFixed(2)} after=${child.after.toFixed(2)} delta=${child.delta.toFixed(2)}`;
}

function formatOptical(report: OpticalAlignmentReport) {
  return [
    `iconCenter=${report.iconVisualCenterY.toFixed(2)}`,
    `baseline=${report.textBaselineY.toFixed(2)}`,
    `textOptical=${report.textOpticalCenterY.toFixed(2)}`,
    `parentMid=${report.parentMidY.toFixed(2)}`,
    `icon-baseline=${report.iconToBaselineDelta.toFixed(2)}`,
    `icon-textOptical=${report.iconToTextOpticalDelta.toFixed(2)}`,
    `icon-parentMid=${report.iconToParentMidDelta.toFixed(2)}`,
  ].join(" ");
}

export function HoverButtonDevTest() {
  const [hovered, setHovered] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<Measurement | null>(null);
  const [centerReport, setCenterReport] = React.useState<CenterAlignmentReport | null>(null);
  const [opticalReport, setOpticalReport] = React.useState<OpticalAlignmentReport | null>(null);

  const hoverButtonRef = React.useRef<HTMLButtonElement>(null);
  const plainButtonRef = React.useRef<HTMLButtonElement>(null);
  const centerButtonRef = React.useRef<HTMLButtonElement>(null);

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

    const centerButton = centerButtonRef.current;
    const simple = centerButton?.querySelector("[data-slot='hover-button-simple']");
    const reveal = centerButton?.querySelector("[data-slot='hover-button-reveal']");
    if (centerButton && simple && reveal) {
      const report = evaluateElementCenterAlignment(
        centerButton,
        [
          { element: simple, label: "icon" },
          { element: reveal, label: "text" },
        ],
        { axis: "vertical", ink: true },
      );
      console.log(
        `[hover-button-dev] center ${report.axis} ${report.pass ? "PASS" : "FAIL"} ${formatChild(report.children[0])} ${formatChild(report.children[1])}`,
      );
      setCenterReport(report);

      const optical = evaluateElementOpticalAlignment(centerButton, simple, reveal);
      console.log(
        `[hover-button-dev] optical ${optical.pass ? "PASS" : "FAIL"} ${formatOptical(optical)}`,
      );
      setOpticalReport(optical);
    } else {
      setCenterReport(null);
      setOpticalReport(null);
    }

    setRunning(false);
  }, []);

  React.useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const grows = result ? result.expanded > result.collapsed : false;
  const leak = result ? Math.abs(result.collapsed - result.baseline) <= 1 : false;
  const status = !result ? "running" : grows && leak ? "pass" : "fail";
  const centerStatus = !centerReport ? "running" : centerReport.pass ? "pass" : "fail";
  const opticalStatus = !opticalReport ? "running" : opticalReport.pass ? "pass" : "fail";

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

      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <HoverButton
          ref={centerButtonRef}
          data-testid="hover-button-center"
          type="button"
          size="xs"
          variant="outline"
          hovered
          simpleView={<LayersArrowDown />}
          expandedView="Expand all"
          aria-label="Center alignment fixture"
        />
        <span className="text-xs text-muted-foreground">
          xs Expand all, held open. Ink boxes must be centered. Icon visual center must line up
          with the text optical center (midpoint above the baseline).
        </span>
      </div>

      <div
        data-testid="hover-button-center-result"
        data-status={centerStatus}
        className="space-y-1 rounded-lg border bg-muted/20 p-3 font-mono text-xs"
      >
        {centerReport ? (
          <>
            <p>axis: {centerReport.axis}</p>
            <p>tolerance: {centerReport.tolerance}px</p>
            <p>{formatChild(centerReport.children[0])}</p>
            <p>{formatChild(centerReport.children[1])}</p>
            <p className={centerReport.pass ? "text-green-500" : "text-red-500"}>
              {centerReport.pass
                ? "PASS both children are equidistant in the parent"
                : "FAIL a child is not centered in the parent"}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Measuring…</p>
        )}
      </div>

      <div
        data-testid="hover-button-optical-result"
        data-status={opticalStatus}
        className="space-y-1 rounded-lg border bg-muted/20 p-3 font-mono text-xs"
      >
        {opticalReport ? (
          <>
            <p>icon visual center: {opticalReport.iconVisualCenterY.toFixed(2)}</p>
            <p>text baseline: {opticalReport.textBaselineY.toFixed(2)}</p>
            <p>text optical center: {opticalReport.textOpticalCenterY.toFixed(2)}</p>
            <p>parent mid: {opticalReport.parentMidY.toFixed(2)}</p>
            <p>icon minus baseline: {opticalReport.iconToBaselineDelta.toFixed(2)}</p>
            <p>icon minus text optical: {opticalReport.iconToTextOpticalDelta.toFixed(2)}</p>
            <p>icon minus parent mid: {opticalReport.iconToParentMidDelta.toFixed(2)}</p>
            <p className={opticalReport.pass ? "text-green-500" : "text-red-500"}>
              {opticalReport.pass
                ? "PASS icon visual center matches text optical center and parent mid"
                : "FAIL icon visual center is off the text optical center or parent mid"}
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
