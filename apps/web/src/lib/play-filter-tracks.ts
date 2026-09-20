import { flattenFilterRules } from "@/components/reui/filters/filters-query";
import type { FilterQuery, FilterRule } from "@/components/reui/filters/filters-types";
import { parseKeyFilterValue } from "@/lib/play-filter-choice";
import type { Track } from "@/lib/play-types";

function fieldId(rule: FilterRule): string {
  return rule.path[0] ?? "";
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function readBpmRange(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const from = Number(value[0]);
  const to = Number(value[1]);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return from <= to ? [from, to] : [to, from];
}

function readBpm(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function isLibraryFilterRuleComplete(rule: FilterRule): boolean {
  if (!rule.operator) return false;

  const field = fieldId(rule);
  if (field === "targetBpm") {
    if (rule.operator === "empty" || rule.operator === "not_empty") return true;
    if (rule.operator === "between" || rule.operator === "not_between") {
      return readBpmRange(rule.value) !== null;
    }
    return readBpm(rule.value) !== null;
  }

  if (field === "timeSignature") {
    return asStrings(rule.value).length > 0;
  }

  if (field === "key") {
    const { centers, scale } = parseKeyFilterValue(rule.value);
    return centers.length > 0 || Boolean(scale);
  }

  return false;
}

function trackMatchesKey(track: Track, value: unknown): boolean {
  const { centers, scale } = parseKeyFilterValue(value);
  if (track.key === "No Key") {
    return centers.includes("No Key");
  }
  const centerOk = centers.length === 0 || centers.includes(track.key);
  const scaleOk = !scale || track.keyMode === scale;
  return centerOk && scaleOk;
}

function trackMatchesTimeSignature(track: Track, value: unknown): boolean {
  return asStrings(value).includes(track.timeSignature);
}

function trackMatchesTempo(track: Track, operator: string, value: unknown): boolean | null {
  const bpm = track.originalBpm;

  if (operator === "empty") return !Number.isFinite(bpm);
  if (operator === "not_empty") return Number.isFinite(bpm);

  if (operator === "between" || operator === "not_between") {
    const range = readBpmRange(value);
    if (!range) return null;
    const inside = bpm >= range[0] && bpm <= range[1];
    return operator === "between" ? inside : !inside;
  }

  const bound = readBpm(value);
  if (bound === null) return null;
  if (operator === "eq") return bpm === bound;
  if (operator === "neq") return bpm !== bound;
  if (operator === "gt") return bpm > bound;
  if (operator === "gte") return bpm >= bound;
  if (operator === "lt") return bpm < bound;
  if (operator === "lte") return bpm <= bound;
  return null;
}

function trackMatchesRule(track: Track, rule: FilterRule): boolean {
  const field = fieldId(rule);
  let matches = false;

  if (field === "targetBpm") {
    const tempo = trackMatchesTempo(track, rule.operator, rule.value);
    if (tempo === null) return true;
    matches = tempo;
  } else if (field === "timeSignature") {
    matches = trackMatchesTimeSignature(track, rule.value);
  } else if (field === "key") {
    matches = trackMatchesKey(track, rule.value);
  } else {
    return true;
  }

  if (rule.operator === "is_not" || rule.operator === "is_none_of") {
    matches = !matches;
  }
  if (rule.negated) matches = !matches;
  return matches;
}

export function filterLibraryTracks(tracks: Track[], query: FilterQuery): Track[] {
  const complete = flattenFilterRules(query).filter(isLibraryFilterRuleComplete);
  if (complete.length === 0) return tracks;
  return tracks.filter((track) => complete.every((rule) => trackMatchesRule(track, rule)));
}
