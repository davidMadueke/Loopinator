import { protectedProcedure, publicProcedure, router } from "../index";
import { audioRouter } from "./audio";
import { libraryRouter } from "./library";
import { playRouter } from "./play";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  play: playRouter,
  library: libraryRouter,
  audio: audioRouter
});
export type AppRouter = typeof appRouter;
