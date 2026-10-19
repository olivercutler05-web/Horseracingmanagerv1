export type Training = "rest" | "walk" | "swim" | "aerobic" | "pace" | "speed" | "barrier" | "trial";
export type HorseStatus = "racing" | "foal" | "broodmare" | "stallion" | "retired";
export type Sex = "colt" | "filly" | "gelding" | "mare" | "horse";
export type Travel = "home" | "local" | "regional" | "intrastate" | "interstate";
export type Development = "immature" | "developing" | "maturing" | "mature";
export type RunStyle = "leader" | "on_pace" | "midfield" | "back";
export type Pace = "slow" | "even" | "genuine" | "hot";
export type EvidenceSource = "inspection" | "walk_video" | "vet" | "trackwork" | "trial" | "race";
export type Descriptor = "weak" | "below average" | "average" | "good" | "strong" | "exceptional";

export type BodyTrait = "frame" | "length" | "girth" | "bone" | "coupling" | "hindquarter" | "topline" | "balance" | "muscling";
export type MoveTrait = "stride_length" | "stride_freq" | "efficiency" | "coordination";
export type MindTrait = "temperament" | "trainability" | "relaxation" | "drive";
export type PhysTrait = "fast_twitch" | "aerobic" | "recovery" | "soundness";
export type Trait = BodyTrait | MoveTrait | MindTrait | PhysTrait;

export type TraitGroup = "size" | "engine" | "power" | "mechanics" | "mind" | "sound";

export interface StateInfo { code: string; name: string }
export interface Track { name: string; state: string; region: string; tier: "metro" | "provincial" | "country" }
export interface Meta { states: StateInfo[]; tracks: Track[] }

export interface GameCreate { stable_name: string; home_track: string; silks: string }

export interface GameState {
  stable_name: string;
  state: string;
  home_track: string;
  silks: string;
  week: number;
  cash: number;
  date: string;
  season: string;
  week_of_season: number;
}

export interface Estimate { low: number; high: number; label: Descriptor; confidence: number }
export interface Evidence { week: number; source: EvidenceSource }

export interface RaceRecord {
  race_id: string;
  week: number;
  date: string;
  race_name: string;
  track: string;
  distance: number;
  race_class: string;
  going: string;
  barrier: number;
  position: number;
  field_size: number;
  margin: number;
  style: RunStyle;
  pace: Pace;
  performance: number;
  prize: number;
}

export interface Horse {
  id: string;
  name: string;
  sex: Sex;
  age: number;
  owner: "player" | "market";
  status: HorseStatus;
  sire: string;
  dam: string;
  born_week: number;
  race_eligible_week: number | null;
  profile: Record<Trait, Estimate>;
  development: Development;
  pedigree_suggests: Record<Trait, Descriptor> | null;
  evidence: Evidence[];
  best_distance: number | null;
  fitness: number;
  freshness: number;
  workload: number;
  training: Training;
  going_pref: string;
  injured_weeks: number;
  fatigue: number;
  sharpness: number;
  rating: number;
  peak_rating: number;
  form: string;
  starts: number;
  wins: number;
  places: number;
  earnings: number;
  history: RaceRecord[];
  price: number;
  entered_race_id: string | null;
  in_foal_to: string | null;
  in_foal_sire_id: string | null;
  due_week: number | null;
  imported: boolean;
  source: string | null;
}

export interface HorseUpdate { name?: string; training?: Training }
export interface InspectRequest { source: "inspection" | "walk_video" | "vet" }

export interface HorseImport {
  name: string;
  rating: number;
  best_distance: number;
  sex: Sex;
  age: number;
  sire?: string | null;
  source?: string | null;
}

export interface Runner {
  id: string;
  horse_id: string | null;
  name: string;
  barrier: number;
  rating: number;
  odds: number;
  place_odds: number;
  is_player: boolean;
  silks: string;
  sire: string;
  age: number;
  fitness: number;
  freshness: number;
  going_pref: string;
  style: RunStyle;
}

export interface ResultRow {
  runner_id: string;
  horse_id: string | null;
  name: string;
  position: number;
  margin: number;
  behind: number;
  time: number;
  checkpoints: number[];
  is_player: boolean;
  prize: number;
  odds: number;
  silks: string;
  barrier: number;
  style: RunStyle;
  rating_in: number;
}

