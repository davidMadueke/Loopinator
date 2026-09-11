import { describe, expect, it } from "bun:test";

import { isReloadShortcut } from "./is-reload-shortcut";

describe("isReloadShortcut", () => {
  it("treats F5 as reload", () => {
    expect(isReloadShortcut({ key: "F5", ctrlKey: false, metaKey: false })).toBe(true);
  });

  it("treats Ctrl+R and Cmd+R as reload", () => {
    expect(isReloadShortcut({ key: "r", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isReloadShortcut({ key: "R", ctrlKey: false, metaKey: true })).toBe(true);
  });

  it("leaves other keys alone", () => {
    expect(isReloadShortcut({ key: "r", ctrlKey: false, metaKey: false })).toBe(false);
    expect(isReloadShortcut({ key: "Escape", ctrlKey: true, metaKey: false })).toBe(false);
  });
});
