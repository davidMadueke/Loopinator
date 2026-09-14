import {
  KEY_CENTERS,
  TIME_SIGNATURES,
  type KeyCenter,
  type KeyScale,
  type TimeSignature,
  type TrackKey,
} from "@/lib/play-types";

export type KeyFilterSelection = {
  centers: string[];
  scale: KeyScale | "";
};

export function parseKeyToken(token: string): { center: string; scale: KeyScale | "" } {
  if (token === "major" || token === "minor") return { center: "", scale: token };
  if (token.endsWith(" major")) return { center: token.slice(0, -" major".length), scale: "major" };
  if (token.endsWith(" minor")) return { center: token.slice(0, -" minor".length), scale: "minor" };
  return { center: token, scale: "" };
}

export function parseKeyFilterValue(value: unknown): KeyFilterSelection {
  const tokens = Array.isArray(value)
    ? (value as string[])
    : typeof value === "string" && value
      ? [value]
      : [];
  const centers: string[] = [];
  let scale: KeyScale | "" = "";
  for (const token of tokens) {
    const parsed = parseKeyToken(token);
    if (parsed.center && !centers.includes(parsed.center)) centers.push(parsed.center);
    if (parsed.scale) scale = parsed.scale;
  }
  return { centers, scale };
}

export function serializeKeyFilterValue(centers: string[], scale: KeyScale | ""): string[] {
  if (centers.length === 0) return scale ? [scale] : [];
  return centers.map((center) =>
    !scale || center === "No Key" ? center : `${center} ${scale}`,
  );
}

export function formatKeyFilterText(centers: string[], scale: KeyScale | ""): string {
  const scaleLabel = scale === "major" ? "Major" : scale === "minor" ? "Minor" : "";
  if (centers.length === 0) return scaleLabel ? `any ${scaleLabel}` : "any key";
  const extra = centers.length > 1 ? ` +${centers.length - 1}` : "";
  return scaleLabel ? `${centers[0]}${extra} ${scaleLabel}` : `${centers[0]}${extra}`;
}

/** One Key as a Choice operator **is** value: `"D major"` or `"No Key"`. */
export function slotKeyFilterValue(key: TrackKey): string {
  const [token] = serializeKeyFilterValue(
    [key.center],
    key.center === "No Key" ? "" : key.scale,
  );
  return token ?? "No Key";
}

export function trackKeyFromSlotFilterValue(
  value: unknown,
  fallback: TrackKey,
): TrackKey | null {
  const { centers, scale } = parseKeyFilterValue(value);
  const center = centers[0];
  if (!center || !KEY_CENTERS.includes(center as KeyCenter)) {
    return null;
  }
  if (center === "No Key") {
    return { center: "No Key", scale: "major" };
  }
  return {
    center: center as KeyCenter,
    scale: scale === "major" || scale === "minor" ? scale : fallback.scale,
  };
}

export function timeSignatureFromSlotFilterValue(value: unknown): TimeSignature | null {
  if (typeof value !== "string") return null;
  return TIME_SIGNATURES.includes(value as TimeSignature) ? (value as TimeSignature) : null;
}
