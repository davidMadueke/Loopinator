# Loopinator

A standalone Church OS app for gapless looping of worship percussion on Sunday and at rehearsal. Anyone holding a link can play what that link addresses. Seeing the rest of the Library, or changing any of it, needs a sign-in.

## People

**Editor**:
A signed-in person who uploads Tracks, builds Setlists, and uses Save for everyone. Every signed-in account is an Editor. There is no read-only tier.
_Avoid_: Admin, client, user, viewer

**Musician**:
Anyone who opens a Play screen link. They need not sign in.
_Avoid_: User, client, member, congregation

**Invite code**:
One church-wide secret, held in environment config, that Google, Apple, and email sign-up all require. Nobody registers without it.
_Avoid_: Open registration, shared kit login, single-use invites

## Library

**Track**:
An uploaded WAV or MP3 with its Loop region and metadata (Display name, Original BPM, Key, Time signature, Song title).
_Avoid_: Loop (for the file), Song, Clip, sample

**Display name**:
The human name of a Track. The Play screen shows this one.
_Avoid_: Filename, title, track name

**Filename**:
The name of the uploaded file. Advanced Options and the Library show it. The Play screen does not.
_Avoid_: Display name

**Loop region**:
The In-point and Out-point bounding one Loop cycle. Upload sets a Track default by guessing the first whole bars from the detected BPM. A Setlist slot can hold its own copy.
_Avoid_: Trim, selection, clip

**In-point**:
The start of the Loop region.

**Out-point**:
The end of the Loop region.

**Loop cycle**:
One pass from In-point to Out-point. Playback wraps here rather than at the ends of the file.
_Avoid_: Song, file playthrough

**Setlist**:
A named, ordered list of Tracks. The name can contain a date. It is not a church calendar. Editors build and reorder it in the Setlists tab inside the Library panel, and it plays at `/s/{id}`.
_Avoid_: Playlist, service, Sunday, AllTracks

**Setlist slot**:
One Track on one Setlist. It can hold its own Loop region, Target BPM, and Transport fade. Display name, Key, and Time signature stay on the Track. Removing the Track from the Setlist destroys those overrides, so adding it back starts from the Track default.

**Library**:
The catalog of every Track, grouped by BPM band. When open it stacks as the Library panel above the Playback frame in the same scroll column. Only an Editor reaches it, through the Library panel or the Track picker. No public page lists it.
_Avoid_: AllTracks, public index, library page, library modal

**Library panel**:
The full-width block above the Playback frame, opened from the hamburger. It has two tabs: Tracks and Setlists. Playback keeps running while it is open.
_Avoid_: Library modal, library overlay, library drawer

**Tracks tab**:
The Library panel tab listing every Track by BPM band.
_Avoid_: Catalog view, browse mode, all tracks page

**Setlists tab**:
The Library panel tab listing every Setlist row. Create new and Edit beside each row open Setlist editing inside this tab.
_Avoid_: Setlist management view, setlist modal, setlist editor page

**Playback frame**:
The centered Play screen block, capped at about 860px wide, holding the Route breadcrumb, Playhead circle, Transport bar, and Tempo stepper. The Library panel stacks above it when open.
_Avoid_: Player card, main stage

**BPM band**:
The group a Track sits in inside the Library, taken from its Original BPM. The bands are under 80, 80 to 99, 100 to 129, 130 to 159, and 160 or more.
_Avoid_: Tempo range, bucket, feel

**Row preview**:
Plays a Track straight from its Library row without leaving the Library. The Display name opens `/t/{id}` instead.
_Avoid_: Preview player, mini player

**Short id**:
The stable, unguessable public identifier in `/s/{id}` and `/t/{id}`. Renaming does not change it.
_Avoid_: UUID, slug, pretty URL

**Link scope**:
What a Play screen link opens for a Musician: the thing it addresses and nothing wider. `/s/{id}` reaches every slot in that Setlist. `/t/{id}` reaches that one Track. Neither reaches the Library or the list of Setlists without a sign-in.
_Avoid_: Guest browsing, public library, link permissions

**Soft delete**:
Hides a Track from the Library and drops it from every Setlist. The row and the audio file survive, so an Editor can still get the Track back. A public link to a soft-deleted Track says it was removed.
_Avoid_: Archive, remove, trash

**Purge**:
A scheduled job that destroys the audio files behind soft-deleted Tracks. Nothing recovers a purged Track.
_Avoid_: Hard delete, cleanup

## Musical metadata

**Original BPM**:
The source tempo of a Track. Time-stretch measures every change against it.
_Avoid_: Native BPM, file BPM

**Unconfirmed BPM**:
An Original BPM that came from detection and that no Editor has confirmed, usually because the percussion was too sparse to read. It still saves and still plays, it files the Track into a BPM band, and the Library flags the row. On the Play screen the Original BPM readout carries the flag; the Target BPM readout still shows the number without a separate warning.
_Avoid_: Detected BPM, guessed BPM, auto BPM, needs checking

**Target BPM**:
The tempo a Track plays at, taken from the Setlist slot and then the live control. Clamped to ±20% of Original BPM.
_Avoid_: Playback rate, speed, pitch

**Key**:
Musical key stored on a Track, shown but never applied. Defaults to No Key. v1 does not transpose. On the Play screen it is read-only text inside the Playhead circle, not a dropdown or stepper.
_Avoid_: Pitch, transpose, live key control

**Time signature**:
Meter stored on a Track, chosen from 4/4, 3/4, 6/8, 12/8, and 2/4. Defaults to 4/4. On the Play screen it is read-only text inside the Playhead circle, not a Select or dropdown.
_Avoid_: Time sig as a live performance control, editable meter

