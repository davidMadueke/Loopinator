/** A signed-in person. Every account is an Editor: the glossary has no read-only tier. */
export type Editor = {
  id: string;
  name: string;
  email: string;
};

/** "loading" only means the source has not answered yet, not that a Musician is signed out. */
export type SessionStatus = "loading" | "signed-out" | "signed-in";

export type SessionState = {
  status: SessionStatus;
  editor: Editor | null;
};

export const LOADING_SESSION: SessionState = { status: "loading", editor: null };
export const SIGNED_OUT_SESSION: SessionState = { status: "signed-out", editor: null };

export function signedInSession(editor: Editor): SessionState {
  return { status: "signed-in", editor };
}

/**
 * The one thing components see instead of an auth library. Swapping the implementation
 * (dev dummy today, Better Auth once invite-code sign-up ships) must not touch any caller.
 *
 * `useSession` is a real React hook, so a source has to stay fixed for the life of the tree.
 * Pick it once at startup; never swap it on a live render.
 */
export type SessionSource = {
  name: SessionSourceName;
  useSession(): SessionState;
  /** Imperative read for route `beforeLoad` and anything else outside React. */
  readSession(): Promise<SessionState>;
  signOut(): Promise<void>;
};

export const SESSION_SOURCE_NAMES = ["dev", "better-auth"] as const;
export type SessionSourceName = (typeof SESSION_SOURCE_NAMES)[number];
