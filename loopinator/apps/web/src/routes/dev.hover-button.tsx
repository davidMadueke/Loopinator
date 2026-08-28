import { createFileRoute } from "@tanstack/react-router";

import { HoverButtonDevTest } from "@/components/dev/hover-button-dev-test";

export const Route = createFileRoute("/dev/hover-button")({
  component: HoverButtonDevTest,
});
