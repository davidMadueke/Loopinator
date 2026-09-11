import type { AppRouter } from "@loopinator/api/routers/index";
import { Toaster } from "@loopinator/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { useLayoutEffect } from "react";

import { DevSessionToggle } from "../components/dev-session-toggle";
import Header from "../components/header";
import { appearanceInitScript } from "../lib/appearance";
import { useAppearanceStore } from "../stores/appearance-store";

import appCss from "../index.css?url";
export interface RouterAppContext {
  trpc: TRPCOptionsProxy<AppRouter>;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Loopinator",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  const isPlayRoute = useRouterState({
    select: (state) => /^\/(s|t)\//.test(state.location.pathname),
  });
  const accent = useAppearanceStore((state) => state.accent);
  const hydrate = useAppearanceStore((state) => state.hydrate);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  // The head script rewrites class and data-accent before first paint. After hydrate,
  // data-accent follows the store so a later root render cannot pin it back to Neutral.
  return (
    <html lang="en" className="dark" data-accent={accent} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: appearanceInitScript }} />
      </head>
      <body>
        {isPlayRoute ? (
          <Outlet />
        ) : (
          <div className="grid h-svh grid-rows-[auto_1fr]">
            <Header />
            <Outlet />
          </div>
        )}
        <DevSessionToggle />
        <Toaster richColors />
        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
