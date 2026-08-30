import { Link } from "@tanstack/react-router";
import { Button } from "@loopinator/ui/components/button";
import { cn } from "@loopinator/ui/lib/utils";

import { DEMO_SETLISTS } from "@/lib/mock-data";

type LibrarySetlistsTabProps = {
  activeSetlistId?: string;
};

export function LibrarySetlistsTab({ activeSetlistId }: LibrarySetlistsTabProps) {
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border border border-border">
        {DEMO_SETLISTS.map((setlist) => {
          const isCurrent = setlist.id === activeSetlistId;

          return (
            <li
              key={setlist.id}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-3",
                isCurrent && "pointer-events-none opacity-50",
              )}
            >
              <div className="min-w-0 max-w-4/5 flex-1">
                {isCurrent ? (
                  <span
                    className="block truncate text-sm font-medium text-muted-foreground"
                    title={setlist.name}
                  >
                    {setlist.name}
                  </span>
                ) : (
                  <Link
                    to="/s/$id"
                    params={{ id: setlist.id }}
                    className="block truncate text-sm font-medium hover:underline"
                    title={setlist.name}
                  >
                    {setlist.name}
                  </Link>
                )}
                <p className="truncate text-xs text-muted-foreground">
                  {setlist.slots.length} tracks · {setlist.cached ? "Cached" : "Online only"}
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Edit
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
