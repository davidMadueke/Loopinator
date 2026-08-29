import { useEffect } from "react";

import { useDevSessionStore } from "@/stores/dev-session-store";

import { DEV_EDITOR } from "./dev-editor";
import {
  LOADING_SESSION,
  SIGNED_OUT_SESSION,
  signedInSession,
  type SessionSource,
  type SessionState,
} from "./types";

function toSessionState(signedIn: boolean, hydrated: boolean): SessionState {
  if (!hydrated) {
    return LOADING_SESSION;
  }

  return signedIn ? signedInSession(DEV_EDITOR) : SIGNED_OUT_SESSION;
}

/** Fakes a session from a localStorage flag so editor-only UI can be built before
 *  invite-code sign-up exists. DevSessionToggle flips it. */
export const devSessionSource: SessionSource = {
  name: "dev",

  useSession() {
    const signedIn = useDevSessionStore((state) => state.signedIn);
    const hydrated = useDevSessionStore((state) => state.hydrated);
    const hydrate = useDevSessionStore((state) => state.hydrate);

    // The server render cannot know the stored flag, so it reports "loading" and this
    // catches up on the client, the same shape Better Auth's isPending gives us.
    useEffect(() => {
      hydrate();
    }, [hydrate]);

    return toSessionState(signedIn, hydrated);
  },

  async readSession() {
    const store = useDevSessionStore.getState();
    store.hydrate();

    return toSessionState(useDevSessionStore.getState().signedIn, true);
  },

  async signOut() {
    useDevSessionStore.getState().signOut();
  },
};
