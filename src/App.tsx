import { useEffect, useState } from "react";
import { RouterProvider, useRoute, useMatch, navigate } from "@/router";
import { hasGame } from "@/lib/service";
import { Setup } from "@/components/Setup";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/Dashboard";
import { Horses } from "@/components/Horses";
import { HorseDetail } from "@/components/HorseDetail";
import { Calendar } from "@/components/Calendar";
import { RaceDetail } from "@/components/RaceDetail";
import { Breeding } from "@/components/Breeding";
import { Market } from "@/components/Market";
import { Ledger } from "@/components/Ledger";
import { EmptyState } from "@/components/bits";
import { Link } from "@/router";

export default function App() {
  const [checked, setChecked] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    hasGame().then((ok) => { setExists(ok); setChecked(true); }).catch(() => setChecked(true));
  }, []);

  if (!checked) return <div className="grid min-h-screen place-items-center bg-track text-muted">Loading…</div>;
  if (!exists) return <Setup />;

  return (
    <RouterProvider>
      <AppShell>
        <Pages />
      </AppShell>
    </RouterProvider>
  );
}

function Pages() {
  const route = useRoute();
  const horseMatch = useMatch("/horses/:id");
  const raceMatch = useMatch("/races/:id");
  if (horseMatch) return <HorseDetail id={horseMatch.id} />;
  if (raceMatch) return <RaceDetail />;
  switch (route) {
    case "/": return <Dashboard />;
    case "/horses": return <Horses />;
    case "/calendar": return <Calendar />;
    case "/market": return <Market />;
    case "/breeding": return <Breeding />;
    case "/ledger": return <Ledger />;
    default: return <EmptyState>Page not found. <Link href="/" className="text-turf">Go home</Link></EmptyState>;
  }
}
