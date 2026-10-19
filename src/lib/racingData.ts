import type { Sire, StateInfo, Track } from "./types";

export const STATES: StateInfo[] = [
  { code: "VIC", name: "Victoria" },
  { code: "NSW", name: "New South Wales" },
  { code: "QLD", name: "Queensland" },
  { code: "SA", name: "South Australia" },
  { code: "WA", name: "Western Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NT", name: "Northern Territory" },
];

type TierRaw = "metro" | "provincial" | "country";
const _T: Record<string, Record<string, Partial<Record<TierRaw, string[]>>>> = {
  VIC: {
    Melbourne: {
      metro: ["Flemington", "Caulfield", "Moonee Valley", "Sandown"],
      provincial: ["Pakenham", "Cranbourne", "Mornington"],
    },
    "North East": { country: ["Wodonga", "Wangaratta", "Benalla"] },
    "Goulburn & Northern": { country: ["Seymour", "Kilmore", "Echuca", "Swan Hill"] },
    Central: { provincial: ["Bendigo", "Ballarat"] },
    Western: { provincial: ["Geelong"], country: ["Warrnambool", "Hamilton"] },
    Gippsland: { provincial: ["Sale"], country: ["Moe", "Bairnsdale"] },
  },
  NSW: {
    Sydney: {
      metro: ["Randwick", "Rosehill", "Canterbury", "Warwick Farm"],
      provincial: ["Kembla Grange", "Gosford", "Hawkesbury", "Newcastle"],
    },
    "Riverina & Murray": { country: ["Albury", "Corowa", "Wagga Wagga"] },
    "Hunter & Central West": { country: ["Scone", "Dubbo", "Mudgee"] },
  },
  QLD: {
    Brisbane: {
      metro: ["Eagle Farm", "Doomben", "Gold Coast", "Sunshine Coast"],
      provincial: ["Ipswich", "Toowoomba"],
    },
    "Central & North": { country: ["Rockhampton", "Mackay", "Townsville"] },
  },
  SA: {
    Adelaide: { metro: ["Morphettville"], provincial: ["Gawler", "Murray Bridge"] },
    "Regional SA": { country: ["Balaklava", "Mount Gambier", "Port Lincoln"] },
  },
  WA: {
    Perth: { metro: ["Ascot", "Belmont"], provincial: ["Pinjarra", "Northam", "Bunbury"] },
    "Regional WA": { country: ["Kalgoorlie", "Geraldton", "Albany"] },
  },
  TAS: {
    Tasmania: { metro: ["Elwick", "Mowbray"], provincial: ["Devonport"], country: ["King Island"] },
  },
  ACT: { Canberra: { provincial: ["Canberra"] } },
  NT: { Darwin: { provincial: ["Darwin"] } },
};

export const TRACKS: Track[] = (() => {
  const out: Track[] = [];
  for (const state of Object.keys(_T)) {
    for (const region of Object.keys(_T[state])) {
      for (const tier of Object.keys(_T[state][region]) as TierRaw[]) {
        for (const name of _T[state][region][tier] ?? []) {
          out.push({ name, state, region, tier });
        }
      }
    }
  }
  return out;
})();

export const TRACK_INFO: Record<string, Track> = Object.fromEntries(TRACKS.map((t) => [t.name, t]));
export const TRACK_STATE: Record<string, string> = Object.fromEntries(TRACKS.map((t) => [t.name, t.state]));

export const TRACKS_BY_REGION: Record<string, string[]> = {};
for (const t of TRACKS) (TRACKS_BY_REGION[t.region] ??= []).push(t.name);

// Cross-border regions that behave as one racing area (e.g. Albury-Wodonga).
export const LINKED_REGIONS: [string, string][] = [
  ["North East", "Riverina & Murray"],
  ["North East", "Goulburn & Northern"],
];

export function travelBand(homeTrack: string, raceTrack: string): Travel {
  const a = TRACK_INFO[homeTrack];
  const b = TRACK_INFO[raceTrack];
  if (a.region === b.region) return "local";
  if (
    LINKED_REGIONS.some(([x, y]) => (x === a.region && y === b.region) || (y === a.region && x === b.region))
  ) {
    return "regional";
  }
  return a.state === b.state ? "intrastate" : "interstate";
}
type Travel = "local" | "regional" | "intrastate" | "interstate";

