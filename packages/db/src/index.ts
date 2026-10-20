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

export function createPrismaClient(overrides?: {
  url?: string;
  authToken?: string;
}): PrismaClient {
  const adapter = new PrismaLibSql({
    url: overrides?.url ?? env.DATABASE_URL,
    authToken: overrides?.authToken ?? env.TURSO_AUTH_TOKEN,
  });

  return new PrismaClient({ adapter });
}

const prisma: PrismaClient = createPrismaClient();
export default prisma;
