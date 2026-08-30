import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@loopinator/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@loopinator/ui/components/dropdown-menu";
import { MenuIcon } from "lucide-react";

import { AppearanceMenu } from "@/components/appearance-menu";
import { useSession } from "@/hooks/use-session";

type PlayScreenHeaderProps = {
  libraryOpen: boolean;
  onLibraryToggle: () => void;
  advancedOpen: boolean;
  onAdvancedClose: () => void;
  transport: ReactNode;
  transportExpanded: boolean;
};

export function PlayScreenHeader({
  libraryOpen,
  onLibraryToggle,
  advancedOpen,
  onAdvancedClose,
  transport,
  transportExpanded,
}: PlayScreenHeaderProps) {
  const { isSignedIn, isLoading } = useSession();
  const panelOpen = libraryOpen || advancedOpen;

  return (
    <header className="sticky top-0 z-30 flex items-center border-b border-border bg-background px-4 py-3">
      {panelOpen ? null : (
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex size-8 items-center justify-center border border-border text-[10px] font-semibold tracking-wider">
            CCIC
          </div>
          <span className="text-sm font-semibold tracking-[0.2em]">LOOPINATOR</span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 items-center justify-center">
        {/* min-w-0 plus a zero flex basis keeps this column sized by the header's free
            space; the transport island measures it and would otherwise inflate it. */}
        <div className="flex min-w-0 w-full max-w-215 items-center gap-2">
          {panelOpen ? transport : null}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {libraryOpen && !transportExpanded ? (
              <Button variant="outline" onClick={onLibraryToggle}>
                Close library
              </Button>
            ) : null}
            {advancedOpen && !transportExpanded ? (
              <Button variant="outline" className="text-playhead" onClick={onAdvancedClose}>
                Close advanced options
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AppearanceMenu />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Menu" />}>
            <MenuIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* The menu only mounts on open, by which time the source has answered, so
                holding the items back while loading costs nothing and avoids a label swap. */}
            {isLoading ? null : isSignedIn ? (
              <>
                <DropdownMenuItem onClick={onLibraryToggle}>
                  {libraryOpen ? "Close library" : "Library"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/dashboard" />}>Account</DropdownMenuItem>
              </>
            ) : (
              <>
                {/* ADR-0002: a Musician still sees the editor route, it just lands on /login. */}
                <DropdownMenuItem render={<Link to="/login" />}>Library</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/login" />}>Login</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
