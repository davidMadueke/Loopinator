# UI frontend testing

Layout checks for `@loopinator/ui` components that jsdom cannot see. The first subject is **HoverButton**: an icon that stays put, plus a label that reveals on hover. The boxes can sit in the middle of the button and the pair can still look wrong.

Domain terms live in [../../CONTEXT.md](../../CONTEXT.md). Play screen layout lives in [../../apps/web/CONTEXT.md](../../apps/web/CONTEXT.md).

## Language

**HoverButton**:
A button that always shows a simple view and reveals an expanded view beside it on hover or focus.
_Avoid_: Icon button, expand button

**Simple view**:
The content that stays visible. On Expand all / Collapse all this is the icon.
_Avoid_: Idle state, collapsed content

**Expanded view**:
The content revealed beside the simple view. On those same controls this is the label text.
_Avoid_: Hover label, tooltip

**Layout box**:
`getBoundingClientRect()` of the element, including padding and stretched wrappers.
_Avoid_: Offset box, client rect (without saying which)

**Ink box**:
The painted glyphs or SVG, not the wrapper. Use this when a child stretches to the parent; that wrapper would always look centered.
_Avoid_: Visual box, content box

**Equidistance**:
A child is centered on one axis when its two opposite gaps to the parent match. Vertical: top gap equals bottom gap. Horizontal: left gap equals right gap.

**Visual center**:
The midpoint of the SVG’s tight painted geometry (`getBBox`), not the 24×24 viewBox. Lucide icons sit inside padding, so the viewBox center is a lie.
_Avoid_: Bounding-box center, viewBox center

**Text baseline**:
The alphabetic baseline of the label, measured with an inline probe on the same line as the text.

**Text optical center**:
Halfway from the text baseline up the actual ink ascent. That is the line an icon’s visual center should meet.
_Avoid_: Ink-box center, cap-height center

## Why Chrome

`bun:test` plus jsdom has no layout engine. Every `offsetWidth` there is 0, so a HoverButton that is stuck expanded looks identical to one that is not. Real checks go through a page and headless Chrome.

The math is still unit-tested with synthetic boxes. Chrome is only for coordinates that came from a real layout.

## What we check

Three layers. The first two can pass while the third still fails, which is why they are separate.

| Check | Question | Pass |
|---|---|---|
| Reveal layout | Does the expanded view change the button’s size? | Expanded size is larger than collapsed, and collapsed matches an icon-only reference within 1px |
| Box centering | Are both children’s ink boxes equidistant in the parent? | Each child’s opposite gaps match within 1px |
| Optical alignment | Do the icon’s visual center and the text optical center share a line, and does that line hit the parent mid? | Both deltas within 1px |

The optical check also reports **icon minus baseline**. That number should stay a few pixels, not zero. A Lucide mark’s center sits above the alphabetic baseline. Forcing those two onto the same Y would drop the icon into the text.

Tolerance is 1 CSS pixel. Subpixel rounding on a 24px `xs` button is normal.

## Same-frame rule

Read the parent, the icon, and the text in one synchronous turn. A `setState` plus `await` in the middle lets React paint a result panel above the fixture. The button moves, and you end up comparing an icon Y from before the shift to a baseline Y from after it. That showed up as an 80px “fail” that was just the page growing.

`evaluateElementOpticalAlignment` is sync for that reason. The optional pixel-centroid helper is async and stale if anything above the fixture re-renders while the image loads.

## Live fixture

`/dev/hover-button` holds an `xs` outline HoverButton, forced open: LayersArrowDown plus “Expand all”. That is the Library Tracks tab control.

Last Chrome run on that fixture:

| Measure | px |
|---|---|
| Icon visual center | 416 |
| Text baseline | 420 |
| Text optical center | 415.5 |
| Parent mid | 416 |
| Icon minus text optical | 0.5 |
| Icon minus parent mid | 0 |

Box centering also passed: icon 6px / 6px, text 5px / 5px.

## How to run

Dev server already up (`bun run dev:web`). Then from `apps/web`:

```bash
bun test ./src/lib/center-alignment.test.ts
```

From the repo root, after the page has compiled:

```bash
bun scripts/check-hover-button.ts http://localhost:3001/dev/hover-button
```

The script opens headless Chrome, reads `[data-testid="hover-button-dev-result"]`, `[data-testid="hover-button-center-result"]`, and `[data-testid="hover-button-optical-result"]`, then moves a real cursor over the uncontrolled HoverButton to confirm hover, not only the `hovered` prop.

Set `HOVER_BUTTON_SCREENSHOT_DIR` if you want away/over PNGs.

## File layout

```
packages/ui/src/components/hover-button.tsx
apps/web/src/lib/center-alignment.ts
apps/web/src/lib/center-alignment.test.ts
apps/web/src/components/dev/hover-button-dev-test.tsx
apps/web/src/routes/dev.hover-button.tsx
scripts/check-hover-button.ts
```

`evaluateCenterAlignment` takes a parent box and exactly two children. `evaluateElementCenterAlignment` reads those from the DOM (`ink: true` for painted content). `evaluateOpticalAlignment` is the second check: visual center, baseline, optical center, parent mid.

## Related

- [../../apps/web/CONTEXT.md](../../apps/web/CONTEXT.md) — Library panel, HoverButton as the Filters Add control
- [../../CONTEXT.md](../../CONTEXT.md) — Tracks tab, Library panel
