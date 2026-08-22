import { cn } from "@loopinator/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-trigger"
      className={cn(
        "inline-flex h-8 min-w-0 items-center justify-between gap-2 border border-input bg-background px-2.5 text-xs text-foreground",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
    </div>
  );
}

export { SelectTrigger };
