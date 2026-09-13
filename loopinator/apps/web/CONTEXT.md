# Loopinator web app

The TanStack Start front end for Loopinator. Domain terms live in [../../CONTEXT.md](../../CONTEXT.md). This file records Play screen UI decisions and the Shadcn build plan for `apps/web`.

## Agreed design

Wireframe layout with these domain overrides:

| Wireframe element | Decision |
|---|---|
| Key +/- and dropdown | Read-only text inside the Playhead circle. A Track whose Key is **No Key** never gets key-change UI |
| 4/4 dropdown | Read-only text inside the Playhead circle |
| Fade on main screen | Transport fade in the Advanced Options panel only |
| Split Play \| Pause | One contextual Transport bar button: Play, then Pause, then Restart |
| Space | **Space play/pause** on the **Active transport**. Form fields keep Space. A ready WavePlayer outranks the Play screen Transport |
| "Advanced Settings" | **Advanced Options panel**, scroll-stacked like the Library panel |
| Single large BPM | **Target BPM readout** at performance size, no "Target" label |
| Source tempo | **Original BPM readout** row directly under Target BPM, smaller type |
| Auto-detected BPM | Flag on Original BPM readout only; Target still shows the number |
| Library as overlay | **Library panel** scroll-stacked above the Playback frame; audio keeps playing |
| Library structure | **Tracks tab** and **Setlists tab** inside the Library panel |
| Setlist editing | Create new and Edit on Setlist rows inside the Setlists tab |
| Route context row | **Route breadcrumb** in the Playback frame; its chips open the Setlist, Slot, and Track pickers |
| Play screen width | Playback frame max ~860px, centered on wider viewports |
| Tempo stepper | ±1 BPM per tap, ±3 BPM while held. Drives Play screen Time-stretch |
| Playhead ring color | `--playhead` from `packages/ui` globals; follows the Accent colour |
| Hamburger | Library, Setlists, Upload, Account/Login per ADR-0002 |
| Appearance menu | Palette icon button left of the hamburger; Theme and Accent colour |
| Library filters | **Filters** Add/Clear in the Library toolbar centre column; chips in a second full-width row in the same padded toolbar box, above the list |

## Shadcn components

### Install now (`packages/ui`)

- `breadcrumb` — Route breadcrumb chips, each a `DropdownMenu` trigger
- `separator` — dividers inside the Playhead circle and control panels
- `tabs` — Tracks and Setlists tabs inside the Library panel

### Already installed

`button`, `dropdown-menu`, `label`, `card`, `input`, `select` (Key and Time signature fields on Create Track), `slider`, `toggle` / `toggle-group`, `popover`, `button-group`, `scroll-area`, `spinner`

### ReUI (apps/web)

Registry `@reui` → `https://reui.io/r/{style}/{name}.json` in both `apps/web` and `packages/ui` `components.json`. Play Library Filters owns a copy of the ReUI Filters + Cascader sources under `apps/web/src/components/reui/`. Patterns drawn from free blocks `@reui/c-filters-6` (slider editors) and `@reui/c-filters-8` (toggle-group editors).

### Defer

- Transport fade slider when Advanced Options ships (Library Filters already uses `slider` for tempo range)

### Custom (not stock Shadcn)

- `PlayheadCircle` in `packages/ui` — SVG ring, `stroke-dashoffset` driven by audio clock, stroke from `--playhead`, unfilled track at `muted-foreground/25` so it reads on a white background as well as a dark one
- Override dot on Advanced Options entry
- Cache indicator beside Route breadcrumb on Track routes
- Library panel scroll stack (flex column, not Sheet)
- Advanced Options panel scroll stack, same flex column. The Playhead entry button opens and closes
  it, and **Close advanced options** in the header closes it. The hamburger has no entry for it, so
  the Playhead entry stays the only way in

## File layout

