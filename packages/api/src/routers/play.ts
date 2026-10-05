import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../index";

const trackPlayFields = {
  id: true,
  name: true,
  originalBPM: true,
  bpmAutoDetected: true,
  keyCenter: true,
  keyMode: true,
  keyAutoDetected: true,
  timeSignature: true,
  inPoint: true,
  outPoint: true,
  transportFadeSec: true,
  transportFadeCurve: true,
} as const;

export const playRouter = router({
  track: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const track = await ctx.prisma.track.findUnique({
        where: { id: input.id },
        select: { ...trackPlayFields, softDeleted: true },
      });

      if (!track) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      }
      if (track.softDeleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This track was removed" });
      }

      const { softDeleted: _softDeleted, ...payload } = track;
      return payload;
    }),

  setlist: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const setlist = await ctx.prisma.setlist.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          slots: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
              slotLabel: true,
              targetBpm: true,
              keyCenter: true,
              keyMode: true,
              keyAutoDetected: true,
              timeSignature: true,
              inPoint: true,
              outPoint: true,
              transportFadeSec: true,
              transportFadeCurve: true,
              track: { select: { id: true, name: true, originalBPM: true } },
            },
          },
        },
      });

      if (!setlist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Setlist not found" });
      }
      return setlist;
    }),
});