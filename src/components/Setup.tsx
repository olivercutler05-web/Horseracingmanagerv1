import { useState } from "react";
import { useCreateGame, useMeta } from "@/hooks/useGame";
import { Button, Input, Label, toast } from "./ui";
import { APP_NAME } from "@/lib/format";
import { navigate } from "@/router";

const SILK_COLOURS = ["#10B981", "#D97706", "#3B82F6", "#F87171", "#FBBF24", "#A78BFA", "#F472B6", "#14B8A6", "#E879F9", "#84CC16"];

export function Setup() {
  const create = useCreateGame();
  const meta = useMeta();
  const [name, setName] = useState("");
  const [track, setTrack] = useState("");
  const [silk, setSilk] = useState(SILK_COLOURS[0]);

  const tracks = meta.data?.tracks ?? [];
  const states = [...new Set(tracks.map((t) => t.state))];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give your stable a name");
    if (!track) return toast.error("Choose a home track");
    try {
      await create.mutate({ stable_name: name.trim(), home_track: track, silks: silk });
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create stable");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-track p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-line bg-panel p-8 shadow-2xl animate-rise">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-xl bg-turf font-heading text-3xl font-black text-[#04110B]">M</span>
          <h1 className="mt-4 text-3xl font-extrabold">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted">Train, race and breed your own thoroughbreds.</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="stable">Stable name</Label>
            <Input id="stable" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rosehill Park" maxLength={32} autoFocus />
          </div>
          <div>
            <Label htmlFor="track">Home track</Label>
            <select
              id="track"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="h-10 w-full rounded-md border border-line bg-panel px-3 text-sm outline-none focus:border-turf/60"
            >
              <option value="">Choose a track…</option>
              {states.map((st) => (
                <optgroup key={st} label={st}>
                  {tracks.filter((t) => t.state === st).map((t) => (
                    <option key={t.name} value={t.name}>{t.name} ({t.tier})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <Label>Your silks</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SILK_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSilk(c)}
                  className={cnSilk(c === silk)}
                  style={{ background: c }}
                  aria-label={`Silk colour ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <Button type="submit" variant="turf" className="mt-6 w-full" disabled={create.isPending}>
          {create.isPending ? "Setting up…" : "Start Training"}
        </Button>
      </form>
    </div>
  );
}

function cnSilk(active: boolean) {
  return `size-8 rounded-full transition-transform hover:scale-110 ${active ? "ring-2 ring-foreground ring-offset-2 ring-offset-panel" : ""}`;
}
