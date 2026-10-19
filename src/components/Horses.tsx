import { useState } from "react";
import { Link } from "@/router";
import { useHorses } from "@/hooks/useGame";
import { PageHeader, RatingBadge, DevelopmentBadge, FormString, EmptyState } from "./bits";
import { moneyShort, STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Horses() {
  const horses = useHorses();
  const [filter, setFilter] = useState<string>("all");
  const hs = horses.data ?? [];
  const shown = filter === "all" ? hs : hs.filter((h) => h.status === filter);

  return (
    <div>
      <PageHeader eyebrow="Your stable" title="Horses" />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {["all", "racing", "foal", "broodmare", "stallion", "retired"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === f ? "border-turf bg-turf/15 text-turf" : "border-line text-muted hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>
      {horses.isLoading ? <p className="text-sm text-muted">Loading…</p>
        : shown.length === 0 ? <EmptyState>No horses in this group.</EmptyState>
        : (
          <div className="space-y-2">
            {shown.map((h) => (
              <Link key={h.id} href={`/horses/${h.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition-colors hover:border-turf/40">
                <RatingBadge rating={h.rating} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{h.name}</p>
                  <p className="text-xs text-muted">
                    {h.sex} · {h.age}YO · {STATUS_LABELS[h.status]}
                    {h.entered_race_id ? " · entered" : ""}
                    {h.injured_weeks > 0 ? ` · injured (${h.injured_weeks}wk)` : ""}
                  </p>
                </div>
                {h.status === "racing" && (
                  <div className="hidden w-40 gap-2 sm:flex">
                    <Mini label="Fit" v={h.fitness} warn={h.fitness < 55} />
                    <Mini label="Fresh" v={h.freshness} warn={h.freshness < 35} />
                    <Mini label="Fatigue" v={h.fatigue} warn={h.fatigue > 55} />
                  </div>
                )}
                <DevelopmentBadge dev={h.development} />
                <FormString form={h.form} />
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}

function Mini({ label, v, warn }: { label: string; v: number; warn: boolean }) {
  return (
    <div className="text-center">
      <p className={cn("font-mono text-sm font-bold", warn ? "text-warn" : "text-foreground")}>{Math.round(v)}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}
