import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "apps/server/.env") });
config({ path: resolve(root, ".env.vercel.development") });

if (process.env.DB_TURSO_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DB_TURSO_DATABASE_URL;
}
if (process.env.DB_TURSO_AUTH_TOKEN) {
  process.env.TURSO_AUTH_TOKEN = process.env.DB_TURSO_AUTH_TOKEN;
}

const { appRouter } = await import("../packages/api/src/routers/index.ts");
const { createPrismaClient } = await import("../packages/db/src/index.ts");

const prisma = createPrismaClient();
const caller = appRouter.createCaller({ prisma, session: null });

try {
  const track = await caller.play.track({ id: "k7m2p9" });
  console.log(`play.track k7m2p9 ${track.name} bpm=${track.originalBPM} blobVersion=${track.blobVersion}`);

  const setlist = await caller.play.setlist({ id: "p5d1m8" });
  console.log(`play.setlist p5d1m8 ${setlist.name} slots=${setlist.slots.length}`);

  const signed = await caller.audio.forTrack({ trackId: "k7m2p9" });
  const response = await fetch(signed.url);
  const bytes = await response.arrayBuffer();
  console.log(
    `audio.forTrack k7m2p9 status=${response.status} type=${response.headers.get("content-type")} bytes=${bytes.byteLength}`,
  );
  if (!response.ok || bytes.byteLength < 1000) {
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