```
packages/ui/src/components/
  playhead-circle.tsx
  breadcrumb.tsx, sheet.tsx, separator.tsx, tabs.tsx   ← CLI

apps/web/src/components/play/
  play-screen.tsx           ← page shell: header + scroll column; Space play/pause for Transport
  play-screen-header.tsx    ← Church OS mark, title, hamburger (DropdownMenu)
  route-breadcrumb.tsx      ← picker chips + Slot navigator + Cache indicator
  playback-frame.tsx        ← max-w ~860px centered column
  transport-bar.tsx         ← single large Button (Play / Pause / Restart)
  tempo-stepper.tsx         ← Label + Button +/− (±1 tap, ±3 hold)
  library-panel.tsx         ← Tabs: Tracks | Setlists
  filters.tsx               ← Library Filters provider, trigger, chip row
  advanced-options-panel.tsx ← Reset this device, Save for everyone
  library-tracks-tab.tsx    ← Tracks by BPM band; filter toolbar + chips
  library-setlists-tab.tsx  ← Setlist rows, Create new, Edit
  create-setlist-panel.tsx  ← name, slot list, Create enablement
  create-setlist/           ← Slot row, Slot Track picker

apps/web/src/components/reui/
  filters/                  ← ReUI Filters package (CLI-owned)
  cascader/                 ← Cascader dependency of Filters
```

## Component mapping

| UI block | Implementation |
|---|---|
| Hamburger | `DropdownMenu` |
| Appearance menu | `DropdownMenu` + two `DropdownMenuRadioGroup`s |
| Route breadcrumb | `Breadcrumb` chips; each is a `DropdownMenu` trigger holding one picker |
| Slot prev/next | `Button` variant ghost + Lucide chevrons |
| Playhead ring | `PlayheadCircle` (`packages/ui`) |
| Target / Original BPM | Plain text; Auto-detected flag on Original only |
| Key, Time signature | Plain text, wireframe styling. No Key shows no Major/Minor and no key-change controls |
| Advanced Options entry | `Button` outline + Override dot |
| Transport | One `Button`, size lg |
| Tempo stepper | `Button` +/− in bordered container |
| Advanced Options body | Custom panel; full-width block above the Playback frame |
| Library panel | `Tabs` + custom lists; full-width block above Playback frame |
| Library Filters | ReUI provider in the Tracks tab; `HoverButton` Add on the same sticky row as Expand all / Collapse all, chips in a second sticky row |

## Page structure

```tsx
// play-screen.tsx
<div className="flex min-h-dvh flex-col">
  <PlayScreenHeader />
  <main className="flex flex-1 flex-col overflow-y-auto">
    {libraryOpen && <LibraryPanel />}     {/* Tabs: Tracks | Setlists */}
    {advancedOpen && <AdvancedOptionsPanel />}
    <PlaybackFrame />                     {/* max-w-[860px] mx-auto */}
  </main>
</div>
```

## Appearance menu

Theme and Accent colour, opened from a Palette icon button sitting left of the hamburger in the
Play screen header. Modelled on the 7Ovr Settings 6 appearance block, trimmed to what fits a
dropdown: no density control and no mock preview, since the Play screen behind the menu already
recolours live.

| Decision | Choice |
|---|---|
| Theme options | Light, Dark, System, as a three-up tile grid of radio items |
| Default theme | **Dark**, which is what `__root.tsx` used to hard-code |
| Accent options | Neutral (default), Green, Blue, Violet, Amber, Rose, as a swatch row |
| What accent moves | `--primary`, `--primary-foreground`, `--ring`, and `--playhead` |
| What accent leaves alone | `--chart-*`, which stays a green ramp for future charts |
| Playhead under Neutral | Keeps the brand green; every other accent hands `--playhead` its `--primary` |
| Where the palettes live | `:root[data-accent]` / `.dark[data-accent]` blocks in `packages/ui` globals |
| Carrier attributes | `dark` class and `data-accent` on `<html>`, both written by the same helper |
| Persistence | `localStorage` under `loopinator.theme` and `loopinator.accent`; per device, no DB |
| No-flash | Blocking `<script>` in `<head>` reapplies the stored choice before first paint |
| Hydration | `<html suppressHydrationWarning>`: that script makes server and client markup differ |
| Selection styling | Ring and fill on the item itself; the stock tick is hidden in both groups |

`System` follows `prefers-color-scheme` and re-resolves on OS change while the hook is mounted.

Canvas cannot read `var(--primary)`, so `useCssVar` in `lib/wave-cn.tsx` resolves it to a literal
colour and watches `<html>` for changes. Its `attributeFilter` must list every carrier attribute:
`data-accent` was missing, which left the waveform progress bars on the previous accent until the
Wavesurfer instance happened to be rebuilt.

