# Save unconfirmed detected BPM

Church OS says a human confirms ambiguous writes. Loopinator bends that for tempo. BPM detection often misreads sparse percussion, but blocking Save behind a typed BPM stops an Editor uploading a loop they have not measured yet. Create Track saves the guess as an Auto-detected BPM even when confidence is low, flags it in the Library, and lets an Editor correct it later by typing, Tap tempo, or Half/double. Replacing or removing the file resets every Create Track field, then detection fills Original BPM and Key from the new file. Time-stretch still works, so a wrong Original BPM shows up as a Target BPM that feels off rather than a Track nobody can play.

The UI term is Auto-detected BPM (formerly Unconfirmed BPM). The save rule is the same.
