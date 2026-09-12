# Three-band Target BPM on Setlist edit

ADR-0004 clamps Time-stretch to ±20% of Original BPM because drums sound bad outside that. Setlist edit still needs a half-time or double-time bed, so legal Target BPM is three bands around half, original, and double Original BPM, each ±20%. Gaps between those bands stay illegal. Typing, Tap tempo, and the Tempo stepper stay in the current band. Half/double on the Setlist expand panel scales the current Target BPM and may enter another band. The Play screen has no Half/double. It plays the saved Target BPM and its stepper stays in that band. Stretch quality in the half and double bands is accepted so Sunday can save those tempos.

## Considered options

- Keep ±20% of Original everywhere: Half/double on a slot is useless.
- Put Half/double on the Play screen: Sunday can jump bands live, which we do not want.
- Save 240 but play 144: the slot editor would lie.