`--playhead` is set once by `:root:not([data-accent="neutral"]) { --playhead: var(--primary) }`
rather than inside all ten palette blocks. That selector weighs (0,2,0), so it beats the `.dark`
default, and `--primary` is already per-theme by the time it resolves. The Override dot on the
Advanced Options entry reads `--playhead` too, so it never drifts away from the ring.

### Appearance file layout

```
apps/web/src/
  lib/appearance.ts                ← options, storage, applyAppearance, head script
  stores/appearance-store.ts       ← Zustand state shared by every mounted menu
  hooks/use-appearance.ts          ← hydrate on mount + prefers-color-scheme listener
  components/appearance-menu.tsx   ← trigger button + dropdown
```

## Library create — discard progress

Leaving a part-filled **Create New Track** or **Create New Setlist** form asks for confirmation first. Every exit runs the same guard, so the warning cannot appear on one and not the other.

| Decision | Choice |
|---|---|
| Guarded exits | **Back to Library**, **Close library**, **Account**, and **reload** (F5 / Ctrl+R / Cmd+R / browser refresh) |
| Leave the page | Refresh, a typed URL, and tab close cancel the leave and open the same dialog. Some browsers also show their own leave-site prompt first |
| In progress | Any field touched: `hasCreateTrackProgress` / `hasCreateSetlistProgress` |
| Nothing entered | Leaves immediately, no dialog |
| Keep editing | Dialog closes; form, Library view, panel visibility, and route all unchanged |
| Discard | Clears the form **and** its parent: Back to Library returns the panel to browse, Close library closes the panel, Account goes to the dashboard, reload reloads the page |
| Clearing mechanism | The create panel unmounts on exit, which drops its field state; no manual field reset, no remount key |
| Shared state | `hasProgress`, the discard intent, and dialog visibility live in `src/stores/library-create-store.ts` (Zustand) |
| Dialog owner | One `DiscardProgressDialog`, rendered by `play-screen.tsx`; opened on the next microtask so the hamburger can close first |

## Session source

Sign-in state reaches components through one swappable source, so editor-only UI can be built
before invite-code sign-up ships. See **[0013-session-source-seam](../../docs/adr/0013-session-source-seam.md)**.

| Decision | Choice |
|---|---|
| What components call | `useSession()` → `{ status, editor, isSignedIn, isLoading, signOut }` |
| What they never call | `authClient` directly, outside `SignInForm` / `SignUpForm` |
| States | `loading`, `signed-out`, `signed-in`; `editor` is null for the first two |
| Sources | `devSessionSource` (localStorage flag, `DEV_EDITOR`), `betterAuthSessionSource` (real) |
| Which one runs | `VITE_SESSION_SOURCE`; unset means dev for `vite dev`, Better Auth for a build |
| Where it is chosen | `lib/session/active-source.ts`, once per page load, never swapped mid-render |
| How components receive it | `SessionProvider` in `router.tsx` `Wrap`; tests pass their own `source` prop |
| Outside React | `activeSessionSource.readSession()`, used by the `/_auth` `beforeLoad` gate |
| Sign-in itself | Not on the interface: credentials differ per provider, so forms own it |
| Flipping state in dev | `DevSessionToggle` pill, mounted in `__root.tsx`, hidden under Better Auth |
| Dev `/login` | Renders `DevSignInPanel` instead of the real forms, so no server is needed |
| First paint | Server render reports `loading`, the client resolves after hydration |
| What a faked session buys | UI only. Writes still hit tRPC `protectedProcedure` and get rejected |

Gated UI today: the Play screen hamburger (Library toggles for an Editor, links to `/login` for a
Musician, per ADR-0002), the Route breadcrumb pickers, `UserMenu`, and the `/_auth` route gate.

### Session file layout

```
apps/web/src/
  lib/session/types.ts              ← Editor, SessionState, SessionSource
  lib/session/dev-editor.ts         ← DEV_EDITOR + localStorage read/write
  lib/session/dev-source.ts         ← dummy source over the Zustand store
  lib/session/better-auth-source.ts ← real source over authClient
  lib/session/active-source.ts      ← VITE_SESSION_SOURCE resolution
  stores/dev-session-store.ts       ← signedIn + hydrated
  hooks/use-session.ts              ← the hook every component uses
  components/session-provider.tsx   ← context holding the chosen source
  components/dev-session-toggle.tsx ← dev-only sign in / sign out pill
  components/dev-sign-in-panel.tsx  ← dev-only /login body
```

