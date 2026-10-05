import { auth } from "@loopinator/auth";
import prisma, { type PrismaClient } from "@loopinator/db";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function createContext(
  opts: CreateExpressContextOptions,
): Promise<{ prisma: PrismaClient; session: Session }> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });
  return {
    prisma,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
