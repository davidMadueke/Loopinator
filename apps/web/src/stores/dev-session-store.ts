import { create } from "zustand";

import { readStoredDevSignedIn, storeDevSignedIn } from "@/lib/session/dev-editor";

type DevSessionStore = {
  signedIn: boolean;
  /** True once the stored choice has been read on the client. */
  hydrated: boolean;
  hydrate: () => void;
  signIn: () => void;
  signOut: () => void;
};

export const useDevSessionStore = create<DevSessionStore>((set, get) => ({
  signedIn: false,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) {
      return;
    }

    set({ signedIn: readStoredDevSignedIn(), hydrated: true });
  },
  signIn: () => {
    set({ signedIn: true, hydrated: true });
    storeDevSignedIn(true);
  },
  signOut: () => {
    set({ signedIn: false, hydrated: true });
    storeDevSignedIn(false);
  },
}));
