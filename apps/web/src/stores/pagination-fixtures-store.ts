import { create } from "zustand";

type PaginationFixturesStore = {
  enabled: boolean;
  toggle: () => void;
};

export const usePaginationFixturesStore = create<PaginationFixturesStore>((set) => ({
  enabled: false,
  toggle: () => set((state) => ({ enabled: !state.enabled })),
}));
