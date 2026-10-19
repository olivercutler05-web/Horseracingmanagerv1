import { supabase } from "./supabase";
import { SIRES, SIRES_BY_ID, TRACK_INFO, TRACKS } from "./racingData";
import {
  ageYears, applyTraining, assignStyles, ceilingRating, clamp, describe, development, drawAiField, estimate, foalFrom,
  generateWeek, GESTATION_WEEKS, inherit, observe, performanceRatings, priceField, RACE_AGE_WEEKS, refresh, runnerFromHorse, SAVE_VERSION,
  simulate, studProfile, TRAITS, TRAINING, TRAINABLE, UPKEEP_OTHER, UPKEEP_RACING, updatedRating, valuation, RNG, uid,
  weekSaturday, seasonLabel, weekOfSeason, type Derived,
} from "./engine";
import type {
  AdvanceSummary, Bet, BetCreate, BreedingPreview, EvidenceSource, GameCreate, GameState, Horse, HorseInternal,
  Race, RaceInternal, RunnerInternal, ResultRow, SaveData, Sire, Trait,
} from "./types";

const LOOKAHEAD = 8;
const MAX_FIELD = 14;
const MIN_RACE_FITNESS = 55;
const STALLION_MIN_RATING = 90;
const HEAVY_WORK = new Set(["pace", "speed", "trial"]);
const LIGHT_WORK = new Set(["rest", "walk"]);
const STATUS_ORDER: Record<string, number> = { racing: 0, foal: 1, broodmare: 2, stallion: 3, retired: 4 };
const HIDDEN = new Set([
  "genes", "expression", "maturity", "conditioning", "knowledge", "inheritance", "pedigree_projection",
  "speed", "stamina", "acceleration", "early_speed", "efficiency", "consistency", "durability",
]);
const RUNNER_HIDDEN = new Set(["speed", "stamina", "acceleration", "early_speed", "efficiency", "consistency", "durability"]);

export class GameError extends Error {}

// ---------- save load / persist ----------
async function loadSave(): Promise<SaveData | null> {
  const { data, error } = await supabase.from("game_state").select("data").eq("id", "main").maybeSingle();
  if (error) throw new GameError(`Could not load save: ${error.message}`);
  return (data as { data: SaveData } | null)?.data ?? null;
}

async function persist(save: SaveData): Promise<void> {
  const { error } = await supabase.from("game_state").upsert({ id: "main", data: save, updated_at: new Date().toISOString() });
  if (error) throw new GameError(`Could not save: ${error.message}`);
}

export async function hasGame(): Promise<boolean> {
  return !!(await loadSave());
}

// ---------- public projections ----------
function devLabel(h: HorseInternal, week: number): Horse["development"] {
  const d = development(h, week);
  return d < 0.4 ? "immature" : d < 0.75 ? "developing" : d < 0.95 ? "maturing" : "mature";
}

export function horsePublic(h: HorseInternal, week: number): Horse {
  const out: any = {};
  for (const k of Object.keys(h) as (keyof HorseInternal)[]) if (!HIDDEN.has(k as string)) out[k] = h[k];
  out.age = Math.floor(ageYears(h, week));
  out.profile = {} as Record<Trait, any>;
  for (const t of TRAITS) out.profile[t] = estimate(h, t, week);
  out.development = devLabel(h, week);
  const k = h.knowledge;
  const known = (k.aerobic ?? 0) + (k.fast_twitch ?? 0) >= 0.35 * 2;
  out.best_distance = known ? h.best_distance : null;
  if (h.pedigree_projection) {
    out.pedigree_suggests = {} as Record<Trait, any>;
    for (const t of TRAITS) out.pedigree_suggests[t] = describe(h.pedigree_projection[t]);
  } else {
    out.pedigree_suggests = null;
  }
  if (h.owner === "player") out.price = valuation(h, week);
  return out as Horse;
}

