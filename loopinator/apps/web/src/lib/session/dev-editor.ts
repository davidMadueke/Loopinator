import type { Editor } from "./types";

export const DEV_SESSION_STORAGE_KEY = "loopinator.devSession";

/** Stand-in Editor for the dev session source. No server ever sees it, so a faked
 *  sign-in unlocks editor UI and nothing else: writes still hit protectedProcedure. */
export const DEV_EDITOR: Editor = {
  id: "dev-editor",
  name: "Dev Editor",
  email: "dev@loopinator.local",
};

export function readStoredDevSignedIn(): boolean {
  try {
    return localStorage.getItem(DEV_SESSION_STORAGE_KEY) === "signed-in";
  } catch {
    return false;
  }
}

export function storeDevSignedIn(signedIn: boolean) {
  try {
    if (signedIn) {
      localStorage.setItem(DEV_SESSION_STORAGE_KEY, "signed-in");
      return;
    }

    localStorage.removeItem(DEV_SESSION_STORAGE_KEY);
  } catch {
    // Private-mode or blocked storage: the choice still applies for this session.
  }
}
