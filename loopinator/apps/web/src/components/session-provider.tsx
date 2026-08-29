import { createContext, type ReactNode } from "react";

import { activeSessionSource } from "@/lib/session/active-source";
import type { SessionSource } from "@/lib/session/types";

export const SessionSourceContext = createContext<SessionSource>(activeSessionSource);

type SessionProviderProps = {
  /** Pass a source to override the flag, for a test or a story. */
  source?: SessionSource;
  children: ReactNode;
};

export function SessionProvider({ source = activeSessionSource, children }: SessionProviderProps) {
  return <SessionSourceContext.Provider value={source}>{children}</SessionSourceContext.Provider>;
}
