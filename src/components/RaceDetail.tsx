import { useState } from "react";
import { Link, navigate, useMatch } from "@/router";
import { useRace, useGame, usePlaceBet, useRunRace, useScratchHorse, useHorses } from "@/hooks/useGame";
import { PageHeader, ClassBadge, TravelBadge, RatingBadge, SilkDot, EmptyState, FormString } from "./bits";
import { Button, Input, Label, toast } from "./ui";
import { RaceReplay } from "./RaceTrackCanvas";
import { money, moneyShort, auDate, STYLE_LABELS, TRAVEL_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RaceDetail() {
  const match = useMatch("/races/:id");
  const race = useRace(match?.id);
  const game = useGame();
  const horses = useHorses();
  const runRace = useRunRace();
  const scratch = useScratchHorse();
  const [betOn, setBetOn] = useState<string | null>(null);

  if (race.isLoading) return <p className="text-sm text-muted">Loading…</p>;
  if (race.error || !race.data) return <EmptyState>Race not found. <Link href="/calendar" className="text-turf">Back to calendar</Link></EmptyState>;
  const r = race.data;
  const g = game.data;
  const mine = (horses.data ?? []).find((h) => r.field.some((f) => f.horse_id === h.id));
  const finished = r.status === "finished";

  const doRun = async () => {
    try { await runRace.mutate(r.id); toast.success("Race complete"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not run race"); }
  };
  const doScratch = async () => {
    if (!mine) return;
    try { await scratch.mutate(r.id, mine.id); toast.success(`${mine.name} scratched`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not scratch"); }
  };

  return (
    <div>
      <PageHeader eyebrow={finished ? "Result" : `${auDate(r.date)} · ${TRAVEL_LABELS[r.travel]}`} title={r.name}>
        <div className="flex items-center gap-2">
          <ClassBadge cls={r.race_class} />
          <span className="font-mono text-lg font-bold text-gold">{money(r.purse)}</span>
        </div>
      </PageHeader>
      <p className="mb-6 text-sm text-muted">
        {r.track} · {r.distance}m · {r.going}
        {r.age_restriction ? ` · ${r.age_restriction}YO` : ""}
        {r.min_rating ? ` · min rating ${r.min_rating}` : ""}
        {r.pace ? ` · pace: ${r.pace}` : ""}
      </p>

      {finished && <RaceReplay race={r} />}

      {/* field table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-sidebar text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Horse</th>
              <th className="hidden px-3 py-2 text-center sm:table-cell">Age</th>
              <th className="px-3 py-2 text-center">Rating</th>
              <th className="px-3 py-2 text-center">Win</th>
              <th className="hidden px-3 py-2 text-center sm:table-cell">Place</th>
              {finished && <th className="px-3 py-2 text-center">Pos</th>}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-panel">
            {[...r.field].sort((a, b) => a.barrier - b.barrier).map((f) => {
              const res = r.result?.find((x) => x.runner_id === f.id);
              return (
                <tr key={f.id} className={cn(res?.position === 1 && "bg-turf/10", f.is_player && "border-l-2 border-l-gold")}>
                  <td className="px-3 py-2"><SilkDot colour={f.silks} label={f.barrier} className="size-6" /></td>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-[11px] text-muted">By {f.sire}{finished ? ` · ${STYLE_LABELS[f.style]}` : ` · fit ${Math.round(f.fitness)}`}</p>
                  </td>
                  <td className="hidden px-3 py-2 text-center font-mono sm:table-cell">{f.age}</td>
                  <td className="px-3 py-2 text-center"><RatingBadge rating={f.rating} /></td>
                  <td className="px-3 py-2 text-center font-mono">{f.odds.toFixed(1)}</td>
                  <td className="hidden px-3 py-2 text-center font-mono sm:table-cell">{f.place_odds.toFixed(1)}</td>
                  {finished && (
                    <td className="px-3 py-2 text-center">
                      <span className={cn("font-mono font-bold", res?.position === 1 ? "text-turf" : "")}>
                        {res?.position}
                        {res && res.margin > 0 && <span className="ml-1 text-[10px] font-normal text-muted">{res.margin}L</span>}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-2 text-right">
                    {!finished && g && (
                      <Button size="sm" variant="outline" onClick={() => setBetOn(betOn === f.id ? null : f.id)}>
                        Bet
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {betOn && <BetPanel raceId={r.id} runner={r.field.find((f) => f.id === betOn)!} onDone={() => setBetOn(null)} />}

      {/* actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        {mine && !finished && (
          <>
            <Button variant="turf" onClick={doRun}>Run race</Button>
            <Button variant="outline" onClick={doScratch}>Scratch {mine.name}</Button>
          </>
        )}
        <Button variant="ghost" onClick={() => navigate("/calendar")}>Back to calendar</Button>
      </div>
      {finished && r.result && (
        <p className="mt-3 text-xs text-muted">
          Winning time {r.result[0]?.time.toFixed(2)}s · {r.result[0]?.name} started at {r.result[0]?.odds.toFixed(1)}.
        </p>
      )}
    </div>
  );
}

function BetPanel({ raceId, runner, onDone }: { raceId: string; runner: { id: string; name: string; odds: number; place_odds: number }; onDone: () => void }) {
  const bet = usePlaceBet();
  const [kind, setKind] = useState<"win" | "place">("win");
  const [stake, setStake] = useState(50);
  return (
    <div className="mt-4 rounded-xl border border-gold/40 bg-gold/5 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Bet on {runner.name}</Label>
          <div className="mt-1 flex gap-1.5">
            <Button size="sm" variant={kind === "win" ? "turf" : "outline"} onClick={() => setKind("win")}>Win @ {runner.odds.toFixed(1)}</Button>
            <Button size="sm" variant={kind === "place" ? "turf" : "outline"} onClick={() => setKind("place")}>Place @ {runner.place_odds.toFixed(1)}</Button>
          </div>
        </div>
        <div className="w-28">
          <Label htmlFor="stake">Stake</Label>
          <Input id="stake" type="number" min={10} step={10} value={stake} onChange={(e) => setStake(Math.max(10, +e.target.value))} className="mt-1" />
        </div>
        <Button
          variant="turf"
          disabled={bet.isPending}
          onClick={async () => {
            try {
              await bet.mutate({ race_id: raceId, runner_id: runner.id, kind, stake });
              toast.success(`${moneyShort(stake)} ${kind} on ${runner.name}`);
              onDone();
            } catch (e) { toast.error(e instanceof Error ? e.message : "Bet failed"); }
          }}
        >
          Place bet
        </Button>
      </div>
    </div>
  );
}
