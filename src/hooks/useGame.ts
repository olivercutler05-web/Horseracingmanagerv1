import { useCallback, useEffect, useRef, useState } from "react";
import * as svc from "@/lib/service";
import type {
  AdvanceSummary, Bet, BreedingPreview, GameCreate, GameState, Horse, Race, Sire,
} from "@/lib/types";
import { getMeta } from "@/lib/service";

// Simple cache + subscribers — React Query isn't installed, so we roll a tiny one.
type Unsub = () => void;
let cache: Record<string, unknown> = {};
const subs = new Set<Unsub>();
const notify = () => subs.forEach((f) => f());

function useCached<T>(key: string, loader: () => Promise<T>, enabled = true): { data?: T; error?: Error; isLoading: boolean; refetch: () => Promise<void> } {
  const [, setTick] = useState(0);
  const ref = useRef<{ key: string; loader: () => Promise<T> }>({ key, loader });
  ref.current = { key, loader };
  const sub = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => { subs.add(sub); return () => { subs.delete(sub); }; }, [sub]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      if (cache[ref.current.key] === undefined || (cache[ref.current.key] as any).__err) {
        try {
          const d = await ref.current.loader();
          if (alive) { cache[ref.current.key] = d; setTick((t) => t + 1); }
        } catch (e) {
          if (alive) { cache[ref.current.key] = { __err: e }; setTick((t) => t + 1); }
        }
      }
    })();
    return () => { alive = false; };
  }, [key, enabled]);
  const raw = cache[key] as any;
  const refetch = useCallback(async () => {
    try { cache[ref.current.key] = await ref.current.loader(); }
    catch (e) { cache[ref.current.key] = { __err: e }; }
    setTick((t) => t + 1); notify();
  }, []);
  if (raw && raw.__err) return { error: raw.__err as Error, isLoading: false, refetch };
  return { data: raw as T, isLoading: raw === undefined && enabled, refetch };
}

export function invalidateAll() { cache = {}; notify(); }

// ---------- queries ----------
export const useGame = () => useCached<GameState>("game", () => svc.getGame());
export const useMeta = () => useCached("meta", () => Promise.resolve(getMeta()));
export const useHorses = () => useCached<Horse[]>("horses", () => svc.listHorses());
export const useHorse = (id: string | undefined) => useCached<Horse>(`horse:${id}`, () => svc.getHorse(id!), !!id);
export const useMarket = () => useCached<Horse[]>("market", () => svc.listMarket());
export const useRaces = (week?: number, state?: string) =>
  useCached<Race[]>(`races:${week ?? "cur"}:${state ?? "all"}`, () => svc.listRaces(week, state));
export const useEnteredRaces = () => useCached<Race[]>("entered", () => svc.listEnteredRaces());
export const useFeatures = () => useCached<Race[]>("features", () => svc.listFeatures());
export const useRace = (id: string | undefined) => useCached<Race>(`race:${id}`, () => svc.getRace(id!), !!id);
export const useBets = () => useCached<Bet[]>("bets", () => svc.listBets());
export const useSires = () => useCached<Sire[]>("sires", () => svc.listSires());
export const useBreedingPreview = (mareId?: string, sireId?: string) =>
  useCached<BreedingPreview>(`preview:${mareId}:${sireId}`, () => svc.breedingPreview(mareId!, sireId!), !!mareId && !!sireId);

// ---------- mutations ----------
function useMut<TArgs extends any[], TRes>(fn: (...args: TArgs) => Promise<TRes>) {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mutate = useCallback(async (...args: TArgs) => {
    setPending(true); setError(null);
    try { const r = await fn(...args); invalidateAll(); return r; }
    catch (e) { setError(e as Error); throw e; }
    finally { setPending(false); }
  }, [fn]);
  return { mutate, isPending, error };
}

export const useCreateGame = () => useMut((b: GameCreate) => svc.createGame(b));
export const useAdvanceWeek = () => useMut(() => svc.advanceWeek());
export const useUpdateHorse = () => useMut((id: string, b: { name?: string; training?: string }) => svc.updateHorse(id, b));
export const useInspectHorse = () => useMut((id: string, src: "inspection" | "walk_video" | "vet") => svc.inspectHorse(id, src));
export const useSellHorse = () => useMut((id: string) => svc.sellHorse(id));
export const useRetireHorse = () => useMut((id: string) => svc.retireHorse(id));
export const useBuyHorse = () => useMut((id: string) => svc.buyHorse(id));
export const useEnterRace = () => useMut((raceId: string, horseId: string) => svc.enterRace(raceId, horseId));
export const useScratchHorse = () => useMut((raceId: string, horseId: string) => svc.scratchHorse(raceId, horseId));
export const useRunRace = () => useMut((raceId: string) => svc.runRace(raceId));
export const usePlaceBet = () => useMut((b: { race_id: string; runner_id: string; kind: "win" | "place"; stake: number }) => svc.placeBet(b));
export const useBreed = () => useMut((b: { mare_id: string; sire_id: string }) => svc.breed(b));

export type { AdvanceSummary };
