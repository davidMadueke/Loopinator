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

const clientTheme = typeof window === "undefined" ? DEFAULT_THEME : readStoredTheme();
const clientAccent = typeof window === "undefined" ? DEFAULT_ACCENT : readStoredAccent();

export const useAppearanceStore = create<AppearanceStore>((set, get) => ({
  theme: clientTheme,
  accent: clientAccent,
  hydrated: false,
  hydrate: () => {
    if (!get().hydrated) {
      set({ theme: readStoredTheme(), accent: readStoredAccent(), hydrated: true });
    }
    const { theme, accent } = get();
    applyAppearance(theme, accent);
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
