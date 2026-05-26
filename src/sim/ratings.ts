import { clamp, createRng, type Rng } from "../lib/rng";
import { POSITIONS, type Attributes, type Player, type Position, type Prospect, type ProspectConcernRanges, type RatingRangeVector, type RatingVector } from "../types";

export type RatingGroup = "Core" | "Mental" | "Offense" | "Blocking" | "Defense" | "Special Teams";

export interface RatingDefinition {
  key: string;
  label: string;
  group: RatingGroup;
}

export const ratingRegistry = [
  { key: "speed", label: "Speed", group: "Core" },
  { key: "acceleration", label: "Acceleration", group: "Core" },
  { key: "agility", label: "Agility", group: "Core" },
  { key: "changeOfDirection", label: "Change of Direction", group: "Core" },
  { key: "explosiveness", label: "Explosiveness", group: "Core" },
  { key: "strength", label: "Strength", group: "Core" },
  { key: "stamina", label: "Stamina", group: "Core" },
  { key: "awareness", label: "Awareness", group: "Mental" },
  { key: "playRecognition", label: "Play Recognition", group: "Mental" },
  { key: "discipline", label: "Discipline", group: "Mental" },
  { key: "composure", label: "Composure", group: "Mental" },
  { key: "consistency", label: "Consistency", group: "Mental" },
  { key: "workEthic", label: "Work Ethic", group: "Mental" },
  { key: "leadership", label: "Leadership", group: "Mental" },
  { key: "throwPower", label: "Throw Power", group: "Offense" },
  { key: "shortAccuracy", label: "Short Accuracy", group: "Offense" },
  { key: "mediumAccuracy", label: "Medium Accuracy", group: "Offense" },
  { key: "deepAccuracy", label: "Deep Accuracy", group: "Offense" },
  { key: "timing", label: "Timing", group: "Offense" },
  { key: "pocketPresence", label: "Pocket Presence", group: "Offense" },
  { key: "pressureSense", label: "Pressure Sense", group: "Offense" },
  { key: "throwOnRun", label: "Throw on Run", group: "Offense" },
  { key: "scramble", label: "Scramble", group: "Offense" },
  { key: "ballSecurity", label: "Ball Security", group: "Offense" },
  { key: "rushingVision", label: "Rushing Vision", group: "Offense" },
  { key: "burst", label: "Burst", group: "Offense" },
  { key: "elusiveness", label: "Elusiveness", group: "Offense" },
  { key: "powerRun", label: "Power Run", group: "Offense" },
  { key: "contactBalance", label: "Contact Balance", group: "Offense" },
  { key: "breakTackle", label: "Break Tackle", group: "Offense" },
  { key: "passCatching", label: "Pass Catching", group: "Offense" },
  { key: "release", label: "Release", group: "Offense" },
  { key: "shortRoute", label: "Short Route", group: "Offense" },
  { key: "mediumRoute", label: "Medium Route", group: "Offense" },
  { key: "deepRoute", label: "Deep Route", group: "Offense" },
  { key: "contestedCatch", label: "Contested Catch", group: "Offense" },
  { key: "yardsAfterCatch", label: "Yards After Catch", group: "Offense" },
  { key: "separation", label: "Separation", group: "Offense" },
  { key: "runBlock", label: "Run Block", group: "Blocking" },
  { key: "passBlock", label: "Pass Block", group: "Blocking" },
  { key: "passBlockFootwork", label: "Pass Block Footwork", group: "Blocking" },
  { key: "runBlockPower", label: "Run Block Power", group: "Blocking" },
  { key: "anchor", label: "Anchor", group: "Blocking" },
  { key: "handTechnique", label: "Hand Technique", group: "Blocking" },
  { key: "blitzPickup", label: "Blitz Pickup", group: "Blocking" },
  { key: "secondLevel", label: "Second Level", group: "Blocking" },
  { key: "tackling", label: "Tackling", group: "Defense" },
  { key: "pursuit", label: "Pursuit", group: "Defense" },
  { key: "hitPower", label: "Hit Power", group: "Defense" },
  { key: "blockShedding", label: "Block Shedding", group: "Defense" },
  { key: "gapDiscipline", label: "Gap Discipline", group: "Defense" },
  { key: "runDefense", label: "Run Defense", group: "Defense" },
  { key: "edgeSetting", label: "Edge Setting", group: "Defense" },
  { key: "powerRush", label: "Power Rush", group: "Defense" },
  { key: "finesseRush", label: "Finesse Rush", group: "Defense" },
  { key: "passRushPlan", label: "Pass-Rush Plan", group: "Defense" },
  { key: "manCoverage", label: "Man Coverage", group: "Defense" },
  { key: "zoneCoverage", label: "Zone Coverage", group: "Defense" },
  { key: "pressCoverage", label: "Press Coverage", group: "Defense" },
  { key: "ballSkills", label: "Ball Skills", group: "Defense" },
  { key: "closingSpeed", label: "Closing Speed", group: "Defense" },
  { key: "takeaways", label: "Takeaways", group: "Defense" },
  { key: "kickPower", label: "Kick Power", group: "Special Teams" },
  { key: "kickAccuracy", label: "Kick Accuracy", group: "Special Teams" },
  { key: "puntPower", label: "Punt Power", group: "Special Teams" },
  { key: "puntAccuracy", label: "Punt Accuracy", group: "Special Teams" }
] as const satisfies readonly RatingDefinition[];

