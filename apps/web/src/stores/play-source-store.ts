import { create } from "zustand";

export type PlaySource = "mock" | "api";

type PlaySourceStore = {
  source: PlaySource;
  setSource: (source: PlaySource) => void;
};

function isDevBuild() {
  return import.meta.env?.DEV !== false;
}

/** Production builds always resolve to API, even if the store still says mock. */
export function resolvePlaySource(
  stored: PlaySource,
  isDev: boolean = isDevBuild(),
): PlaySource {
  return isDev ? stored : "api";
}

export const usePlaySourceStore = create<PlaySourceStore>((set) => ({
  source: "mock",
  setSource: (source) => set({ source }),
}));

export function getEnableMockData() {
  return resolvePlaySource(usePlaySourceStore.getState().source) === "mock";
}

export function getEnableApiData() {
  return resolvePlaySource(usePlaySourceStore.getState().source) === "api";
}

export function selectEnableMockData(state: PlaySourceStore) {
  return resolvePlaySource(state.source) === "mock";
}

export function selectEnableApiData(state: PlaySourceStore) {
  return resolvePlaySource(state.source) === "api";
}
