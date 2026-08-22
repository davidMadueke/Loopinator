import { Link } from "@tanstack/react-router";
import { Button } from "@loopinator/ui/components/button";

import { DEMO_SETLISTS } from "@/lib/mock-data";

export function LibrarySetlistsTab() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled>
          Create new
        </Button>
      </div>
      <ul className="divide-y divide-border border border-border">
        {DEMO_SETLISTS.map((setlist) => (
          <li
            key={setlist.id}
            className="flex items-center justify-between gap-3 px-3 py-3"
          >
            <div>
              <Link
                to="/s/$id"
                params={{ id: setlist.id }}
                className="text-sm font-medium hover:underline"
              >
                {setlist.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {setlist.slots.length} tracks · {setlist.cached ? "Cached" : "Online only"}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Edit
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
