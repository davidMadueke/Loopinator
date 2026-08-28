import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@loopinator/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@loopinator/ui/components/card";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const trpc = useTRPC();
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[0.15em]">LOOPINATOR</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gapless worship percussion loops. Open a Play link below to try the front-end prototype.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Setlist play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Public route: <code className="text-foreground">/s/&#123;id&#125;</code>
            </p>
            <Button render={<Link to="/s/$id" params={{ id: "x3f8s2" }} />}>
              Open Sunday AM
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Single track play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Public route: <code className="text-foreground">/t/&#123;id&#125;</code>
            </p>
            <Button
              variant="outline"
              render={<Link to="/t/$id" params={{ id: "n4w8q1" }} />}
            >
              Open Shaker Groove
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 font-medium">Dev</h2>
        <Button variant="outline" render={<Link to="/dev/loop-preview" />}>
          Loop preview dev test
        </Button>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 font-medium">API status</h2>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-muted-foreground text-sm">
            {healthCheck.isLoading
              ? "Checking..."
              : healthCheck.data
                ? "Connected"
                : "Disconnected (Play UI still works with mock data)"}
          </span>
        </div>
      </section>
    </div>
  );
}
