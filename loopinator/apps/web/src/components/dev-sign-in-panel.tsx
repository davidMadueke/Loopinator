import { Button } from "@loopinator/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { DEV_EDITOR } from "@/lib/session/dev-editor";
import { useDevSessionStore } from "@/stores/dev-session-store";

/** Stands in for SignInForm while the dev session source is active, so /login still
 *  ends with a signed-in Editor without a running apps/server. */
export default function DevSignInPanel() {
  const navigate = useNavigate();
  const signIn = useDevSessionStore((state) => state.signIn);

  return (
    <div className="mx-auto mt-10 w-full max-w-md space-y-4 p-6">
      <h1 className="text-center text-3xl font-bold">Dev sign-in</h1>
      <p className="text-center text-sm text-muted-foreground">
        The dummy session source is active. No password, no invite code, no server call.
        Set VITE_SESSION_SOURCE=better-auth for the real forms.
      </p>
      <Button
        className="w-full"
        onClick={() => {
          signIn();
          toast.success(`Signed in as ${DEV_EDITOR.name}`);
          navigate({ to: "/dashboard" });
        }}
      >
        Sign in as {DEV_EDITOR.name}
      </Button>
    </div>
  );
}