**Song title**:
Free text on a Track naming a related song, shown on the Play screen under the Display name. It is not a Church OS Song record.
_Avoid_: Song, hymn

## Playback

**Play screen**:
The live player at `/s/{id}` and `/t/{id}`. The Playback frame holds the Route breadcrumb, Playhead circle, Transport bar, and Tempo stepper. Transport fade and the Loop region editor live in Advanced Options, not on the main surface.
_Avoid_: Player page, performance view

**Play screen header**:
The top bar on the Play screen: Church OS mark, the LOOPINATOR title, the Appearance menu, and the hamburger menu for editor routes.
_Avoid_: App bar, navbar, top nav

**Appearance menu**:
The Palette dropdown beside the hamburger holding Theme (Light, Dark, System) and Accent colour. Both save to the browser, so they follow the device rather than the account, and neither reaches the Library.
_Avoid_: Settings, preferences, theme toggle

**Route breadcrumb**:
The row in the Playback frame showing where playback came from and moving between the places it can reach. On a Setlist it holds the Setlist name and the Slot label, each opening its picker, with the Slot navigator beside them. On a single Track it holds the Display name, opening the Track picker, with the Cache indicator beside it.
_Avoid_: Context bar, read-only row, editable Select

**Slot label**:
The position readout for the current Setlist slot in the Route breadcrumb, such as "Track 12". It opens the Slot picker. It is not the Display name.
_Avoid_: Track name, slot number alone

**Slot navigator**:
The paired prev and next controls beside the slot label. They move to the adjacent Setlist slot without opening the Slot picker.
_Avoid_: Skip buttons, queue controls

**Setlist picker**:
The dropdown on the Setlist name in the Route breadcrumb, listing every Setlist. Only an Editor sees it. A Musician holding a Setlist link never learns which other Setlists exist.
_Avoid_: Setlist switcher, breadcrumb menu

**Slot picker**:
The dropdown on the Slot label, listing the Tracks in the Setlist being played. The one picker a Musician gets, since the link already grants that Setlist.
_Avoid_: Queue, slot menu, Track picker (which lists the Library)

**Track picker**:
The dropdown on the Display name in the Route breadcrumb on `/t/{id}`, listing the whole Library. Only an Editor sees it.
_Avoid_: Library dropdown, Slot picker (which lists one Setlist)

**Playhead circle**:
The large ring on the Play screen. It shows Target BPM at performance size without a "Target" label, a separate Original BPM readout, read-only Key, read-only Time signature, Display name, Song title, and the Advanced Options entry. The green ring is the Playhead.
_Avoid_: BPM dial, tempo wheel, progress ring (without playhead meaning)

**Target BPM readout**:
The large tempo figure inside the Playhead circle, formatted like the wireframe ("154 BPM"). It reflects the live Target BPM, not the Original BPM.
_Avoid_: Target tempo label, playback speed display

**Original BPM readout**:
A dedicated row inside the Playhead circle, directly under the Target BPM readout and above Key and Time signature, in smaller type. It shows the Track's Original BPM from upload and does not change when the Tempo stepper adjusts Target BPM.
_Avoid_: Source BPM label, file tempo, native BPM

**Playhead**:
The current position inside the Loop region. The green stroke on the Playhead circle tracks it through one Loop cycle and wraps.

**Transport bar**:
The primary playback control below the Playhead circle. One large button: Play while stopped, Pause while playing, Restart while paused after a Pause. There is no always-visible split Play and Pause pair.
_Avoid_: Transport controls (plural), dual transport

**Tempo stepper**:
The +/- control on the main Play screen that adjusts Target BPM by 1 per tap, or by 3 while held. Key has no stepper on the Play screen.
_Avoid_: Tempo slider, pitch control, Key stepper

**Pause**:
Freezes the Playhead and silences audio. The Transport bar control then shows Restart.

**Restart**:
Snaps the Playhead to the In-point and stays paused. Shown on the Transport bar after Pause, not beside a separate Pause button.

**Advanced Options**:
The bottom sheet reached from the Playhead circle, holding the region editor, Transport fade, Reset this device, and Save for everyone.
_Avoid_: Advanced Settings, settings modal, centered dialog

**Local override**:
Advanced Options changes kept on one device. Playback reads the Local override first, then the Setlist slot, then the Track default.

**Override dot**:
The marker on the Advanced Options button meaning a Local override is active on this device. It is not the Cache indicator.

**Offline cache**:
The Setlist metadata and Track audio a device stores when a Play screen opens, so the whole screen still works with no network. It expires 30 days after that device last opened it.
_Avoid_: Ready, download, sync

**Cache indicator**:
The marker beside the Setlist or Track name showing whether it can play offline. It is not the Override dot.

**Unavailable Track**:
A Setlist slot whose audio never finished caching and cannot be fetched now. The Play screen says so instead of failing at Play.
_Avoid_: Missing, broken, error

**Reset this device**:
Clears the Local override for the current Track or Setlist slot so playback falls back to the cloud. It writes nothing to the Library.

**Save for everyone**:
A write that needs a signed-in account. From a Setlist it copies Loop region, Target BPM, and Transport fade onto that Setlist slot. From upload or `/t/{id}` it writes the Track default, which new slots inherit until they hold a copy.

**Transport fade**:
The envelope on Play, Pause, and Restart, measured in seconds. Linear (default), exponential, or equal-power. A displayed 0 s runs a 10 to 20 ms click-safe envelope. Adjusted only inside Advanced Options, not on the main Play screen.
_Avoid_: Crossfade, seam, loop fade, fade in/out on main screen

**Seam crossfade**:
The crossfade at the wrap from Out-point back to In-point, set in the region editor. Defaults to 5 ms and reaches about 50 ms.
_Avoid_: Fade in/out, Transport fade