## Breadcrumb pickers and link scope

Every Route breadcrumb chip opens a dropdown. Which ones a signed-out Musician may open follows
**[0014-link-scope-breadcrumb-pickers](../../docs/adr/0014-link-scope-breadcrumb-pickers.md)**: the
link opens what it addresses and nothing wider.

| Route | Chip | Picker lists | Musician | Editor |
|---|---|---|---|---|
| `/s/{id}` | Setlist name | Every Setlist | No | Yes |
| `/s/{id}` | Slot label | The Tracks in this Setlist | Yes | Yes |
| `/t/{id}` | Display name | Every Track in the Library | No | Yes |

The Library panel sits on the same line. The hamburger toggles it for an Editor and sends a
Musician to `/login`, so a Musician never lists Tracks by either route.

How a denied chip looks is still open. Plain text with no chevron, a disabled trigger, and a
dropdown holding one Sign in item are all still on the table. Whichever it becomes, the Slot
navigator stays available to a Musician, so a Setlist is walkable without the Slot picker.

## Long names

A Setlist name, Slot label, or Display name can be much longer than the row it lands in. Long names
truncate with an ellipsis rather than wrapping, and the group carrying them never claims the whole
row, so trailing controls keep their place at every viewport width.

| Decision | Choice |
|---|---|
| Row split | The name-carrying group is `max-w-4/5 flex-1 min-w-0`; trailing controls stay `shrink-0` |
| Why four fifths | The Slot navigator, Cache indicator, and Library row actions stay put instead of being pushed off or wrapping to a second line |
| Overflow | One line, ellipsis, never wrap; `BreadcrumbList` is `flex-nowrap overflow-hidden` |
| Where the ellipsis sits | A `truncate` span inside the chip, because `text-overflow` does not apply to a flex container |
| Shrink chain | Every ancestor from the row down to the text carries `min-w-0`, since the default `min-width: auto` refuses to shrink a flex item below its text |
| Button override | `Button` variants ship `shrink-0`; a chip passes `shrink` and `twMerge` drops the base |
| Reading the full name | `title` on the chip or link, so a cut-off name is still legible on hover |
| Chip caps | Setlist name `max-w-80`, Slot label `max-w-56` over a `min-w-24` floor, single Track `max-w-full`, chip default `max-w-40` |

Where it applies: the Route breadcrumb row, the Tracks tab rows, and the Setlists tab rows. Library
rows already truncated Display name and Filename; the four-fifths cap is what keeps a long name from
crowding out Row preview and Edit.

### Picker items

Not built yet. Each item inside the Setlist, Slot, or Track picker truncates to the full width of
the dropdown container.

| Decision | Choice |
|---|---|
| Item width | Whatever the dropdown container is; items truncate to it |
| Menu width | Set by the container, never stretched to fit the longest name |
| Overflow | One line, ellipsis, never wrap |
| Per-item cap | None. The container is the only limit |
| Reading the full name | Same `title` hover as the chips |

## Space play/pause

Space is hard-mapped to Play/Pause on the **Active transport**. It does not Restart, scroll the page, or fire the focused button. Domain terms: [../../CONTEXT.md](../../CONTEXT.md).

Highest matching row wins:

| Priority | When | Space does |
|---|---|---|
| 1 | A form field is focused: text, number, textarea, select, combobox, contenteditable | Stays with that field |
| 2 | A WavePlayer is ready (Create Track upload preview, `/dev/loop-preview`) | Toggles that WavePlayer |
| 3 | Play screen is open | Toggles Play screen Transport |

The header island and the Transport bar are one playback. Space hits `usePlayback` play/pause, not a particular button. Row preview is not on this stack.

| Decision | Choice |
|---|---|
| Focused buttons | Restart, Loop preview, Tempo +/−, hamburger, and other buttons do not keep Space |
| Hold | First press only. No strobe |
| Modifiers | Ctrl, Meta, Alt leave Space alone |
| Two WavePlayers | Last mounted ready instance is the Active transport |
| WavePlayer still loading | Falls through to the Play screen Transport |
| Create Track over Play screen | The ready WavePlayer outranks Transport, so previewing an upload does not toggle the live Track |

