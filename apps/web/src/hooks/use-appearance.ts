import { useEffect } from "react";

import { watchSystemTheme } from "@/lib/appearance";
import { useAppearanceStore } from "@/stores/appearance-store";

export function useAppearance() {
  const theme = useAppearanceStore((state) => state.theme);
  const accent = useAppearanceStore((state) => state.accent);
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const setAccent = useAppearanceStore((state) => state.setAccent);
  const hydrate = useAppearanceStore((state) => state.hydrate);
  const reapply = useAppearanceStore((state) => state.reapply);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    return watchSystemTheme(reapply);
  }, [theme, reapply]);

  return { theme, accent, setTheme, setAccent };
}
