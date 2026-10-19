import {
  DAMS, FEATURES, NAME_A, NAME_B, RACE_WORDS, SILK_COLOURS, SIRES, TRACK_INFO, TRACKS, TRACKS_BY_REGION, LINKED_REGIONS, travelBand,
} from "./racingData";
import type { FeatureDef } from "./racingData";
import type {
  EvidenceSource, HorseInternal, RaceInternal, RunStyle, Trait, TraitGroup, RunnerInternal, ResultRow, Pace,
} from "./types";

// ---------- seeded RNG (mulberry32) ----------
export class RNG {
  private s: number;
  constructor(seed: string | number) {
    const str = String(seed);
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    this.s = h >>> 0;
  }
  next(): number {
    this.s |= 0;
    this.s = (this.s + 0x6D2B79F5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(lo: number, hi: number): number { return Math.floor(this.next() * (hi - lo + 1)) + lo; }
  uniform(lo: number, hi: number): number { return this.next() * (hi - lo) + lo; }
  gauss(mean: number, std: number): number {
    const u = 1 - this.next();
    const v = this.next();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  choice<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  choices<T>(arr: T[], weights: number[]): T {
    const tot = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * tot;
    for (let i = 0; i < arr.length; i++) { r -= weights[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }
  chance(p: number): boolean { return this.next() < p; }
}

export function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- calendar ----------
export const SEASON_START = new Date(2026, 6, 26); // Sun 26 Jul 2026 — month is 0-indexed
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const SAVE_VERSION = 2;

export const BANDS: Record<string, [number, number]> = {
  Maiden: [40, 58], BM58: [45, 58], BM64: [52, 64], BM72: [60, 72], BM78: [66, 78],
  Listed: [80, 94], G3: [88, 100], G2: [94, 106], G1: [100, 116],
  Restricted: [70, 100], Special: [100, 120],
};
export const BASE_PURSE: Record<string, number> = {
  Maiden: 25_000, BM58: 25_000, BM64: 35_000, BM72: 50_000, BM78: 70_000,
  Listed: 160_000, G3: 200_000, G2: 300_000, G1: 600_000,
};
export const TIER_MULT: Record<string, number> = { metro: 2.0, provincial: 1.0, country: 0.8 };
export const PRIZE_SPLIT = [0.6, 0.2, 0.1, 0.05, 0.03, 0.02];
export const LENGTH_SECONDS = 0.17;
export const LBS_PER_LENGTH = 1.5;
export const TRAVEL_COST: Record<string, number> = { local: 150, regional: 400, intrastate: 900, interstate: 3_500 };
export const FAR_STATES = new Set(["WA", "TAS", "NT"]);
export const UPKEEP_RACING = 1_200;
export const UPKEEP_OTHER = 400;
export const GESTATION_WEEKS = 48;
export const RACE_AGE_WEEKS = 104;
export const STALLION_MIN_RATING = 90;

export const weekStart = (week: number): Date =>
  new Date(SEASON_START.getTime() + 7 * (week - 1) * 86_400_000);

export const weekSaturday = (week: number): Date =>
  new Date(weekStart(week).getTime() + 6 * 86_400_000);

export const seasonIndex = (week: number) => Math.floor((week - 1) / 52);
export const seasonLabel = (week: number) => {
  const y = 2026 + seasonIndex(week);
  return `${y}/${String(y + 1).slice(2)}`;
};
export const weekOfSeason = (week: number) => ((week - 1) % 52) + 1;

export function weekOfDate(d: Date): number {
  return Math.floor((d.getTime() - SEASON_START.getTime()) / 86_400_000 / 7) + 1;
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  if (n > 0) {
    const d = new Date(year, month - 1, 1);
    d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
    d.setDate(d.getDate() + 7 * (n - 1));
    return d;
  }
  const nxt = new Date(year + (month === 12 ? 1 : 0), month % 12, 1);
  const d = new Date(nxt.getTime() - 86_400_000);
  d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7));
  return d;
}

export function featureDate(f: FeatureDef, week: number): Date {
  const y = 2026 + seasonIndex(week);
  const year = f.month >= 8 ? y : y + 1;
  const base = nthWeekday(year, f.month, f.weekday, f.n);
  return new Date(base.getTime() + (f.offset ?? 0) * 86_400_000);
}

export function travelCost(homeTrack: string, track: string): { band: string; cost: number } {
  if (track === homeTrack) return { band: "home", cost: 0 };
  const band = travelBand(homeTrack, track);
  let cost = TRAVEL_COST[band];
  if (band === "interstate" && (FAR_STATES.has(TRACK_INFO[track].state) || FAR_STATES.has(TRACK_INFO[homeTrack].state))) {
    cost += 2_500;
  }
  return { band, cost };
}

function goingFor(rng: RNG, month: number): string {
  const wet = [5, 6, 7, 8].includes(month);
  const opts = ["Good 3", "Good 4", "Soft 5", "Soft 6", "Soft 7", "Heavy 8", "Heavy 9"];
  const w = wet ? [10, 40, 20, 12, 8, 6, 4] : [18, 50, 16, 8, 4, 3, 1];
  return rng.choices(opts, w);
}

function classDistance(rng: RNG, cls: string): number {
  if (cls === "Maiden") return rng.choice([1000, 1100, 1200, 1300, 1400, 1600]);
  if (["Listed", "G3", "G2"].includes(cls)) return rng.choice([1200, 1400, 1600, 2000, 2400]);
  return rng.choice([1000, 1100, 1200, 1300, 1400, 1500, 1600, 1800, 2000, 2200, 2400]);
}

function raceName(rng: RNG, cls: string): string {
  const word = rng.choice(RACE_WORDS);
  if (cls === "Maiden") return `${word} Maiden Plate`;
  if (cls.startsWith("BM")) return `${word} Handicap`;
  return `${word} Stakes`;
}

function makeRace(
  week: number, d: Date, track: string, name: string, cls: string, distance: number, purse: number,
  going: string, homeTrack: string, extra: Partial<{ age: number; min_rating: number; feature: boolean }> = {},
): RaceInternal {
  const info = TRACK_INFO[track];
  const { band, cost } = travelCost(homeTrack, track);
  return {
    id: uid(), week, date: isoDate(d), day: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1],
    state: info.state, region: info.region, track, tier: info.tier as "metro" | "provincial" | "country",
    name, race_class: cls, distance, purse, going,
    age_restriction: extra.age ?? null, min_rating: extra.min_rating ?? null,
    feature: extra.feature ?? false, travel: band as RaceInternal["travel"], travel_cost: cost,
    status: "open", entry_fee: Math.max(250, Math.floor(purse * 0.004)),
    field: [], result: null, pace: null,
  };
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tracksForStateTier(state: string, tier: string): string[] {
  return TRACKS.filter((t) => t.state === state && t.tier === tier).map((t) => t.name);
}

export function generateWeek(week: number, homeTrack: string): RaceInternal[] {
  const home = TRACK_INFO[homeTrack];
  const rng = new RNG(`wk-${week}-${homeTrack}`);
  const sat = weekSaturday(week);
  const month = sat.getMonth() + 1;
  const races: RaceInternal[] = [];

  const meeting = (track: string, d: Date, classes: string[]) => {
    const going = goingFor(rng, month);
    const tier = TRACK_INFO[track].tier;
    for (const cls of classes) {
      const purse = ["Listed", "G3", "G2", "G1"].includes(cls) ? BASE_PURSE[cls] : Math.floor(BASE_PURSE[cls] * TIER_MULT[tier]);
      races.push(makeRace(week, d, track, raceName(rng, cls), cls, classDistance(rng, cls), purse, going, homeTrack));
    }
  };

  // Local country racing: two meetings a week across home + linked regions.
  let local = [...(TRACKS_BY_REGION[home.region] ?? [])];
  for (const [a, b] of LINKED_REGIONS) {
    if (home.region === a) local.push(...(TRACKS_BY_REGION[b] ?? []));
    if (home.region === b) local.push(...(TRACKS_BY_REGION[a] ?? []));
  }
  local = [...new Set(local)].filter((t) => TRACK_INFO[t].tier !== "metro");
  if (local.length) {
    const d1 = new Date(sat.getTime() - 2 * 86_400_000);
    const d2 = new Date(sat.getTime() + 1 * 86_400_000);
    meeting(local[week % local.length], d1, ["Maiden", "Maiden", "BM58", "BM64"]);
    meeting(local[(week + 3) % local.length], d2, ["Maiden", "BM58", "BM64", "BM72"]);
  }

  // Every state: Saturday top meeting; home state also gets midweek provincial.
  const states = [...new Set(TRACKS.map((t) => t.state))];
  for (const st of states) {
    const top = tracksForStateTier(st, "metro");
    const topProv = top.length ? top : tracksForStateTier(st, "provincial");
    if (!topProv.length) continue;
    if (st === home.state) {
      const g = week % 4 === 0 ? "G2" : "G3";
      meeting(topProv[week % topProv.length], sat, ["Maiden", "BM64", "BM72", "BM78", "Listed", g]);
      const prov = tracksForStateTier(st, "provincial");
      if (prov.length) meeting(prov[week % prov.length], new Date(sat.getTime() - 3 * 86_400_000), ["Maiden", "BM58", "BM64", "BM72"]);
    } else {
      meeting(topProv[week % topProv.length], sat, ["Maiden", "BM72", "BM78", "Listed"]);
    }
  }

  for (const f of FEATURES) {
    const d = featureDate(f, week);
    if (weekOfDate(d) === week) {
      races.push(makeRace(week, d, f.track, f.name, f.cls, f.distance, f.purse, goingFor(rng, d.getMonth() + 1), homeTrack,
        { age: f.age, min_rating: f.min_rating, feature: true }));
    }
  }
  return races;
}

// ---------- trait model ----------
export const BODY: Trait[] = ["frame", "length", "girth", "bone", "coupling", "hindquarter", "topline", "balance", "muscling"];
export const MOVE: Trait[] = ["stride_length", "stride_freq", "efficiency", "coordination"];
export const MIND: Trait[] = ["temperament", "trainability", "relaxation", "drive"];
export const PHYS: Trait[] = ["fast_twitch", "aerobic", "recovery", "soundness"];
export const TRAITS: Trait[] = [...BODY, ...MOVE, ...MIND, ...PHYS];
export const TRAINABLE: Trait[] = ["muscling", "topline", "hindquarter", "aerobic", "coordination", "relaxation"];

export const LINKAGE: Record<TraitGroup, Trait[]> = {
  size: ["frame", "length", "bone"],
  engine: ["girth", "aerobic", "recovery"],
  power: ["hindquarter", "muscling", "fast_twitch", "stride_freq"],
  mechanics: ["stride_length", "efficiency", "coordination", "balance", "coupling", "topline"],
  mind: ["temperament", "trainability", "relaxation", "drive"],
  sound: ["soundness"],
};

type TendKey = "distance" | "frame" | "muscling" | "action" | "temperament";
const TENDENCY_MAP: Record<string, Partial<Record<Trait, number>>> = {
  "distance:sprint": { fast_twitch: 12, stride_freq: 8, aerobic: -8 },
  "distance:sprint_mile": { fast_twitch: 8, aerobic: -2 },
  "distance:mile": { fast_twitch: 3, aerobic: 3 },
  "distance:middle": { aerobic: 8, fast_twitch: -3, relaxation: 4 },
  "distance:staying": { aerobic: 12, fast_twitch: -8, stride_length: 6, relaxation: 6 },
  "frame:light": { frame: -12, bone: -6 },
  "frame:large": { frame: 12, length: 8 },
  "muscling:lean": { muscling: -10, hindquarter: -5 },
  "muscling:heavy": { muscling: 12, hindquarter: 10 },
  "action:quick": { stride_freq: 10, stride_length: -5 },
  "action:long": { stride_length: 10, stride_freq: -6 },
  "temperament:sharp": { drive: 8, relaxation: -8 },
  "temperament:relaxed": { relaxation: 10, drive: -3 },
};
const MATURITY_VAL: Record<string, number> = { early: 0.15, mid: 0.5, late: 0.85 };

// [fitness, freshness, workload, injuryBase, conditioningGains, fatigue, sharpness]
export const TRAINING: Record<string, [number, number, number, number, Partial<Record<Trait, number>>, number, number]> = {
  rest: [-5, 20, -15, 0.0, {}, -15, -8],
  walk: [-1, 12, -8, 0.0, { relaxation: 0.02 }, -8, -3],
  swim: [4, 6, 3, 0.2, { aerobic: 0.03, topline: 0.02 }, -2, 0],
  aerobic: [6, -6, 8, 1.0, { aerobic: 0.05 }, 4, 1],
  pace: [7, -8, 10, 1.5, { aerobic: 0.03, coordination: 0.02 }, 7, 4],
  speed: [6, -10, 12, 2.5, { muscling: 0.03, hindquarter: 0.03 }, 10, 8],
  barrier: [2, -2, 3, 0.3, { relaxation: 0.04 }, 1, 2],
  trial: [10, -8, 10, 1.5, { coordination: 0.03, relaxation: 0.02 }, 8, 10],
};

export const SOURCE_REVEALS: Record<EvidenceSource, Trait[]> = {
  inspection: BODY,
  walk_video: [...MOVE, "balance", "coupling"],
  vet: ["soundness", "bone"],
  trackwork: ["fast_twitch", "aerobic", "efficiency", "trainability"],
  trial: ["fast_twitch", "aerobic", "relaxation", "drive", "coordination"],
  race: [...PHYS, "drive", "relaxation", "temperament", "efficiency"],
};
export const SOURCE_GAIN: Record<EvidenceSource, number> = {
  inspection: 0.25, walk_video: 0.2, vet: 0.4, trackwork: 0.1, trial: 0.2, race: 0.15,
};

// ---------- genetics ----------
export function randomGenes(rng: RNG, quality: number, distBias = 0.5): Record<Trait, number> {
  const g: Record<Trait, number> = {} as Record<Trait, number>;
  for (const t of TRAITS) g[t] = rng.gauss(quality, 7);
  const s = distBias - 0.5;
  g.fast_twitch -= s * 20;
  g.stride_freq -= s * 10;
  g.aerobic += s * 20;
  g.stride_length += s * 10;
  g.relaxation += s * 10;
  for (const t of TRAITS) g[t] = round(clamp(g[t], 20, 100), 1);
  return g;
}

export function randomExpression(rng: RNG): Record<Trait, number> {
  const out = {} as Record<Trait, number>;
  for (const t of TRAITS) out[t] = round(clamp(1 - Math.abs(rng.gauss(0, 0.07)), 0.75, 1.0), 3);
  return out;
}

export function studProfile(sire: { id: string; fee?: number; tendencies?: Record<string, string> }): { genes: Record<Trait, number>; maturity: number } {
  const rng = new RNG(`sire-${sire.id}`);
  const quality = clamp(62 + 8 * Math.log10(Math.max(sire.fee ?? 30_000, 5_000) / 30_000), 50, 80);
  const genes: Record<Trait, number> = {} as Record<Trait, number>;
  for (const t of TRAITS) genes[t] = rng.gauss(quality, 5);
  const td = sire.tendencies ?? {};
  for (const key of ["distance", "frame", "muscling", "action", "temperament"] as TendKey[]) {
    const val = td[key];
    if (!val) continue;
    const shifts = TENDENCY_MAP[`${key}:${val}`];
    if (shifts) for (const t of TRAITS) if (shifts[t] !== undefined) genes[t] += shifts[t]!;
  }
  for (const t of TRAITS) genes[t] = round(clamp(genes[t], 20, 100), 1);
  return { genes, maturity: MATURITY_VAL[td.maturity ?? "mid"] ?? 0.5 };
}

export function inherit(
  rng: RNG, sireGenes: Record<Trait, number>, damGenes: Record<Trait, number>, sireMat: number, damMat: number,
): { genes: Record<Trait, number>; maturity: number; sources: Record<TraitGroup, "sire" | "dam" | "blend"> } {
  const genes = {} as Record<Trait, number>;
  const sources = {} as Record<TraitGroup, "sire" | "dam" | "blend">;
  for (const group of Object.keys(LINKAGE) as TraitGroup[]) {
    const w = rng.uniform(0.15, 0.85);
    sources[group] = w > 0.6 ? "sire" : w < 0.4 ? "dam" : "blend";
    for (const t of LINKAGE[group]) {
      let v = w * sireGenes[t] + (1 - w) * damGenes[t] + rng.gauss(0, 4);
      if (rng.chance(0.03)) v += rng.gauss(0, 10);
      genes[t] = round(clamp(v, 20, 100), 1);
    }
  }
  const mw = rng.uniform(0.3, 0.7);
  const maturity = round(clamp(mw * sireMat + (1 - mw) * damMat + rng.gauss(0, 0.1), 0, 1), 2);
  return { genes, maturity, sources };
}

// ---------- development & derived ----------
export function ageYears(h: HorseInternal, week: number): number {
  return Math.max(0, (week - h.born_week) / 52);
}

export function development(h: HorseInternal, week: number): number {
  const a = ageYears(h, week);
  return 1 / (1 + Math.exp(-(a - (1.6 + 1.4 * h.maturity)) / 0.45));
}

export function currentBody(h: HorseInternal, week: number): Record<Trait, number> {
  const dev = development(h, week);
  const cond = h.conditioning;
  const out = {} as Record<Trait, number>;
  for (const t of TRAITS) {
    const ceiling = h.genes[t] * h.expression[t];
    let v = ceiling * (MIND.includes(t) ? 0.85 + 0.15 * dev : 0.6 + 0.4 * dev);
    if (TRAINABLE.includes(t)) v *= 0.88 + 0.12 * (cond[t] ?? 0);
    out[t] = v;
  }
  return out;
}

export interface Derived {
  speed: number; acceleration: number; stamina: number; early_speed: number;
  efficiency: number; consistency: number; durability: number;
}

export function derive(h: HorseInternal, week: number, body?: Record<Trait, number>): Derived {
  const b = body ?? currentBody(h, week);
  const supportGap = Math.max(0, b.frame - (b.bone + b.coupling) / 2 - 5);
  const eff = 0.6 * b.efficiency + 0.2 * b.coordination + 0.2 * b.balance - 0.4 * supportGap;
  const acc = 0.35 * b.fast_twitch + 0.25 * b.hindquarter + 0.2 * b.stride_freq + 0.2 * b.balance;
  return {
    speed: round(0.35 * b.fast_twitch + 0.2 * b.hindquarter + 0.15 * b.stride_freq + 0.15 * b.coordination + 0.15 * eff, 1),
    acceleration: round(acc, 1),
    stamina: round(0.4 * b.aerobic + 0.15 * b.girth + 0.15 * eff + 0.15 * b.relaxation + 0.15 * b.stride_length, 1),
    early_speed: round(0.5 * acc + 0.3 * b.drive + 0.2 * (100 - b.relaxation), 1),
    efficiency: round(clamp(eff, 0, 100), 1),
    consistency: round(0.5 * b.temperament + 0.3 * b.relaxation + 0.2 * b.trainability, 1),
    durability: round(clamp(b.soundness - 0.6 * supportGap, 0, 100), 1),
  };
}

export const ability = (d: Derived) => 0.5 * d.speed + 0.3 * d.stamina + 0.2 * d.acceleration;

export function ratingFromStats(d: Derived): number {
  return Math.round(ability(d) * 1.35 - 15);
}

export function bestDistance(d: Derived): number {
  const ratio = d.stamina / Math.max(1, d.speed);
  const dist = 1000 + ((ratio - 0.55) / 0.55) * 2200;
  return clamp(Math.round(dist / 100) * 100, 1000, 3200);
}

const DISTANCES = [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3200];

/** Suitability 0..1 at each distance — bell curve centred on best_distance. */
export function distanceProfile(d: Derived): { distance: number; suitability: number }[] {
  const peak = bestDistance(d);
  const spread = 250 + 900 * (d.stamina / Math.max(1, d.speed));
  return DISTANCES.map((distance) => ({ distance, suitability: Math.exp(-Math.pow((distance - peak) / spread, 2)) }));
}

export function ceilingRating(h: HorseInternal): number {
  const b = {} as Record<Trait, number>;
  for (const t of TRAITS) b[t] = h.genes[t] * h.expression[t];
  return ratingFromStats(derive(h, 0, b));
}

export function refresh(h: HorseInternal, week: number): HorseInternal {
  const d = derive(h, week);
  h.speed = d.speed; h.stamina = d.stamina; h.acceleration = d.acceleration;
  h.early_speed = d.early_speed; h.efficiency = d.efficiency; h.consistency = d.consistency; h.durability = d.durability;
  h.best_distance = bestDistance(d);
  h.distance_profile = distanceProfile(d);
  if (h.peak_rating === undefined) h.peak_rating = h.rating;
  if (["foal", "broodmare", "stallion"].includes(h.status)) {
    if (!h.rating) h.rating = ratingFromStats(d);
  }
  return h;
}

// ---------- horses ----------
export function horseName(rng: RNG, taken = new Set<string>()): string {
  for (let i = 0; i < 50; i++) {
    const n = `${rng.choice(NAME_A)} ${rng.choice(NAME_B)}`;
    if (!taken.has(n)) { taken.add(n); return n; }
  }
  return `${rng.choice(NAME_A)} ${rng.choice(NAME_B)} ${rng.int(2, 9)}`;
}

function baseHorse(
  rng: RNG, owner: "player" | "market", sex: HorseInternal["sex"], age: number,
  status: HorseInternal["status"], week: number, sire: string, dam: string,
): HorseInternal {
  return {
    id: uid(), name: horseName(rng), sex, owner, status,
    born_week: week - age * 52 - rng.int(0, 20), sire, dam,
    conditioning: Object.fromEntries(TRAINABLE.map((t) => [t, 0])) as Record<Trait, number>,
    workload: 0, fatigue: 0, sharpness: 20,
    knowledge: Object.fromEntries(TRAITS.map((t) => [t, 0])) as Record<Trait, number>,
    evidence: [], fitness: 50, freshness: 85, form: "",
    starts: 0, wins: 0, places: 0, earnings: 0, training: "rest",
    going_pref: rng.choice(["any", "any", "firm", "wet"]),
    injured_weeks: 0, entered_race_id: null, in_foal_to: null, in_foal_sire_id: null, due_week: null, history: [],
    genes: {} as Record<Trait, number>, expression: {} as Record<Trait, number>, maturity: 0.5,
    speed: 50, stamina: 50, acceleration: 50, early_speed: 50, efficiency: 50, consistency: 50, durability: 50,
    best_distance: 1400, distance_profile: [], rating: 50, peak_rating: 50, price: 0,
  };
}

export function newHorse(
  rng: RNG, owner: "player" | "market", rating: number, age: number, week: number,
  opts: { sex?: HorseInternal["sex"]; status?: HorseInternal["status"]; sire?: string; distBias?: number } = {},
): HorseInternal {
  const sex = opts.sex ?? rng.choice(age <= 3 ? ["colt", "filly", "gelding"] : ["gelding", "mare", "horse"]);
  const status = opts.status ?? "racing";
  const h = baseHorse(rng, owner, sex, age, status, week, opts.sire ?? rng.choice(SIRES).name, rng.choice(DAMS));
  const quality = (rating + 15) / 1.35 + rng.uniform(0, 6);
  h.genes = randomGenes(rng, quality, opts.distBias ?? rng.next());
  h.expression = randomExpression(rng);
  h.maturity = round(rng.next(), 2);
  h.conditioning = Object.fromEntries(TRAINABLE.map((t) => [t, round(rng.uniform(0.2, 0.6), 2)])) as Record<Trait, number>;
  refresh(h, week);
  h.rating = ratingFromStats(h);
  h.price = valuation(h, week);
  return h;
}

export function foalFrom(
  rng: RNG, sire: { id: string; name: string; fee?: number; genes?: Record<Trait, number>; maturity?: number; tendencies?: Record<string, string> },
  mare: HorseInternal, week: number,
): HorseInternal {
  let sGenes: Record<Trait, number>; let sMat: number;
  if (sire.genes) { sGenes = sire.genes; sMat = sire.maturity ?? 0.5; }
  else { const sp = studProfile(sire); sGenes = sp.genes; sMat = sp.maturity; }
  const { genes, maturity, sources } = inherit(rng, sGenes, mare.genes, sMat, mare.maturity);
  const sex = rng.choice(["colt", "filly"]) as HorseInternal["sex"];
  const h = baseHorse(rng, "player", sex, 0, "foal", week, sire.name, mare.name);
  h.born_week = week;
  h.name = `${sire.name} x ${mare.name}`;
  h.genes = genes; h.expression = randomExpression(rng); h.maturity = maturity; h.fitness = 20;
  h.inheritance = sources; h.race_eligible_week = week + RACE_AGE_WEEKS;
  h.pedigree_projection = {} as Record<Trait, number>;
  for (const t of TRAITS) h.pedigree_projection[t] = round((sGenes[t] + mare.genes[t]) / 2, 1);
  refresh(h, week);
  h.rating = 0;
  h.price = valuation(h, week);
  return h;
}

export function valuation(h: HorseInternal, week: number): number {
  const ceil = ceilingRating(h);
  let v: number;
  if (h.status === "foal") v = 20_000 * Math.pow(1.05, ceil - 60);
  else if (h.status === "broodmare") v = 8_000 * Math.pow(1.06, ceil - 50);
  else {
    const a = ageYears(h, week);
    const ageF = a <= 3 ? 1.2 : a <= 5 ? 1.0 : 0.6;
    v = 12_000 * Math.pow(1.065, (h.rating ?? 50) - 45) * ageF + h.wins * 2_000;
  }
  return Math.round(clamp(v, 3_000, 5_000_000) / 500) * 500;
}

// ---------- scouting ----------
const DESCRIPTORS: [number, string][] = [
  [35, "weak"], [50, "below average"], [62, "average"], [74, "good"], [86, "strong"], [101, "exceptional"],
];
export function describe(v: number): string {
  for (const [cut, label] of DESCRIPTORS) if (v < cut) return label;
  return "exceptional";
}

export function observe(h: HorseInternal, source: EvidenceSource, week: number): void {
  for (const t of SOURCE_REVEALS[source]) {
    h.knowledge[t] = round(Math.min(0.95, (h.knowledge[t] ?? 0) + SOURCE_GAIN[source]), 2);
  }
  h.evidence.push({ week, source });
}

export function estimate(h: HorseInternal, trait: Trait, _week: number): { low: number; high: number; label: string; confidence: number } {
  const trueVal = currentBody(h, _week)[trait];
  const conf = h.knowledge[trait] ?? 0;
  const bias = new RNG(`${h.id}-${trait}`).gauss(0, 10) * (1 - conf);
  const width = 4 + 20 * (1 - conf);
  const mid = trueVal + bias;
  return { low: Math.round(mid - width), high: Math.round(mid + width), label: describe(mid), confidence: conf };
}

// ---------- training ----------
export function applyTraining(rng: RNG, h: HorseInternal, week: number): string {
  if (h.injured_weeks > 0) {
    h.injured_weeks -= 1;
    h.fitness = clamp(h.fitness - 6, 0, 100);
    h.freshness = clamp(h.freshness + 10, 0, 100);
    h.workload = Math.max(0, h.workload - 10);
    return `${h.name} recovering (${h.injured_weeks} wk left)`;
  }
  const [fit, fresh, load, inj, gains, fatigue, sharp] = TRAINING[h.training];
  const dev = development(h, week);
  const b = currentBody(h, week);
  h.fitness = round(clamp(h.fitness + fit, 0, 100), 1);
  h.freshness = round(clamp(h.freshness + fresh, 0, 100), 1);
  h.workload = round(clamp(h.workload * 0.85 + load, 0, 100), 1);
  // fatigue recovers at rest, accumulates with hard work; recovery depends on constitution
  const recovery = 0.7 + 0.3 * b.soundness / 100;
  h.fatigue = round(clamp(h.fatigue + fatigue * (2 - recovery), 0, 100), 1);
  h.sharpness = round(clamp(h.sharpness + sharp, 0, 100), 1);
  if (h.training === "rest" || h.training === "walk") h.sharpness = round(clamp(h.sharpness - 3, 0, 100), 1);

  const receptivity = (0.4 + 0.6 * dev) * (0.7 + 0.3 * b.trainability / 100);
  const changed: string[] = [];
  for (const [t, g] of Object.entries(gains) as [Trait, number][]) {
    const before = h.conditioning[t];
    h.conditioning[t] = round(clamp(before + g * receptivity * rng.uniform(0.7, 1.3), 0, 1), 3);
    if (h.conditioning[t] > before + 0.02) changed.push(t);
  }
  if (h.training === "rest") {
    for (const t of TRAINABLE) h.conditioning[t] = round(Math.max(0, h.conditioning[t] - 0.01), 3);
  }
  const d = derive(h, week);
  let risk = inj * (1.6 - d.durability / 100);
  risk += Math.max(0, h.workload - 60) * 0.08;
  risk += (1 - dev) * inj * 1.5;
  if (h.freshness < 30) risk += 3;
  refresh(h, week);
  if (risk > 0 && rng.chance(risk / 100)) {
    h.injured_weeks = rng.int(2, 6);
    h.training = "rest";
    return `⚠ ${h.name} pulled up sore — out ${h.injured_weeks} weeks`;
  }
  const note = changed.length ? ` (developing: ${changed.join(", ")})` : "";
  const warn = h.workload > 60 ? " — workload high" : "";
  return `${h.name}: ${h.training}${note}${warn}`;
}

// ---------- trainer feedback (natural-language read of condition) ----------
export function trainerFeedback(h: HorseInternal, week: number): string[] {
  const out: string[] = [];
  const fit = h.fitness, fat = h.fatigue, sharp = h.sharpness, fresh = h.freshness;
  if (fit < 40) out.push("Still carrying plenty of condition — a long way from race fitness.");
  else if (fit < 60) out.push("Fitness is coming along, but not yet race-ready.");
  else if (fit < 80) out.push("Getting close to race fitness.");
  else out.push("Looks fit and well in herself.");
  if (fat > 55) out.push("Showing signs of fatigue — may need an easier week.");
  if (sharp > 70 && fit > 65) out.push("Work suggests she is nearing race fitness and sharp.");
  else if (sharp < 25 && fit > 60) out.push("Fit but lacks race sharpness — a trial or a strong gallop would help.");
  if (fresh < 35) out.push("Beginning to tighten up — a freshen-up would help.");
  const dev = development(h, week);
  if (dev < 0.4) out.push("Still immature and growing into her frame.");
  else if (dev < 0.7) out.push("Still developing physically.");
  if (h.injured_weeks > 0) out.push(`On the easy list — ${h.injured_weeks} week${h.injured_weeks > 1 ? "s" : ""} until back.`);
  if (h.workload > 65) out.push("Carrying a heavy workload — keep an eye on her.");
  return out;
}

// ---------- fields & odds ----------
export function runnerFromHorse(h: HorseInternal, barrier: number, silks: string, isPlayer: boolean, week: number): RunnerInternal {
  const d = derive(h, week);
  // AI field horses have no modelled genes — fall back to their cached stats
  const ok = (v: number, fb: number) => (Number.isFinite(v) ? v : fb);
  return {
    id: uid(), horse_id: isPlayer ? h.id : null, name: h.name, barrier,
    rating: h.rating, odds: 0, place_odds: 0, is_player: isPlayer, silks,
    sire: h.sire, age: Math.floor(ageYears(h, week)),
    speed: ok(d.speed, h.speed), stamina: ok(d.stamina, h.stamina), acceleration: ok(d.acceleration, h.acceleration),
    early_speed: ok(d.early_speed, h.early_speed), efficiency: ok(d.efficiency, h.efficiency),
    consistency: ok(d.consistency, h.consistency), durability: ok(d.durability, h.durability),
    fitness: h.fitness, freshness: h.freshness, fatigue: h.fatigue ?? 0, sharpness: h.sharpness ?? 50, going_pref: h.going_pref, style: "midfield",
  };
}

function aiRunnerStats(rng: RNG, rating: number, distBias: number): Partial<RunnerInternal> {
  const a = (rating + 15) / 1.35;
  const s = distBias - 0.4;
  let sp = a - s * 14 + rng.gauss(0, 4);
  let stm = a + s * 40 + rng.gauss(0, 4);
  let acc = a - s * 10 + rng.gauss(0, 4);
  const k = a - (0.5 * sp + 0.3 * stm + 0.2 * acc);
  acc = clamp(acc + k, 15, 120);
  sp = clamp(sp + k, 15, 120);
  stm = clamp(stm + k, 15, 120);
  return {
    speed: round(sp, 1), stamina: round(stm, 1), acceleration: round(acc, 1),
    early_speed: round(clamp(acc + rng.gauss(0, 12), 15, 120), 1),
    efficiency: round(rng.uniform(50, 85), 1), consistency: round(rng.uniform(40, 85), 1), durability: 60,
  };
}

export function drawAiField(race: RaceInternal, size: number): RunnerInternal[] {
  const rng = new RNG(race.id);
  let [lo, hi] = BANDS[race.race_class];
  if (race.min_rating) { lo = Math.max(lo, race.min_rating); hi = Math.max(hi, race.min_rating + 18); }
  const bias = clamp((race.distance - 1000) / 2200, 0, 1);
  const taken = new Set<string>();
  const field: RunnerInternal[] = [];
  for (let i = 0; i < size; i++) {
    const r = rng.uniform(lo, hi);
    const h: HorseInternal = {
      id: uid(), name: horseName(rng, taken), sex: "gelding", owner: "market", status: "racing",
      born_week: 0, sire: rng.choice(SIRES).name, dam: "", conditioning: {} as Record<Trait, number>,
      workload: 0, fatigue: 0, sharpness: 50, knowledge: {} as Record<Trait, number>, evidence: [],
      fitness: rng.int(72, 96), freshness: rng.int(65, 95), form: "", starts: 0, wins: 0, places: 0, earnings: 0,
      training: "rest", going_pref: rng.choice(["any", "any", "firm", "wet"]), injured_weeks: 0,
      entered_race_id: null, in_foal_to: null, in_foal_sire_id: null, due_week: null, history: [],
      genes: {} as Record<Trait, number>, expression: {} as Record<Trait, number>, maturity: 0.5,
      rating: Math.round(r), price: 0,
      ...(aiRunnerStats(rng, r, clamp(bias + rng.gauss(0, 0.15), 0, 1)) as Partial<HorseInternal>),
    } as unknown as HorseInternal;
    const runner = runnerFromHorse(h, i + 1, SILK_COLOURS[i % SILK_COLOURS.length], false, 0);
    runner.age = race.age_restriction ?? rng.int(3, 7);
    field.push(runner);
  }
  return field;
}

export const goingNum = (going: string) => parseInt(going.split(" ").pop() ?? "4", 10);

// ---------- race simulation ----------
export function assignStyles(field: RunnerInternal[]): number {
  const ranked = [...field].sort((a, b) => b.early_speed - a.early_speed);
  const n = ranked.length;
  ranked.forEach((r, i) => {
    const q = i / Math.max(1, n - 1);
    r.style = (q < 0.2 ? "leader" : q < 0.45 ? "on_pace" : q < 0.75 ? "midfield" : "back") as RunStyle;
  });
  const hot = ranked.filter((r) => r.style === "leader" && r.early_speed > 65).length;
  return clamp(hot - 1, 0, 3);
}

function segSpeed(r: RunnerInternal, race: RaceInternal, f: number, pace: number): number {
  const distReq = clamp((race.distance - 1000) / 2200, 0, 1);
  const need = 40 + 55 * distReq;
  const base = 15.5 + (r.speed / 100) * 2.2;
  const early = f < 0.25 ? ((r.early_speed - 60) / 100) * 0.9 : 0;
  const burn = pace * (r.style === "leader" ? 6 : r.style === "on_pace" ? 3 : 1);
  const fatigue = (Math.max(0, need - (r.stamina - burn)) / 100) * 3.0 * f * f;
  let kick = f > 0.7 ? ((r.acceleration - 60) / 100) * 0.7 : 0;
  if (f > 0.7) {
    if (r.style === "midfield" || r.style === "back") kick += pace * 0.06;
    else if (pace === 0 && (r.style === "leader" || r.style === "on_pace")) kick += 0.1;
  }
  const m = (0.94 + 0.04 * r.fitness / 100 + 0.02 * r.freshness / 100) * (0.97 + 0.03 * r.efficiency / 100) * (1 - r.fatigue / 100 * 0.12) * (0.96 + 0.04 * r.sharpness / 100);
  const g = goingNum(race.going);
  const pref = r.going_pref ?? "any";
  let gf = 1.0;
  if (pref === "firm") gf = g <= 4 ? 1.012 : g >= 6 ? 0.985 : 1.0;
  else if (pref === "wet") gf = g <= 4 ? 0.99 : 1.015;
  return (base + early - fatigue + kick) * m * gf * (1 - Math.max(0, g - 4) * 0.006);
}

function barrierPenalty(r: RunnerInternal, race: RaceInternal): number {
  return Math.max(0, r.barrier - 8) * 0.05 * (1400 / race.distance);
}

function expectedTime(r: RunnerInternal, race: RaceInternal, pace: number): number {
  const seg = race.distance / 10;
  let t = 0;
  for (let i = 0; i < 10; i++) t += seg / segSpeed(r, race, (i + 0.5) / 10, pace);
  return t + barrierPenalty(r, race);
}

export function priceField(race: RaceInternal): void {
  const field = race.field;
  if (!field.length) return;
  const pace = assignStyles(field);
  const times = field.map((r) => expectedTime(r, race, pace));
  const tmin = Math.min(...times);
  const ws = times.map((t) => Math.exp(-(t - tmin) / 0.55));
  const tot = ws.reduce((a, b) => a + b, 0);
  field.forEach((r, i) => {
    let win = clamp(0.85 / (ws[i] / tot), 1.2, 101);
    win = win >= 10 ? Math.round(win * 2) / 2 : Math.round(win * 10) / 10;
    r.odds = win;
    r.place_odds = Math.round(Math.max(1.05, (win - 1) / 3.5 + 1) * 100) / 100;
  });
}

export function simulate(race: RaceInternal): ResultRow[] {
  const rng = new RNG(`${race.id}-sim`);
  const seg = race.distance / 10;
  const pace = assignStyles(race.field);
  const rows: { r: RunnerInternal; time: number; cps: number[] }[] = [];
  for (const r of race.field) {
    const formDay = rng.gauss(0, 0.32 - r.consistency * 0.0025);
    let t = barrierPenalty(r, race);
    const cps = [0];
    for (let i = 0; i < 10; i++) {
      const v = segSpeed(r, race, (i + 0.5) / 10, pace) + formDay + rng.gauss(0, 0.16);
      t += seg / Math.max(8, v);
      cps.push(Math.round(t * 1000) / 1000);
    }
    rows.push({ r, time: t, cps });
  }
  rows.sort((a, b) => a.time - b.time);
  const winTime = rows[0].time;
  const out: ResultRow[] = [];
  let prev = winTime;
  rows.forEach((row, idx) => {
    const pos = idx + 1;
    const r = row.r;
    const margin = pos === 1 ? 0 : Math.round(Math.max(0.05, (row.time - prev) / LENGTH_SECONDS) * 10) / 10;
    prev = row.time;
    out.push({
      runner_id: r.id, horse_id: r.horse_id, name: r.name, position: pos,
      margin, behind: Math.round((row.time - winTime) / LENGTH_SECONDS * 10) / 10,
      time: Math.round(row.time * 100) / 100, checkpoints: row.cps, is_player: r.is_player,
      prize: pos <= PRIZE_SPLIT.length ? Math.floor(race.purse * PRIZE_SPLIT[pos - 1]) : 0,
      odds: r.odds, silks: r.silks, barrier: r.barrier, style: r.style, rating_in: r.rating,
    });
  });
  race.pace = (["slow", "even", "genuine", "hot"] as Pace[])[pace];
  return out;
}

// ---------- ratings ----------
export function performanceRatings(results: ResultRow[]): Record<string, number> {
  const top = results.map((r) => r.rating_in).sort((a, b) => b - a).slice(0, 4);
  const winnerPerf = top.reduce((a, b) => a + b, 0) / top.length + 3;
  const out: Record<string, number> = {};
  for (const r of results) out[r.runner_id] = Math.round((winnerPerf - r.behind * LBS_PER_LENGTH) * 10) / 10;
  return out;
}

export function updatedRating(old: number, perf: number): number {
  const k = perf > old ? 0.35 : 0.2;
  return Math.round(clamp(old + k * (perf - old), 30, 140));
}

export const placeCount = (fieldSize: number) => (fieldSize <= 7 ? 2 : 3);

// ---------- helpers ----------
function round(v: number, dp: number): number {
  const m = Math.pow(10, dp);
  return Math.round(v * m) / m;
}
