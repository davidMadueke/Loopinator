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
| Route context row | **Route breadcrumb** in the Playback frame; its chips open the Setlist, Slot, and Track pickers |
| Play screen width | Playback frame max ~860px, centered on wider viewports |
| Tempo stepper | ±1 BPM per tap, ±3 BPM while held |
| Playhead ring color | `--playhead` from `packages/ui` globals; follows the Accent colour |
| Hamburger | Library, Setlists, Upload, Account/Login per ADR-0002 |
| Appearance menu | Palette icon button left of the hamburger; Theme and Accent colour |

## Shadcn components

### Install now (`packages/ui`)

- `breadcrumb` — Route breadcrumb chips, each a `DropdownMenu` trigger
- `sheet` — Advanced Options
- `separator` — dividers inside the Playhead circle and control panels
- `tabs` — Tracks and Setlists tabs inside the Library panel

### Already installed

`button`, `dropdown-menu`, `label`, `card`, `input`, `select` (Key and Time signature fields on Create Track)

### Defer

- `slider` — Transport fade when Advanced Options ships

### Custom (not stock Shadcn)

- `PlayheadCircle` in `packages/ui` — SVG ring, `stroke-dashoffset` driven by audio clock, stroke from `--playhead`, unfilled track at `muted-foreground/25` so it reads on a white background as well as a dark one
- Override dot on Advanced Options entry
- Cache indicator beside Route breadcrumb on Track routes
- Library panel scroll stack (flex column, not Sheet)

## File layout

```
packages/ui/src/components/
  playhead-circle.tsx
  breadcrumb.tsx, sheet.tsx, separator.tsx, tabs.tsx   ← CLI

apps/web/src/components/play/
  play-screen.tsx           ← page shell: header + scroll column
  play-screen-header.tsx    ← Church OS mark, title, hamburger (DropdownMenu)
  route-breadcrumb.tsx      ← picker chips + Slot navigator + Cache indicator
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
| Appearance menu | `DropdownMenu` + two `DropdownMenuRadioGroup`s |
| Route breadcrumb | `Breadcrumb` chips; each is a `DropdownMenu` trigger holding one picker |
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

Leaving a part-filled **Create New Track** or **Create New Setlist** form asks for confirmation first. Both exits run the same guard, so the warning cannot appear on one and not the other.

| Decision | Choice |
|---|---|
| Guarded exits | **Back to Library** button, and **Close library** in the hamburger |
| In progress | Any field touched: `hasCreateTrackProgress` / `hasCreateSetlistProgress` |
| Nothing entered | Leaves immediately, no dialog |
| Keep editing | Dialog closes; form, Library view, and panel visibility all unchanged |
| Discard | Clears the form **and** its parent: Back to Library returns the panel to browse, Close library closes the panel |
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

## Create Track — loop region editor

Loop region editing lives inside the audio upload success panel, not as a separate form section. Snap, decode, time format, and analysis roadmap: **[src/lib/loop-analysis/CONTEXT.md](src/lib/loop-analysis/CONTEXT.md)**.

| Decision | Choice |
|---|---|
| Layout | `WavePlayer` on top, `LoopRegionField` inputs below, inside `AudioUploadField` `renderOnSuccess` |
| Form state | `inPoint` / `outPoint` stay in `CreateTrackPanel`; passed through `AudioUploadField` as props |
| Auto (file edge) | Stored as empty string `""`; inputs display **Auto**; markers stay at 0 s (in) or duration (out) |
| Marker UI | Thin vertical lines, draggable; primary-tinted shade between them |
| WavePlayer scope | Opt-in via `loopRegion` prop; library preview and other uses unchanged |
| Preview loop | Local **Loop preview** toggle on WavePlayer controls (right-aligned); default ON; not saved with upload |
| Region shade | Primary tint when loop preview ON; muted tint when OFF (markers stay draggable either way) |
| Replace / Remove | Panel `onFileChange` resets both points to auto |
| Implementation switch | `LOOP_REGION_IMPL` constant at top of `wave-player.tsx`: `"custom"` (React overlay) or `"regions"` (Wavesurfer Regions plugin) |

### Create Track file layout

```
apps/web/src/
  lib/loop-analysis/                   ← analysis CONTEXT + decode, zero-cross, snap
  lib/loop-region-time.ts            ← parse, format, clamp, commit helpers
  lib/use-loop-snap.ts               ← decode uploaded file for marker snap
  components/waves-cn/
    wave-player.tsx                  ← WavePlayer + LOOP_REGION_IMPL
    loop-region-overlay.tsx          ← custom overlay markers
  components/play/create-track/
    audio-upload-field.tsx           ← upload + WavePlayer + LoopRegionField
    loop-region-field.tsx            ← in/out text inputs
    create-track-panel.tsx           ← form state; no standalone loop section
```

## Related ADRs

- [0002-public-play-auth-writes](../../docs/adr/0002-public-play-auth-writes.md) — hamburger and public Play routes
- [0012-library-scroll-stack](../../docs/adr/0012-library-scroll-stack.md) — Library panel above Playback frame
- [0013-session-source-seam](../../docs/adr/0013-session-source-seam.md) — one swappable session source
- [0014-link-scope-breadcrumb-pickers](../../docs/adr/0014-link-scope-breadcrumb-pickers.md) — which pickers a Musician may open
