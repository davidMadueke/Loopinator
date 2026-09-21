import { describe, expect, it } from "bun:test";

import { createFilterQuery, createFilterRule } from "@/components/reui/filters/filters-query";
import { filterLibraryTracks, isLibraryFilterRuleComplete } from "@/lib/play-filter-tracks";
import type { Track } from "@/lib/play-types";

function track(partial: Partial<Track> & Pick<Track, "id">): Track {
  return {
    displayName: partial.id,
    filename: `${partial.id}.wav`,
    originalBpm: 120,
    bpmAutoDetected: false,
    keyAutoDetected: false,
    key: "C",
    keyMode: "major",
    timeSignature: "4/4",
    cached: true,
    dev: true,
    ...partial,
  };
}

const tracks: Track[] = [
  track({ id: "c-maj-120", originalBpm: 120, key: "C", keyMode: "major", timeSignature: "4/4" }),
  track({ id: "g-min-90", originalBpm: 90, key: "G", keyMode: "minor", timeSignature: "6/8" }),
  track({ id: "nokey-140", originalBpm: 140, key: "No Key", keyMode: "major", timeSignature: "2/4" }),
  track({ id: "c-min-100", originalBpm: 100, key: "C", keyMode: "minor", timeSignature: "4/4" }),
];

function query(rules: ReturnType<typeof createFilterRule>[]) {
  return createFilterQuery(rules);
}

function rule(path: string, operator: string, value: unknown) {
  return createFilterRule({ id: path + operator, path: [path], operator, value });
}

describe("isLibraryFilterRuleComplete", () => {
  it("ignores a chip with no operator or value", () => {
    expect(isLibraryFilterRuleComplete(rule("targetBpm", "", undefined))).toBe(false);
    expect(isLibraryFilterRuleComplete(rule("timeSignature", "is_any_of", []))).toBe(false);
    expect(isLibraryFilterRuleComplete(rule("key", "is_any_of", []))).toBe(false);
  });

  it("treats a Key scale-only value as complete", () => {
    expect(isLibraryFilterRuleComplete(rule("key", "is_any_of", ["minor"]))).toBe(true);
  });
});

describe("filterLibraryTracks", () => {
  it("returns the same array when no complete chip is mounted", () => {
    const unfiltered = query([rule("timeSignature", "is_any_of", [])]);
    expect(filterLibraryTracks(tracks, unfiltered)).toBe(tracks);
  });

  it("matches Tempo against Original BPM, inclusive", () => {
    const filtered = filterLibraryTracks(
      tracks,
      query([rule("targetBpm", "between", [90, 120])]),
    );
    expect(filtered.map((item) => item.id)).toEqual(["c-maj-120", "g-min-90", "c-min-100"]);
  });

  it("ANDs every complete chip", () => {
    const filtered = filterLibraryTracks(
      tracks,
      query([
        rule("targetBpm", "between", [80, 130]),
        rule("timeSignature", "is_any_of", ["4/4"]),
      ]),
    );
    expect(filtered.map((item) => item.id)).toEqual(["c-maj-120", "c-min-100"]);
  });

  it("matches Key centers with any scale", () => {
    const filtered = filterLibraryTracks(
      tracks,
      query([rule("key", "is_any_of", ["C"])]),
    );
    expect(filtered.map((item) => item.id)).toEqual(["c-maj-120", "c-min-100"]);
  });

  it("matches Key scale with any center except No Key", () => {
    const filtered = filterLibraryTracks(
      tracks,
      query([rule("key", "is_any_of", ["major"])]),
    );
    expect(filtered.map((item) => item.id)).toEqual(["c-maj-120"]);
  });

  it("matches Key center and scale together", () => {
    const filtered = filterLibraryTracks(
      tracks,
      query([rule("key", "is_any_of", ["C minor"])]),
    );
    expect(filtered.map((item) => item.id)).toEqual(["c-min-100"]);
  });

  it("matches No Key and ignores scale", () => {
    const filtered = filterLibraryTracks(
      tracks,
      query([rule("key", "is_any_of", ["No Key"])]),
    );
    expect(filtered.map((item) => item.id)).toEqual(["nokey-140"]);
  });

  it("inverts Key with is none of", () => {
    const filtered = filterLibraryTracks(
      tracks,
      query([rule("key", "is_none_of", ["C"])]),
    );
    expect(filtered.map((item) => item.id)).toEqual(["g-min-90", "nokey-140"]);
  });

  it("can match nothing", () => {
    const filtered = filterLibraryTracks(
      tracks,
      query([rule("timeSignature", "is", "12/8")]),
    );
    expect(filtered).toEqual([]);
  });
});