export type RatingKey = (typeof ratingRegistry)[number]["key"];

const ratingIndex = new Map<string, number>(ratingRegistry.map((rating, index) => [rating.key, index]));
const groups: RatingGroup[] = ["Core", "Mental", "Offense", "Blocking", "Defense", "Special Teams"];

type WeightMap = Partial<Record<RatingKey, number>>;
type GenerationGroupProfile = Partial<Record<RatingGroup, number>>;
export type RatingTierId = "fringe" | "backup" | "starter" | "pro-bowl" | "all-pro" | "legendary";

export interface RatingTier {
  id: RatingTierId;
  label: string;
  min: number;
  description: string;
}

export const ratingTiers: RatingTier[] = [
  { id: "legendary", label: "Legendary", min: 90, description: "Historic, once-in-a-generation level." },
  { id: "all-pro", label: "All-Pro", min: 80, description: "True elite player at his position." },
  { id: "pro-bowl", label: "Pro Bowl", min: 70, description: "High-end starter and yearly honors candidate." },
  { id: "starter", label: "Starter", min: 60, description: "Average NFL starter baseline." },
  { id: "backup", label: "Backup", min: 50, description: "Usable roster player or spot starter." },
  { id: "fringe", label: "Fringe", min: 0, description: "Practice squad, camp, or replacement level." }
];

export function calibrateOverall(value: number): number {
  return Math.round(clamp(value, 20, 99));
}

export function calibratePotential(overall: number, value: number): number {
  return Math.round(clamp(Math.max(overall, value), overall, 99));
}

export function ratingTierFor(value: number): RatingTier {
  return ratingTiers.find((tier) => value >= tier.min) ?? ratingTiers.at(-1)!;
}

export function ratingTierLabel(value: number): string {
  return ratingTierFor(value).label;
}

export function ratingsByGroup(): Array<{ group: RatingGroup; ratings: RatingDefinition[] }> {
  return groups.map((group) => ({
    group,
    ratings: ratingRegistry.filter((rating) => rating.group === group)
  }));
}

export function ratingLabel(key: RatingKey): string {
  return ratingRegistry[ratingIndex.get(key) ?? 0]?.label ?? key;
}

export function ratingValue(ratings: RatingVector | undefined, key: RatingKey, fallback = 50): number {
  const index = ratingIndex.get(key);
  if (index === undefined) return fallback;
  return ratings?.[index] ?? fallback;
}

function setRating(ratings: RatingVector, key: RatingKey, value: number): void {
  const index = ratingIndex.get(key);
  if (index !== undefined) {
    ratings[index] = calibrateOverall(value);
  }
}

