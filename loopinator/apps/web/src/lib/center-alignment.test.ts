import { describe, expect, it } from "bun:test";

import {
  boundingBoxFromRect,
  evaluateCenterAlignment,
  evaluateOpticalAlignment,
} from "@/lib/center-alignment";

function box(top: number, left: number, width: number, height: number) {
  return boundingBoxFromRect({
    top,
    left,
    right: left + width,
    bottom: top + height,
  });
}

describe("evaluateCenterAlignment", () => {
  it("passes when both children are vertically equidistant in the parent", () => {
    const parent = box(10, 20, 120, 24);
    const icon = box(16, 28, 12, 12);
    const text = box(14, 44, 72, 16);

    const report = evaluateCenterAlignment(
      parent,
      [
        { box: icon, label: "icon" },
        { box: text, label: "text" },
      ],
      { axis: "vertical" },
    );

    expect(report.pass).toBe(true);
    expect(report.children[0]).toMatchObject({ before: 6, after: 6, delta: 0, centered: true });
    expect(report.children[1]).toMatchObject({ before: 4, after: 4, delta: 0, centered: true });
  });

  it("fails when a child sits low in the parent", () => {
    const parent = box(0, 0, 100, 24);
    const icon = box(6, 8, 12, 12);
    const text = box(8, 24, 60, 12);

    const report = evaluateCenterAlignment(parent, [
      { box: icon, label: "icon" },
      { box: text, label: "text" },
    ]);

    expect(report.pass).toBe(false);
    expect(report.children[0].centered).toBe(true);
    expect(report.children[1]).toMatchObject({ before: 8, after: 4, delta: 4, centered: false });
  });

  it("fails when a child sits high in the parent", () => {
    const parent = box(0, 0, 100, 24);
    const icon = box(2, 8, 12, 12);
    const text = box(6, 24, 60, 12);

    const report = evaluateCenterAlignment(parent, [icon, text]);

    expect(report.pass).toBe(false);
    expect(report.children[0]).toMatchObject({ before: 2, after: 10, delta: -8, centered: false });
    expect(report.children[1].centered).toBe(true);
  });

  it("passes when both children are horizontally equidistant in the parent", () => {
    const parent = box(0, 0, 80, 24);
    const first = box(4, 30, 20, 16);
    const second = box(2, 20, 40, 20);

    const report = evaluateCenterAlignment(parent, [first, second], { axis: "horizontal" });

    expect(report.pass).toBe(true);
    expect(report.children[0]).toMatchObject({ before: 30, after: 30, delta: 0 });
    expect(report.children[1]).toMatchObject({ before: 20, after: 20, delta: 0 });
  });

  it("fails when a child is shifted on the horizontal axis", () => {
    const parent = box(0, 0, 80, 24);
    const first = box(4, 30, 20, 16);
    const second = box(2, 10, 40, 20);

    const report = evaluateCenterAlignment(parent, [first, second], { axis: "horizontal" });

    expect(report.pass).toBe(false);
    expect(report.children[1]).toMatchObject({ before: 10, after: 30, delta: -20, centered: false });
  });

  it("treats a subpixel miss as centered within the default 1px tolerance", () => {
    const parent = box(0, 0, 100, 24);
    const icon = box(6.4, 8, 12, 12);
    const text = box(6, 24, 60, 12);

    expect(evaluateCenterAlignment(parent, [icon, text]).pass).toBe(true);
    expect(evaluateCenterAlignment(parent, [icon, text], { tolerance: 0.5 }).pass).toBe(false);
  });
});

describe("evaluateOpticalAlignment", () => {
  it("passes when the icon visual center matches the text optical center and parent mid", () => {
    const report = evaluateOpticalAlignment({
      iconVisualCenterY: 12,
      textBaselineY: 16,
      textAscent: 8,
      parentTop: 0,
      parentBottom: 24,
    });

    expect(report.textOpticalCenterY).toBe(12);
    expect(report.parentMidY).toBe(12);
    expect(report.iconToBaselineDelta).toBe(-4);
    expect(report.iconToTextOpticalDelta).toBe(0);
    expect(report.iconToParentMidDelta).toBe(0);
    expect(report.pass).toBe(true);
  });

  it("fails when the icon visual center sits below the text optical center", () => {
    const report = evaluateOpticalAlignment({
      iconVisualCenterY: 15,
      textBaselineY: 16,
      textAscent: 8,
      parentTop: 0,
      parentBottom: 24,
    });

    expect(report.iconToTextOpticalDelta).toBe(3);
    expect(report.pass).toBe(false);
  });

  it("fails when the icon visual center is off the parent midline", () => {
    const report = evaluateOpticalAlignment({
      iconVisualCenterY: 14,
      textBaselineY: 18,
      textAscent: 8,
      parentTop: 0,
      parentBottom: 24,
    });

    expect(report.iconToTextOpticalDelta).toBe(0);
    expect(report.iconToParentMidDelta).toBe(2);
    expect(report.pass).toBe(false);
  });
});