export interface Race {
  id: string;
  week: number;
  date: string;
  day: string;
  state: string;
  region: string;
  track: string;
  tier: "metro" | "provincial" | "country";
  name: string;
  race_class: string;
  distance: number;
  purse: number;
  going: string;
  age_restriction: number | null;
  min_rating: number | null;
  feature: boolean;
  travel: Travel;
  travel_cost: number;
  status: "open" | "finished";
  entry_fee: number;
  pace: Pace | null;
  field: Runner[];
  result: ResultRow[] | null;
}

export interface BetCreate { race_id: string; runner_id: string; kind: "win" | "place"; stake: number }

export interface Bet {
  id: string;
  race_id: string;
  race_name: string;
  runner_id: string;
  runner_name: string;
  kind: "win" | "place";
  stake: number;
  odds: number;
  status: "pending" | "won" | "lost";
  payout: number;
  week: number;
}

export interface AdvanceSummary {
  week: number;
  date: string;
  cash_before: number;
  cash_after: number;
  upkeep: number;
  prize_money: number;
  bet_returns: number;
  races_run: number;
  lines: string[];
}

export interface SireTendencies {
  distance: "sprint" | "sprint_mile" | "mile" | "middle" | "staying";
  maturity: "early" | "mid" | "late";
  frame: "light" | "medium" | "large";
  muscling: "lean" | "medium" | "heavy";
  action: "quick" | "balanced" | "long";
  temperament: "sharp" | "balanced" | "relaxed";
}

export interface Sire {
  id: string;
  name: string;
  sire: string;
  farm: string;
  state: string;
  fee: number;
  tendencies: SireTendencies;
  data?: Record<string, string>;
}

export interface BreedRequest { mare_id: string; sire_id: string }

export interface BreedingPreview {
  fee: number;
  projection: Record<Trait, Descriptor>;
  reinforced: Trait[];
  shared_weaknesses: Trait[];
  sire_maturity: SireTendencies["maturity"] | null;
  warnings: string[];
  note: string;
}

/** Internal horse carrying hidden genes — never rendered directly; use horsePublic(). */
export interface HorseInternal {
  id: string;
  name: string;
  sex: Sex;
  owner: "player" | "market";
  status: HorseStatus;
  born_week: number;
  sire: string;
  dam: string;
  conditioning: Record<string, number>;
  workload: number;
  fatigue: number;       // accumulated training/race fatigue — reduces performance
  sharpness: number;     // race readiness from gallop/speed work
  knowledge: Record<Trait, number>;
  evidence: Evidence[];
  fitness: number;
  freshness: number;
  form: string;
  starts: number;
  wins: number;
  places: number;
  earnings: number;
  training: Training;
  going_pref: string;
  injured_weeks: number;
  entered_race_id: string | null;
  in_foal_to: string | null;
  in_foal_sire_id: string | null;
  due_week: number | null;
  history: RaceRecord[];
  // hidden
  genes: Record<Trait, number>;
  expression: Record<Trait, number>;
  maturity: number;
  inheritance?: Record<TraitGroup, "sire" | "dam" | "blend">;
  pedigree_projection?: Record<Trait, number>;
  race_eligible_week?: number;
  // cached derived
  speed: number;
  stamina: number;
  acceleration: number;
  early_speed: number;
  efficiency: number;
  consistency: number;
  durability: number;
  best_distance: number;
  distance_profile: { distance: number; suitability: number }[];
  rating: number;
  peak_rating: number;
  price: number;
  imported?: boolean;
  source?: string | null;
}

export interface RunnerInternal extends Runner {
  speed: number;
  stamina: number;
  acceleration: number;
  early_speed: number;
  efficiency: number;
  consistency: number;
  durability: number;
  fatigue: number;
  sharpness: number;
}

export interface RaceInternal extends Omit<Race, "field" | "result"> {
  field: RunnerInternal[];
  result: ResultRow[] | null;
  drawn?: boolean;
  pace: Pace | null;
}

export interface SaveData {
  version: number;
  stable_name: string;
  home_track: string;
  state: string;
  silks: string;
  week: number;
  cash: number;
  horses: HorseInternal[];
  races: RaceInternal[];
  bets: Bet[];
  generated_weeks: number[];
}