function runnerPublic(r: RunnerInternal): RunnerInternal {
  const out: any = {};
  for (const k of Object.keys(r) as (keyof RunnerInternal)[]) if (!RUNNER_HIDDEN.has(k as string)) out[k] = r[k];
  return out as RunnerInternal;
}

function racePublic(r: RaceInternal): Race {
  return { ...r, field: r.field.map(runnerPublic), pace: r.pace } as unknown as Race;
}

export function gameState(save: SaveData): GameState {
  const w = save.week;
  return {
    stable_name: save.stable_name, state: save.state, home_track: save.home_track, silks: save.silks,
    week: w, cash: save.cash, date: weekSaturday(w).toISOString().slice(0, 10),
    season: seasonLabel(w), week_of_season: weekOfSeason(w),
  };
}

// ---------- meta ----------
export function getMeta() {
  return {
    states: TRACKS.length ? [...new Set(TRACKS.map((t) => t.state))].map((code) => {
      const s = TRACK_INFO[Object.keys(TRACK_INFO).find((n) => TRACK_INFO[n].state === code)!];
      return { code, name: s ? fullStateName(code) : code };
    }) : [],
    tracks: TRACKS,
  };
}
function fullStateName(code: string): string {
  const names: Record<string, string> = { VIC: "Victoria", NSW: "New South Wales", QLD: "Queensland", SA: "South Australia", WA: "Western Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory" };
  return names[code] ?? code;
}

// ---------- race generation ----------
function ensureWeek(save: SaveData, week: number): void {
  if (save.races.some((r) => r.week === week)) return;
  const races = generateWeek(week, save.home_track);
  save.races.push(...races);
  if (!save.generated_weeks) save.generated_weeks = [];
  save.generated_weeks.push(week);
}

function ensureField(race: RaceInternal): void {
  if (race.status !== "open" || race.drawn) return;
  const rng = new RNG(race.id + "size");
  const size = race.feature ? 14 : rng.int(9, 13);
  const players = race.field.filter((r) => r.is_player);
  const field = drawAiField(race, Math.max(2, size - players.length)).concat(players);
  field.forEach((r, i) => (r.barrier = i + 1));
  race.field = field;
  race.drawn = true;
  priceField(race);
}

function refreshPlayerRunners(race: RaceInternal, save: SaveData): void {
  for (let i = 0; i < race.field.length; i++) {
    const r = race.field[i];
    if (!r.is_player) continue;
    const h = save.horses.find((x) => x.id === r.horse_id);
    if (!h) continue;
    const fresh = runnerFromHorse(h, r.barrier, r.silks, true, save.week);
    (fresh as RunnerInternal).id = r.id; (fresh as RunnerInternal).odds = r.odds; (fresh as RunnerInternal).place_odds = r.place_odds;
    race.field[i] = fresh;
  }
}

// ---------- API ----------
export async function createGame(req: GameCreate): Promise<GameState> {
  if (!TRACK_INFO[req.home_track]) throw new GameError("Unknown home track");
  const rng = new RNG(Date.now().toString());
  const save: SaveData = {
    version: SAVE_VERSION, stable_name: req.stable_name, home_track: req.home_track,
    state: TRACK_INFO[req.home_track].state, silks: req.silks, week: 1, cash: 400_000,
    horses: [], races: [], bets: [], generated_weeks: [],
  };
  const starters: HorseInternal[] = [
    makeStarter(rng, "player", 48, 2, { sex: "colt" }),
    makeStarter(rng, "player", 58, 3, { sex: "filly" }),
    makeStarter(rng, "player", 66, 4, { sex: "gelding" }),
    makeStarter(rng, "player", 74, 7, { sex: "mare", status: "broodmare" }),
  ];
  for (const h of starters) { h.fitness = rng.int(60, 75); observe(h, "inspection", 1); h.price = valuation(h, 1); }
  save.horses.push(...starters);
  save.horses.push(...generateMarket(rng, 1));
  ensureWeek(save, 1);
  await persist(save);
  return gameState(save);
}

