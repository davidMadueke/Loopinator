import { createFileRoute } from "@tanstack/react-router";

import { LoopPreviewDevTest } from "@/components/dev/loop-preview-dev-test";

export const Route = createFileRoute("/dev/loop-preview")({
  component: LoopPreviewDevTest,
});
