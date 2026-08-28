import { create } from "zustand";

export type LibraryDiscardIntent = "close-library" | "return-to-browse";

type LibraryCreateStore = {
  hasProgress: boolean;
  browseResetKey: number;
  discardDialogOpen: boolean;
  discardIntent: LibraryDiscardIntent | null;
  setHasProgress: (hasProgress: boolean) => void;
  resetProgress: () => void;
  requestDiscard: (intent: LibraryDiscardIntent) => "dialog" | "proceeded";
  confirmDiscard: () => LibraryDiscardIntent | null;
  cancelDiscard: () => void;
};

export const useLibraryCreateStore = create<LibraryCreateStore>((set, get) => ({
  hasProgress: false,
  browseResetKey: 0,
  discardDialogOpen: false,
  discardIntent: null,
  setHasProgress: (hasProgress) => set({ hasProgress }),
  resetProgress: () => set({ hasProgress: false }),
  requestDiscard: (intent) => {
    if (get().hasProgress) {
      queueMicrotask(() => set({ discardDialogOpen: true, discardIntent: intent }));
      return "dialog";
    }

    set({ hasProgress: false });
    if (intent === "return-to-browse") {
      set({ browseResetKey: get().browseResetKey + 1 });
    }

    return "proceeded";
  },
  confirmDiscard: () => {
    const intent = get().discardIntent;

    set({
      discardDialogOpen: false,
      discardIntent: null,
      hasProgress: false,
      ...(intent === "return-to-browse" ? { browseResetKey: get().browseResetKey + 1 } : {}),
    });

    return intent;
  },
  cancelDiscard: () => set({ discardDialogOpen: false, discardIntent: null }),
}));
