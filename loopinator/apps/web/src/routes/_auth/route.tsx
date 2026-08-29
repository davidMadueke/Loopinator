import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { activeSessionSource } from "@/lib/session/active-source";

export const Route = createFileRoute("/_auth")({
  ssr: false,
  component: AuthLayout,
  beforeLoad: async () => {
    // beforeLoad runs outside React, so it reads the source directly rather than useSession.
    const { editor } = await activeSessionSource.readSession();
    if (!editor) {
      throw redirect({
        to: "/login",
      });
    }
    return { editor };
  },
});

function AuthLayout() {
  return <Outlet />;
}
