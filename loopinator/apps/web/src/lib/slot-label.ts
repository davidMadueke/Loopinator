/** Default Slot label from 0-based insert position. Track 1, Track 2, … */
export function defaultSlotLabel(insertIndex: number): string {
  return `Track ${insertIndex + 1}`;
}

/**
 * Duplicate-below numbering. A bare stem counts as #1. A trailing ` #n`
 * with n ≥ 2 is a copy. "Opening" copies to "Opening #2".
 */
export function parseSlotLabelCopy(label: string): { stem: string; n: number } {
  const match = /^(.*) #(\d+)$/.exec(label);
  if (match) {
    const n = Number(match[2]);
    if (n >= 2) {
      return { stem: match[1], n };
    }
  }
  return { stem: label, n: 1 };
}

export function nextDuplicateSlotLabel(sourceLabel: string, existingLabels: string[]): string {
  const { stem } = parseSlotLabelCopy(sourceLabel.trim() || "Track");
  const taken = new Set<number>();

  for (const label of existingLabels) {
    const parsed = parseSlotLabelCopy(label);
    if (parsed.stem === stem) {
      taken.add(parsed.n);
    }
  }

  let n = 2;
  while (taken.has(n)) {
    n += 1;
  }

  return `${stem} #${n}`;
}
