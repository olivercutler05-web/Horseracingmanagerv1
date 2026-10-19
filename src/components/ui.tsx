import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline" | "turf" | "destructive" | "destructive-outline";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  default: "bg-panel-2 text-foreground hover:bg-panel-2/70 border border-line",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-panel-2/60",
  outline: "border border-line text-foreground hover:bg-panel-2/60",
  turf: "bg-turf text-[#04110B] hover:bg-emerald-400 font-semibold",
  destructive: "bg-destructive text-[#1A0505] hover:bg-red-400 font-semibold",
  "destructive-outline": "border border-destructive/50 text-destructive hover:bg-destructive/10",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-md gap-2",
  icon: "size-9 rounded-md",
};

export const buttonVariants = (o: { variant?: Variant; size?: Size } = {}) =>
  cn("inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none", variants[o.variant ?? "default"], sizes[o.size ?? "md"]);

export function Button({ variant = "default", size = "md", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 w-full rounded-md border border-line bg-panel px-3 text-sm outline-none focus:border-turf/60", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-foreground", className)} {...props} />;
}

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onOpenChange]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-rise" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-lg rounded-xl border border-line bg-panel p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}
export function DialogHeader({ children }: { children: React.ReactNode }) { return <div className="mb-4 space-y-1.5">{children}</div>; }
export function DialogTitle({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) { return <h2 className={cn("text-xl font-bold", className)} {...p} />; }
export function DialogDescription({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("text-sm text-muted", className)} {...p} />; }
export function DialogFooter({ children }: { children: React.ReactNode }) { return <div className="mt-6 flex justify-end gap-2">{children}</div>; }
export function DialogClose({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <Button variant="outline" {...p}>{children}</Button>; }

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: React.ReactNode }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute left-0 top-0 h-full w-64 border-r border-sidebar-border bg-sidebar p-4 animate-rise" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}
export function SheetTitle({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) { return <h2 className={cn("sr-only text-lg font-bold", className)} {...p} />; }

// ---------- toast ----------
type Toast = { id: number; msg: string; tone: "success" | "error" | "info" };
let toastId = 0;
const toastListeners = new Set<(t: Toast) => void>();
export function toast(msg: string, tone: Toast["tone"] = "info") {
  const t = { id: ++toastId, msg, tone };
  toastListeners.forEach((f) => f(t));
}
toast.success = (m: string) => toast(m, "success");
toast.error = (m: string) => toast(m, "error");

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const h = (t: Toast) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 4000);
    };
    toastListeners.add(h);
    return () => { toastListeners.delete(h); };
  }, []);
  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] space-y-2">
      {items.map((t) => (
        <div key={t.id} className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl animate-rise",
          t.tone === "success" ? "border-turf/40 bg-panel text-foreground" : t.tone === "error" ? "border-destructive/40 bg-panel text-foreground" : "border-line bg-panel text-foreground")}>
          {t.msg}
          <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="text-muted hover:text-foreground"><X className="size-3.5" /></button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
