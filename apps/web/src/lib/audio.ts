import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  getSetlistById,
  getTrackById,
  getTrackForSlot,
} from "@/lib/dev/mock-data";
import {
  isTrackAudioCached,
} from "@/lib/offline-cache/audio-cache";
import {
  readPlayPayload,
  touchPlayPayload,
  writePlayPayload,
} from "@/lib/offline-cache/play-payload-cache";
import {
  mapPlaySetlist,
  mapPlayTrack,
  uniqueLiveTracks,
  type PlaySetlistDto,
  type PlayTrackDto,
} from "@/lib/play-payload";
import { playLoadState, type Setlist, type Track } from "@/lib/play-types";
import {
  getEnableMockData,
  resolvePlaySource,
  usePlaySourceStore,
} from "@/stores/play-source-store";

export type PlaySourceDeps = {
  playTrack?: (id: string) => Promise<PlayTrackDto>;
  playSetlist?: (id: string) => Promise<PlaySetlistDto>;
};

async function queryPlayTrack(id: string, deps: PlaySourceDeps): Promise<PlayTrackDto> {
  if (deps.playTrack) {
    return deps.playTrack(id);
  }
  const { trpcClient } = await import("@/utils/trpc-client");
  return trpcClient.play.track.query({ id });
}

async function queryPlaySetlist(id: string, deps: PlaySourceDeps): Promise<PlaySetlistDto> {
  if (deps.playSetlist) {
    return deps.playSetlist(id);
  }
  const { trpcClient } = await import("@/utils/trpc-client");
  return trpcClient.play.setlist.query({ id });
}

async function cachedFlag(trackId: string, blobVersion: number) {
  return isTrackAudioCached(trackId, blobVersion);
}

async function setlistCached(setlist: Setlist) {
  const live = uniqueLiveTracks(setlist);
  if (live.length === 0) {
    return false;
  }
  const flags = await Promise.all(
    live.map((track) => isTrackAudioCached(track.trackId, track.blobVersion)),
  );
  return flags.every(Boolean);
}

export async function getPlayTrack(
  id: string,
  deps: PlaySourceDeps = {},
): Promise<Track | undefined> {
  if (getEnableMockData()) {
    return getTrackById(id);
  }

  const routeKey = `/t/${id}`;
  try {
    const dto = await queryPlayTrack(id, deps);
    writePlayPayload(routeKey, dto);
    return mapPlayTrack(dto, await cachedFlag(dto.id, dto.blobVersion));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("play.track failed", error);
    }
    const stored = readPlayPayload<PlayTrackDto>(routeKey);
    if (!stored) {
      return undefined;
    }
    touchPlayPayload(routeKey);
    return mapPlayTrack(stored, await cachedFlag(stored.id, stored.blobVersion));
  }
}

export async function getPlaySetlist(
  id: string,
  deps: PlaySourceDeps = {},
): Promise<Setlist | undefined> {
  if (getEnableMockData()) {
    return getSetlistById(id);
  }

  const routeKey = `/s/${id}`;
  try {
    const dto = await queryPlaySetlist(id, deps);
    writePlayPayload(routeKey, dto);
    const mapped = mapPlaySetlist(dto, false);
    return { ...mapped, cached: await setlistCached(mapped) };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("play.setlist failed", error);
    }
    const stored = readPlayPayload<PlaySetlistDto>(routeKey);
    if (!stored) {
      return undefined;
    }
    touchPlayPayload(routeKey);
    const mapped = mapPlaySetlist(stored, false);
    return { ...mapped, cached: await setlistCached(mapped) };
  }
}

export async function getPlayTrackForSlot(
  setlist: Setlist,
  slotIndex: number,
  deps: PlaySourceDeps = {},
): Promise<Track | undefined> {
  if (getEnableMockData()) {
    return getTrackForSlot(setlist, slotIndex);
  }

  const slot = setlist.slots[slotIndex];
  if (!slot) {
    return undefined;
  }
  if (slot.track) {
    return slot.track;
  }
  return getPlayTrack(slot.trackId, deps);
}

function withPlayLoadState<T>(query: UseQueryResult<T | null>) {
  return {
    ...query,
    loadState: playLoadState(query.isPending, query.data),
  };
}

export function usePlayTrack(id: string) {
  const source = usePlaySourceStore((state) => resolvePlaySource(state.source));
  return withPlayLoadState(
    useQuery({
      queryKey: ["play", "track", source, id],
      queryFn: async () => (await getPlayTrack(id)) ?? null,
    }),
  );
}

export function usePlaySetlist(id: string) {
  const source = usePlaySourceStore((state) => resolvePlaySource(state.source));
  return withPlayLoadState(
    useQuery({
      queryKey: ["play", "setlist", source, id],
      queryFn: async () => (await getPlaySetlist(id)) ?? null,
    }),
  );
}

export function useSetlistTrack(setlist: Setlist | undefined, slotIndex: number) {
  const source = usePlaySourceStore((state) => resolvePlaySource(state.source));
  const slot = setlist?.slots[slotIndex];
  return withPlayLoadState(
    useQuery({
      queryKey: ["play", "slot-track", source, setlist?.id, slotIndex, slot?.trackId],
      queryFn: async () => {
        if (!setlist) {
          return null;
        }
        return (await getPlayTrackForSlot(setlist, slotIndex)) ?? null;
      },
      enabled: Boolean(setlist),
      initialData: slot?.track,
    }),
  );
}

export async function isSetlistCached(setlist: Setlist) {
  if (!readPlayPayload(`/s/${setlist.id}`)) {
    return false;
  }
  return setlistCached(setlist);
}
