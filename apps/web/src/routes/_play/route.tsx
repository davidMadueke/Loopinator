import { DiscardProgressDialog } from "@/components/play/discard-progress-dialog";
import { useLibraryCreateStore } from "@/stores/library-create-store";
import { Outlet, createFileRoute, useBlocker } from "@tanstack/react-router";

export const Route = createFileRoute("/_play")({
  component: PlayLayout,
});



function PlayLayout() {
  const resetProgress = useLibraryCreateStore((state) => state.resetProgress);

  const blocker = useBlocker({
    shouldBlockFn: () => useLibraryCreateStore.getState().hasProgress,
    withResolver: true,
    enableBeforeUnload: false
  })

  return (
  <>
  <DiscardProgressDialog
      open={blocker.status === "blocked"}
      onOpenChange={
        (open) =>
        {
          if (!open && blocker.status === "blocked")
          { blocker.reset();}
        }
      } 
      onDiscard={() => {
        if (blocker.status !== "blocked") { 
          return; 
        }
        resetProgress();
        blocker.proceed();
      }}
      />
  <Outlet />
  </>
  )
}
