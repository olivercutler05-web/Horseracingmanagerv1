import { Link, navigate } from "@/router";
import { useGame, useHorses, useEnteredRaces, useFeatures, useBets } from "@/hooks/useGame";
import { PageHeader, RatingBadge, DevelopmentBadge, FormString, RaceSummary, EmptyState, TravelBadge, ClassBadge } from "./bits";
import { Button } from "./ui";
import { money, moneyShort, auDate, STATUS_LABELS, TRAVEL_LABELS } from "@/lib/format";

export function Dashboard() {
  const game = useGame();
  const horses = useHorses();
  const entered = useEnteredRaces();
  const features = useFeatures();
  const bets = useBets();

  const g = game.data;
  const hs = (horses.data ?? []).filter((h) => h.status === "racing");
  const youngsters = (horses.data ?? []).filter((h) => h.status === "foal");
  const pending = (bets.data ?? []).filter((b) => b.status === "pending");

  if (!g) return null;

  return (
    <div>
      <PageHeader eyebrow="Stable overview" title={`Welcome to ${g.stable_name}`}>
        <p className="text-sm text-muted">{g.date} · {g.state}</p>
      </PageHeader>

      {/* stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Cash" value={moneyShort(g.cash)} accent />
        <Stat label="In work" value={String(hs.length)} />
        <Stat label="Young stock" value={String(youngsters.length)} />
        <Stat label="Open bets" value={String(pending.length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* horses */}
        <section className="rounded-xl border border-line bg-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Your horses</h2>
            <Link href="/horses" className="text-xs text-turf hover:underline">View all</Link>
          </div>
          {horses.isLoading ? <p className="text-sm text-muted">Loading…</p>
            : horses.data && horses.data.length > 0 ? (
              <div className="space-y-2">
                {horses.data.slice(0, 6).map((h) => (
                  <Link key={h.id} href={`/horses/${h.id}`} className="flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2 transition-colors hover:border-turf/40">
                    <RatingBadge rating={h.rating} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{h.name}</p>
                      <p className="text-[11px] text-muted">{STATUS_LABELS[h.status]} · {h.age}YO · {h.sex}</p>
                    </div>
                    <DevelopmentBadge dev={h.development} />
                    <FormString form={h.form} />
                  </Link>
                ))}
              </div>
            ) : <EmptyState>No horses yet — visit the market.</EmptyState>}
        </section>

        {/* entered races */}
        <section className="rounded-xl border border-line bg-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Entered this week</h2>
            <Link href="/calendar" className="text-xs text-turf hover:underline">Calendar</Link>
          </div>
          {entered.data && entered.data.length > 0 ? (
            <div className="space-y-2">
              {entered.data.map((r) => (
                <Link key={r.id} href={`/races/${r.id}`} className="block rounded-lg border border-line bg-panel-2 px-3 py-2 hover:border-turf/40">
                  <RaceSummary race={r} />
                </Link>
              ))}
            </div>
          ) : <EmptyState>Nothing entered. Head to the calendar to find a race.</EmptyState>}

          <h3 className="mb-2 mt-5 text-sm font-bold text-muted">Upcoming features</h3>
          {features.data && features.data.length > 0 ? (
            <div className="space-y-1.5">
              {features.data.slice(0, 4).map((r) => (
                <Link key={r.id} href={`/races/${r.id}`} className="flex items-center gap-2 text-sm hover:text-turf">
                  <ClassBadge cls={r.race_class} />
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted">{short(r.date)}</span>
                </Link>
              ))}
            </div>
          ) : <p className="text-xs text-muted">No features in the next 8 weeks.</p>}
        </section>
      </div>

      {/* quick actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => navigate("/market")}>Buy a horse</Button>
        <Button variant="outline" onClick={() => navigate("/calendar")}>Find races</Button>
        <Button variant="outline" onClick={() => navigate("/breeding")}>Breeding shed</Button>
      </div>
    </div>
  );
}

function short(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cnCard(accent)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cnVal(accent)}>{value}</p>
    </div>
  );
}
function cnCard(accent?: boolean) {
  return `rounded-xl border p-4 ${accent ? "border-gold/40 bg-gold/10" : "border-line bg-panel"}`;
}
function cnVal(accent?: boolean) {
  return `mt-1 font-heading text-2xl font-bold ${accent ? "text-gold" : ""}`;
}