function makeStarter(rng: RNG, owner: "player" | "market", rating: number, age: number, opts: { sex?: HorseInternal["sex"]; status?: HorseInternal["status"] }): HorseInternal {
  return newHorseInternal(rng, owner, rating, age, 1, opts);
}

import { newHorse as newHorseEngine } from "./engine";
function newHorseInternal(rng: RNG, owner: "player" | "market", rating: number, age: number, week: number, opts: { sex?: HorseInternal["sex"]; status?: HorseInternal["status"]; sire?: string; distBias?: number } = {}): HorseInternal {
  return newHorseEngine(rng, owner, rating, age, week, opts);
}

function generateMarket(rng: RNG, week: number): HorseInternal[] {
  const out: HorseInternal[] = [];
  for (let i = 0; i < 6; i++) out.push(newHorseInternal(rng, "market", rng.uniform(45, 88), rng.choice([2, 2, 3, 3, 4, 5]), week));
  for (let i = 0; i < 2; i++) out.push(newHorseInternal(rng, "market", rng.uniform(62, 92), rng.int(6, 10), week, { sex: "mare", status: "broodmare" }));
  for (const h of out) h.price = valuation(h, week);
  return out;
}

async function save0(): Promise<SaveData> {
  const s = await loadSave();
  if (!s) throw new GameError("No stable yet — create one first");
  return s;
}

export async function getGame(): Promise<GameState> {
  const s = await save0();
  return gameState(s);
}

export async function listHorses(): Promise<Horse[]> {
  const s = await save0();
  return s.horses.filter((h) => h.owner === "player")
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || b.rating - a.rating)
    .map((h) => horsePublic(h, s.week));
}

export async function getHorse(id: string): Promise<Horse> {
  const s = await save0();
  const h = s.horses.find((x) => x.id === id && (x.owner === "player" || x.owner === "market"));
  if (!h) throw new GameError("Horse not found");
  return horsePublic(h, s.week);
}

export async function updateHorse(id: string, body: { name?: string; training?: string }): Promise<Horse> {
  const s = await save0();
  const h = s.horses.find((x) => x.id === id && x.owner === "player");
  if (!h) throw new GameError("Horse not found in your stable");
  if (body.training) {
    if (!(body.training in TRAINING)) throw new GameError(`Unknown training type '${body.training}'`);
    if (h.injured_weeks > 0 && !LIGHT_WORK.has(body.training)) throw new GameError("Injured horses can only rest or walk");
    if (["broodmare", "stallion", "retired"].includes(h.status) && !LIGHT_WORK.has(body.training)) throw new GameError("Horses out of training can only rest or walk");
    if (HEAVY_WORK.has(body.training) && ageYears(h, s.week) < 1.75) throw new GameError("Too young for fast work");
    h.training = body.training as HorseInternal["training"];
  }
  if (body.name !== undefined) h.name = body.name.trim();
  await persist(s);
  return horsePublic(h, s.week);
}

const INSPECT_COST: Record<string, number> = { inspection: 250, walk_video: 0, vet: 800 };

export async function inspectHorse(id: string, source: EvidenceSource): Promise<Horse> {
  const s = await save0();
  const h = s.horses.find((x) => x.id === id && (x.owner === "player" || x.owner === "market"));
  if (!h) throw new GameError("Horse not found");
  if (source !== "walk_video" && source !== "inspection" && source !== "vet") throw new GameError("Unknown inspection type");
  const cost = INSPECT_COST[source];
  if (s.cash < cost) throw new GameError(`Not enough funds — need $${cost.toLocaleString()}`);
  observe(h, source, s.week);
  s.cash -= cost;
  await persist(s);
  return horsePublic(h, s.week);
}

