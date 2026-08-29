import { Button } from "@loopinator/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@loopinator/ui/components/dropdown-menu";
import { Skeleton } from "@loopinator/ui/components/skeleton";
import { Link, useNavigate } from "@tanstack/react-router";

import { useSession } from "@/hooks/use-session";

export default function UserMenu() {
  const navigate = useNavigate();
  const { editor, isLoading, signOut } = useSession();

  if (isLoading) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!editor) {
    return (
      <Link to="/login">
        <Button variant="outline">Sign In</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>{editor.name}</DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{editor.email}</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
