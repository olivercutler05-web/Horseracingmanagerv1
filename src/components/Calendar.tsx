import { useState } from "react";
import { Link, navigate } from "@/router";
import { useGame, useRaces, useHorses, useEnterRace, useFeatures } from "@/hooks/useGame";
import { PageHeader, ClassBadge, TravelBadge, EmptyState, RatingBadge } from "./bits";
import { Button, Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, toast } from "./ui";
import { money, moneyShort, auDate, TRAVEL_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Race } from "@/lib/types";

const LOOKAHEAD = 8;

export function Calendar() {
  const game = useGame();
  const features = useFeatures();
  const [weekOffset, setWeekOffset] = useState(0);
  const curWeek = game.data?.week ?? 1;
  const week = curWeek + weekOffset;
  const races = useRaces(week);
  const [enterRace, setEnterRace] = useState<Race | null>(null);
  const enter = useEnterRace();
  const horses = useHorses();

  const eligible = (r: Race) => (horses.data ?? []).filter((h) => h.status === "racing" && !h.entered_race_id && h.injured_weeks === 0 && h.fitness >= 55);

  return (
    <div>
      <PageHeader eyebrow="Race calendar" title="Calendar">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={weekOffset <= 0} onClick={() => setWeekOffset((w) => w - 1)}>‹ Prev</Button>
          <span className="min-w-40 text-center font-mono text-sm">
            {weekOffset === 0 ? "This week" : `Week ${week}`}
          </span>
          <Button size="sm" variant="outline" disabled={weekOffset >= LOOKAHEAD - 1} onClick={() => setWeekOffset((w) => w + 1)}>Next ›</Button>
        </div>
      </PageHeader>

      {races.isLoading ? <p className="text-sm text-muted">Loading…</p>
        : races.error ? <EmptyState>{races.error.message}</EmptyState>
        : (races.data ?? []).length === 0 ? <EmptyState>No races this week.</EmptyState>
        : (
          <div className="space-y-2">
            {(races.data ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-line bg-panel px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ClassBadge cls={r.race_class} />
                  <Link href={`/races/${r.id}`} className="font-semibold hover:text-turf">{r.name}</Link>
                  <span className="text-sm text-muted">{r.track} · {r.distance}m · {r.going}</span>
                  <span className="ml-auto font-mono text-sm text-gold">{money(r.purse)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                  <span>{auDate(r.date)}</span>
                  <TravelBadge travel={r.travel} />
                  {r.age_restriction && <span>{r.age_restriction}YO only</span>}
                  {r.entry_fee + r.travel_cost > 0 && <span>Cost {moneyShort(r.entry_fee + r.travel_cost)}</span>}
                  {r.feature && <span className="font-semibold text-gold">Feature</span>}
                  <Button size="sm" variant="turf" className="ml-auto" onClick={() => setEnterRace(r)} disabled={r.status !== "open"}>
                    {r.status === "finished" ? "Run" : "Enter"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

      {features.data && features.data.length > 0 && weekOffset === 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Feature races · next 8 weeks</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {features.data.map((r) => (
              <Link key={r.id} href={`/races/${r.id}`} className="rounded-xl border border-gold/30 bg-panel px-4 py-3 hover:border-gold/60">
                <div className="flex flex-wrap items-center gap-2">
                  <ClassBadge cls={r.race_class} />
                  <span className="font-semibold">{r.name}</span>
                  <span className="ml-auto font-mono text-sm text-gold">{money(r.purse)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">{r.track} · {r.distance}m · {auDate(r.date)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <EnterDialog race={enterRace} onClose={() => setEnterRace(null)} horses={(horses.data ?? []).filter((h) => !h.entered_race_id && h.status === "racing" && h.injured_weeks === 0)} />
    </div>
  );
}

function EnterDialog({ race, onClose, horses }: { race: Race | null; onClose: () => void; horses: import("@/lib/types").Horse[] }) {
  const enter = useEnterRace();
  if (!race) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogHeader>
        <DialogTitle>Enter {race.name}</DialogTitle>
        <DialogDescription>
          {race.track} · {race.distance}m · {race.going} · {money(race.purse)} purse.
          Entry + travel: {money(race.entry_fee + race.travel_cost)} ({TRAVEL_LABELS[race.travel]}).
        </DialogDescription>
      </DialogHeader>
      {horses.length === 0 ? (
        <p className="py-4 text-sm text-muted">No eligible horses — all racing horses must be fit (55+), uninjured and unentered.</p>
      ) : (
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {horses.map((h) => (
            <button
              key={h.id}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2 text-left hover:border-turf/40"
              onClick={async () => {
                try {
                  await enter.mutate(race.id, h.id);
                  toast.success(`${h.name} entered in ${race.name}`);
                  onClose();
                } catch (e) { toast.error(e instanceof Error ? e.message : "Entry failed"); }
              }}
            >
              <RatingBadge rating={h.rating} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{h.name}</p>
                <p className="text-[11px] text-muted">{h.age}YO · fit {Math.round(h.fitness)} · {h.best_distance ?? "?"}m best</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button></DialogFooter>
    </Dialog>
  );
}