export async function sellHorse(id: string): Promise<{ horse: Horse; price: number }> {
  const s = await save0();
  const h = s.horses.find((x) => x.id === id && x.owner === "player");
  if (!h) throw new GameError("Horse not found in your stable");
  if (h.entered_race_id) throw new GameError("Scratch the horse from its race first");
  if (h.in_foal_to) throw new GameError("Cannot sell a mare in foal");
  const price = Math.floor(valuation(h, s.week) * 0.85);
  s.horses = s.horses.filter((x) => x.id !== id);
  s.cash += price;
  await persist(s);
  return { price, horse: { ...horsePublic(h, s.week), price } };
}

export async function retireHorse(id: string): Promise<Horse> {
  const s = await save0();
  const h = s.horses.find((x) => x.id === id && x.owner === "player");
  if (!h) throw new GameError("Horse not found in your stable");
  if (h.status !== "racing") throw new GameError("Only racing horses can be retired");
  if (h.entered_race_id) throw new GameError("Scratch the horse from its race first");
  if (h.sex === "filly" || h.sex === "mare") { h.status = "broodmare"; h.sex = "mare"; }
  else if ((h.sex === "colt" || h.sex === "horse") && h.rating >= STALLION_MIN_RATING) { h.status = "stallion"; h.sex = "horse"; }
  else h.status = "retired";
  h.training = "rest";
  await persist(s);
  return horsePublic(h, s.week);
}

export async function importHorse(body: { name: string; rating: number; best_distance: number; sex: HorseInternal["sex"]; age: number; sire?: string | null; source?: string | null }): Promise<Horse> {
  const s = await save0();
  const rng = new RNG(body.name + s.week);
  const bias = clamp((body.best_distance - 1000) / 2200, 0, 1);
  const h = newHorseInternal(rng, "player", body.rating, body.age, s.week, { sex: body.sex, sire: body.sire ?? undefined, distBias: bias });
  h.name = body.name.trim(); h.rating = body.rating; h.fitness = 80; h.imported = true; h.source = body.source ?? "user-supplied";
  for (const t of TRAITS) h.knowledge[t] = 0.5;
  h.price = valuation(h, s.week);
  s.horses.push(h);
  await persist(s);
  return horsePublic(h, s.week);
}

// ---------- market ----------
export async function listMarket(): Promise<Horse[]> {
  const s = await save0();
  return s.horses.filter((h) => h.owner === "market").sort((a, b) => b.price - a.price).map((h) => horsePublic(h, s.week));
}

export async function buyHorse(id: string): Promise<Horse> {
  const s = await save0();
  const h = s.horses.find((x) => x.id === id && x.owner === "market");
  if (!h) throw new GameError("That horse has already been sold");
  if (s.cash < h.price) throw new GameError(`Not enough funds — need $${h.price.toLocaleString()}`);
  h.owner = "player";
  s.cash -= h.price;
  await persist(s);
  return horsePublic(h, s.week);
}

// ---------- breeding ----------
export async function listSires(): Promise<Sire[]> {
  return SIRES;
}

function sireFor(sireId: string, s: SaveData): { sire: any; fee: number; owned: boolean } {
  const stud = SIRES_BY_ID[sireId];
  if (stud) return { sire: stud, fee: stud.fee, owned: false };
  const own = s.horses.find((x) => x.id === sireId && x.owner === "player" && x.status === "stallion");
  if (own) return { sire: own, fee: 0, owned: true };
  throw new GameError("Sire not found");
}

function knownMid(h: HorseInternal, week: number): Record<Trait, number> {
  const out = {} as Record<Trait, number>;
  for (const t of TRAITS) {
    const e = estimate(h, t, week);
    out[t] = (e.low + e.high) / 2;
  }
  return out;
}

