import prisma from "@loopinator/db";
import z from "zod";
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../index";

const URL_TTL_MS = 5 * 60 * 1000;

async function signAudioUrl(pathname: string) {
    const validUntil = Date.now() + URL_TTL_MS;
    const token = await issueSignedToken({
        pathname: pathname,
        operations: ['get'],
        validUntil: validUntil,
      });
    
    const { presignedUrl } = await presignUrl(token, {
        operation: 'get',
        pathname: pathname,
        access: 'private',
        validUntil: validUntil,
    });

    return {url: presignedUrl, validUntil: validUntil}
}

function playable(track: { blobPathname: string; softDeleted: boolean } | null | undefined) {
    if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
    if (track.softDeleted) throw new TRPCError({ code: "NOT_FOUND", message: "This track was removed" });
    return track.blobPathname;
  }

const id = z.string().min(1).max(64);

export const audioRouter = router({
    forTrack: publicProcedure
      .input(z.object({
        trackId: id
      }))
      .query( async ({ input }) => {
        const track = await prisma.track.findUnique({
          where: { id: input.trackId},
          select: { blobPathname: true, softDeleted: true  }
        });
        return signAudioUrl(playable(track));
        }),
    
    forSetlistTrack: publicProcedure
    .input(z.object({
      setlistId: id,
      trackId: id
    }))
    .query( async ({ input }) => {
      // Setlists can have multiple slots with the same underlying track, so only need to fetch the track one time
      const slot = await prisma.setlistSlot.findFirst({
        where: { setlistId: input.setlistId, trackId: input.trackId },
        select: { track: { select: { blobPathname: true, softDeleted: true } } },
      });
      return signAudioUrl(playable(slot?.track));
      }),
  
      
})

