import { env } from "@loopinator/env/web";

import { betterAuthSessionSource } from "./better-auth-source";
import { devSessionSource } from "./dev-source";
import type { SessionSource, SessionSourceName } from "./types";

const SOURCES: Record<SessionSourceName, SessionSource> = {
  dev: devSessionSource,
  "better-auth": betterAuthSessionSource,
};

function resolveSessionSource(): SessionSource {
  const requested: SessionSourceName =
    env.VITE_SESSION_SOURCE ?? (import.meta.env.DEV ? "dev" : "better-auth");

  if (requested === "dev" && !import.meta.env.DEV) {
    console.warn(
      "VITE_SESSION_SOURCE=dev in a production build: editor UI unlocks on a localStorage flag.",
    );
  }

  return SOURCES[requested];
}

/**
 * Chosen once per page load. Components should read the source from SessionProvider
 * instead of importing this, so tests and stories can pass their own.
 */
export const activeSessionSource = resolveSessionSource();
