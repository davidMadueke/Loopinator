import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopinator/ui/components/tabs";

import { LibrarySetlistsTab } from "./library-setlists-tab";
import { LibraryTracksTab } from "./library-tracks-tab";

export function LibraryPanel() {
  return (
    <section className="border-b border-border bg-card/40">
      <div className="mx-auto w-full max-w-[860px] px-4 py-4">
        <Tabs defaultValue="tracks">
          <TabsList>
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
            <TabsTrigger value="setlists">Setlists</TabsTrigger>
          </TabsList>
          <TabsContent value="tracks" className="pt-4">
            <LibraryTracksTab />
          </TabsContent>
          <TabsContent value="setlists" className="pt-4">
            <LibrarySetlistsTab />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
