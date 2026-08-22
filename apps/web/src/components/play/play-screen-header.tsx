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

type PlayScreenHeaderProps = {
  libraryOpen: boolean;
  onLibraryToggle: () => void;
};

export function PlayScreenHeader({ libraryOpen, onLibraryToggle }: PlayScreenHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center border border-border text-[10px] font-semibold tracking-wider">
          CCIC
        </div>
        <span className="text-sm font-semibold tracking-[0.2em]">LOOPINATOR</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Menu" />}>
          <MenuIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onLibraryToggle}>
            {libraryOpen ? "Close library" : "Library"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Setlists</DropdownMenuItem>
          <DropdownMenuItem disabled>Upload</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/login" />}>Login</DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/dashboard" />}>Account</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
