import { useState } from "react";
import { useMarket, useBuyHorse, useInspectHorse, useHorse } from "@/hooks/useGame";
import { PageHeader, RatingBadge, DevelopmentBadge, EmptyState } from "./bits";
import { Button, Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, toast } from "./ui";
import { money, moneyShort, TRAIT_GROUPS, TRAIT_LABELS, confidenceLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Horse } from "@/lib/types";

export function Market() {
  const market = useMarket();
  const buy = useBuyHorse();
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <div>
      <PageHeader eyebrow="Sales complex" title="Market">
        <p className="text-xs text-muted">Scouting reports improve with inspections — buy blind at your peril.</p>
      </PageHeader>
      {market.isLoading ? <p className="text-sm text-muted">Loading…</p>
        : (market.data ?? []).length === 0 ? <EmptyState>The market is empty — new stock arrives as weeks pass.</EmptyState>
        : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(market.data ?? []).map((h) => (
              <div key={h.id} className="flex flex-col rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center gap-2">
                  <RatingBadge rating={h.rating} />
                  <span className="ml-auto font-mono text-lg font-bold text-gold">{money(h.price)}</span>
                </div>
                <p className="mt-2 font-semibold">{h.name}</p>
                <p className="text-xs text-muted">{h.sex} · {h.age}YO · by {h.sire}</p>
                <div className="mt-2 flex gap-1.5">
                  <DevelopmentBadge dev={h.development} />
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{h.going_pref} going</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                  <Mini label="Speed" e={h.profile.fast_twitch} />
                  <Mini label="Stamina" e={h.profile.aerobic} />
                  <Mini label="Mentality" e={h.profile.temperament} />
                </div>
                <div className="mt-auto flex gap-1.5 pt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewing(h.id)}>Inspect</Button>
                  <Button
                    size="sm"
                    variant="turf"
                    className="flex-1"
                    disabled={buy.isPending}
                    onClick={async () => {
                      try { await buy.mutate(h.id); toast.success(`${h.name} joins your stable`); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Purchase failed"); }
                    }}
                  >
                    Buy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      {viewing && <InspectModal id={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function Mini({ label, e }: { label: string; e: { label: string; confidence: number; low: number; high: number } }) {
  return (
    <div className="rounded-md bg-panel-2 p-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("truncate text-[11px] font-semibold", e.confidence >= 0.45 ? "text-foreground" : "text-muted")}>
        {e.confidence < 0.2 ? "—" : e.label}
      </p>
    </div>
  );
}

function InspectModal({ id, onClose }: { id: string; onClose: () => void }) {
  const horse = useHorse(id);
  const inspect = useInspectHorse();
  const buy = useBuyHorse();
  const h = horse.data;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogHeader>
        <DialogTitle>{h?.name ?? "Loading…"}</DialogTitle>
        <DialogDescription>
          {h ? `${h.sex} · ${h.age}YO · by ${h.sire} · ${money(h.price)}` : ""}
        </DialogDescription>
      </DialogHeader>
      {h && (
        <>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {TRAIT_GROUPS.map((grp) => (
              <div key={grp.title}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-turf">{grp.title}</p>
                {grp.traits.map((t) => {
                  const e = h.profile[t];
                  return (
                    <div key={t} className="flex justify-between border-b border-line/50 py-0.5 text-sm last:border-0">
                      <span className="text-muted">{TRAIT_LABELS[t]}</span>
                      <span className={e.confidence >= 0.45 ? "text-foreground" : "text-muted"}>
                        {e.confidence < 0.2 ? "Unknown" : `${e.label} (${e.low}–${e.high})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => inspect.mutate(id, "walk_video").catch(() => toast.error("Failed"))}>Walk video</Button>
              <Button size="sm" variant="outline" onClick={() => inspect.mutate(id, "inspection").catch(() => toast.error("Inspection failed"))}>Inspection $250</Button>
              <Button size="sm" variant="outline" onClick={() => inspect.mutate(id, "vet").catch(() => toast.error("Vet failed"))}>Vet $800</Button>
            </div>
            <Button
              variant="turf"
              disabled={buy.isPending}
              onClick={async () => {
                try { await buy.mutate(id); toast.success(`${h.name} joins your stable`); onClose(); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Purchase failed"); }
              }}
            >
              Buy for {moneyShort(h.price)}
            </Button>
          </div>
        </>
      )}
      <DialogFooter><Button variant="ghost" onClick={onClose}>Close</Button></DialogFooter>
    </Dialog>
  );
}