function weightedRating(ratings: RatingVector, weights: WeightMap): number {
  const entries = Object.entries(weights) as Array<[RatingKey, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return 50;
  const value = entries.reduce((sum, [key, weight]) => sum + ratingValue(ratings, key) * weight, 0) / total;
  return calibrateOverall(value);
}

function average(ratings: RatingVector, keys: RatingKey[]): number {
  return Math.round(keys.reduce((sum, key) => sum + ratingValue(ratings, key), 0) / Math.max(1, keys.length));
}

function makeValue(base: number, rng: Rng, offset = 0, dev = 8): number {
  return calibrateOverall(rng.normal(base + offset, dev));
}

function apply(ratings: RatingVector, rng: Rng, base: number, keys: RatingKey[], offset: number, dev = 7): void {
  keys.forEach((key) => setRating(ratings, key, makeValue(base, rng, offset, dev)));
}

const generationGroupOffsets: Record<Position, GenerationGroupProfile> = {
  QB: { Core: -2, Mental: 1, Offense: -2, Blocking: -22, Defense: -24, "Special Teams": -30 },
  RB: { Core: 1, Mental: -1, Offense: -3, Blocking: -18, Defense: -20, "Special Teams": -30 },
  WR: { Core: 1, Mental: -1, Offense: -4, Blocking: -20, Defense: -22, "Special Teams": -30 },
  TE: { Core: -1, Mental: 0, Offense: -7, Blocking: -8, Defense: -20, "Special Teams": -30 },
  LT: { Core: -4, Mental: 1, Offense: -20, Blocking: -5, Defense: -24, "Special Teams": -30 },
  LG: { Core: -4, Mental: 1, Offense: -21, Blocking: -5, Defense: -24, "Special Teams": -30 },
  C: { Core: -4, Mental: 2, Offense: -20, Blocking: -5, Defense: -24, "Special Teams": -30 },
  RG: { Core: -4, Mental: 1, Offense: -21, Blocking: -5, Defense: -24, "Special Teams": -30 },
  RT: { Core: -4, Mental: 1, Offense: -20, Blocking: -5, Defense: -24, "Special Teams": -30 },
  EDGE: { Core: -1, Mental: 0, Offense: -24, Blocking: -22, Defense: -5, "Special Teams": -30 },
  DL: { Core: -3, Mental: 0, Offense: -24, Blocking: -18, Defense: -5, "Special Teams": -30 },
  LB: { Core: -1, Mental: 0, Offense: -22, Blocking: -18, Defense: -6, "Special Teams": -30 },
  CB: { Core: 0, Mental: -1, Offense: -21, Blocking: -24, Defense: -5, "Special Teams": -30 },
  S: { Core: 0, Mental: 0, Offense: -21, Blocking: -24, Defense: -5, "Special Teams": -30 },
  K: { Core: -6, Mental: -1, Offense: -28, Blocking: -28, Defense: -28, "Special Teams": -3 },
  P: { Core: -6, Mental: -1, Offense: -28, Blocking: -28, Defense: -28, "Special Teams": -3 }
};

const versatilitySecondaryKeys: Partial<Record<Position, RatingKey[]>> = {
  RB: ["passCatching", "shortRoute", "mediumRoute", "separation", "blitzPickup"],
  WR: ["burst", "ballSecurity", "rushingVision", "elusiveness", "contactBalance"],
  TE: ["passCatching", "contestedCatch", "runBlock", "passBlock", "handTechnique"],
  LT: ["passBlockFootwork", "secondLevel", "awareness", "runBlock", "blitzPickup"],
  LG: ["runBlockPower", "secondLevel", "awareness", "passBlock", "anchor"],
  C: ["playRecognition", "blitzPickup", "secondLevel", "passBlockFootwork", "handTechnique"],
  RG: ["runBlockPower", "secondLevel", "awareness", "passBlock", "anchor"],
  RT: ["passBlockFootwork", "secondLevel", "awareness", "runBlock", "blitzPickup"],
  EDGE: ["runDefense", "tackling", "pursuit", "zoneCoverage", "playRecognition"],
  DL: ["powerRush", "pursuit", "tackling", "strength", "explosiveness"],
  LB: ["zoneCoverage", "manCoverage", "closingSpeed", "blockShedding", "powerRush"],
  CB: ["zoneCoverage", "playRecognition", "tackling", "closingSpeed", "ballSkills"],
  S: ["manCoverage", "takeaways", "changeOfDirection", "ballSkills", "pressCoverage"]
};

export function generateRatings(position: Position, base: number, rng: Rng): RatingVector {
  const versatileProfile = rng.next() < 0.14;
  const groupProfile = generationGroupOffsets[position];
  const ratings: RatingVector = ratingRegistry.map((rating) => {
    const offset = groupProfile[rating.group] ?? -18;
    const versatileOffset =
      versatileProfile && (rating.group === "Core" || rating.group === "Mental") ? 2 :
      versatileProfile && (rating.group === "Offense" || rating.group === "Blocking" || rating.group === "Defense") ? 3 :
      0;
    const dev = rating.group === "Core" ? 7 : rating.group === "Mental" ? 6 : 7;
    return makeValue(base, rng, offset + versatileOffset, dev);
  });

  apply(ratings, rng, base, ["stamina", "discipline", "consistency"], 2);

  if (position === "QB") {
    apply(ratings, rng, base, ["throwPower", "shortAccuracy", "mediumAccuracy", "deepAccuracy"], 10);
    apply(ratings, rng, base, ["timing", "pocketPresence", "pressureSense", "composure", "awareness", "playRecognition"], 8);
    apply(ratings, rng, base, ["throwOnRun", "scramble", "ballSecurity"], 3);
  }

  if (position === "RB") {
    apply(ratings, rng, base, ["speed", "acceleration", "agility", "changeOfDirection", "explosiveness", "burst"], 8);
    apply(ratings, rng, base, ["rushingVision", "elusiveness", "powerRun", "contactBalance", "breakTackle", "ballSecurity"], 8);
    apply(ratings, rng, base, ["passCatching", "shortRoute", "yardsAfterCatch", "blitzPickup"], versatileProfile ? 3 : -2);
  }

  if (position === "WR") {
    apply(ratings, rng, base, ["speed", "acceleration", "agility", "changeOfDirection", "explosiveness"], 8);
    apply(ratings, rng, base, ["passCatching", "release", "shortRoute", "mediumRoute", "deepRoute", "yardsAfterCatch", "separation"], 8);
    apply(ratings, rng, base, ["contestedCatch", "ballSecurity"], 2);
  }

  if (position === "TE") {
    apply(ratings, rng, base, ["strength", "passCatching", "contestedCatch", "release", "shortRoute", "mediumRoute"], 6);
    apply(ratings, rng, base, ["runBlock", "passBlock", "runBlockPower", "anchor", "handTechnique", "secondLevel"], 5);
  }

  if (["LT", "LG", "C", "RG", "RT"].includes(position)) {
    apply(ratings, rng, base, ["strength", "stamina"], 8);
    apply(ratings, rng, base, ["runBlock", "passBlock", "passBlockFootwork", "runBlockPower", "anchor", "handTechnique", "blitzPickup"], 10);
    apply(ratings, rng, base, ["secondLevel", "awareness", "discipline", "consistency"], 5);
  }

  if (position === "EDGE") {
    apply(ratings, rng, base, ["speed", "acceleration", "explosiveness", "strength"], 5);
    apply(ratings, rng, base, ["powerRush", "finesseRush", "passRushPlan", "blockShedding", "edgeSetting"], 9);
    apply(ratings, rng, base, ["runDefense", "tackling", "pursuit", "playRecognition"], 5);
  }

  if (position === "DL") {
    apply(ratings, rng, base, ["strength", "anchor", "blockShedding", "gapDiscipline", "runDefense"], 9);
    apply(ratings, rng, base, ["powerRush", "passRushPlan", "tackling", "hitPower"], 6);
    apply(ratings, rng, base, ["finesseRush", "pursuit"], 2);
  }

  if (position === "LB") {
    apply(ratings, rng, base, ["speed", "acceleration", "agility", "strength"], 3);
    apply(ratings, rng, base, ["tackling", "pursuit", "playRecognition", "gapDiscipline", "runDefense"], 8);
    apply(ratings, rng, base, ["zoneCoverage", "manCoverage", "blockShedding", "hitPower", "closingSpeed"], 5);
  }

  if (position === "CB") {
    apply(ratings, rng, base, ["speed", "acceleration", "agility", "changeOfDirection", "closingSpeed"], 8);
    apply(ratings, rng, base, ["manCoverage", "zoneCoverage", "pressCoverage", "ballSkills", "playRecognition", "takeaways"], 8);
    apply(ratings, rng, base, ["tackling", "pursuit"], 0);
  }

  if (position === "S") {
    apply(ratings, rng, base, ["speed", "acceleration", "closingSpeed"], 5);
    apply(ratings, rng, base, ["zoneCoverage", "manCoverage", "ballSkills", "playRecognition", "tackling", "pursuit", "hitPower"], 7);
    apply(ratings, rng, base, ["takeaways", "gapDiscipline"], 4);
  }

  if (position === "K") {
    apply(ratings, rng, base, ["kickPower", "kickAccuracy", "composure", "consistency"], 15, 6);
  }

  if (position === "P") {
    apply(ratings, rng, base, ["puntPower", "puntAccuracy", "composure", "consistency"], 15, 6);
  }

  const versatilityKeys = versatilitySecondaryKeys[position];
  if (versatileProfile && versatilityKeys?.length) {
    apply(ratings, rng, base, versatilityKeys, 4, 6);
  }

  return ratings;
}

export function legacyAttributesFromRatings(position: Position, ratings: RatingVector): Attributes {
  const kicking =
    position === "P"
      ? average(ratings, ["puntPower", "puntAccuracy"])
      : position === "K"
        ? average(ratings, ["kickPower", "kickAccuracy"])
        : average(ratings, ["kickPower", "kickAccuracy", "puntPower", "puntAccuracy"]);

  return {
    speed: average(ratings, ["speed", "acceleration", "burst"]),
    strength: ratingValue(ratings, "strength"),
    athleticism: average(ratings, ["agility", "changeOfDirection", "explosiveness"]),
    awareness: average(ratings, ["awareness", "playRecognition", "composure"]),
    passing: average(ratings, ["throwPower", "shortAccuracy", "mediumAccuracy", "deepAccuracy", "timing"]),
    rushing: average(ratings, ["rushingVision", "burst", "elusiveness", "powerRun", "breakTackle"]),
    receiving: average(ratings, ["passCatching", "release", "shortRoute", "mediumRoute", "deepRoute", "separation"]),
    blocking: average(ratings, ["runBlock", "passBlock", "anchor", "handTechnique"]),
    tackling: average(ratings, ["tackling", "pursuit", "hitPower"]),
    coverage: average(ratings, ["manCoverage", "zoneCoverage", "pressCoverage", "ballSkills"]),
    kicking,
    durability: average(ratings, ["stamina"]),
    discipline: average(ratings, ["discipline", "composure", "consistency"])
  };
}

export function deriveRatingsFromAttributes(position: Position, attributes: Attributes, seed = "legacy"): RatingVector {
  const rng = createRng(`${seed}:${position}:ratings-upgrade`);
  const base = Math.round(
    (attributes.speed +
      attributes.strength +
      attributes.athleticism +
      attributes.awareness +
      attributes.durability +
      attributes.discipline) /
      6
  );
  const ratings = generateRatings(position, base, rng);
  const setMany = (keys: RatingKey[], value: number) => keys.forEach((key) => setRating(ratings, key, value + rng.int(-3, 3)));

  setMany(["speed", "acceleration", "burst"], attributes.speed);
  setMany(["strength"], attributes.strength);
  setMany(["agility", "changeOfDirection", "explosiveness"], attributes.athleticism);
  setMany(["awareness", "playRecognition"], attributes.awareness);
  setMany(["discipline", "composure", "consistency"], attributes.discipline);
  setMany(["stamina"], attributes.durability);
  setMany(["throwPower", "shortAccuracy", "mediumAccuracy", "deepAccuracy", "timing"], attributes.passing);
  setMany(["rushingVision", "elusiveness", "powerRun", "contactBalance", "breakTackle"], attributes.rushing);
  setMany(["passCatching", "release", "shortRoute", "mediumRoute", "deepRoute", "separation"], attributes.receiving);
  setMany(["runBlock", "passBlock", "anchor", "handTechnique"], attributes.blocking);
  setMany(["tackling", "pursuit", "hitPower"], attributes.tackling);
  setMany(["manCoverage", "zoneCoverage", "pressCoverage", "ballSkills"], attributes.coverage);
  setMany(["kickPower", "kickAccuracy", "puntPower", "puntAccuracy"], attributes.kicking);

  return ratings.map((value) => calibrateOverall(value));
}

const positionWeights: Record<Position, WeightMap> = {
  QB: { throwPower: 0.08, shortAccuracy: 0.14, mediumAccuracy: 0.14, deepAccuracy: 0.08, timing: 0.11, pocketPresence: 0.1, pressureSense: 0.09, awareness: 0.08, composure: 0.07, ballSecurity: 0.05, throwOnRun: 0.04, scramble: 0.02 },
  RB: { rushingVision: 0.16, burst: 0.12, contactBalance: 0.11, breakTackle: 0.11, powerRun: 0.09, elusiveness: 0.1, ballSecurity: 0.09, speed: 0.07, passCatching: 0.07, blitzPickup: 0.05, stamina: 0.03 },
  WR: { passCatching: 0.14, release: 0.12, shortRoute: 0.11, mediumRoute: 0.12, deepRoute: 0.1, separation: 0.13, speed: 0.09, acceleration: 0.07, yardsAfterCatch: 0.07, contestedCatch: 0.05 },
  TE: { passCatching: 0.13, shortRoute: 0.1, mediumRoute: 0.08, contestedCatch: 0.1, runBlock: 0.14, passBlock: 0.11, strength: 0.1, anchor: 0.08, awareness: 0.06, yardsAfterCatch: 0.06, secondLevel: 0.04 },
  LT: { passBlock: 0.2, passBlockFootwork: 0.17, anchor: 0.14, handTechnique: 0.13, strength: 0.1, runBlock: 0.08, blitzPickup: 0.08, awareness: 0.06, discipline: 0.04 },
  LG: { runBlock: 0.17, passBlock: 0.15, runBlockPower: 0.15, anchor: 0.13, handTechnique: 0.11, strength: 0.11, blitzPickup: 0.07, secondLevel: 0.06, awareness: 0.05 },
  C: { awareness: 0.14, playRecognition: 0.12, passBlock: 0.14, runBlock: 0.13, anchor: 0.12, handTechnique: 0.11, blitzPickup: 0.11, strength: 0.07, discipline: 0.06 },
  RG: { runBlock: 0.17, passBlock: 0.15, runBlockPower: 0.15, anchor: 0.13, handTechnique: 0.11, strength: 0.11, blitzPickup: 0.07, secondLevel: 0.06, awareness: 0.05 },
  RT: { passBlock: 0.17, runBlock: 0.14, passBlockFootwork: 0.14, anchor: 0.13, handTechnique: 0.12, strength: 0.1, blitzPickup: 0.08, secondLevel: 0.06, discipline: 0.06 },
  EDGE: { explosiveness: 0.11, acceleration: 0.08, powerRush: 0.15, finesseRush: 0.14, passRushPlan: 0.13, blockShedding: 0.11, edgeSetting: 0.09, runDefense: 0.08, tackling: 0.06, pursuit: 0.05 },
  DL: { runDefense: 0.15, gapDiscipline: 0.13, blockShedding: 0.14, anchor: 0.12, strength: 0.12, powerRush: 0.11, passRushPlan: 0.1, tackling: 0.08, handTechnique: 0.05 },
  LB: { playRecognition: 0.14, tackling: 0.14, pursuit: 0.12, gapDiscipline: 0.1, runDefense: 0.1, zoneCoverage: 0.11, awareness: 0.08, blockShedding: 0.07, speed: 0.06, closingSpeed: 0.05, leadership: 0.03 },
  CB: { manCoverage: 0.16, zoneCoverage: 0.14, pressCoverage: 0.11, speed: 0.1, changeOfDirection: 0.1, acceleration: 0.08, ballSkills: 0.1, playRecognition: 0.08, closingSpeed: 0.07, tackling: 0.04, discipline: 0.02 },
  S: { zoneCoverage: 0.15, playRecognition: 0.13, ballSkills: 0.1, closingSpeed: 0.09, speed: 0.08, tackling: 0.11, pursuit: 0.09, hitPower: 0.08, takeaways: 0.07, manCoverage: 0.06, awareness: 0.04 },
  K: { kickPower: 0.36, kickAccuracy: 0.43, composure: 0.11, consistency: 0.07, discipline: 0.03 },
  P: { puntPower: 0.35, puntAccuracy: 0.43, composure: 0.1, consistency: 0.08, discipline: 0.04 }
};

const coreKeys = ratingRegistry.filter((rating) => rating.group === "Core").map((rating) => rating.key as RatingKey);
const mentalKeys = ratingRegistry.filter((rating) => rating.group === "Mental").map((rating) => rating.key as RatingKey);

const universalPositionWeights: Record<Position, WeightMap> = {
  QB: { speed: 0.008, acceleration: 0.007, agility: 0.006, changeOfDirection: 0.004, explosiveness: 0.006, strength: 0.004, stamina: 0.01, awareness: 0.03, playRecognition: 0.026, discipline: 0.018, composure: 0.022, consistency: 0.016, workEthic: 0.008, leadership: 0.01 },
  RB: { speed: 0.026, acceleration: 0.026, agility: 0.02, changeOfDirection: 0.018, explosiveness: 0.018, strength: 0.008, stamina: 0.014, awareness: 0.014, playRecognition: 0.015, discipline: 0.012, composure: 0.01, consistency: 0.01, workEthic: 0.006, leadership: 0.004 },
  WR: { speed: 0.024, acceleration: 0.02, agility: 0.016, changeOfDirection: 0.014, explosiveness: 0.014, strength: 0.006, stamina: 0.012, awareness: 0.012, playRecognition: 0.012, discipline: 0.01, composure: 0.008, consistency: 0.01, workEthic: 0.006, leadership: 0.004 },
  TE: { speed: 0.01, acceleration: 0.008, agility: 0.007, changeOfDirection: 0.006, explosiveness: 0.008, strength: 0.018, stamina: 0.012, awareness: 0.012, playRecognition: 0.012, discipline: 0.012, composure: 0.008, consistency: 0.01, workEthic: 0.006, leadership: 0.004 },
  LT: { speed: 0.004, acceleration: 0.004, agility: 0.006, changeOfDirection: 0.006, explosiveness: 0.006, strength: 0.024, stamina: 0.018, awareness: 0.016, playRecognition: 0.016, discipline: 0.016, composure: 0.008, consistency: 0.012, workEthic: 0.006, leadership: 0.004 },
  LG: { speed: 0.004, acceleration: 0.004, agility: 0.006, changeOfDirection: 0.004, explosiveness: 0.006, strength: 0.026, stamina: 0.016, awareness: 0.014, playRecognition: 0.014, discipline: 0.016, composure: 0.008, consistency: 0.012, workEthic: 0.006, leadership: 0.004 },
  C: { speed: 0.004, acceleration: 0.004, agility: 0.006, changeOfDirection: 0.004, explosiveness: 0.006, strength: 0.022, stamina: 0.016, awareness: 0.02, playRecognition: 0.022, discipline: 0.018, composure: 0.01, consistency: 0.012, workEthic: 0.006, leadership: 0.008 },
  RG: { speed: 0.004, acceleration: 0.004, agility: 0.006, changeOfDirection: 0.004, explosiveness: 0.006, strength: 0.026, stamina: 0.016, awareness: 0.014, playRecognition: 0.014, discipline: 0.016, composure: 0.008, consistency: 0.012, workEthic: 0.006, leadership: 0.004 },
  RT: { speed: 0.004, acceleration: 0.004, agility: 0.006, changeOfDirection: 0.006, explosiveness: 0.006, strength: 0.024, stamina: 0.018, awareness: 0.016, playRecognition: 0.016, discipline: 0.016, composure: 0.008, consistency: 0.012, workEthic: 0.006, leadership: 0.004 },
  EDGE: { speed: 0.014, acceleration: 0.016, agility: 0.012, changeOfDirection: 0.01, explosiveness: 0.018, strength: 0.016, stamina: 0.012, awareness: 0.012, playRecognition: 0.014, discipline: 0.012, composure: 0.008, consistency: 0.01, workEthic: 0.006, leadership: 0.004 },
  DL: { speed: 0.006, acceleration: 0.008, agility: 0.006, changeOfDirection: 0.004, explosiveness: 0.012, strength: 0.024, stamina: 0.014, awareness: 0.012, playRecognition: 0.014, discipline: 0.014, composure: 0.008, consistency: 0.01, workEthic: 0.006, leadership: 0.004 },
  LB: { speed: 0.016, acceleration: 0.014, agility: 0.012, changeOfDirection: 0.01, explosiveness: 0.012, strength: 0.012, stamina: 0.014, awareness: 0.018, playRecognition: 0.022, discipline: 0.014, composure: 0.008, consistency: 0.01, workEthic: 0.006, leadership: 0.006 },
  CB: { speed: 0.022, acceleration: 0.02, agility: 0.018, changeOfDirection: 0.018, explosiveness: 0.012, strength: 0.004, stamina: 0.012, awareness: 0.012, playRecognition: 0.014, discipline: 0.01, composure: 0.008, consistency: 0.01, workEthic: 0.006, leadership: 0.004 },
  S: { speed: 0.016, acceleration: 0.014, agility: 0.012, changeOfDirection: 0.01, explosiveness: 0.01, strength: 0.008, stamina: 0.012, awareness: 0.016, playRecognition: 0.02, discipline: 0.012, composure: 0.008, consistency: 0.01, workEthic: 0.006, leadership: 0.006 },
  K: { speed: 0.002, acceleration: 0.002, agility: 0.002, changeOfDirection: 0.002, explosiveness: 0.004, strength: 0.004, stamina: 0.008, awareness: 0.01, playRecognition: 0.008, discipline: 0.018, composure: 0.024, consistency: 0.024, workEthic: 0.006, leadership: 0.004 },
  P: { speed: 0.002, acceleration: 0.002, agility: 0.002, changeOfDirection: 0.002, explosiveness: 0.004, strength: 0.004, stamina: 0.008, awareness: 0.01, playRecognition: 0.008, discipline: 0.018, composure: 0.024, consistency: 0.024, workEthic: 0.006, leadership: 0.004 }
};

function combinedPositionWeights(position: Position): WeightMap {
  const combined: WeightMap = {};
  const universal = universalPositionWeights[position];
  for (const key of coreKeys) combined[key] = universal[key] ?? 0.004;
  for (const key of mentalKeys) combined[key] = universal[key] ?? 0.006;
  for (const [key, weight] of Object.entries(positionWeights[position]) as Array<[RatingKey, number]>) {
    combined[key] = (combined[key] ?? 0) + weight;
  }
  return combined;
}

const resolvedPositionWeights = Object.fromEntries(
  POSITIONS.map((position) => [position, combinedPositionWeights(position)])
) as Record<Position, WeightMap>;

export function positionRatingKeys(position: Position): RatingKey[] {
  return Object.entries(resolvedPositionWeights[position])
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key as RatingKey);
}

