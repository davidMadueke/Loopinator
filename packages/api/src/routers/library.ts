import type { MusicalKey, MusicalMode, TimeSignature, Track } from "@loopinator/db";

import { protectedProcedure, router } from "../index";

type LibraryTrack = Omit<Track, "keyCenter" | "keyMode" | "timeSignature"> & {
  keyCenter: MusicalKey;
  keyMode: MusicalMode;
  timeSignature: TimeSignature;
};

export const libraryRouter = router({
    tracks: protectedProcedure.query(
      ({ ctx }): Promise<LibraryTrack[]> =>
        ctx.prisma.track.findMany({
          where: { softDeleted: false },
          orderBy: [{ originalBPM: "asc" }, { name: "asc" }],
        }),
    ),
    setlists: protectedProcedure.query(({ ctx }) =>
      ctx.prisma.setlist.findMany({
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { slots: true } } },
      }),
    ),
  });