Hook: `apps/web/src/hooks/use-spacebar-play-pause.ts`. WavePlayer registers when ready. PlayScreen always registers.

## Create Track — loop region editor

Loop region editing lives inside the audio upload success panel, not as a separate form section. Snap, decode, time format, and analysis roadmap: **[src/lib/loop-analysis/CONTEXT.md](src/lib/loop-analysis/CONTEXT.md)**.

| Decision | Choice |
|---|---|
| Layout | `AudioUploadField` is the file header. `WavePlayer` sticks to the top of `CreateTrackPanel` while the form scrolls. `LoopRegionField` sits below the player |
| Form state | `inPoint` / `outPoint` stay in `CreateTrackPanel`; passed through `AudioUploadField` as props |
| Auto (file edge) | Stored as empty string `""`; inputs display **Auto**; markers stay at 0 s (in) or duration (out) |
| Marker UI | Thin vertical lines, draggable; primary-tinted shade between them |
| In/Out order | In-point is always at or before Out-point. Typing or field-scrubbing past the other point swaps the two values. Region handles stop at the other point |
| Region ↔ fields | Both write In-point and Out-point together after every edit, so the waveform markers and the time fields never drift |
| Time fields | Drag horizontally to scrub; click (no drag) to type m:ss or m:ss.sss. Shift tightens the scrub |
| WavePlayer scope | Opt-in via `loopRegion` prop; library preview and other uses unchanged |
| Preview loop | Local **Loop preview** toggle on WavePlayer controls (right-aligned); default ON; not saved with upload |
| Loop edge fade | Fixed 4 ms on the shared playback engine. Always on, no control. Not Seam crossfade |
| Preview audio | `createPlaybackEngine` at stretch ratio 1. WaveSurfer draws the waveform and does not play |
| Region shade | Primary tint when loop preview ON; muted tint when OFF (markers stay draggable either way) |
| Replace / Remove | Panel `onFileChange` resets every Create Track field to the empty defaults, then detection fills Original BPM and Key from the new file |
| Markers | Wavesurfer Regions plugin, on the waveform canvas, so they scroll with long audio. `LoopRegionField` still scrubs, types, snaps, and swaps |
| Preview tempo | File speed. Time-stretch is Play screen only |

## Create Track — Original BPM and Key

Domain: [../../CONTEXT.md](../../CONTEXT.md). Analysis: **[src/lib/loop-analysis/CONTEXT.md](src/lib/loop-analysis/CONTEXT.md)**.

| Decision | Choice |
|---|---|
| BPM detection | Runs in a Worker when the file decodes. Fills Original BPM as **Auto-detected BPM**, including a low-confidence guess |
| Clear Auto-detected BPM | Typing, **Tap tempo** (TAP button), or **Half/double** (×2 / ÷2) |
| Empty until decode | Placeholder stays “Detected on upload” until the Worker returns |
| Key detection | Same Worker. High confidence fills **Key** as **Auto-detected Key**. Low confidence or no result leaves **No Key** |
| Key on replace | Replace and Remove reset Key to **No Key**. Detection fills it again from the new file |
| Backends | UI calls `audioAnalysisEngine`. Swap `@audio/beat` / `@audio/mir-*` in `engine/`. [0017-audio-engine-seam](../../docs/adr/0017-audio-engine-seam.md) |
| No Key | Future key-change UI does not apply. Create Track still has the Key field so an Editor can set one. Play screen Key is read-only |
| Preview | WavePlayer does not Time-stretch |

## Play screen — Time-stretch

Upload Track is still disabled and Play screen Tracks have no audio URL. `usePlayback` already runs the shared file-time clock. A stand-in Loop region of 4 beats at Original BPM keeps the Playhead circle moving. Audio stays silent until the stretch worklet and a real buffer land.

