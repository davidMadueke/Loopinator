# Loopinator web app

The TanStack Start front end for Loopinator. Domain terms live in [../../CONTEXT.md](../../CONTEXT.md). This file records Play screen UI decisions and the Shadcn build plan for `apps/web`.

## Agreed design

Wireframe layout with these domain overrides:

| Wireframe element | Decision |
|---|---|
| Key +/- and dropdown | Read-only text inside the Playhead circle |
| 4/4 dropdown | Read-only text inside the Playhead circle |
| Fade on main screen | Transport fade in Advanced Options sheet only |
| Split Play \| Pause | One contextual Transport bar button: Play, then Pause, then Restart |
| "Advanced Settings" | **Advanced Options** (bottom sheet) |
| Single large BPM | **Target BPM readout** at performance size, no "Target" label |
| Source tempo | **Original BPM readout** row directly under Target BPM, smaller type |
| Unconfirmed BPM | Flag on Original BPM readout only; Target still shows the number |
| Library as overlay | **Library panel** scroll-stacked above the Playback frame; audio keeps playing |
| Library structure | **Tracks tab** and **Setlists tab** inside the Library panel |
| Setlist editing | Create new and Edit on Setlist rows inside the Setlists tab |
| Route context row | **Route breadcrumb** in the Playback frame: read-only dropdown styling, no pickers |
| Play screen width | Playback frame max ~860px, centered on wider viewports |
| Tempo stepper | ±1 BPM per tap, ±3 BPM while held |
| Playhead ring color | `--chart-2` from `packages/ui` globals |
| Hamburger | Library, Setlists, Upload, Account/Login per ADR-0002 |

## Shadcn components

### Install now (`packages/ui`)

- `select` — styled read-only Route breadcrumb triggers (disabled or non-interactive; same visual as wireframe dropdowns)
- `sheet` — Advanced Options
- `separator` — dividers inside the Playhead circle and control panels
- `tabs` — Tracks and Setlists tabs inside the Library panel

### Already installed

`button`, `dropdown-menu`, `label`, `card`, `input`

### Defer

- `slider` — Transport fade when Advanced Options ships

### Custom (not stock Shadcn)

- `PlayheadCircle` in `packages/ui` — SVG ring, `stroke-dashoffset` driven by audio clock, green stroke from `--chart-2`
- Override dot on Advanced Options entry
- Cache indicator beside Route breadcrumb on Track routes
- Library panel scroll stack (flex column, not Sheet)

## File layout

```
packages/ui/src/components/
  playhead-circle.tsx
  select.tsx, sheet.tsx, separator.tsx, tabs.tsx   ← CLI

apps/web/src/components/play/
  play-screen.tsx           ← page shell: header + scroll column
  play-screen-header.tsx    ← Church OS mark, title, hamburger (DropdownMenu)
  route-breadcrumb.tsx      ← read-only Select-styled labels + Slot navigator
  playback-frame.tsx        ← max-w ~860px centered column
  transport-bar.tsx         ← single large Button (Play / Pause / Restart)
  tempo-stepper.tsx         ← Label + Button +/− (±1 tap, ±3 hold)
  library-panel.tsx         ← Tabs: Tracks | Setlists
  library-tracks-tab.tsx    ← Tracks by BPM band
  library-setlists-tab.tsx  ← Setlist rows, Create new, Edit
```

## Component mapping

| UI block | Implementation |
|---|---|
| Hamburger | `DropdownMenu` |
| Route breadcrumb | `Select` triggers, read-only (disabled or label-only), no route change on click |
| Slot prev/next | `Button` variant ghost + Lucide chevrons |
| Playhead ring | `PlayheadCircle` (`packages/ui`) |
| Target / Original BPM | Plain text; unconfirmed flag on Original only |
| Key, Time signature | Plain text, wireframe styling |
| Advanced Options entry | `Button` outline + Override dot |
| Transport | One `Button`, size lg |
| Tempo stepper | `Button` +/− in bordered container |
| Advanced Options body | `Sheet`, side bottom |
| Library panel | `Tabs` + custom lists; full-width block above Playback frame |

## Page structure

```tsx
// play-screen.tsx
<div className="flex min-h-dvh flex-col">
  <PlayScreenHeader />
  <main className="flex flex-1 flex-col overflow-y-auto">
    {libraryOpen && <LibraryPanel />}   {/* Tabs: Tracks | Setlists */}
    <PlaybackFrame />                   {/* max-w-[860px] mx-auto */}
  </main>
</div>
```

## Related ADRs

- [0002-public-play-auth-writes](../../docs/adr/0002-public-play-auth-writes.md) — hamburger and public Play routes
- [0012-library-scroll-stack](../../docs/adr/0012-library-scroll-stack.md) — Library panel above Playback frame
