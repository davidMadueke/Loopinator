export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const ACCENTS = ["neutral", "green", "blue", "violet", "amber", "rose"] as const;
export type Accent = (typeof ACCENTS)[number];

/** Swatch fills for the picker. Hard-coded rather than read from --primary so every
 *  option previews its own colour instead of the one currently applied. */
export const ACCENT_SWATCHES: Record<Accent, string> = {
  neutral: "oklch(0.556 0 0)",
  green: "oklch(0.723 0.219 149.579)",
  blue: "oklch(0.623 0.214 259.815)",
  violet: "oklch(0.606 0.25 292.717)",
  amber: "oklch(0.828 0.189 84.429)",
  rose: "oklch(0.645 0.246 16.439)",
};

export const ACCENT_LABELS: Record<Accent, string> = {
  neutral: "Neutral",
  green: "Green",
  blue: "Blue",
  violet: "Violet",
  amber: "Amber",
  rose: "Rose",
};

export const THEME_STORAGE_KEY = "loopinator.theme";
export const ACCENT_STORAGE_KEY = "loopinator.accent";

export const DEFAULT_THEME: ThemeMode = "dark";
export const DEFAULT_ACCENT: Accent = "neutral";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

export function isAccent(value: unknown): value is Accent {
  return ACCENTS.includes(value as Accent);
}

export function resolveTheme(theme: ThemeMode): "light" | "dark" {
  if (theme !== "system") {
    return theme;
  }

  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function applyAppearance(theme: ThemeMode, accent: Accent) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolveTheme(theme) === "dark");
  root.setAttribute("data-accent", accent);
}

export function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function readStoredAccent(): Accent {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return isAccent(stored) ? stored : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function storeTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private-mode or blocked storage: the choice still applies for this session.
  }
}

export function storeAccent(accent: Accent) {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    // Private-mode or blocked storage: the choice still applies for this session.
  }
}

export function watchSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Runs in <head> before first paint so a stored light theme or accent never flashes
 *  the server-rendered defaults. Must stay dependency-free and self-contained. */
export const appearanceInitScript = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var a=localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});
if(${JSON.stringify(THEME_MODES)}.indexOf(t)===-1){t=${JSON.stringify(DEFAULT_THEME)};}
if(${JSON.stringify(ACCENTS)}.indexOf(a)===-1){a=${JSON.stringify(DEFAULT_ACCENT)};}
var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;
d.classList.toggle("dark",r==="dark");
d.setAttribute("data-accent",a);
}catch(e){}})();`;