export async function breedingPreview(mareId: string, sireId: string): Promise<BreedingPreview> {
  const s = await save0();
  const mare = s.horses.find((x) => x.id === mareId && x.owner === "player");
  if (!mare) throw new GameError("Mare not found");
  const { sire, fee, owned } = sireFor(sireId, s);
  const sGenes = owned ? knownMid(sire, s.week) : studProfile(sire).genes;
  const mGenes = knownMid(mare, s.week);
  const proj = {} as Record<Trait, number>;
  for (const t of TRAITS) proj[t] = (sGenes[t] + mGenes[t]) / 2;
  const warnings: string[] = [];
  if (proj.frame - (proj.bone + proj.coupling) / 2 > 5) warnings.push("Projected frame may outgrow its support (bone/coupling)");
  const projection = {} as Record<Trait, any>;
  for (const t of TRAITS) projection[t] = describe(proj[t]);
  const reinforced = TRAITS.filter((t) => sGenes[t] >= 74 && mGenes[t] >= 74);
  const sharedWeaknesses = TRAITS.filter((t) => sGenes[t] < 50 && mGenes[t] < 50);
  return {
    fee, projection, reinforced, shared_weaknesses: sharedWeaknesses,
    sire_maturity: owned ? null : sire.tendencies?.maturity ?? null,
    warnings, note: "Projection only. The foal can take after either parent in each trait group.",
  };
}

export async function breed(req: { mare_id: string; sire_id: string }): Promise<Horse> {
  const s = await save0();
  const mare = s.horses.find((x) => x.id === req.mare_id && x.owner === "player");
  if (!mare) throw new GameError("Mare not found");
  if (mare.status !== "broodmare") throw new GameError("Only broodmares can be bred — retire a mare to stud first");
  if (mare.in_foal_to) throw new GameError("Mare is already in foal");
  const { sire, fee } = sireFor(req.sire_id, s);
  if (s.cash < fee) throw new GameError(`Not enough funds — need $${fee.toLocaleString()}`);
  mare.in_foal_to = sire.name; mare.in_foal_sire_id = sire.id; mare.due_week = s.week + GESTATION_WEEKS;
  s.cash -= fee;
  await persist(s);
  return horsePublic(mare, s.week);
}

// ---------- races ----------
const TRAVEL_ORDER: Record<string, number> = { home: 0, local: 1, regional: 2, intrastate: 3, interstate: 4 };

export async function listRaces(week?: number, state?: string): Promise<Race[]> {
  const s = await save0();
  const w = week ?? s.week;
  if (w < s.week || w > s.week + LOOKAHEAD) throw new GameError(`Calendar shows the current week up to ${LOOKAHEAD} weeks ahead`);
  ensureWeek(s, w);
  let races = s.races.filter((r) => r.week === w);
  if (state) races = races.filter((r) => r.state === state);
  races = races.slice().sort((a, b) => (TRAVEL_ORDER[a.travel] ?? 9) - (TRAVEL_ORDER[b.travel] ?? 9) || a.date.localeCompare(b.date) || a.track.localeCompare(b.track) || b.purse - a.purse);
  await persist(s);
  return races.map(racePublic);
}

export async function listFeatures(): Promise<Race[]> {
  const s = await save0();
  for (let w = s.week; w <= s.week + LOOKAHEAD; w++) ensureWeek(s, w);
  await persist(s);
  return s.races
    .filter((r) => r.feature && r.week >= s.week && r.week <= s.week + LOOKAHEAD)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(racePublic);
}

export async function listEnteredRaces(): Promise<Race[]> {
  const s = await save0();
  return s.races
    .filter((r) => r.status === "open" && r.field.some((f) => f.is_player))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(racePublic);
}

export async function getRace(id: string): Promise<Race> {
  const s = await save0();
  const r = s.races.find((x) => x.id === id);
  if (!r) throw new GameError("Race not found");
  ensureField(r);
  await persist(s);
  return racePublic(r);
}

