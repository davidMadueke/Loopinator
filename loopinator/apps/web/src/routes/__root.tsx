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

import { DevSessionToggle } from "../components/dev-session-toggle";
import Header from "../components/header";
import { DEFAULT_ACCENT, appearanceInitScript } from "../lib/appearance";

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

  // The head script rewrites the class and data-accent below before first paint, so
  // the server markup and the hydrated DOM disagree by design.
  return (
    <html lang="en" className="dark" data-accent={DEFAULT_ACCENT} suppressHydrationWarning>
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
