import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.development") });

const url = process.env.DB_TURSO_DATABASE_URL;
const authToken = process.env.DB_TURSO_AUTH_TOKEN;
if (!url?.startsWith("libsql:") || !authToken) {
  throw new Error("Missing Turso url or token");
}

const raw = readFileSync(resolve(root, "packages/db/schema.diff.sql"), "utf8");
const sql = raw
  .split("\n")
  .filter((line) => !line.startsWith("◇") && !line.startsWith("Loaded Prisma"))
  .join("\n");

const statements = sql
  .split(";")
  .map((part) =>
    part
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter((part) => part.length > 0);

const client = createClient({ url, authToken });
for (const statement of statements) {
  try {
    await client.execute(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists")) {
      continue;
    }
    throw error;
  }
}
console.log(`applied ${statements.length} statements to turso`);