| Decision | Choice |
|---|---|
| Graph | Web Audio, pitch-preserving stretch worklet. [0015-web-audio-stretch-graph](../../docs/adr/0015-web-audio-stretch-graph.md) |
| Algorithm | `@audio/stretch-transient`. [0016-audiojs-beat-and-stretch](../../docs/adr/0016-audiojs-beat-and-stretch.md) |
| Live control | Tempo stepper changes Target BPM; stretch ratio is Target / Original, clamped ±20% |
| Loop wrap | Source file time. Stretch does not move In-point or Out-point |
| What does not stretch | Create Track preview, Row preview |

### Create Track file layout

```
apps/web/src/
  lib/loop-analysis/                   ← analysis CONTEXT + decode, snap, Worker, engine seam
  lib/playback/                      ← file-time clock, Loop bounds, Transport fade, Loop edge fade
  lib/loop-region-time.ts            ← parse, format, clamp, commit helpers
  lib/use-loop-snap.ts               ← decode uploaded file for marker snap
  hooks/use-playback.ts              ← Play screen session over createPlaybackEngine
  hooks/use-spacebar-play-pause.ts   ← Active transport stack (see Space play/pause)
  components/waves-cn/
    wave-player.tsx                  ← waveform + regions. Audio from the playback engine
  components/play/create-track/
    audio-upload-field.tsx           ← upload / file header
    loop-region-field.tsx            ← in/out text inputs
    original-bpm-field.tsx           ← Original BPM, TAP, Half/double, Auto-detected icon
    key-field.tsx                    ← Key; Auto-detected icon when detection fills it
  components/play/create-track-panel.tsx ← form state; sticky WavePlayer; LoopRegionField; detection
```

## Create Setlist, slot list

Domain: [../../CONTEXT.md](../../CONTEXT.md). This is the first pass. Edit expand (Target BPM, Key, Time signature) and Slot Track picker Filters are not built yet.

| Decision | Choice |
|---|---|
| Start | One Empty slot labelled Track 1 |
| Progress | Setlist name, an extra slot, a picked Track, or a Slot label other than Track 1 |
| Create enablement | Name is non-empty, at least one slot, every slot has a Track |
| Persist | Create Setlist enables when valid. Click does not write yet |
| Slot Track picker | Dropdown of `DEMO_TRACKS`. Trigger reads Pick a Track while empty |
| Pick / replace | Assigning a Track copies Target BPM, Key, and Time signature. Replacing resets those three. Slot label sticks |
| Duplicate below | Filled slots only. New Slot label is the stem plus the next free #n |
| Edit | Shown on every row. Disabled this pass, empty or filled |
| Remove | Any slot except the last remaining one |
| Add slot | Appends an Empty slot labelled Track N from the insert position |

### Create Setlist file layout

```
apps/web/src/
  lib/slot-label.ts                    ← Track N defaults, duplicate #n
  components/play/create-form-state.ts ← CreateSetlistFormState + slot ops
  components/play/create-setlist-panel.tsx
  components/play/create-setlist/
    slot-row.tsx
    slot-track-picker.tsx
```

## Library Filters

Browse-mode filter bar on the Tracks tab, same sticky row as Expand all / Collapse all.
Hidden on Setlists and while creating a Track or Setlist. Built on ReUI Filters; field editors
follow the free c-filters-6 (range slider) and c-filters-8 (toggle group) patterns.

