import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { put } from "@vercel/blob";
import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "apps/server/.env") });
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env.vercel.development") });

if (process.env.DB_TURSO_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DB_TURSO_DATABASE_URL;
}
if (process.env.DB_TURSO_AUTH_TOKEN) {
  process.env.TURSO_AUTH_TOKEN = process.env.DB_TURSO_AUTH_TOKEN;
}

const localDb = resolve(root, "packages/db/local.db");
console.log(
  "connected db:",
  process.env.DATABASE_URL?.startsWith("libsql:") ? "turso" : "sqlite-file",
);
const { createPrismaClient } = await import("../packages/db/src/index.ts");
const connected = createPrismaClient();
const local = createPrismaClient({ url: `file:${localDb}` });

type SeedTrack = {
  id: string;
  name: string;
  filename: string;
  originalBPM: number;
  bpmAutoDetected: boolean;
  key: string;
  keyMode: "major" | "minor";
  timeSignature: string;
};

const SEED_TRACKS: SeedTrack[] = [
  {
    id: "k7m2p9",
    name: "Sunday Kick Loop",
    filename: "sunday-kick-loop.wav",
    originalBPM: 120,
    bpmAutoDetected: false,
    key: "D",
    keyMode: "major",
    timeSignature: "4/4",
  },
  {
    id: "n4w8q1",
    name: "Shaker Groove",
    filename: "shaker-groove-154.wav",
    originalBPM: 154,
    bpmAutoDetected: true,
    key: "No Key",
    keyMode: "major",
    timeSignature: "4/4",
  },
  {
    id: "r2t6h5",
    name: "Conga Fill",
    filename: "conga-fill-92.wav",
    originalBPM: 92,
    bpmAutoDetected: false,
    key: "G",
    keyMode: "minor",
    timeSignature: "6/8",
  },
];

const SEED_SETLIST = {
  id: "p5d1m8",
  name: "Rehearsal Wed",
  slots: [
    {
      trackId: "r2t6h5",
      slotLabel: "Track 1",
      targetBpm: 92,
      timeSignature: "6/8",
      key: "G",
      keyMode: "minor" as const,
      position: 0,
    },
    {
      trackId: "k7m2p9",
      slotLabel: "Track 2",
      targetBpm: 118,
      timeSignature: "4/4",
      key: "C",
      keyMode: "major" as const,
      position: 1,
    },
    {
      trackId: "k7m2p9",
      slotLabel: "Half-time Kick",
      targetBpm: 60,
      timeSignature: "4/4",
      key: "D",
      keyMode: "major" as const,
      position: 2,
    },
  ],
};

const KEY_TO_PRISMA: Record<string, string> = {
  "No Key": "NO_KEY",
  C: "C",
  "C#": "C_SHARP",
  Db: "D_FLAT",
  D: "D",
  "D#": "D_SHARP",
  Eb: "E_FLAT",
  E: "E",
  F: "F",
  "F#": "F_SHARP",
  Gb: "G_FLAT",
  G: "G",
  "G#": "G_SHARP",
  Ab: "A_FLAT",
  A: "A",
  "A#": "A_SHARP",
  Bb: "B_FLAT",
  B: "B",
};

const TIME_TO_PRISMA: Record<string, string> = {
  "4/4": "FOUR_FOUR",
  "3/4": "THREE_FOUR",
  "6/8": "SIX_EIGHT",
  "12/8": "TWELVE_EIGHT",
  "2/4": "TWO_FOUR",
};

async function ensureFixtures() {
  const fixturesDir = resolve(root, "apps/web/public/fixtures");
  const missing = SEED_TRACKS.some((track) => !existsSync(resolve(fixturesDir, track.filename)));
  if (!missing) {
    return fixturesDir;
  }
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("bun", ["apps/web/scripts/generate-audio-fixtures.ts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Failed to generate audio fixtures");
  }
  return fixturesDir;
}

async function uploadTrack(track: SeedTrack, fixturesDir: string) {
  const bytes = readFileSync(resolve(fixturesDir, track.filename));
  const pathname = `audio/${track.id}/${track.filename}`;
  const blob = await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "audio/wav",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.pathname;
}

async function seedDatabase(
  prisma: Awaited<ReturnType<typeof createPrismaClient>>,
  pathnames: Record<string, string>,
  label: string,
) {
  for (const track of SEED_TRACKS) {
    const blobPathname = pathnames[track.id];
    if (!blobPathname) {
      throw new Error(`Missing blob pathname for ${track.id}`);
    }
    await prisma.track.upsert({
      where: { id: track.id },
      create: {
        id: track.id,
        name: track.name,
        filename: track.filename,
        blobPathname,
        blobVersion: 1,
        originalBPM: track.originalBPM,
        bpmAutoDetected: track.bpmAutoDetected,
        keyCenter: (KEY_TO_PRISMA[track.key] ?? "NO_KEY") as never,
        keyMode: track.keyMode,
        timeSignature: (TIME_TO_PRISMA[track.timeSignature] ?? "FOUR_FOUR") as never,
      },
      update: {
        name: track.name,
        filename: track.filename,
        blobPathname,
        originalBPM: track.originalBPM,
        bpmAutoDetected: track.bpmAutoDetected,
        keyCenter: (KEY_TO_PRISMA[track.key] ?? "NO_KEY") as never,
        keyMode: track.keyMode,
        timeSignature: (TIME_TO_PRISMA[track.timeSignature] ?? "FOUR_FOUR") as never,
        softDeleted: false,
        deletedAt: null,
      },
    });
  }

  await prisma.setlist.upsert({
    where: { id: SEED_SETLIST.id },
    create: { id: SEED_SETLIST.id, name: SEED_SETLIST.name },
    update: { name: SEED_SETLIST.name },
  });
  await prisma.setlistSlot.deleteMany({ where: { setlistId: SEED_SETLIST.id } });
  await prisma.setlistSlot.createMany({
    data: SEED_SETLIST.slots.map((slot) => ({
      setlistId: SEED_SETLIST.id,
      trackId: slot.trackId,
      position: slot.position,
      slotLabel: slot.slotLabel,
      targetBpm: slot.targetBpm,
      keyCenter: (KEY_TO_PRISMA[slot.key] ?? "NO_KEY") as never,
      keyMode: slot.keyMode,
      timeSignature: (TIME_TO_PRISMA[slot.timeSignature] ?? "FOUR_FOUR") as never,
    })),
  });
  console.log(`${label}: ${SEED_TRACKS.length} tracks, setlist ${SEED_SETLIST.id}`);
}

async function main() {
  const fixturesDir = await ensureFixtures();
  const pathnames: Record<string, string> = {};
  for (const track of SEED_TRACKS) {
    pathnames[track.id] = await uploadTrack(track, fixturesDir);
    console.log(`blob ${track.id} ${pathnames[track.id]}`);
  }

  await seedDatabase(connected, pathnames, "turso");
  await seedDatabase(local, pathnames, "local");

  const serverDb = resolve(root, "apps/server/local.db");
  copyFileSync(localDb, serverDb);
  for (const suffix of ["-wal", "-shm"] as const) {
    const from = `${localDb}${suffix}`;
    if (existsSync(from)) {
      copyFileSync(from, `${serverDb}${suffix}`);
    }
  }
  console.log("copied local db to apps/server/local.db");
}

try {
  await main();
} finally {
  await Promise.all([connected.$disconnect(), local.$disconnect()]);
}
