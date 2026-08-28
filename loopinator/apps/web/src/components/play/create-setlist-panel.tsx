import { useEffect, useState } from "react";
import { Button } from "@loopinator/ui/components/button";
import { Input } from "@loopinator/ui/components/input";
import { Label } from "@loopinator/ui/components/label";

import {
  hasCreateSetlistProgress,
  INITIAL_CREATE_SETLIST_FORM,
  type CreateSetlistFormState,
} from "./create-form-state";

type CreateSetlistPanelProps = {
  onProgressChange: (hasProgress: boolean) => void;
};

export function CreateSetlistPanel({ onProgressChange }: CreateSetlistPanelProps) {
  const [form, setForm] = useState<CreateSetlistFormState>(INITIAL_CREATE_SETLIST_FORM);

  useEffect(() => {
    onProgressChange(hasCreateSetlistProgress(form));
  }, [form, onProgressChange]);

  return (
    <div className="pt-4">
      <div className="space-y-1 pb-4 ">
        {/* <h2 className="text-base font-medium">Create New Setlist</h2> */}
        <p className="text-sm text-muted-foreground text-center">Setlist creation is not wired up yet.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="setlist-name">Setlist name</Label>
        <Input
          id="setlist-name"
          placeholder="e.g. Sunday 14 Sep"
          value={form.name}
          onChange={(event) => setForm({ name: event.target.value })}
        />
      </div>

      <div className="flex justify-end pt-6">
        <Button disabled>Create Setlist</Button>
      </div>
    </div>
  );
}
