import { useContext } from "react";

import { SessionSourceContext } from "@/components/session-provider";
import type { Editor, SessionStatus } from "@/lib/session/types";

type UseSessionResult = {
  status: SessionStatus;
  /** Null while loading as well as when signed out. Check status before showing a name. */
  editor: Editor | null;
  isSignedIn: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

/**
 * The only way components read sign-in state. Which source answers is decided in
 * active-source.ts, so no caller knows whether the session is real or faked.
 */
export function useSession(): UseSessionResult {
  const source = useContext(SessionSourceContext);
  const { status, editor } = source.useSession();

  return {
    status,
    editor,
    isSignedIn: status === "signed-in",
    isLoading: status === "loading",
    signOut: source.signOut,
  };
}
