import { cn } from "@/lib/utils";
import { DEVELOPMENT_LABELS, money } from "@/lib/format";
import type { Development, Race } from "@/lib/types";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-turf">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-extrabold">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function SilkDot({ colour, label, className }: { colour: string; label?: number | string; className?: string }) {
  return (
    <span className={cn("inline-grid place-items-center rounded-full font-mono text-[9px] font-bold text-[#04110B]", className)} style={{ background: colour }}>
      {label}
    </span>
  );
}

export function RatingBadge({ rating }: { rating: number }) {
  const tone = rating >= 100 ? "bg-gold/20 text-gold" : rating >= 80 ? "bg-turf/20 text-turf" : "bg-panel-2 text-muted";
  return <span className={cn("rounded-md px-2 py-0.5 font-mono text-sm font-bold", tone)}>{rating}</span>;
}

const DEV_TONE: Record<Development, string> = {
  immature: "border-warn/40 text-warn", developing: "border-turf/40 text-turf",
  maturing: "border-turf/60 text-turf", mature: "border-line text-muted",
};
export function DevelopmentBadge({ dev }: { dev: Development }) {
  return <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", DEV_TONE[dev])} title={DEVELOPMENT_LABELS[dev]}>{dev}</span>;
}

export function StatBar({ label, value, tone = "turf", warnAbove }: { label: string; value: number; tone?: "turf" | "sky"; warnAbove?: number }) {
  const v = Math.round(value);
  const warn = warnAbove !== undefined && v > warnAbove;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className={cn("font-mono", warn ? "text-warn" : "text-foreground")}>{v}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-panel-2">
        <div className={cn("h-full rounded-full transition-all", warn ? "bg-warn" : tone === "turf" ? "bg-turf" : "bg-sky-400")} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function FormString({ form }: { form: string }) {
  if (!form) return <span className="text-xs text-muted">No form</span>;
  return (
    <span className="font-mono text-sm">
      {form.split("").map((c, i) => {
        const n = parseInt(c, 10);
        const tone = n === 1 ? "text-turf font-bold" : n <= 3 ? "text-foreground" : "text-muted";
        return <span key={i} className={tone}>{c}</span>;
      })}
    </span>
  );
}

const CLASS_TONE: Record<string, string> = {
  G1: "bg-[#451A03] text-[#FDBA74]", G2: "bg-[#3B2C05] text-[#FDE047]", G3: "bg-[#3B2C05] text-[#FDE047]",
  Listed: "bg-[#064E3B] text-[#6EE7B7]", Special: "bg-gold/20 text-gold", Restricted: "bg-[#064E3B] text-[#6EE7B7]",
};
export function ClassBadge({ cls }: { cls: string }) {
  const tone = CLASS_TONE[cls] ?? "bg-panel-2 text-muted";
  return <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase", tone)}>{cls}</span>;
}

const TRAVEL_TONE: Record<string, string> = {
  home: "text-turf", local: "text-turf", regional: "text-foreground", intrastate: "text-muted", interstate: "text-warn",
};
export function TravelBadge({ travel }: { travel: string }) {
  return <span className={cn("text-[10px] uppercase tracking-wide", TRAVEL_TONE[travel] ?? "text-muted")}>{travel}</span>;
}

export function RaceSummary({ race }: { race: Race }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <ClassBadge cls={race.race_class} />
      <span className="font-semibold">{race.name}</span>
      <span className="text-muted">{race.track} · {race.distance}m · {race.going}</span>
      <span className="font-mono text-muted">{money(race.purse)}</span>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}