export function positionRatingWeight(position: Position, key: RatingKey): number {
  return resolvedPositionWeights[position][key] ?? 0;
}

export function positionRatingImportance(position: Position, key: RatingKey): number {
  const weights = resolvedPositionWeights[position];
  const current = weights[key] ?? 0;
  if (current <= 0) return 0;
  const values = Object.values(weights).filter((value) => value > 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return 1;
  return clamp((current - min) / (max - min), 0, 1);
}

export function calculateOverallFromRatings(position: Position, ratings: RatingVector): number {
  return weightedRating(ratings, resolvedPositionWeights[position]);
}

export function refreshPlayerRatings<T extends Player>(player: T, seed: string): T {
  const { roleGrades: _legacyRoleGrades, ...playerWithoutLegacyRoles } = player as T & { roleGrades?: unknown };
  const ratings =
    player.ratings?.length === ratingRegistry.length
      ? player.ratings.map((value) => calibrateOverall(value))
      : deriveRatingsFromAttributes(player.position, player.attributes, `${seed}:${player.id}:${player.age}:${player.potential}`);
  const overall = calculateOverallFromRatings(player.position, ratings);
  return {
    ...playerWithoutLegacyRoles,
    ratings,
    overall,
    attributes: legacyAttributesFromRatings(player.position, ratings)
  } as T;
}

export function ratingRangesFor(ratings: RatingVector, confidence: number, rng: Rng): RatingRangeVector {
  const uncertainty = Math.round(clamp(28 - confidence * 0.22 + rng.int(-3, 4), 5, 28));
  return ratings.map((value) => [
    Math.round(clamp(value - uncertainty - rng.int(0, 3), 20, 99)),
    Math.round(clamp(value + uncertainty + rng.int(0, 3), 20, 99))
  ]);
}

export function tightenRatingRanges(ranges: RatingRangeVector, ratings: RatingVector, confidence: number): RatingRangeVector {
  const pull = clamp(confidence / 145, 0.1, 0.75);
  return ranges.map(([low, high], index) => {
    const trueValue = ratings[index] ?? 50;
    return [
      Math.round(clamp(low + (trueValue - low) * pull, 20, trueValue)),
      Math.round(clamp(high - (high - trueValue) * pull, trueValue, 99))
    ];
  });
}

export function refreshProspectRatings<T extends Prospect>(prospect: T, seed: string): T {
  const { roleGrades: _legacyRoleGrades, ...prospectWithoutLegacyRoles } = prospect as T & { roleGrades?: unknown };
  const { roleGradeRanges: _legacyRoleGradeRanges, ...scoutedWithoutLegacyRoles } = (prospect.scouted ?? {}) as Prospect["scouted"] & {
    roleGradeRanges?: unknown;
  };
  const ratings =
    prospect.ratings?.length === ratingRegistry.length
      ? prospect.ratings.map((value) => Math.round(clamp(value, 20, 99)))
      : deriveRatingsFromAttributes(prospect.position, prospectAttributesFallback(prospect), `${seed}:${prospect.id}:${prospect.age}:${prospect.potential}`);
  const trueOverall = calculateOverallFromRatings(prospect.position, ratings);
  const confidence = prospect.scouted?.confidence ?? 40;
  const progress = prospect.scouted?.progress ?? confidence;
  const ranges =
    prospect.scouted?.ratingRanges?.length === ratingRegistry.length
      ? prospect.scouted.ratingRanges
      : ratingRangesFor(ratings, confidence, createRng(`${seed}:${prospect.id}:ranges`));
  const potentialLow = prospect.scouted?.potentialLow ?? Math.round(clamp(prospect.potential - 12, trueOverall, 99));
  const potentialHigh = prospect.scouted?.potentialHigh ?? Math.round(clamp(prospect.potential + 12, prospect.potential, 99));
  const concerns: ProspectConcernRanges = prospect.scouted?.concerns ?? {
    medical: [prospect.medical ?? 60, prospect.medical ?? 60],
    character: [prospect.character ?? 60, prospect.character ?? 60],
    workEthic: [prospect.workEthic ?? prospect.potential ?? 60, prospect.workEthic ?? prospect.potential ?? 60]
  };
  return {
    ...prospectWithoutLegacyRoles,
    ratings,
    trueOverall,
    scouted: {
      ...scoutedWithoutLegacyRoles,
      low: prospect.scouted?.low ?? Math.round(clamp(trueOverall - 10, 25, trueOverall)),
      high: prospect.scouted?.high ?? Math.round(clamp(trueOverall + 10, trueOverall, 99)),
      potentialLow,
      potentialHigh,
      confidence,
      progress,
      concerns,
      ratingRanges: ranges
    }
  } as T;
}

function prospectAttributesFallback(prospect: Prospect): Attributes {
  const base = prospect.trueOverall;
  return {
    speed: prospect.combine.speed,
    strength: prospect.combine.strength,
    athleticism: Math.round((prospect.combine.agility + prospect.combine.explosion) / 2),
    awareness: Math.round(clamp(base + (prospect.production - 60) * 0.16, 20, 99)),
    passing: base,
    rushing: base,
    receiving: base,
    blocking: base,
    tackling: base,
    coverage: base,
    kicking: base,
    durability: Math.round(clamp(base + 3, 20, 99)),
    discipline: Math.round(clamp(base + 1, 20, 99))
  };
}

export function ratingRangeLabel(ranges: RatingRangeVector | undefined, key: RatingKey): string {
  const index = ratingIndex.get(key);
  const range = index === undefined ? undefined : ranges?.[index];
  return range ? `${range[0]}-${range[1]}` : "--";
}
