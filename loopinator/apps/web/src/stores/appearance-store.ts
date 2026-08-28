import { create } from "zustand";

import {
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  applyAppearance,
  readStoredAccent,
  readStoredTheme,
  storeAccent,
  storeTheme,
  type Accent,
  type ThemeMode,
} from "@/lib/appearance";

type AppearanceStore = {
  theme: ThemeMode;
  accent: Accent;
  /** True once the stored choice has been read on the client. */
  hydrated: boolean;
  hydrate: () => void;
  reapply: () => void;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
};

export const useAppearanceStore = create<AppearanceStore>((set, get) => ({
  theme: DEFAULT_THEME,
  accent: DEFAULT_ACCENT,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) {
      return;
    }

    // The head script already wrote these to <html>, so this only catches state up.
    set({ theme: readStoredTheme(), accent: readStoredAccent(), hydrated: true });
  },
  reapply: () => {
    const { theme, accent } = get();
    applyAppearance(theme, accent);
  },
  setTheme: (theme) => {
    set({ theme });
    storeTheme(theme);
    applyAppearance(theme, get().accent);
  },
  setAccent: (accent) => {
    set({ accent });
    storeAccent(accent);
    applyAppearance(get().theme, accent);
  },
}));
