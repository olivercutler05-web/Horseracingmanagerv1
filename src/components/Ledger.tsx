import { useLedger, useGame, useBets } from "@/hooks/useGame";
import { PageHeader, EmptyState, ClassBadge } from "./bits";
import { money, moneyShort, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Ledger() {
  const ledger = useLedger();
  const game = useGame();
  const bets = useBets();

  const entries = ledger.data ?? [];
  const pending = (bets.data ?? []).filter((b) => b.status === "pending");
  const inTotal = entries.filter((e) => e.amount > 0).reduce((a, b) => a + b.amount, 0);
  const outTotal = entries.filter((e) => e.amount < 0).reduce((a, b) => a + b.amount, 0);

  if (!game.data) return null;

  return (
    <div>
      <PageHeader eyebrow="Stable finances" title="Ledger">
        <p className="text-xs text-muted">{game.data.stable_name} · statement of cash movements</p>
      </PageHeader>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Cash on hand</p>
          <p className="mt-1 font-heading text-2xl font-bold text-gold">{moneyShort(game.data.cash)}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total in</p>
          <p className="mt-1 font-heading text-2xl font-bold text-turf">{moneyShort(inTotal)}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total out</p>
          <p className="mt-1 font-heading text-2xl font-bold text-destructive">{moneyShort(-outTotal)}</p>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="mb-6 rounded-xl border border-gold/40 bg-gold/5 p-4">
          <h2 className="mb-2 text-sm font-bold text-gold">Open bets ({pending.length})</h2>
          <div className="space-y-1 text-sm">
            {pending.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{b.runner_name}</span>
                <span className="text-muted">{b.kind} @ {b.odds.toFixed(1)}</span>
                <span className="ml-auto font-mono">{moneyShort(b.stake)}</span>
                <span className="font-mono text-muted">→ {moneyShort(b.stake * b.odds)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 ? (
        <EmptyState>No transactions yet. Buy, sell, race and bet to build a history.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-sidebar text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Week</th>
                <th className="px-3 py-2 text-left">Transaction</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-panel">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 font-mono text-xs text-muted">Wk {e.week}</td>
                  <td className="px-3 py-2">{e.label}</td>
                  <td className={cn("px-3 py-2 text-right font-mono", e.amount >= 0 ? "text-turf" : "text-destructive")}>
                    {e.amount >= 0 ? "+" : "-"}{moneyShort(Math.abs(e.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
