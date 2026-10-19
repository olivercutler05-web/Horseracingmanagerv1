import { useEffect, useRef, useState } from "react";
import type { ResultRow } from "@/lib/types";
import { SilkDot } from "./bits";

interface Props {
  distance: number;
  field: { name: string; silks: string; barrier: number; is_player: boolean }[];
  checkpoints: Record<string, number[]>; // runner_id -> cumulative times
  finishOrder?: string[]; // runner_ids in finishing order when race is done
  playing?: boolean;
  speed?: number; // sim seconds per real second
  onDone?: () => void;
}

const W = 860, H = 520, CX = W / 2, CY = H / 2, RX = 360, RY = 210;

/** Position along the oval for progress 0..1 (starts at top, runs counter-clockwise). */
function ovalPos(p: number) {
  const t = -Math.PI / 2 - p * Math.PI * 2;
  return { x: CX + RX * Math.cos(t), y: CY + RY * Math.sin(t) };
}

export function RaceTrackCanvas({ distance, field, checkpoints, playing = true, speed = 4, onDone }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const raf = useRef(0);
  const last = useRef(0);

  const times = Object.values(checkpoints).map((c) => c[c.length - 1]).filter(Boolean);
  const total = times.length ? Math.max(...times) : 90;

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setElapsed((e) => {
        const next = e + dt * speed;
        if (next >= total) { cancelAnimationFrame(raf.current); onDone?.(); return total; }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, total, speed, onDone]);

  // cumulative distance covered per runner at this elapsed time
  const lanes = field.map((f, i) => {
    const cps = checkpoints[`${i}`] ?? [];
    // invert checkpoints: progress fraction of distance at each segment end
    let progress = 0;
    for (let s = 0; s < cps.length; s++) {
      const segStart = s === 0 ? 0 : cps[s - 1];
      const segEnd = cps[s];
      if (elapsed >= segEnd) progress = (s + 1) / cps.length;
      else if (elapsed > segStart) {
        progress = (s + (elapsed - segStart) / Math.max(0.01, segEnd - segStart)) / cps.length;
        break;
      }
    }
    const pos = ovalPos(Math.min(1, progress));
    return { ...f, lane: i, x: pos.x, y: pos.y, progress };
  });

  const sorted = [...lanes].sort((a, b) => b.progress - a.progress);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-track">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#1E3A2C" strokeWidth={44} />
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#2C5442" strokeWidth={2} strokeDasharray="6 10" />
        <ellipse cx={CX} cy={CY} rx={RX - 24} ry={RY - 24} fill="#0D1B14" />
        <text x={CX} y={CY - 8} textAnchor="middle" fill="#3D5A4B" className="font-mono" fontSize="15">
          {distance}m
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fill="#33513F" fontSize="12">
          {elapsed.toFixed(1)}s / {total.toFixed(1)}s
        </text>
        {lanes.map((l) => (
          <g key={l.lane} transform={`translate(${l.x},${l.y})`}>
            <circle r={11} fill={l.silks} stroke={l.is_player ? "#D97706" : "#0B120E"} strokeWidth={l.is_player ? 3 : 1.5} />
            <text y={3.5} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#04110B" className="font-mono">{l.barrier}</text>
          </g>
        ))}
        {/* leader labels */}
        {sorted.slice(0, 3).map((l, rank) => (
          <text key={l.lane} x={l.x + 16} y={l.y - 12} fill={rank === 0 ? "#10B981" : "#8FA597"} fontSize="10" className="font-mono">
            {rank + 1}. {l.name}
          </text>
        ))}
        {/* finishing post */}
        <g transform={(() => { const p = ovalPos(0); return `translate(${p.x},${p.y})`; })()}>
          <line x1={-4} y1={-16} x2={-4} y2={16} stroke="#D97706" strokeWidth={3} />
        </g>
      </svg>
    </div>
  );
}

/** Compact replay used in race results. */
export function RaceReplay({ race }: { race: { distance: number; field: { id: string; name: string; silks: string; barrier: number; is_player: boolean }[]; result: ResultRow[] | null } }) {
  const [playing, setPlaying] = useState(true);
  if (!race.result) return null;
  const byId = new Map(race.field.map((r) => [r.id, r]));
  const checkpoints: Record<string, number[]> = {};
  race.field.forEach((r, i) => {
    const res = race.result!.find((x) => x.runner_id === r.id);
    checkpoints[`${i}`] = res?.checkpoints ?? [];
  });
  return (
    <div className="space-y-2">
      <RaceTrackCanvas
        distance={race.distance}
        field={race.field.map((r) => ({ name: r.name, silks: r.silks, barrier: r.barrier, is_player: r.is_player }))}
        checkpoints={checkpoints}
        playing={playing}
        speed={8}
        onDone={() => setPlaying(false)}
      />
      <div className="flex justify-end">
        <button className="text-xs text-turf hover:underline" onClick={() => setPlaying(true)}>Replay</button>
      </div>
      {byId.size === 0 && null}
    </div>
  );
}
