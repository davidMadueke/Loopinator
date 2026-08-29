import { authClient } from "@/lib/auth-client";

import {
  LOADING_SESSION,
  SIGNED_OUT_SESSION,
  signedInSession,
  type Editor,
  type SessionSource,
} from "./types";

type BetterAuthUser = {
  id: string;
  name: string;
  email: string;
};

function toEditor(user: BetterAuthUser): Editor {
  return { id: user.id, name: user.name, email: user.email };
}

/** The real source. It needs a running apps/server, and sign-in itself still goes through
 *  SignInForm rather than this object, since credentials differ per provider. */
export const betterAuthSessionSource: SessionSource = {
  name: "better-auth",

  useSession() {
    const { data, isPending } = authClient.useSession();

    if (isPending) {
      return LOADING_SESSION;
    }

    return data ? signedInSession(toEditor(data.user)) : SIGNED_OUT_SESSION;
  },

  async readSession() {
    const { data } = await authClient.getSession();

    return data ? signedInSession(toEditor(data.user)) : SIGNED_OUT_SESSION;
  },

  async signOut() {
    await authClient.signOut();
  },
};
