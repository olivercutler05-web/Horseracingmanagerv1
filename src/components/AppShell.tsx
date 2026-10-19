import { useEffect, useState } from "react";
import { Link, useRoute } from "@/router";
import { Button } from "./ui";
import { money, moneyShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useGame, useAdvanceWeek } from "@/hooks/useGame";
import { Toaster, toast } from "./ui";
import type { AdvanceSummary } from "@/lib/types";
import { APP_NAME } from "@/lib/format";

const NAV = [
  { path: "/", label: "Dashboard" },
  { path: "/horses", label: "Stable" },
  { path: "/calendar", label: "Calendar" },
  { path: "/market", label: "Market" },
  { path: "/breeding", label: "Breeding" },
  { path: "/ledger", label: "Ledger" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const game = useGame();
  const advance = useAdvanceWeek();
  const [summary, setSummary] = useState<AdvanceSummary | null>(null);
  const [menu, setMenu] = useState(false);

  if (game.isLoading || !game.data) {
    return <div className="grid min-h-screen place-items-center text-muted">Loading stable…</div>;
  }
  const g = game.data;

  const doAdvance = async () => {
    try {
      const s = await advance.mutate();
      setSummary(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not advance week");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-sidebar/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button className="lg:hidden" onClick={() => setMenu(!menu)}>
            <span className="text-xl">☰</span>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-turf font-heading text-lg font-black text-[#04110B]">M</span>
            <span className="font-heading text-lg font-bold tracking-tight">{APP_NAME}</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.path} href={n.path}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-sm font-bold text-gold">{money(g.cash)}</p>
              <p className="text-[11px] text-muted">Week {g.week_of_season} · {g.season}</p>
            </div>
            <Button variant="turf" onClick={doAdvance} disabled={advance.isPending}>
              {advance.isPending ? "Advancing…" : "Advance Week"}
            </Button>
          </div>
        </div>
      </header>
      {menu && (
        <nav className="border-b border-line bg-sidebar p-4 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.path} href={n.path} onClick={() => setMenu(false)} className="block rounded-md px-3 py-2 hover:bg-panel-2">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        {APP_NAME} · Week {g.week}, {g.date}
      </footer>

      {summary && <AdvanceDialog summary={summary} onClose={() => setSummary(null)} />}
      <Toaster />
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = useRoute() === href;
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        active ? "bg-panel-2 font-semibold text-foreground" : "text-muted hover:bg-panel-2/60 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function AdvanceDialog({ summary, onClose }: { summary: AdvanceSummary; onClose: () => void }) {
  const net = summary.cash_after - summary.cash_before;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-panel p-6 shadow-2xl animate-rise" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-turf">Week complete</p>
        <h2 className="mt-1 text-2xl font-bold">Week {summary.week - 1} → {summary.week}</h2>
        <div className="mt-4 space-y-1 font-mono text-sm">
          <Row label="Prize money" value={moneyShort(summary.prize_money)} tone="pos" />
          <Row label="Bet returns" value={moneyShort(summary.bet_returns)} tone="pos" />
          <Row label="Upkeep" value={`-${moneyShort(summary.upkeep)}`} tone="neg" />
          <div className="my-2 border-t border-line" />
          <Row label="Cash" value={moneyShort(summary.cash_after)} />
        </div>
        {summary.lines.length > 0 && (
          <div className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded-md bg-panel-2 p-3 text-xs">
            {summary.lines.map((l, i) => <p key={i} className={l.startsWith("⚠") ? "text-warn" : ""}>{l}</p>)}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Button variant="turf" onClick={onClose}>Continue</Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn(tone === "pos" ? "text-turf" : tone === "neg" ? "text-destructive" : "text-foreground")}>{value}</span>
    </div>
  );
}