| Decision | Choice |
|---|---|
| Add/Clear placement | Left side of the Tracks sticky toolbar, opposite Expand all / Collapse all |
| Chip placement | Second row in that same sticky stack, above the BPM-band list |
| Chip row layout | `w-full flex-wrap`, start aligned, `gap-3`; no extra chrome; unlimited wrap |
| Chip row when empty | Unmounts; the sticky stack collapses back to the Add / Expand / Collapse row |
| Toolbar stickiness | Add Filter row and chip row share one `sticky top-0` wrapper with `bg-background`, so both stay put while the list scrolls |
| List padding | TabsContent keeps `pt-4` whether chips are showing or not |
| Fields (order) | **Tempo** (target BPM range), **Time signature**, **Key** |
| Tempo editor | Dual-thumb range slider, 40–200 BPM, step 1; each bound is a number input beside the track; Apply/Discard footer like c-filters-6 |
| Tempo chip | Mini track + range text; not a bare number |
| Time signature | Multi toggle group over `TIME_SIGNATURES` from `play-types` |
| Key | Multi toggle group over `KEY_CENTERS` wrapping in the popover, with an exclusive Major/Minor toggle beside it. Scale is disabled when only No Key is selected; neither scale means any. Chip value shows centers then scale, in `text-primary` |
| Choice operators | Key and Time signature default to **is**, **is not**, **is one of**, **is none of**. Override with `keyOperators` / `timeSignatureOperators` on `Filters` |
| Chip label wash | Tempo `bg-primary/20`, Time signature `bg-primary/40`, Key `bg-primary/60` |
| Add control | Default `HoverButton`: icon expands to **Add Filter**. Open matches the Route breadcrumb (`text-primary-on-muted`). Custom `trigger` skips this |
| Custom trigger API | Optional `trigger` prop on `FiltersTrigger` |
| With filters active | Same HoverButton, idle fill `bg-primary` (icon only); hover still expands; open still `text-primary-on-muted`. ReUI **Clear** joins it on the left of the Tracks toolbar |
| Field picker search | Hidden on Add Filter (`searchable={false}`); input stays `sr-only` for keyboard |
| Clear | Outline `sm`, ReUI **Clear** label; no `ms-auto` |
| Composition | `Filters` provider wraps the Tracks tab; `FiltersTrigger` shares the Expand/Collapse row; `FiltersChips` is the second sticky row. ReUI `FiltersRow` is unused |
| Query ownership | Local React state in `filters.tsx` for now; not yet applied to Tracks/Setlists lists |
| Why a wrapper trigger | ReUI `PopoverTrigger` merges click/ref onto the `trigger` element; that element must forward props to the real button or the picker never opens |

### Library Filters file layout

```
apps/web/src/
  components/play/filters.tsx          ← schema, editors, Filters provider, FiltersTrigger, FiltersChips
  components/play/library-tracks-tab.tsx ← Filters wraps the tab; Trigger + Expand/Collapse; Chips under that row
  components/play/library-panel.tsx    ← Tabs + Create New; no filter chrome
  components/reui/filters/*            ← ReUI Filters (CLI)
  components/reui/cascader/*           ← Cascader (CLI)
  lib/play-types.ts                    ← TIME_SIGNATURES, KEY_CENTERS
packages/ui/src/components/
  hover-button.tsx                     ← Add Filter control
  slider.tsx, toggle.tsx, toggle-group.tsx, popover.tsx, button-group.tsx
```

Open: wiring the filter query into `LibraryTracksTab` / `LibrarySetlistsTab` so chips actually
narrow the lists. Tempo currently means target BPM in the filter schema; Tracks still group by
original BPM bands until that hand-off lands.

## Frontend layout testing

HoverButton reveal, box centering, and icon-vs-baseline optical checks live in
**[packages/ui/CONTEXT.md](../../packages/ui/CONTEXT.md)**. jsdom cannot run them.

## Related ADRs

- [0002-public-play-auth-writes](../../docs/adr/0002-public-play-auth-writes.md) — hamburger and public Play routes
- [0004-pitch-preserving-stretch](../../docs/adr/0004-pitch-preserving-stretch.md) — Time-stretch, Key stays metadata, No Key has no key-change UI
- [0010-save-unconfirmed-bpm](../../docs/adr/0010-save-unconfirmed-bpm.md) — Auto-detected BPM still saves
- [0012-library-scroll-stack](../../docs/adr/0012-library-scroll-stack.md) — Library panel above Playback frame
- [0013-session-source-seam](../../docs/adr/0013-session-source-seam.md) — one swappable session source
- [0014-link-scope-breadcrumb-pickers](../../docs/adr/0014-link-scope-breadcrumb-pickers.md) — which pickers a Musician may open
- [0015-web-audio-stretch-graph](../../docs/adr/0015-web-audio-stretch-graph.md) — Play screen stretch graph
- [0016-audiojs-beat-and-stretch](../../docs/adr/0016-audiojs-beat-and-stretch.md) — `@audio/beat` and `@audio/stretch-transient`
- [0017-audio-engine-seam](../../docs/adr/0017-audio-engine-seam.md) — analysis backends sit behind `engine/`
- [0019-one-playback-engine](../../docs/adr/0019-one-playback-engine.md) — WavePlayer and Play screen share `createPlaybackEngine`
- [playback-engine-review](../../docs/playback-engine-review.md) — why the clocks split and what not to copy from WaveSurfer
