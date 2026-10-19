import { useState } from "react";
import { Link, navigate, useRoute } from "@/router";
import { useHorse, useUpdateHorse, useInspectHorse, useSellHorse, useRetireHorse, useEnteredRaces, useScratchHorse } from "@/hooks/useGame";
import { PageHeader, RatingBadge, DevelopmentBadge, StatBar, FormString, EmptyState, ClassBadge } from "./bits";
import { Button, Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, toast } from "./ui";
import { money, moneyShort, TRAINING_LABELS, TRAINING_HINTS, HEAVY_WORK, STATUS_LABELS, TRAIT_GROUPS, TRAIT_LABELS, STYLE_LABELS, EVIDENCE_LABELS, confidenceLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const TRAIN_ORDER = ["rest", "walk", "swim", "aerobic", "pace", "speed", "barrier", "trial"];

export function HorseDetail({ id }: { id: string }) {
  const horse = useHorse(id);
  const update = useUpdateHorse();
  const inspect = useInspectHorse();
  const sell = useSellHorse();
  const retire = useRetireHorse();
  const entered = useEnteredRaces();
  const scratch = useScratchHorse();
  const [confirm, setConfirm] = useState<null | "sell" | "retire">(null);

  if (horse.isLoading) return <p className="text-sm text-muted">Loading…</p>;
  if (horse.error || !horse.data) return <EmptyState>Horse not found. <Link href="/horses" className="text-turf">Back to stable</Link></EmptyState>;
  const h = horse.data;
  const thisEntry = (entered.data ?? []).find((r) => r.field.some((f) => f.horse_id === h.id));

  const setTraining = async (t: string) => {
    try { await update.mutate(h.id, { training: t }); toast.success(`${h.name} now on ${TRAINING_LABELS[t]}`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not set training"); }
  };
  const doInspect = async (src: "inspection" | "walk_video" | "vet") => {
    try { await inspect.mutate(h.id, src); toast.success(EVIDENCE_LABELS[src] + " complete"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Inspection failed"); }
  };

  return (
    <div>
      <PageHeader eyebrow={`${STATUS_LABELS[h.status]} · ${h.age}YO ${h.sex}`} title={h.name}>
        <div className="flex items-center gap-3">
          <RatingBadge rating={h.rating} />
          <DevelopmentBadge dev={h.development} />
          <FormString form={h.form} />
        </div>
      </PageHeader>
      <p className="mb-6 text-sm text-muted">By {h.sire} · Dam {h.dam} · Preferred going: {h.going_pref}</p>

      {h.injured_weeks > 0 && (
        <div className="mb-6 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          On the easy list — {h.injured_weeks} week{h.injured_weeks > 1 ? "s" : ""} remaining.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* condition */}
        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-4 text-lg font-bold">Condition</h2>
          <div className="space-y-3">
            <StatBar label="Fitness" value={h.fitness} />
            <StatBar label="Freshness" value={h.freshness} warnAbove={undefined} />
            <StatBar label="Fatigue" value={h.fatigue} tone="sky" warnAbove={55} />
            <StatBar label="Sharpness" value={h.sharpness} tone="sky" />
            <StatBar label="Workload" value={h.workload} tone="sky" warnAbove={60} />
          </div>
          {h.trainer_report && h.trainer_report.length > 0 && (
            <div className="mt-4 rounded-md bg-panel-2 p-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-turf">Trainer's report</p>
              <ul className="space-y-1 text-xs text-muted">
                {h.trainer_report.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </div>
          )}
        </section>

        {/* scouting profile */}
        <section className="rounded-xl border border-line bg-panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Scouting report</h2>
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => doInspect("walk_video")}>Walk video</Button>
              <Button size="sm" onClick={() => doInspect("inspection")}>Inspection $250</Button>
              <Button size="sm" onClick={() => doInspect("vet")}>Vet $800</Button>
            </div>
          </div>
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {TRAIT_GROUPS.map((grp) => (
              <div key={grp.title}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-turf">{grp.title}</p>
                {grp.traits.map((t) => {
                  const e = h.profile[t];
                  return (
                    <div key={t} className="flex items-center justify-between border-b border-line/50 py-1 text-sm last:border-0">
                      <span className="text-muted">{TRAIT_LABELS[t]}</span>
                      <span className="text-right">
                        <span className={cn("font-medium", e.confidence >= 0.45 ? "text-foreground" : "text-muted")}>
                          {e.confidence < 0.2 ? "Unknown" : e.label}
                        </span>
                        {e.confidence >= 0.2 && (
                          <span className="ml-2 font-mono text-[11px] text-muted">{e.low}–{e.high}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {h.pedigree_suggests && (
            <p className="mt-4 rounded-md bg-panel-2 p-3 text-xs text-muted">
              <span className="font-semibold text-gold">Pedigree suggests:</span>{" "}
              strongest in {topTraits(h.pedigree_suggests)}.
            </p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* training */}
        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-4 text-lg font-bold">Training</h2>
          <div className="grid grid-cols-2 gap-1.5">
            {TRAIN_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => setTraining(t)}
                disabled={h.injured_weeks > 0 && !["rest", "walk"].includes(t)}
                title={TRAINING_HINTS[t]}
                className={cn(
                  "rounded-md border px-2 py-2 text-xs transition-colors disabled:opacity-40",
                  h.training === t ? "border-turf bg-turf/15 font-semibold text-turf" : "border-line text-muted hover:border-turf/40 hover:text-foreground",
                )}
              >
                {TRAINING_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">{TRAINING_HINTS[h.training]}</p>
          {h.best_distance && (
            <p className="mt-3 text-sm">
              <span className="text-muted">Best distance:</span>{" "}
              <span className="font-mono font-bold text-turf">{h.best_distance}m</span>
            </p>
          )}
        </section>

        {/* race history */}
        <section className="rounded-xl border border-line bg-panel p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">Race history</h2>
          {h.history.length === 0 ? <EmptyState>No races yet.</EmptyState> : (
            <div className="space-y-2">
              {h.history.map((rec, i) => (
                <Link key={i} href={`/races/${rec.race_id}`} className="block rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm hover:border-turf/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("font-mono font-bold", rec.position === 1 ? "text-turf" : rec.position <= 3 ? "text-foreground" : "text-muted")}>
                      {ord(rec.position)}
                    </span>
                    <span className="font-medium">{rec.race_name}</span>
                    <span className="text-xs text-muted">{rec.track} · {rec.distance}m · {rec.going}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span>Barrier {rec.barrier}</span>
                    <span>· {STYLE_LABELS[rec.style]}</span>
                    <span>· Pace {rec.pace}</span>
                    <span>· Perf {rec.performance}</span>
                    {rec.prize > 0 && <span className="text-gold">{moneyShort(rec.prize)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        {thisEntry && (
          <Button
            variant="outline"
            onClick={async () => { try { await scratch.mutate(thisEntry.id, h.id); toast.success("Scratched"); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }}
          >
            Scratch from {thisEntry.name}
          </Button>
        )}
        {h.status === "racing" && (
          <Button variant="outline" onClick={() => setConfirm("retire")}>Retire to paddock/stud</Button>
        )}
        <Button variant="destructive-outline" onClick={() => setConfirm("sell")}>Sell ({moneyShort(Math.floor(h.price * 0.85))})</Button>
        <Button variant="ghost" onClick={() => navigate("/horses")}>Back</Button>
      </div>

      <Dialog open={confirm !== null} onOpenChange={() => setConfirm(null)}>
        <DialogHeader>
          <DialogTitle>{confirm === "sell" ? `Sell ${h.name}?` : `Retire ${h.name}?`}</DialogTitle>
          <DialogDescription>
            {confirm === "sell"
              ? `You'll receive ${money(Math.floor(h.price * 0.85))}. This cannot be undone.`
              : h.sex === "mare" || h.sex === "filly"
                ? "Mares retire to the broodmare band and can be bred."
                : h.rating >= 90 && (h.sex === "colt" || h.sex === "horse")
                  ? "A colt rated 90+ retires to stud and can serve mares."
                  : "Geldings retire permanently."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            variant={confirm === "sell" ? "destructive" : "turf"}
            onClick={async () => {
              try {
                if (confirm === "sell") { await sell.mutate(h.id); navigate("/horses"); toast.success(`${h.name} sold`); }
                else { await retire.mutate(h.id); toast.success(`${h.name} retired`); }
              } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
              setConfirm(null);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function topTraits(suggests: Record<string, string>) {
  const good = Object.entries(suggests).filter(([, d]) => d === "strong" || d === "exceptional");
  if (!good.length) return "no standout traits";
  return good.slice(0, 3).map(([t]) => TRAIT_LABELS[t as keyof typeof TRAIT_LABELS] ?? t).join(", ");
}
