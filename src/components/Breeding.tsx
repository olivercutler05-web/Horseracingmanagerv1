import { useState } from "react";
import { Link, navigate } from "@/router";
import { useHorses, useSires, useBreed, useBreedingPreview } from "@/hooks/useGame";
import { PageHeader, RatingBadge, DevelopmentBadge, EmptyState } from "./bits";
import { Button, Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, toast } from "./ui";
import { money, moneyShort, TRAIT_GROUPS, TRAIT_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Breeding() {
  const horses = useHorses();
  const sires = useSires();
  const [mare, setMare] = useState<string | null>(null);
  const [sire, setSire] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const breed = useBreed();
  const preview = useBreedingPreview(mare ?? undefined, sire ?? undefined);

  const mares = (horses.data ?? []).filter((h) => h.status === "broodmare");
  const ownStallions = (horses.data ?? []).filter((h) => h.status === "stallion");

  if (mares.length === 0 && ownStallions.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Breeding shed" title="Breeding" />
        <EmptyState>
          No broodmares or stallions in your stable. Retire a filly/mare to become a broodmare, or a colt rated 90+ to stand at stud.
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Breeding shed" title="Breeding" />

      {/* pending foals */}
      {mares.filter((m) => m.due_week).map((m) => (
        <div key={m.id} className="mb-6 rounded-xl border border-turf/40 bg-turf/10 px-4 py-3 text-sm">
          <span className="font-semibold">{m.name}</span> is in foal to {m.in_foal_to} — due week {m.due_week}.
        </div>
      ))}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* mare picker */}
        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-4 text-lg font-bold">1. Choose your mare</h2>
          {mares.length === 0 ? <EmptyState>No broodmares — retire a filly or mare first.</EmptyState> : (
            <div className="space-y-1.5">
              {mares.map((m) => (
                <button
                  key={m.id}
                  disabled={!!m.in_foal_to}
                  onClick={() => setMare(m.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left disabled:opacity-40",
                    mare === m.id ? "border-turf bg-turf/10" : "border-line bg-panel-2 hover:border-turf/40",
                  )}
                >
                  <RatingBadge rating={m.rating} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-[11px] text-muted">{m.age}YO{m.in_foal_to ? ` · in foal to ${m.in_foal_to}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* sire picker */}
        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-4 text-lg font-bold">2. Choose a sire</h2>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {ownStallions.map((s) => (
              <SireRow key={s.id} id={s.id} name={s.name} sub={`Your stallion · free`} fee={0} active={sire === s.id} onClick={() => setSire(s.id)} />
            ))}
            {(sires.data ?? []).map((s) => (
              <SireRow key={s.id} id={s.id} name={s.name} sub={`${s.farm} (${s.state}) · fee ${moneyShort(s.fee)}`} fee={s.fee} active={sire === s.id} onClick={() => setSire(s.id)} />
            ))}
          </div>
        </section>
      </div>

      {/* preview */}
      {mare && sire && preview.data && (
        <section className="mt-6 rounded-xl border border-gold/40 bg-panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Projected foal</h2>
            <p className="font-mono text-sm text-gold">Fee {money(preview.data.fee)}</p>
          </div>
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {TRAIT_GROUPS.map((grp) => (
              <div key={grp.title}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-turf">{grp.title}</p>
                {grp.traits.map((t) => {
                  const p = preview.data!.projection[t];
                  return (
                    <div key={t} className="flex justify-between border-b border-line/50 py-0.5 text-sm last:border-0">
                      <span className="text-muted">{TRAIT_LABELS[t]}</span>
                      <span className={cn(p === "weak" ? "text-destructive" : p === "strong" || p === "exceptional" ? "text-turf" : "")}>{p}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {preview.data.reinforced.length > 0 && (
            <p className="mt-3 text-xs text-turf">Reinforced: {preview.data.reinforced.map((t) => TRAIT_LABELS[t]).join(", ")}</p>
          )}
          {preview.data.shared_weaknesses.length > 0 && (
            <p className="mt-1 text-xs text-warn">Shared weaknesses: {preview.data.shared_weaknesses.map((t) => TRAIT_LABELS[t]).join(", ")}</p>
          )}
          {preview.data.warnings.map((w, i) => <p key={i} className="mt-1 text-xs text-warn">{w}</p>)}
          <p className="mt-3 text-[11px] text-muted">{preview.data.note}</p>
          <div className="mt-4 flex justify-end">
            <Button variant="turf" onClick={() => setConfirm(true)} disabled={breed.isPending}>Book the mating</Button>
          </div>
        </section>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogHeader>
          <DialogTitle>Confirm mating</DialogTitle>
          <DialogDescription>
            Book {mares.find((m) => m.id === mare)?.name} to {sires.data?.find((s) => s.id === sire)?.name ?? "your stallion"} for {money(preview.data?.fee ?? 0)}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button
            variant="turf"
            disabled={breed.isPending}
            onClick={async () => {
              try {
                await breed.mutate({ mare_id: mare!, sire_id: sire! });
                toast.success("Mare booked in — foal due in 44 weeks");
                setConfirm(false); setMare(null); setSire(null);
              } catch (e) { toast.error(e instanceof Error ? e.message : "Breeding failed"); }
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function SireRow({ id, name, sub, fee, active, onClick }: { id: string; name: string; sub: string; fee: number; active: boolean; onClick: () => void }) {
  return (
    <button
      key={id}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left",
        active ? "border-turf bg-turf/10" : "border-line bg-panel-2 hover:border-turf/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="text-[11px] text-muted">{sub}</p>
      </div>
      <span className={cn("font-mono text-sm", fee === 0 ? "text-turf" : "text-gold")}>{fee === 0 ? "Free" : moneyShort(fee)}</span>
    </button>
  );
}