function eligibilityError(race: RaceInternal, h: HorseInternal, week: number): string | null {
  if (h.status !== "racing") return "Only racing horses can be entered";
  if (h.injured_weeks > 0) return `${h.name} is injured`;
  if (h.race_eligible_week && race.week < h.race_eligible_week) return `${h.name} is too young to race`;
  if (h.fitness < MIN_RACE_FITNESS) return `${h.name} isn't fit enough to race (fitness ${Math.round(h.fitness)})`;
  const age = Math.floor(ageYears(h, race.week));
  if (race.age_restriction && age !== race.age_restriction) return `Restricted to ${race.age_restriction}YOs`;
  const cls = race.race_class;
  if (cls === "Maiden" && h.wins > 0) return "Maidens are for horses yet to win";
  if (cls.startsWith("BM") && h.rating > parseInt(cls.slice(2), 10)) return `Rating ${h.rating} is above the ${cls} limit`;
  if (race.min_rating && h.rating < race.min_rating) return `Needs a rating of ${race.min_rating}+ to gain a start`;
  return null;
}

export async function enterRace(raceId: string, horseId: string): Promise<Race> {
  const s = await save0();
  const race = s.races.find((x) => x.id === raceId);
  if (!race) throw new GameError("Race not found");
  if (race.status !== "open" || race.week < s.week) throw new GameError("Entries are closed for this race");
  const h = s.horses.find((x) => x.id === horseId && x.owner === "player");
  if (!h) throw new GameError("Horse not found in your stable");
  if (h.entered_race_id) throw new GameError(`${h.name} is already entered in another race`);
  const err = eligibilityError(race, h, s.week);
  if (err) throw new GameError(err);
  const cost = race.entry_fee + race.travel_cost;
  if (s.cash < cost) throw new GameError(`Not enough funds — need $${cost.toLocaleString()}`);
  ensureField(race);
  let barrier = race.field.length + 1;
  if (race.field.length >= MAX_FIELD) {
    const drop = race.field.filter((r) => !r.is_player).reduce((a, b) => (a.rating < b.rating ? a : b));
    barrier = drop.barrier;
    race.field = race.field.filter((r) => r !== drop);
  }
  race.field.push(runnerFromHorse(h, barrier, s.silks, true, s.week));
  race.field.sort((a, b) => a.barrier - b.barrier);
  priceField(race);
  h.entered_race_id = raceId;
  s.cash -= cost;
  await persist(s);
  return racePublic(race);
}

export async function scratchHorse(raceId: string, horseId: string): Promise<Race> {
  const s = await save0();
  const race = s.races.find((x) => x.id === raceId);
  if (!race) throw new GameError("Race not found");
  if (race.status !== "open") throw new GameError("Race already run");
  const removed = race.field.find((r) => r.horse_id === horseId);
  if (!removed) throw new GameError("Horse is not in this field");
  race.field = race.field.filter((r) => r.horse_id !== horseId);
  priceField(race);
  const h = s.horses.find((x) => x.id === horseId);
  if (h) h.entered_race_id = null;
  let refund = 0;
  for (const b of s.bets) if (b.status === "pending" && b.race_id === raceId && b.runner_id === removed.id) { refund += b.stake; b.status = "lost"; b.payout = 0; }
  s.cash += refund;
  await persist(s);
  return racePublic(race);
}

