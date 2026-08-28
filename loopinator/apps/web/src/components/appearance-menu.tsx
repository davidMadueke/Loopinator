import type { ComponentType } from "react";

import { Button } from "@loopinator/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@loopinator/ui/components/dropdown-menu";
import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react";

import { useAppearance } from "@/hooks/use-appearance";
import {
  ACCENTS,
  ACCENT_LABELS,
  ACCENT_SWATCHES,
  type Accent,
  type ThemeMode,
} from "@/lib/appearance";

type ThemeOption = {
  value: ThemeMode;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

// The stock radio item reserves right-hand space for a tick. These tiles and swatches
// show selection through their own border and ring, so the tick is hidden throughout.
const HIDE_TICK = "[&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden";

export function AppearanceMenu() {
  const { theme, accent, setTheme, setAccent } = useAppearance();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" aria-label="Appearance" />}
      >
        <PaletteIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuRadioGroup
          className="grid grid-cols-3 gap-1.5"
          value={theme}
          onValueChange={(value) => setTheme(value as ThemeMode)}
        >
          <DropdownMenuLabel className="col-span-full px-1 py-1">Theme</DropdownMenuLabel>
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className={`flex-col justify-center gap-1.5 border border-border px-0 py-2.5 text-xs font-normal data-checked:border-foreground/40 data-checked:bg-accent data-checked:font-medium data-checked:text-accent-foreground ${HIDE_TICK}`}
            >
              <Icon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          className="grid grid-cols-6 justify-items-center gap-2"
          value={accent}
          onValueChange={(value) => setAccent(value as Accent)}
        >
          <DropdownMenuLabel className="col-span-full justify-self-start px-1 py-1">
            Accent colour
          </DropdownMenuLabel>
          {ACCENTS.map((value) => (
            <AccentSwatch key={value} accent={value} />
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccentSwatch({ accent }: { accent: Accent }) {
  return (
    <DropdownMenuRadioItem
      value={accent}
      aria-label={ACCENT_LABELS[accent]}
      title={ACCENT_LABELS[accent]}
      style={{ backgroundColor: ACCENT_SWATCHES[accent] }}
      className={`size-7 justify-center rounded-full p-0 ring-offset-2 ring-offset-popover data-checked:ring-2 data-checked:ring-foreground data-highlighted:ring-2 data-highlighted:ring-border ${HIDE_TICK}`}
    />
  );
}
