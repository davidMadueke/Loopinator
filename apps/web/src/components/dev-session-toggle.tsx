import { Button } from "@loopinator/ui/components/button";
import { useContext } from "react";

import { SessionSourceContext } from "@/components/session-provider";
import { useSession } from "@/hooks/use-session";
import { useDevSessionStore } from "@/stores/dev-session-store";

/**
 * Flips the dummy session while editor UI is being built. Renders nothing once the
 * Better Auth source is active, so it can stay mounted in __root.tsx.
 */
export function DevSessionToggle() {
  const source = useContext(SessionSourceContext);
  const { editor, isLoading } = useSession();
  const signIn = useDevSessionStore((state) => state.signIn);
  const signOut = useDevSessionStore((state) => state.signOut);

  if (source.name !== "dev" || isLoading) {
    return null;
  }

  return (
    <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/90 py-1 pl-3 pr-1 text-xs shadow-sm backdrop-blur">
      <span className="text-muted-foreground">
        Dev session: {editor ? editor.name : "signed out"}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-6 rounded-full px-2 text-xs"
        onClick={editor ? signOut : signIn}
      >
        {editor ? "Sign out" : "Sign in"}
      </Button>
    </div>
  );
}