export interface FeatureDef {
  name: string;
  track: string;
  distance: number;
  cls: string;
  purse: number;
  month: number;
  weekday: number;
  n: number;
  offset?: number;
  age?: number;
  min_rating?: number;
}

export const FEATURES: FeatureDef[] = [
  { name: "Winx Stakes", track: "Randwick", distance: 1400, cls: "G1", purse: 1_000_000, month: 8, weekday: 5, n: 3 },
  { name: "Memsie Stakes", track: "Caulfield", distance: 1400, cls: "G1", purse: 1_000_000, month: 8, weekday: 5, n: -1 },
  { name: "Makybe Diva Stakes", track: "Flemington", distance: 1600, cls: "G1", purse: 1_000_000, month: 9, weekday: 5, n: 2 },
  { name: "Underwood Stakes", track: "Caulfield", distance: 1800, cls: "G1", purse: 1_000_000, month: 9, weekday: 5, n: 3 },
  { name: "George Main Stakes", track: "Randwick", distance: 1600, cls: "G1", purse: 1_000_000, month: 9, weekday: 5, n: 3 },
  { name: "Golden Rose", track: "Rosehill", distance: 1400, cls: "G1", purse: 1_500_000, month: 9, weekday: 5, n: 4, age: 3 },
  { name: "Turnbull Stakes", track: "Flemington", distance: 2000, cls: "G1", purse: 1_000_000, month: 10, weekday: 5, n: 1 },
  { name: "Epsom Handicap", track: "Randwick", distance: 1600, cls: "G1", purse: 1_500_000, month: 10, weekday: 5, n: 1 },
  { name: "The Everest", track: "Randwick", distance: 1200, cls: "Special", purse: 20_000_000, month: 10, weekday: 5, n: 2, min_rating: 100 },
  { name: "Caulfield Guineas", track: "Caulfield", distance: 1600, cls: "G1", purse: 3_000_000, month: 10, weekday: 5, n: 2, age: 3 },
  { name: "Caulfield Cup", track: "Caulfield", distance: 2400, cls: "G1", purse: 5_000_000, month: 10, weekday: 5, n: 3, min_rating: 90 },
  { name: "Cox Plate", track: "Moonee Valley", distance: 2040, cls: "G1", purse: 5_000_000, month: 10, weekday: 5, n: 4, min_rating: 95 },
  { name: "Victoria Derby", track: "Flemington", distance: 2500, cls: "G1", purse: 2_000_000, month: 11, weekday: 1, n: 1, offset: -3, age: 3 },
  { name: "Melbourne Cup", track: "Flemington", distance: 3200, cls: "G1", purse: 8_750_000, month: 11, weekday: 1, n: 1, min_rating: 95 },
  { name: "Champions Stakes", track: "Flemington", distance: 2000, cls: "G1", purse: 3_000_000, month: 11, weekday: 1, n: 1, offset: 4 },
  { name: "Railway Stakes", track: "Ascot", distance: 1600, cls: "G1", purse: 1_500_000, month: 11, weekday: 5, n: 4 },
  { name: "Kingston Town Classic", track: "Ascot", distance: 1800, cls: "G1", purse: 1_000_000, month: 12, weekday: 5, n: 1 },
  { name: "Magic Millions 2YO Classic", track: "Gold Coast", distance: 1200, cls: "Restricted", purse: 2_000_000, month: 1, weekday: 5, n: 2, age: 2 },
  { name: "Hobart Cup", track: "Elwick", distance: 2200, cls: "G3", purse: 250_000, month: 2, weekday: 5, n: 2 },
  { name: "Lightning Stakes", track: "Flemington", distance: 1000, cls: "G1", purse: 1_000_000, month: 2, weekday: 5, n: 2 },
  { name: "Blue Diamond Stakes", track: "Caulfield", distance: 1200, cls: "G1", purse: 2_000_000, month: 2, weekday: 5, n: 4, age: 2 },
  { name: "Australian Cup", track: "Flemington", distance: 2000, cls: "G1", purse: 1_500_000, month: 3, weekday: 5, n: 1 },
  { name: "Newmarket Handicap", track: "Flemington", distance: 1200, cls: "G1", purse: 1_500_000, month: 3, weekday: 5, n: 2 },
  { name: "Adelaide Cup", track: "Morphettville", distance: 3200, cls: "G2", purse: 750_000, month: 3, weekday: 0, n: 2 },
  { name: "Golden Slipper", track: "Rosehill", distance: 1200, cls: "G1", purse: 5_000_000, month: 3, weekday: 5, n: 3, age: 2 },
  { name: "Doncaster Mile", track: "Randwick", distance: 1600, cls: "G1", purse: 3_000_000, month: 4, weekday: 5, n: 1 },
  { name: "Australian Derby", track: "Randwick", distance: 2400, cls: "G1", purse: 2_000_000, month: 4, weekday: 5, n: 1, age: 3 },
  { name: "Queen Elizabeth Stakes", track: "Randwick", distance: 2000, cls: "G1", purse: 5_000_000, month: 4, weekday: 5, n: 2 },
  { name: "Sydney Cup", track: "Randwick", distance: 3200, cls: "G1", purse: 2_000_000, month: 4, weekday: 5, n: 2 },
  { name: "Doomben 10,000", track: "Doomben", distance: 1200, cls: "G1", purse: 2_000_000, month: 5, weekday: 5, n: 2 },
  { name: "Goodwood", track: "Morphettville", distance: 1200, cls: "G1", purse: 1_000_000, month: 5, weekday: 5, n: 3 },
  { name: "Kingsford Smith Cup", track: "Eagle Farm", distance: 1300, cls: "G1", purse: 2_000_000, month: 5, weekday: 5, n: 4 },
  { name: "J.J. Atkins", track: "Eagle Farm", distance: 1600, cls: "G1", purse: 2_000_000, month: 6, weekday: 5, n: 1, age: 2 },
  { name: "Queensland Derby", track: "Eagle Farm", distance: 2400, cls: "G1", purse: 1_500_000, month: 6, weekday: 5, n: 1, age: 3 },
  { name: "Stradbroke Handicap", track: "Eagle Farm", distance: 1400, cls: "G1", purse: 3_000_000, month: 6, weekday: 5, n: 2 },
];