export async function runRace(raceId: string): Promise<Race> {
  const s = await save0();
  const race = s.races.find((x) => x.id === raceId);
  if (!race) throw new GameError("Race not found");
  if (race.status === "finished") return racePublic(race);
  if (race.week !== s.week) throw new GameError("This race isn't on this week — advance the calendar first");
  ensureField(race);
  refreshPlayerRunners(race, s);
  const result = simulate(race);
  const perfs = performanceRatings(result);
  race.status = "finished"; race.result = result;
  let prizeTotal = 0;
  for (const row of result) {
    if (!row.is_player) continue;
    const h = s.horses.find((x) => x.id === row.horse_id);
    if (!h) continue;
    observe(h, "race", s.week);
    const perf = perfs[row.runner_id];
    h.fitness = clamp(h.fitness + 2, 0, 100);
    h.freshness = clamp(h.freshness - 18, 0, 100);
    h.fatigue = clamp((h.fatigue ?? 0) + 20, 0, 100);
    h.sharpness = clamp((h.sharpness ?? 50) + 15, 0, 100);
    h.workload = clamp((h.workload ?? 0) + 12, 0, 100);
    h.entered_race_id = null;
    h.starts += 1;
    if (row.position === 1) h.wins += 1;
    if (row.position <= 3) h.places += 1;
    h.earnings += row.prize;
    h.form = (h.form + String(row.position < 10 ? row.position : 0)).slice(-6);
    h.rating = updatedRating(h.rating, perf);
    if (h.rating > (h.peak_rating ?? 0)) h.peak_rating = h.rating;
    h.history = [{
      race_id: race.id, week: race.week, date: race.date, race_name: race.name, track: race.track,
      distance: race.distance, race_class: race.race_class, going: race.going, barrier: row.barrier,
      position: row.position, field_size: result.length, margin: row.behind, style: row.style,
      pace: race.pace ?? "even", performance: perf, prize: row.prize,
    }, ...h.history];
    refresh(h, s.week);
    prizeTotal += row.prize;
  }
  const positions = new Map(result.map((r) => [r.runner_id, r.position]));
  const places = result.length <= 7 ? 2 : 3;
  let betReturns = 0;
  for (const b of s.bets) {
    if (b.race_id !== race.id || b.status !== "pending") continue;
    const pos = positions.get(b.runner_id) ?? 99;
    const won = b.kind === "win" ? pos === 1 : pos <= places;
    b.payout = won ? Math.round(b.stake * b.odds) : 0;
    b.status = won ? "won" : "lost";
    betReturns += b.payout;
  }
  s.cash += prizeTotal + betReturns;
  await persist(s);
  return racePublic(race);
}

// ---------- bets ----------
export async function listBets(): Promise<Bet[]> {
  const s = await save0();
  return s.bets.slice().sort((a, b) => b.week - a.week);
}

export async function placeBet(req: BetCreate): Promise<Bet> {
  const s = await save0();
  const race = s.races.find((x) => x.id === req.race_id);
  if (!race) throw new GameError("Race not found");
  ensureField(race);
  if (race.status !== "open") throw new GameError("Betting has closed on this race");
  const runner = race.field.find((r) => r.id === req.runner_id);
  if (!runner) throw new GameError("Runner not in this field");
  if (s.cash < req.stake) throw new GameError(`Not enough funds — need $${req.stake.toLocaleString()}`);
  const bet: Bet = {
    id: uid(), race_id: race.id, race_name: race.name, runner_id: runner.id, runner_name: runner.name,
    kind: req.kind, stake: req.stake, odds: req.kind === "win" ? runner.odds : runner.place_odds,
    status: "pending", payout: 0, week: race.week,
  };
  s.bets.push(bet);
  s.cash -= req.stake;
  await persist(s);
  return bet;
}

