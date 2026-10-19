import { useEffect, useState, createContext, useContext } from "react";

// Tiny hash router — no react-router dependency.
const RouteCtx = createContext<string>(typeof window !== "undefined" ? loc() : "/");

function loc(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h || "/";
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState(loc());
  useEffect(() => {
    const h = () => setRoute(loc());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return <RouteCtx.Provider value={route}>{children}</RouteCtx.Provider>;
}

export const useRoute = () => useContext(RouteCtx);

export function navigate(to: string) {
  window.location.hash = to;
  window.scrollTo(0, 0);
}

export function Link({ href, className, onClick, children }: { href: string; className?: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <a
      href={`#${href}`}
      className={className}
      onClick={(e) => { e.preventDefault(); onClick?.(); navigate(href); }}
    >
      {children}
    </a>
  );
}

/** Returns path segments for patterns like "/horses/:id". */
export function useMatch(pattern: string): Record<string, string> | null {
  const route = useRoute();
  const pParts = pattern.split("/").filter(Boolean);
  const rParts = route.split("?")[0].split("/").filter(Boolean);
  if (pParts.length !== rParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(":")) params[pParts[i].slice(1)] = decodeURIComponent(rParts[i]);
    else if (pParts[i] !== rParts[i]) return null;
  }
  return params;
}