const SIRES: Sire[] = [
  { id: "i-am-invincible", name: "I Am Invincible", sire: "Invincible Spirit", farm: "Yarraman Park", state: "NSW", fee: 250_000, tendencies: { distance: "sprint", maturity: "early", frame: "medium", muscling: "heavy", action: "quick", temperament: "sharp" } },
  { id: "snitzel", name: "Snitzel", sire: "Redoute's Choice", farm: "Arrowfield", state: "NSW", fee: 220_000, tendencies: { distance: "sprint", maturity: "early", frame: "medium", muscling: "heavy", action: "quick", temperament: "balanced" } },
  { id: "written-tycoon", name: "Written Tycoon", sire: "Iglesia", farm: "Woodside Park", state: "VIC", fee: 250_000, tendencies: { distance: "sprint_mile", maturity: "early", frame: "medium", muscling: "heavy", action: "quick", temperament: "balanced" } },
  { id: "zoustar", name: "Zoustar", sire: "Northern Meteor", farm: "Widden", state: "NSW", fee: 165_000, tendencies: { distance: "sprint", maturity: "early", frame: "medium", muscling: "medium", action: "quick", temperament: "balanced" } },
  { id: "extreme-choice", name: "Extreme Choice", sire: "Not A Single Doubt", farm: "Newgate", state: "NSW", fee: 110_000, tendencies: { distance: "sprint", maturity: "early", frame: "light", muscling: "heavy", action: "quick", temperament: "sharp" } },
  { id: "capitalist", name: "Capitalist", sire: "Written Tycoon", farm: "Newgate", state: "NSW", fee: 132_000, tendencies: { distance: "sprint", maturity: "early", frame: "medium", muscling: "heavy", action: "quick", temperament: "sharp" } },
  { id: "too-darn-hot", name: "Too Darn Hot", sire: "Dubawi", farm: "Darley", state: "NSW", fee: 110_000, tendencies: { distance: "mile", maturity: "mid", frame: "medium", muscling: "medium", action: "balanced", temperament: "balanced" } },
  { id: "street-boss", name: "Street Boss", sire: "Street Cry", farm: "Darley", state: "NSW", fee: 55_000, tendencies: { distance: "sprint", maturity: "mid", frame: "medium", muscling: "medium", action: "quick", temperament: "balanced" } },
  { id: "fastnet-rock", name: "Fastnet Rock", sire: "Danehill", farm: "Coolmore", state: "NSW", fee: 55_000, tendencies: { distance: "sprint_mile", maturity: "mid", frame: "large", muscling: "medium", action: "balanced", temperament: "balanced" } },
  { id: "pierro", name: "Pierro", sire: "Lonhro", farm: "Coolmore", state: "NSW", fee: 33_000, tendencies: { distance: "mile", maturity: "early", frame: "medium", muscling: "medium", action: "balanced", temperament: "sharp" } },
  { id: "toronado", name: "Toronado", sire: "High Chaparral", farm: "Swettenham Stud", state: "VIC", fee: 55_000, tendencies: { distance: "mile", maturity: "mid", frame: "medium", muscling: "medium", action: "balanced", temperament: "balanced" } },
  { id: "shamus-award", name: "Shamus Award", sire: "Snitzel", farm: "Rosemont", state: "VIC", fee: 44_000, tendencies: { distance: "middle", maturity: "mid", frame: "medium", muscling: "medium", action: "balanced", temperament: "relaxed" } },
  { id: "maurice", name: "Maurice", sire: "Screen Hero", farm: "Arrowfield", state: "NSW", fee: 44_000, tendencies: { distance: "middle", maturity: "late", frame: "large", muscling: "lean", action: "long", temperament: "relaxed" } },
  { id: "dundeel", name: "Dundeel", sire: "High Chaparral", farm: "Arrowfield", state: "NSW", fee: 55_000, tendencies: { distance: "staying", maturity: "mid", frame: "medium", muscling: "lean", action: "long", temperament: "relaxed" } },
  { id: "so-you-think", name: "So You Think", sire: "High Chaparral", farm: "Coolmore", state: "NSW", fee: 33_000, tendencies: { distance: "staying", maturity: "late", frame: "large", muscling: "lean", action: "long", temperament: "relaxed" } },
  { id: "deep-field", name: "Deep Field", sire: "Northern Meteor", farm: "Newgate", state: "NSW", fee: 33_000, tendencies: { distance: "sprint", maturity: "early", frame: "medium", muscling: "heavy", action: "quick", temperament: "sharp" } },
];
for (const s of SIRES) {
  s.data = { fee: "approximate — verify current season", status: "verify standing/active", tendencies: "game_assumption" };
}

