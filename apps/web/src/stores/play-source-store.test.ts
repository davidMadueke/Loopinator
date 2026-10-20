import { afterEach, describe, expect, it } from "bun:test";

import {
  getEnableApiData,
  getEnableMockData,
  resolvePlaySource,
  usePlaySourceStore,
} from "./play-source-store";

afterEach(() => {
  usePlaySourceStore.setState({ source: "mock" });
});

describe("play source flags", () => {
  it("cannot read both flags as true from the store", () => {
    for (const stored of ["mock", "api"] as const) {
      usePlaySourceStore.setState({ source: stored });
      expect(getEnableMockData() && getEnableApiData()).toBe(false);
    }
  });

  it("forces API when the production build flag is off", () => {
    expect(resolvePlaySource("mock", false)).toBe("api");
    expect(resolvePlaySource("api", false)).toBe("api");
    expect(resolvePlaySource("mock", false) === "mock").toBe(false);
  });

  it("keeps the stored source in a dev build", () => {
    expect(resolvePlaySource("mock", true)).toBe("mock");
    expect(resolvePlaySource("api", true)).toBe("api");
  });
});
