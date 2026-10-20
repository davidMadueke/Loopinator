import { issueSignedToken, presignUrl } from "@vercel/blob";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { publicProcedure, router } from "../index";

const URL_TTL_MS = 5 * 60 * 1000;

async function signAudioUrl(pathname: string) {
  const validUntil = Date.now() + URL_TTL_MS;
  const token = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil,
  });

  const { presignedUrl } = await presignUrl(token, {
    operation: "get",
    pathname,
    access: "private",
    validUntil,
  });

  return { url: presignedUrl, validUntil };
}

function playable(track: { blobPathname: string; softDeleted: boolean } | null | undefined) {
  if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
  if (track.softDeleted) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This track was removed" });
  }
  return track.blobPathname;
}

const id = z.string().min(1).max(64);

export const audioRouter = router({
  forTrack: publicProcedure.input(z.object({ trackId: id })).query(async ({ ctx, input }) => {
    const track = await ctx.prisma.track.findUnique({
      where: { id: input.trackId },
      select: { blobPathname: true, softDeleted: true },
    });
    return signAudioUrl(playable(track));
  }),

  forSetlistTrack: publicProcedure
    .input(z.object({ setlistId: id, trackId: id }))
    .query(async ({ ctx, input }) => {
      // Duplicate slots share one Track, so sign the file once.
      const slot = await ctx.prisma.setlistSlot.findFirst({
        where: { setlistId: input.setlistId, trackId: input.trackId },
        select: { track: { select: { blobPathname: true, softDeleted: true } } },
      });
      return signAudioUrl(playable(slot?.track));
    }),
});
