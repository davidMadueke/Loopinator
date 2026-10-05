import { env } from "@loopinator/env/server";
import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../prisma/generated/client";

export type {
  MusicalKey,
  MusicalMode,
  PrismaClient,
  TimeSignature,
  Track,
} from "../prisma/generated/client";

export function createPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql({
    url: env.DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN
  });

  return new PrismaClient({ adapter });
}

const prisma: PrismaClient = createPrismaClient();
export default prisma;
