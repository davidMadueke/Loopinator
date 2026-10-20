import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

for (const relative of [".env.local", ".env.vercel.development"]) {
  const path = resolve(root, relative);
  if (existsSync(path)) {
    config({ path, override: false });
  }
}
