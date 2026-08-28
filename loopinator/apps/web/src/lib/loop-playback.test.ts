import { describe, expect, it } from "bun:test";

import { getLoopBounds, shouldWrapLoop } from "@/lib/loop-playback";

describe("loop-playback", () => {
  it("resolves in/out from m:ss strings", () => {
    const bounds = getLoopBounds("0:10", "0:13", 120);
    expect(bounds.in).toBe(10);
    expect(bounds.out).toBe(13);
  });

  it("wraps when playhead reaches out point", () => {
    const bounds = getLoopBounds("0:10", "0:13", 120);
    expect(shouldWrapLoop(12.97, 120, bounds)).toBe(false);
    expect(shouldWrapLoop(12.99, 120, bounds)).toBe(true);
  });

  it("wraps when playhead is before in point", () => {
    const bounds = getLoopBounds("0:10", "0:13", 120);
    expect(shouldWrapLoop(5, 120, bounds)).toBe(true);
  });
});
