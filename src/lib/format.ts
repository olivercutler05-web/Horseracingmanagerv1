import type { Estimate, Trait } from "./types";

export const APP_NAME = "Mounting Yard";
export const APP_TAGLINE = "Australian Racing Manager";
export const APP_TITLE = `${APP_NAME} — ${APP_TAGLINE}`;

const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
export const money = (n: number) => aud.format(n);

export const moneyShort = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 2)}M`;
  if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}k`;
  return `${s}$${a}`;
};

export const auDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit" });

export const errMsg = (e: unknown) => {
  if (e instanceof Error) return e.message;
  return "Something went wrong";
};

export const TRAINING_LABELS: Record<string, string> = {
  rest: "Rest", walk: "Walking", swim: "Swimming", aerobic: "Aerobic base", pace: "Pace work",
  speed: "Fast gallops", barrier: "Barrier education", trial: "Jump-out / trial",
};

export const TRAINING_HINTS: Record<string, string> = {
  rest: "Freshens up, workload drops · fitness fades",
  walk: "Light, settles the mind · eases workload",
  swim: "Low impact · aerobic and topline",
  aerobic: "Builds the engine · moderate load",
  pace: "Rhythm and coordination · solid load",
  speed: "Muscle and hindquarter · heaviest load, highest risk",
  barrier: "Calmer at the start · light",
  trial: "Big fitness lift, reveals ability · solid load",
};

export const HEAVY_WORK = new Set(["pace", "speed", "trial"]);

export const STATUS_LABELS: Record<string, string> = {
  racing: "In work", foal: "Young stock", broodmare: "Broodmare", stallion: "Stallion", retired: "Retired",
};

export const DEVELOPMENT_LABELS: Record<string, string> = {
  immature: "Immature — still growing into its frame",
  developing: "Developing — filling out",
  maturing: "Maturing — close to its final shape",
  mature: "Mature",
};

export const TRAIT_GROUPS: { title: string; traits: Trait[] }[] = [
  { title: "Composition", traits: ["frame", "length", "girth", "bone", "coupling", "hindquarter", "topline", "balance", "muscling"] },
  { title: "Movement", traits: ["stride_length", "stride_freq", "efficiency", "coordination"] },
  { title: "Mentality", traits: ["temperament", "trainability", "relaxation", "drive"] },
  { title: "Engine", traits: ["fast_twitch", "aerobic", "recovery", "soundness"] },
];

export const TRAIT_LABELS: Record<Trait, string> = {
  frame: "Frame", length: "Body length", girth: "Girth depth", bone: "Bone", coupling: "Coupling",
  hindquarter: "Hindquarter", topline: "Topline", balance: "Balance", muscling: "Muscling",
  stride_length: "Stride length", stride_freq: "Stride frequency", efficiency: "Action efficiency",
  coordination: "Coordination", temperament: "Temperament", trainability: "Trainability",
  relaxation: "Relaxation", drive: "Competitive drive", fast_twitch: "Natural speed",
  aerobic: "Aerobic capacity", recovery: "Recovery", soundness: "Soundness",
};

export const confidenceLabel = (c: number) =>
  c < 0.2 ? "Guess" : c < 0.45 ? "Rough read" : c < 0.7 ? "Fair read" : "Well known";

export const estimateText = (e: Estimate) =>
  e.confidence < 0.2 ? "Unknown" : `${e.label} (${e.low}–${e.high})`;

export const TRAVEL_LABELS: Record<string, string> = {
  home: "Home track", local: "Local", regional: "Regional", intrastate: "Intrastate", interstate: "Interstate",
};

export const STYLE_LABELS: Record<string, string> = {
  leader: "Leader", on_pace: "On pace", midfield: "Midfield", back: "Backmarker",
};

export const EVIDENCE_LABELS: Record<string, string> = {
  inspection: "Conformation inspection", walk_video: "Walk video", vet: "Vet check",
  trackwork: "Trackwork", trial: "Trial", race: "Race",
};