export { SIRES };
export const SIRES_BY_ID: Record<string, Sire> = Object.fromEntries(SIRES.map((s) => [s.id, s]));

export const NAME_A = ["Southern", "Coastal", "Golden", "Outback", "Red", "Silver", "Wild", "Midnight", "Royal", "Swift", "Brave", "Desert", "Ocean", "Lucky", "Iron", "Copper", "Dusty", "Sunny", "Stormy", "Bush", "Cobalt", "Velvet", "Crimson", "Electric", "Flying", "Hidden", "Noble", "Rapid", "Rustic", "Thunder", "Northern", "Gallant", "Mystic", "Bold", "Starry", "Spirited", "Jolly", "Majestic", "Shining", "Clever"];
export const NAME_B = ["Banksia", "Wattle", "Brumby", "Kookaburra", "Billabong", "Jacaranda", "Ironbark", "Coolabah", "Waratah", "Boomerang", "Larrikin", "Swagman", "Drover", "Tide", "Comet", "Echo", "Lightning", "Mirage", "Spirit", "Ranger", "Legend", "Express", "Harbour", "Sunset", "Outlaw", "Ruby", "Duchess", "Monarch", "Voyager", "Rocket", "Bluebird", "Lyrebird", "Galah", "Saltbush", "Mallee", "Dreamer", "Pioneer", "Squire", "Empress", "Drifter"];
export const RACE_WORDS = ["Bluegum", "Wattle", "Banksia", "Coolabah", "Jacaranda", "Kookaburra", "Ironbark", "Waratah", "Boronia", "Brolga", "Lyrebird", "Grevillea", "Mallee", "Billabong", "Saltbush", "Paperbark", "Bottlebrush", "Kurrajong"];
export const DAMS = ["Miss Wattle", "Bush Princess", "Coastal Belle", "Starry Lass", "Golden Bay", "Ruby Creek", "Silver Fern", "Lady Banksia", "Noble Rose", "Velvet Sky", "Dawn Chorus", "Harbour Lights"];
export const SILK_COLOURS = ["#F87171", "#60A5FA", "#FBBF24", "#A78BFA", "#F472B6", "#38BDF8", "#FB923C", "#E5E7EB", "#4ADE80", "#FACC15", "#C084FC", "#2DD4BF", "#FCA5A5", "#93C5FD", "#FDE68A", "#D4A373"];
