import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_play")({
  component: PlayLayout,
});

function PlayLayout() {
  return <Outlet />;
}