// ---------- advance week ----------
export async function advanceWeek(): Promise<AdvanceSummary> {
  const s = await save0();
  const cashBefore = s.cash;
  const lines: string[] = [];
  const rng = new RNG(`advance-${s.week}`);

  // 1. training & development
  for (const h of s.horses) {
    if (h.owner !== "player") continue;
    if (h.status === "racing" || h.status === "foal") {
      const msg = applyTraining(rng, h, s.week);
      if (msg.includes("sore") || msg.includes("recovering")) lines.push(msg);
      else if (h.status === "racing" && msg.includes("developing")) lines.push(msg);
    }
  }

  // 2. breeding: foaling
  for (const h of s.horses) {
    if (h.owner !== "player" || h.status !== "broodmare" || !h.due_week) continue;
    if (s.week >= h.due_week) {
      const sireDef = SIRES_BY_ID[h.in_foal_sire_id ?? ""] ?? s.horses.find((x) => x.id === h.in_foal_sire_id);
      if (sireDef) {
        const foal = foalFrom(rng, sireDef as any, h, s.week);
        s.horses.push(foal);
        lines.push(`Foaling: ${h.name} produced a ${foal.sex} by ${sireDef.name}`);
      }
      h.in_foal_to = null; h.in_foal_sire_id = null; h.due_week = null;
    }
  }

  // 3. races this week (auto-run entered, plus all features? no — only entered races)
  let prizeMoney = 0; let betReturns = 0; let racesRun = 0;
  for (const race of s.races) {
    if (race.week !== s.week || race.status !== "open") continue;
    if (!race.field.some((r) => r.is_player)) continue;
    ensureField(race);
    refreshPlayerRunners(race, s);
    const result = simulate(race);
    const perfs = performanceRatings(result);
    race.status = "finished"; race.result = result;
    racesRun += 1;
    for (const row of result) {
      if (!row.is_player) continue;
      const h = s.horses.find((x) => x.id === row.horse_id);
      if (!h) continue;
      observe(h, "race", s.week);
      const perf = perfs[row.runner_id];
      h.fitness = clamp(h.fitness + 2, 0, 100);
      h.freshness = clamp(h.freshness - 18, 0, 100);
      h.fatigue = clamp((h.fatigue ?? 0) + 20, 0, 100);
      h.sharpness = clamp((h.sharpness ?? 50) + 15, 0, 100);
      h.workload = clamp((h.workload ?? 0) + 12, 0, 100);
      h.entered_race_id = null;
      h.starts += 1;
      if (row.position === 1) h.wins += 1;
      if (row.position <= 3) h.places += 1;
      h.earnings += row.prize;
      h.form = (h.form + String(row.position < 10 ? row.position : 0)).slice(-6);
      h.rating = updatedRating(h.rating, perf);
      if (h.rating > (h.peak_rating ?? 0)) h.peak_rating = h.rating;
      h.history = [{
        race_id: race.id, week: race.week, date: race.date, race_name: race.name, track: race.track,
        distance: race.distance, race_class: race.race_class, going: race.going, barrier: row.barrier,
        position: row.position, field_size: result.length, margin: row.behind, style: row.style,
        pace: race.pace ?? "even", performance: perf, prize: row.prize,
      }, ...h.history];
      refresh(h, s.week);
      prizeMoney += row.prize;
      if (row.position === 1) lines.push(`Winner: ${h.name} — ${race.name} at ${race.track} (${money(row.prize)})`);
      else if (row.position <= 3) lines.push(`${h.name} ran ${row.position}th in the ${race.name}`);
    }
    const positions = new Map(result.map((r) => [r.runner_id, r.position]));
    const places = result.length <= 7 ? 2 : 3;
    for (const b of s.bets) {
      if (b.race_id !== race.id || b.status !== "pending") continue;
      const pos = positions.get(b.runner_id) ?? 99;
      const won = b.kind === "win" ? pos === 1 : pos <= places;
      b.payout = won ? Math.round(b.stake * b.odds) : 0;
      b.status = won ? "won" : "lost";
      betReturns += b.payout;
    }
  }
  s.cash += prizeMoney + betReturns;

  // 4. upkeep
  let upkeep = 0;
  for (const h of s.horses) {
    if (h.owner !== "player") continue;
    upkeep += h.status === "racing" ? UPKEEP_RACING : UPKEEP_OTHER;
  }
  s.cash -= upkeep;

  // 5. advance week
  s.week += 1;
  ensureWeek(s, s.week);
  await persist(s);

  return {
    week: s.week, date: weekSaturday(s.week).toISOString().slice(0, 10),
    cash_before: cashBefore, cash_after: s.cash, upkeep, prize_money: prizeMoney,
    bet_returns: betReturns, races_run: racesRun, lines,
  };
}

function money(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}
