# Soft delete now, purge audio later

Deleting a Track drops it from every Setlist, which can quietly gut a Sunday list a week before the service. The overlay names every affected Setlist and only enables Delete once the Editor types the Display name. Behind that, Delete hides the Track and keeps both the row and the Blob, so a mistake is a database flip. A later scheduled Purge destroys the audio of soft-deleted Tracks, and that step is final.
