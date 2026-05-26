import { clamp, createRng, type Rng } from "../lib/rng";
import {
  POSITIONS,
  type BodyProfile,
  type GameSave,
  type Player,
  type PlayerTrainingState,
  type Position,
  type Prospect,
  type ProspectBodyScoutingReport,
  type ProspectConversionScoutingReport,
  type RatingVector,
  type SkillBucketKey,
  type SkillBuckets,
  type TrainingBodyPlan,
  type TrainingSkillPlan
} from "../types";
import { coachDevelopmentGrade } from "./staffModel";
import {
  calculateOverallFromRatings,
  deriveRatingsFromAttributes,
  legacyAttributesFromRatings,
  ratingRegistry,
  ratingValue,
  type RatingKey
} from "./ratings";

const ratingIndex = new Map(ratingRegistry.map((rating, index) => [rating.key, index]));
const skillBucketKeys: SkillBucketKey[] = [
  "speed",
  "burst",
  "power",
  "stamina",
  "processing",
  "discipline",
  "throwing",
  "accuracy",
  "pocket",
  "ballCarrier",
  "hands",
  "routeCraft",
  "passProtection",
  "runBlocking",
  "frontDefense",
  "tackling",
  "coverage",
  "passRush",
  "specialist"
];

type PositionArchetype = {
  height: [number, number];
  weight: [number, number];
  musclePct: [number, number];
  bodyFatPct: [number, number];
  bucketWeights: Partial<Record<SkillBucketKey, number>>;
};

const positionArchetypes: Record<Position, PositionArchetype> = {
  QB: { height: [73, 78], weight: [205, 245], musclePct: [44, 59], bodyFatPct: [10, 18], bucketWeights: { throwing: 1.4, accuracy: 1.35, pocket: 1.2, processing: 1.1, discipline: 0.7, speed: 0.3 } },
  RB: { height: [69, 74], weight: [198, 232], musclePct: [46, 63], bodyFatPct: [8, 16], bucketWeights: { speed: 1.05, burst: 1.15, power: 0.8, stamina: 0.75, ballCarrier: 1.35, hands: 0.4, passProtection: 0.35 } },
  WR: { height: [70, 78], weight: [182, 225], musclePct: [42, 56], bodyFatPct: [7, 14], bucketWeights: { speed: 1.1, burst: 1.1, hands: 1.25, routeCraft: 1.2, ballCarrier: 0.55, discipline: 0.45 } },
  TE: { height: [75, 80], weight: [236, 268], musclePct: [48, 62], bodyFatPct: [10, 18], bucketWeights: { power: 0.85, hands: 0.95, routeCraft: 0.75, passProtection: 0.7, runBlocking: 1.05, processing: 0.45 } },
  LT: { height: [76, 81], weight: [298, 345], musclePct: [50, 66], bodyFatPct: [17, 28], bucketWeights: { power: 1.1, stamina: 0.6, processing: 0.6, passProtection: 1.3, runBlocking: 1.05 } },
  LG: { height: [74, 79], weight: [300, 345], musclePct: [52, 67], bodyFatPct: [18, 29], bucketWeights: { power: 1.15, stamina: 0.55, processing: 0.55, passProtection: 0.95, runBlocking: 1.3 } },
  C: { height: [74, 79], weight: [290, 332], musclePct: [50, 66], bodyFatPct: [16, 28], bucketWeights: { power: 1.05, stamina: 0.6, processing: 0.85, passProtection: 1.05, runBlocking: 1.15, discipline: 0.5 } },
  RG: { height: [74, 79], weight: [300, 345], musclePct: [52, 67], bodyFatPct: [18, 29], bucketWeights: { power: 1.15, stamina: 0.55, processing: 0.55, passProtection: 0.95, runBlocking: 1.3 } },
  RT: { height: [76, 81], weight: [300, 346], musclePct: [50, 66], bodyFatPct: [17, 28], bucketWeights: { power: 1.1, stamina: 0.6, processing: 0.6, passProtection: 1.25, runBlocking: 1.05 } },
  EDGE: { height: [74, 79], weight: [242, 282], musclePct: [50, 65], bodyFatPct: [10, 20], bucketWeights: { speed: 0.65, burst: 0.8, power: 0.9, stamina: 0.55, frontDefense: 0.95, tackling: 0.7, passRush: 1.3 } },
  DL: { height: [74, 80], weight: [286, 332], musclePct: [54, 69], bodyFatPct: [16, 27], bucketWeights: { burst: 0.45, power: 1.25, stamina: 0.5, frontDefense: 1.25, tackling: 0.6, passRush: 0.75 } },
  LB: { height: [72, 77], weight: [224, 258], musclePct: [48, 62], bodyFatPct: [9, 18], bucketWeights: { speed: 0.7, burst: 0.7, power: 0.5, stamina: 0.75, processing: 0.7, frontDefense: 0.85, tackling: 1.15, coverage: 0.75, passRush: 0.45 } },
  CB: { height: [69, 75], weight: [182, 208], musclePct: [40, 52], bodyFatPct: [6, 12], bucketWeights: { speed: 1.15, burst: 1.05, stamina: 0.55, processing: 0.45, hands: 0.45, coverage: 1.35 } },
  S: { height: [70, 76], weight: [196, 224], musclePct: [44, 57], bodyFatPct: [8, 15], bucketWeights: { speed: 0.8, burst: 0.7, power: 0.4, stamina: 0.65, processing: 0.75, hands: 0.3, tackling: 1.05, coverage: 1.1 } },
  K: { height: [70, 77], weight: [180, 220], musclePct: [38, 50], bodyFatPct: [7, 16], bucketWeights: { discipline: 0.8, specialist: 1.6 } },
  P: { height: [71, 78], weight: [185, 225], musclePct: [38, 50], bodyFatPct: [7, 16], bucketWeights: { discipline: 0.7, specialist: 1.6 } }
};

const positionBodyTargets = Object.fromEntries(
  POSITIONS.map((position) => {
    const archetype = positionArchetypes[position];
    return [position, {
      height: average(archetype.height),
      weight: average(archetype.weight),
      musclePct: average(archetype.musclePct),
      bodyFatPct: average(archetype.bodyFatPct)
    }];
  })
) as Record<Position, { height: number; weight: number; musclePct: number; bodyFatPct: number }>;

const positionSkillWeights = Object.fromEntries(
  POSITIONS.map((position) => {
    const entries = Object.entries(positionArchetypes[position].bucketWeights) as Array<[SkillBucketKey, number]>;
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    return [position, { entries, total }];
  })
) as Record<Position, { entries: Array<[SkillBucketKey, number]>; total: number }>;

const bodyPlanDisplay: Record<TrainingBodyPlan, string> = {
  auto: "Auto body plan",
  maintain: "Maintenance work kept the frame stable.",
  "lean-bulk": "Lean-mass work added good weight.",
  "power-bulk": "Power bulk added mass and force.",
  cut: "Cutting trimmed body fat.",
  conditioning: "Conditioning improved the engine.",
  mobility: "Mobility work opened up movement."
};

const skillPlanDisplay: Record<TrainingSkillPlan, string> = {
  auto: "Auto football plan",
  maintain: "Maintenance reps held the skill base steady.",
  "position-technique": "Position-specific reps sharpened fundamentals.",
  athlete: "Athletic field work targeted movement traits.",
  passing: "Passing lab reps improved ball delivery.",
  "ball-skills": "Ball-skill work targeted hands and finishing.",
  trench: "Trench work emphasized blocking leverage and power.",
  coverage: "Coverage work sharpened range and reaction.",
  "pass-rush": "Rush work emphasized counters and close speed.",
  specialist: "Specialist work refined operation consistency."
};

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function bucketRange(value: number): [number, number] {
  return [Math.max(20, Math.round(value - 4)), Math.min(99, Math.round(value + 4))];
}

function clampBody(body: BodyProfile): BodyProfile {
  const weightLbs = Math.round(clamp(body.weightLbs, 165, 365));
  const musclePct = Math.round(clamp(body.musclePct, 30, 72));
  const bodyFatPct = Math.round(clamp(body.bodyFatPct, 4, 34));
  return {
    heightInches: Math.round(clamp(body.heightInches, 67, 82)),
    frameSize: Math.round(clamp(body.frameSize, 35, 95)),
    weightLbs,
    musclePct,
    bodyFatPct,
    conditioning: Math.round(clamp(body.conditioning, 20, 99)),
    flexibility: Math.round(clamp(body.flexibility, 20, 99)),
    recovery: Math.round(clamp(body.recovery, 20, 99)),
    explosiveReadiness: Math.round(clamp(body.explosiveReadiness, 20, 99))
  };
}

function clampBuckets(buckets: SkillBuckets): SkillBuckets {
  return Object.fromEntries(
    skillBucketKeys.map((key) => [key, Math.round(clamp(buckets[key], 20, 99))])
  ) as SkillBuckets;
}

function setRating(ratings: RatingVector, key: RatingKey, value: number): void {
  const index = ratingIndex.get(key);
  if (index === undefined) return;
  ratings[index] = Math.round(clamp(value, 20, 99));
}

function derivedAthleticScore(body: BodyProfile, buckets: SkillBuckets): number {
  return clamp(average([
    buckets.speed,
    buckets.burst,
    buckets.stamina,
    body.conditioning,
    body.flexibility,
    body.explosiveReadiness
  ]), 20, 99);
}

function buildAttributesFromModel(body: BodyProfile, buckets: SkillBuckets) {
  const durability = clamp(average([body.recovery, 100 - body.bodyFatPct * 2, body.conditioning, body.musclePct + 24]), 20, 99);
  return {
    speed: Math.round(clamp(average([buckets.speed, buckets.burst, body.explosiveReadiness, 110 - body.bodyFatPct * 2]), 20, 99)),
    strength: Math.round(clamp(average([buckets.power, body.musclePct + 22, body.frameSize * 0.72, body.weightLbs * 0.19]), 20, 99)),
    athleticism: Math.round(derivedAthleticScore(body, buckets)),
    awareness: Math.round(clamp(average([buckets.processing, buckets.discipline, body.recovery]), 20, 99)),
    passing: Math.round(clamp(average([buckets.throwing, buckets.accuracy, buckets.pocket]), 20, 99)),
    rushing: Math.round(clamp(average([buckets.ballCarrier, buckets.speed, buckets.burst]), 20, 99)),
    receiving: Math.round(clamp(average([buckets.hands, buckets.routeCraft, buckets.ballCarrier]), 20, 99)),
    blocking: Math.round(clamp(average([buckets.passProtection, buckets.runBlocking, buckets.power]), 20, 99)),
    tackling: Math.round(clamp(average([buckets.tackling, buckets.frontDefense, buckets.power]), 20, 99)),
    coverage: Math.round(clamp(average([buckets.coverage, buckets.processing, buckets.speed]), 20, 99)),
    kicking: Math.round(clamp(buckets.specialist, 20, 99)),
    durability: Math.round(durability),
    discipline: Math.round(clamp(average([buckets.discipline, buckets.processing]), 20, 99))
  };
}

function buildRatingsFromModel(position: Position, body: BodyProfile, buckets: SkillBuckets): RatingVector {
  const attributes = buildAttributesFromModel(body, buckets);
  const ratings = deriveRatingsFromAttributes(position, attributes, `body-model:${position}`);
  const strength = attributes.strength;
  const speed = attributes.speed;
  const athleticism = attributes.athleticism;
  const awareness = attributes.awareness;
  const bodyBalance = clamp(100 - body.bodyFatPct * 1.8 + body.musclePct * 0.4, 20, 99);

  setRating(ratings, "speed", average([speed, buckets.speed]));
  setRating(ratings, "acceleration", average([speed, buckets.burst, body.explosiveReadiness]));
  setRating(ratings, "agility", average([speed, body.flexibility, buckets.speed]));
  setRating(ratings, "changeOfDirection", average([buckets.speed, body.flexibility, buckets.burst]));
  setRating(ratings, "explosiveness", average([buckets.burst, body.explosiveReadiness, athleticism]));
  setRating(ratings, "strength", average([strength, buckets.power]));
  setRating(ratings, "stamina", average([buckets.stamina, body.conditioning, body.recovery]));
  setRating(ratings, "burst", average([buckets.burst, body.explosiveReadiness]));
  setRating(ratings, "closingSpeed", average([buckets.speed, buckets.burst, body.conditioning]));
  setRating(ratings, "awareness", average([awareness, buckets.processing]));
  setRating(ratings, "playRecognition", average([buckets.processing, buckets.discipline]));
  setRating(ratings, "discipline", average([buckets.discipline, buckets.processing]));
  setRating(ratings, "composure", average([buckets.discipline, body.recovery, body.conditioning]));
  setRating(ratings, "consistency", average([buckets.discipline, body.recovery]));
  setRating(ratings, "leadership", average([buckets.discipline, awareness]));
  setRating(ratings, "workEthic", average([buckets.discipline, body.recovery, body.conditioning]));

  setRating(ratings, "throwPower", average([buckets.throwing, buckets.power]));
  setRating(ratings, "shortAccuracy", average([buckets.accuracy, buckets.processing]));
  setRating(ratings, "mediumAccuracy", average([buckets.accuracy, buckets.throwing, buckets.processing]));
  setRating(ratings, "deepAccuracy", average([buckets.accuracy, buckets.throwing, body.explosiveReadiness]));
  setRating(ratings, "timing", average([buckets.accuracy, buckets.processing, buckets.discipline]));
  setRating(ratings, "pocketPresence", average([buckets.pocket, buckets.processing, body.recovery]));
  setRating(ratings, "pressureSense", average([buckets.pocket, buckets.processing]));
  setRating(ratings, "throwOnRun", average([buckets.throwing, buckets.speed, body.flexibility]));

  setRating(ratings, "rushingVision", average([buckets.ballCarrier, buckets.processing]));
  setRating(ratings, "elusiveness", average([buckets.ballCarrier, buckets.speed, body.flexibility]));
  setRating(ratings, "powerRun", average([buckets.ballCarrier, buckets.power, bodyBalance]));
  setRating(ratings, "contactBalance", average([buckets.ballCarrier, buckets.power, body.musclePct + 20]));
  setRating(ratings, "breakTackle", average([buckets.ballCarrier, buckets.power]));
  setRating(ratings, "ballSecurity", average([buckets.ballCarrier, buckets.discipline, body.recovery]));

  setRating(ratings, "passCatching", average([buckets.hands, buckets.routeCraft]));
  setRating(ratings, "release", average([buckets.routeCraft, buckets.speed, body.flexibility]));
  setRating(ratings, "shortRoute", average([buckets.routeCraft, buckets.processing]));
  setRating(ratings, "mediumRoute", average([buckets.routeCraft, buckets.processing, buckets.speed]));
  setRating(ratings, "deepRoute", average([buckets.routeCraft, buckets.speed, buckets.burst]));
  setRating(ratings, "contestedCatch", average([buckets.hands, buckets.power, body.frameSize]));
  setRating(ratings, "yardsAfterCatch", average([buckets.ballCarrier, buckets.speed, buckets.burst]));
  setRating(ratings, "separation", average([buckets.routeCraft, buckets.speed, body.flexibility]));

  setRating(ratings, "runBlock", average([buckets.runBlocking, buckets.power, body.frameSize]));
  setRating(ratings, "passBlock", average([buckets.passProtection, buckets.power, buckets.processing]));
  setRating(ratings, "passBlockFootwork", average([buckets.passProtection, buckets.speed, body.flexibility]));
  setRating(ratings, "runBlockPower", average([buckets.runBlocking, buckets.power]));
  setRating(ratings, "anchor", average([buckets.power, body.musclePct + 25, body.frameSize]));
  setRating(ratings, "handTechnique", average([buckets.runBlocking, buckets.passProtection, buckets.discipline]));
  setRating(ratings, "blitzPickup", average([buckets.passProtection, buckets.processing, buckets.discipline]));
  setRating(ratings, "secondLevel", average([buckets.runBlocking, buckets.speed, body.flexibility]));

  setRating(ratings, "edgeSetting", average([buckets.frontDefense, buckets.power, buckets.discipline]));
  setRating(ratings, "powerRush", average([buckets.passRush, buckets.power]));
  setRating(ratings, "finesseRush", average([buckets.passRush, buckets.speed, body.flexibility]));
  setRating(ratings, "passRushPlan", average([buckets.passRush, buckets.processing, buckets.discipline]));
  setRating(ratings, "blockShedding", average([buckets.frontDefense, buckets.power]));
  setRating(ratings, "gapDiscipline", average([buckets.frontDefense, buckets.discipline, buckets.processing]));
  setRating(ratings, "runDefense", average([buckets.frontDefense, buckets.tackling, buckets.power]));
  setRating(ratings, "tackling", average([buckets.tackling, buckets.power]));
  setRating(ratings, "pursuit", average([buckets.tackling, buckets.speed, buckets.processing]));
  setRating(ratings, "hitPower", average([buckets.power, buckets.tackling]));

  setRating(ratings, "manCoverage", average([buckets.coverage, buckets.speed, body.flexibility]));
  setRating(ratings, "zoneCoverage", average([buckets.coverage, buckets.processing]));
  setRating(ratings, "pressCoverage", average([buckets.coverage, buckets.power, bodyBalance]));
  setRating(ratings, "ballSkills", average([buckets.coverage, buckets.hands, buckets.processing]));
  setRating(ratings, "takeaways", average([buckets.coverage, buckets.hands, buckets.discipline]));

  setRating(ratings, "kickPower", average([buckets.specialist, buckets.power]));
  setRating(ratings, "kickAccuracy", average([buckets.specialist, buckets.discipline]));
  setRating(ratings, "puntPower", average([buckets.specialist, buckets.power]));
  setRating(ratings, "puntAccuracy", average([buckets.specialist, buckets.discipline]));

  return ratings.map((value) => Math.round(clamp(value, 20, 99)));
}

function bodyForPosition(position: Position, age: number, ratings: RatingVector, rng: Rng): BodyProfile {
  const archetype = positionArchetypes[position];
  const speed = ratingValue(ratings, "speed");
  const strength = ratingValue(ratings, "strength");
  const stamina = ratingValue(ratings, "stamina");
  const body = {
    heightInches: rng.int(archetype.height[0], archetype.height[1]),
    frameSize: Math.round(clamp(average([strength, ratingValue(ratings, "anchor"), ratingValue(ratings, "runDefense")]), 35, 95)),
    weightLbs: Math.round(clamp(rng.normal(average(archetype.weight), 8) + (strength - 60) * 0.45, archetype.weight[0] - 10, archetype.weight[1] + 12)),
    musclePct: Math.round(clamp(rng.normal(average(archetype.musclePct), 3.5) + (strength - 60) * 0.12, 30, 72)),
    bodyFatPct: Math.round(clamp(rng.normal(average(archetype.bodyFatPct), 2.2) - (speed - 60) * 0.06 + (age - 25) * 0.14, 4, 34)),
    conditioning: Math.round(clamp(average([stamina, speed, ratingValue(ratings, "discipline")]) + rng.normal(0, 4), 20, 99)),
    flexibility: Math.round(clamp(average([ratingValue(ratings, "agility"), ratingValue(ratings, "changeOfDirection"), speed]) + rng.normal(0, 3), 20, 99)),
    recovery: Math.round(clamp(average([ratingValue(ratings, "stamina"), ratingValue(ratings, "discipline"), 100 - age * 1.2]) + rng.normal(0, 4), 20, 99)),
    explosiveReadiness: Math.round(clamp(average([ratingValue(ratings, "burst"), ratingValue(ratings, "explosiveness"), speed]) + rng.normal(0, 3), 20, 99))
  } satisfies BodyProfile;
  return clampBody(body);
}

function bucketsFromRatings(ratings: RatingVector): SkillBuckets {
  const buckets = {
    speed: average([ratingValue(ratings, "speed"), ratingValue(ratings, "acceleration"), ratingValue(ratings, "agility"), ratingValue(ratings, "changeOfDirection")]),
    burst: average([ratingValue(ratings, "burst"), ratingValue(ratings, "explosiveness"), ratingValue(ratings, "closingSpeed")]),
    power: average([ratingValue(ratings, "strength"), ratingValue(ratings, "anchor"), ratingValue(ratings, "hitPower")]),
    stamina: average([ratingValue(ratings, "stamina"), ratingValue(ratings, "consistency")]),
    processing: average([ratingValue(ratings, "awareness"), ratingValue(ratings, "playRecognition"), ratingValue(ratings, "leadership")]),
    discipline: average([ratingValue(ratings, "discipline"), ratingValue(ratings, "composure"), ratingValue(ratings, "consistency"), ratingValue(ratings, "workEthic")]),
    throwing: average([ratingValue(ratings, "throwPower"), ratingValue(ratings, "throwOnRun")]),
    accuracy: average([ratingValue(ratings, "shortAccuracy"), ratingValue(ratings, "mediumAccuracy"), ratingValue(ratings, "deepAccuracy"), ratingValue(ratings, "timing")]),
    pocket: average([ratingValue(ratings, "pocketPresence"), ratingValue(ratings, "pressureSense")]),
    ballCarrier: average([ratingValue(ratings, "rushingVision"), ratingValue(ratings, "elusiveness"), ratingValue(ratings, "contactBalance"), ratingValue(ratings, "ballSecurity")]),
    hands: average([ratingValue(ratings, "passCatching"), ratingValue(ratings, "contestedCatch"), ratingValue(ratings, "ballSkills")]),
    routeCraft: average([ratingValue(ratings, "release"), ratingValue(ratings, "shortRoute"), ratingValue(ratings, "mediumRoute"), ratingValue(ratings, "deepRoute"), ratingValue(ratings, "separation")]),
    passProtection: average([ratingValue(ratings, "passBlock"), ratingValue(ratings, "passBlockFootwork"), ratingValue(ratings, "blitzPickup")]),
    runBlocking: average([ratingValue(ratings, "runBlock"), ratingValue(ratings, "runBlockPower"), ratingValue(ratings, "handTechnique"), ratingValue(ratings, "secondLevel")]),
    frontDefense: average([ratingValue(ratings, "edgeSetting"), ratingValue(ratings, "blockShedding"), ratingValue(ratings, "gapDiscipline"), ratingValue(ratings, "runDefense")]),
    tackling: average([ratingValue(ratings, "tackling"), ratingValue(ratings, "pursuit"), ratingValue(ratings, "hitPower")]),
    coverage: average([ratingValue(ratings, "manCoverage"), ratingValue(ratings, "zoneCoverage"), ratingValue(ratings, "pressCoverage"), ratingValue(ratings, "ballSkills"), ratingValue(ratings, "takeaways")]),
    passRush: average([ratingValue(ratings, "powerRush"), ratingValue(ratings, "finesseRush"), ratingValue(ratings, "passRushPlan")]),
    specialist: average([ratingValue(ratings, "kickPower"), ratingValue(ratings, "kickAccuracy"), ratingValue(ratings, "puntPower"), ratingValue(ratings, "puntAccuracy")])
  } satisfies SkillBuckets;
  return clampBuckets(buckets);
}

function blankTraining(position: Position): PlayerTrainingState {
  return {
    bodyPlan: "auto",
    skillPlan: "auto",
    targetPosition: position,
    autoPosition: true,
    conversionProgress: { [position]: 100 }
  };
}

function bodyFitScore(position: Position, body: BodyProfile): number {
  const target = positionBodyTargets[position];
  const diffScore =
    100 -
    Math.abs(body.weightLbs - target.weight) * 0.35 -
    Math.abs(body.heightInches - target.height) * 5.2 -
    Math.abs(body.musclePct - target.musclePct) * 1.8 -
    Math.abs(body.bodyFatPct - target.bodyFatPct) * 2.8;
  return clamp(diffScore, 20, 99);
}

function skillFitScore(position: Position, buckets: SkillBuckets): number {
  const weights = positionSkillWeights[position];
  const score = weights.entries.reduce((sum, [key, weight]) => sum + buckets[key] * weight, 0) / Math.max(1, weights.total);
  return clamp(score, 20, 99);
}

const offensiveLinePositions = new Set<Position>(["LT", "LG", "C", "RG", "RT"]);
const defensiveBackPositions = new Set<Position>(["CB", "S"]);
const defensiveFrontPositions = new Set<Position>(["EDGE", "DL", "LB"]);
const offensiveSkillPositions = new Set<Position>(["RB", "WR", "TE"]);

function familyComfort(currentPosition: Position, targetPosition: Position): number {
  if (currentPosition === targetPosition) return 100;
  if (offensiveLinePositions.has(currentPosition) && offensiveLinePositions.has(targetPosition)) {
    if ((currentPosition === "LT" && targetPosition === "RT") || (currentPosition === "RT" && targetPosition === "LT")) return 88;
    if ((currentPosition === "LG" && targetPosition === "RG") || (currentPosition === "RG" && targetPosition === "LG")) return 92;
    if (targetPosition === "C" && (currentPosition === "LG" || currentPosition === "RG")) return 88;
    if (currentPosition === "C" && (targetPosition === "LG" || targetPosition === "RG")) return 90;
    return 70;
  }
  if (defensiveBackPositions.has(currentPosition) && defensiveBackPositions.has(targetPosition)) return currentPosition === "CB" ? 72 : 68;
  if (defensiveFrontPositions.has(currentPosition) && defensiveFrontPositions.has(targetPosition)) {
    if ((currentPosition === "EDGE" && targetPosition === "DL") || (currentPosition === "DL" && targetPosition === "EDGE")) return 74;
    if (targetPosition === "LB" || currentPosition === "LB") return 66;
    return 70;
  }
  if (offensiveSkillPositions.has(currentPosition) && offensiveSkillPositions.has(targetPosition)) {
    if ((currentPosition === "RB" && targetPosition === "WR") || (currentPosition === "WR" && targetPosition === "RB")) return 60;
    if ((currentPosition === "WR" && targetPosition === "TE") || (currentPosition === "TE" && targetPosition === "WR")) return 58;
    return 54;
  }
  return 34;
}

function fitForPositionFromScores(
  currentPosition: Position,
  targetPosition: Position,
  bodyFit: number,
  skillFit: number,
  training: PlayerTrainingState
): number {
  if (targetPosition === currentPosition) return 100;
  const trainingBoost = training.conversionProgress[targetPosition] ?? 0;
  const comfort =
    familyComfort(currentPosition, targetPosition) * 0.34 +
    bodyFit * 0.22 +
    skillFit * 0.34 +
    trainingBoost * 0.1;
  return Math.round(clamp(comfort, 20, 100));
}

function fitForPosition(currentPosition: Position, targetPosition: Position, body: BodyProfile, buckets: SkillBuckets, training: PlayerTrainingState): number {
  return fitForPositionFromScores(
    currentPosition,
    targetPosition,
    bodyFitScore(targetPosition, body),
    skillFitScore(targetPosition, buckets),
    training
  );
}

export function modelPositionFitsFor(
  currentPosition: Position,
  body: BodyProfile,
  buckets: SkillBuckets,
  training?: PlayerTrainingState
): Partial<Record<Position, number>> {
  const state = training ?? blankTraining(currentPosition);
  const bodyScores = Object.fromEntries(POSITIONS.map((position) => [position, bodyFitScore(position, body)])) as Record<Position, number>;
  const skillScores = Object.fromEntries(POSITIONS.map((position) => [position, skillFitScore(position, buckets)])) as Record<Position, number>;
  const fits = Object.fromEntries(
    POSITIONS.map((position) => [position, fitForPositionFromScores(currentPosition, position, bodyScores[position], skillScores[position], state)])
  ) as Partial<Record<Position, number>>;
  fits[currentPosition] = 100;
  return fits;
}

export function bestPositionForModel(
  currentPosition: Position,
  body: BodyProfile,
  buckets: SkillBuckets,
  training?: PlayerTrainingState
): Position {
  const state = training ?? blankTraining(currentPosition);
  const ratings = buildRatingsFromModel(currentPosition, body, buckets);
  let bestPosition = currentPosition;
  let bestScore = calculateOverallFromRatings(currentPosition, ratings);
  for (const position of POSITIONS) {
    const fit = fitForPosition(currentPosition, position, body, buckets, state);
    if (fit < 58) continue;
    const score = calculateOverallFromRatings(position, ratings) + fit * 0.08;
    if (score > bestScore + 1.5) {
      bestScore = score;
      bestPosition = position;
    }
  }
  return bestPosition;
}

function bodyScoutReport(body: BodyProfile): ProspectBodyScoutingReport {
  return {
    heightInches: [body.heightInches, body.heightInches],
    weightLbs: bucketRange(body.weightLbs),
    musclePct: bucketRange(body.musclePct),
    bodyFatPct: bucketRange(body.bodyFatPct),
    conditioning: bucketRange(body.conditioning),
    flexibility: bucketRange(body.flexibility),
    recovery: bucketRange(body.recovery),
    explosiveReadiness: bucketRange(body.explosiveReadiness)
  };
}

function conversionScoutReport(position: Position, body: BodyProfile, buckets: SkillBuckets, training: PlayerTrainingState): ProspectConversionScoutingReport[] {
  return POSITIONS
    .filter((candidate) => candidate !== position)
    .map((candidate) => ({
      targetPosition: candidate,
      fit: fitForPosition(position, candidate, body, buckets, training),
      summary: `${candidate} conversion ${fitForPosition(position, candidate, body, buckets, training) >= 74 ? "looks natural" : fitForPosition(position, candidate, body, buckets, training) >= 64 ? "is viable with work" : "is a longer-term project"}.`
    }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 5);
}

export function normalizePlayerModel(player: Player, seed: string): Player {
  const rng = createRng(`${seed}:player-model:${player.id}`);
  const preserveRatings = !player.body || !player.skillBuckets || !player.training;
  const body = clampBody(player.body ?? bodyForPosition(player.position, player.age, player.ratings, rng));
  const skillBuckets = clampBuckets(player.skillBuckets ?? bucketsFromRatings(player.ratings));
  const training = {
    ...blankTraining(player.position),
    ...player.training,
    targetPosition: player.training?.targetPosition ?? player.position,
    autoPosition: player.training?.autoPosition ?? true,
    conversionProgress: {
      [player.position]: 100,
      ...(player.training?.conversionProgress ?? {})
    }
  } satisfies PlayerTrainingState;
  const primaryPosition = preserveRatings ? player.position : training.autoPosition ? bestPositionForModel(player.position, body, skillBuckets, training) : player.position;
  const ratings = preserveRatings ? [...player.ratings] : buildRatingsFromModel(primaryPosition, body, skillBuckets);
  const overall = preserveRatings ? player.overall : calculateOverallFromRatings(primaryPosition, ratings);
  return {
    ...player,
    position: primaryPosition,
    body,
    skillBuckets,
    training,
    ratings,
    overall,
    potential: Math.max(overall, player.potential ?? overall),
    attributes: legacyAttributesFromRatings(primaryPosition, ratings),
    positionFits: modelPositionFitsFor(primaryPosition, body, skillBuckets, training)
  };
}

export function normalizeProspectModel(prospect: Prospect, seed: string): Prospect {
  const rng = createRng(`${seed}:prospect-model:${prospect.id}`);
  const preserveRatings = !prospect.body || !prospect.skillBuckets || !prospect.training;
  const body = clampBody(prospect.body ?? bodyForPosition(prospect.position, prospect.age, prospect.ratings, rng));
  const skillBuckets = clampBuckets(prospect.skillBuckets ?? bucketsFromRatings(prospect.ratings));
  const training = {
    ...blankTraining(prospect.position),
    ...prospect.training,
    targetPosition: prospect.training?.targetPosition ?? prospect.position,
    autoPosition: prospect.training?.autoPosition ?? true,
    conversionProgress: {
      [prospect.position]: 100,
      ...(prospect.training?.conversionProgress ?? {})
    }
  } satisfies PlayerTrainingState;
  const primaryPosition = preserveRatings ? prospect.position : training.autoPosition ? bestPositionForModel(prospect.position, body, skillBuckets, training) : prospect.position;
  const ratings = preserveRatings ? [...prospect.ratings] : buildRatingsFromModel(primaryPosition, body, skillBuckets);
  const trueOverall = preserveRatings ? prospect.trueOverall : calculateOverallFromRatings(primaryPosition, ratings);
  return {
    ...prospect,
    position: primaryPosition,
    body,
    skillBuckets,
    training,
    ratings,
    trueOverall,
    potential: Math.max(trueOverall, prospect.potential ?? trueOverall),
    positionFits: modelPositionFitsFor(primaryPosition, body, skillBuckets, training),
    scouted: {
      ...prospect.scouted,
      bodyRanges: prospect.scouted.bodyRanges ?? bodyScoutReport(body),
      conversionUpside: prospect.scouted.conversionUpside ?? conversionScoutReport(primaryPosition, body, skillBuckets, training)
    }
  };
}

export function syncPlayerModelFromRatings(player: Player, seed: string): Player {
  const body = clampBody(player.body);
  const skillBuckets = bucketsFromRatings(player.ratings);
  const training = {
    ...blankTraining(player.position),
    ...player.training,
    conversionProgress: {
      [player.position]: 100,
      ...(player.training?.conversionProgress ?? {})
    }
  } satisfies PlayerTrainingState;
  const primaryPosition = training.autoPosition ? bestPositionForModel(player.position, body, skillBuckets, training) : player.position;
  return {
    ...player,
    position: primaryPosition,
    body,
    skillBuckets,
    training,
    overall: calculateOverallFromRatings(primaryPosition, player.ratings),
    attributes: legacyAttributesFromRatings(primaryPosition, player.ratings),
    positionFits: modelPositionFitsFor(primaryPosition, body, skillBuckets, training)
  };
}

export function updatePlayerTrainingSettings(
  player: Player,
  updates: Partial<Pick<PlayerTrainingState, "bodyPlan" | "skillPlan" | "targetPosition" | "autoPosition">>,
  seed: string
): Player {
  return normalizePlayerModel(
    {
      ...player,
      training: {
        ...player.training,
        ...updates
      }
    },
    seed
  );
}

function skillPlanKeys(plan: TrainingSkillPlan, position: Position): SkillBucketKey[] {
  if (plan === "passing") return ["throwing", "accuracy", "pocket", "processing"];
  if (plan === "ball-skills") return ["hands", "routeCraft", "ballCarrier"];
  if (plan === "trench") return ["power", "passProtection", "runBlocking", "discipline"];
  if (plan === "coverage") return ["speed", "processing", "coverage", "discipline"];
  if (plan === "pass-rush") return ["burst", "power", "frontDefense", "passRush"];
  if (plan === "specialist") return ["specialist", "discipline"];
  if (plan === "athlete") return ["speed", "burst", "stamina"];
  if (plan === "position-technique") {
    return (Object.entries(positionArchetypes[position].bucketWeights) as Array<[SkillBucketKey, number]>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key]) => key);
  }
  if (plan === "maintain" || plan === "auto") {
    return skillPlanKeys("position-technique", position);
  }
  return ["processing", "discipline"];
}

function weeklyBodyAdjustments(body: BodyProfile, plan: TrainingBodyPlan, intensity: number, rng: Rng): BodyProfile {
  const next = { ...body };
  const lift = intensity * 0.55;
  const trim = intensity * 0.4;
  if (plan === "lean-bulk") {
    next.weightLbs += rng.normal(0.8 + lift * 0.35, 0.45);
    next.musclePct += rng.normal(0.45 + lift * 0.12, 0.2);
    next.bodyFatPct += rng.normal(0.1, 0.12);
    next.explosiveReadiness += rng.normal(0.18 + intensity * 0.1, 0.14);
  } else if (plan === "power-bulk") {
    next.weightLbs += rng.normal(1.4 + lift * 0.45, 0.55);
    next.musclePct += rng.normal(0.55 + lift * 0.14, 0.24);
    next.bodyFatPct += rng.normal(0.22 + intensity * 0.05, 0.16);
    next.conditioning -= rng.normal(0.08, 0.12);
  } else if (plan === "cut") {
    next.weightLbs -= rng.normal(0.9 + trim * 0.28, 0.4);
    next.bodyFatPct -= rng.normal(0.38 + trim * 0.12, 0.18);
    next.conditioning += rng.normal(0.28 + intensity * 0.08, 0.15);
  } else if (plan === "conditioning") {
    next.conditioning += rng.normal(0.55 + intensity * 0.15, 0.2);
    next.recovery += rng.normal(0.28 + intensity * 0.08, 0.16);
    next.bodyFatPct -= rng.normal(0.14, 0.1);
  } else if (plan === "mobility") {
    next.flexibility += rng.normal(0.62 + intensity * 0.12, 0.2);
    next.explosiveReadiness += rng.normal(0.24 + intensity * 0.06, 0.14);
  } else if (plan === "maintain" || plan === "auto") {
    next.conditioning += rng.normal(0.12 + intensity * 0.05, 0.12);
    next.recovery += rng.normal(0.1 + intensity * 0.04, 0.12);
  }
  next.explosiveReadiness += rng.normal((next.conditioning - 60) * 0.003, 0.1);
  return clampBody(next);
}

function weeklySkillAdjustments(
  buckets: SkillBuckets,
  plan: TrainingSkillPlan,
  position: Position,
  targetPosition: Position,
  intensity: number,
  rng: Rng
): SkillBuckets {
  const next = { ...buckets };
  const keys = skillPlanKeys(plan, targetPosition);
  for (const key of keys) {
    next[key] += rng.normal(0.28 + intensity * 0.16, 0.16);
  }
  if (plan === "maintain" || plan === "auto") {
    const homeKeys = skillPlanKeys("position-technique", position);
    for (const key of homeKeys) next[key] += rng.normal(0.08, 0.08);
  }
  return clampBuckets(next);
}

function conversionCompatibility(position: Position, target: Position, body: BodyProfile, buckets: SkillBuckets, training: PlayerTrainingState): number {
  const fit = fitForPosition(position, target, body, buckets, training);
  return clamp((fit - 50) / 50, 0, 1);
}

function decayUnusedConversionProgress(progress: Partial<Record<Position, number>>, preserve: Position[]): Partial<Record<Position, number>> {
  const next = { ...progress };
  for (const position of POSITIONS) {
    if (preserve.includes(position)) continue;
    const value = next[position];
    if (typeof value !== "number") continue;
    next[position] = Math.round(clamp(value - 0.45, position === preserve[0] ? 100 : 0, 100));
  }
  return next;
}

function developTrainingState(
  position: Position,
  body: BodyProfile,
  buckets: SkillBuckets,
  training: PlayerTrainingState,
  responsiveness: number,
  rng: Rng
): PlayerTrainingState {
  const targetPosition = training.targetPosition ?? position;
  const compatibility = conversionCompatibility(position, targetPosition, body, buckets, training);
  const gain = targetPosition === position ? 0 : Math.max(0, rng.normal(compatibility * (0.9 + responsiveness * 0.55), 0.35));
  const progress = decayUnusedConversionProgress(training.conversionProgress, [position, targetPosition]);
  progress[position] = 100;
  progress[targetPosition] = Math.round(clamp((progress[targetPosition] ?? 0) + gain, 0, 100));
  return {
    ...training,
    targetPosition,
    conversionProgress: progress
  };
}

export function runWeeklyTraining(save: GameSave): GameSave {
  const seasonYear = save.seasonYear ?? ((save.draftState?.draftYear ?? 2027) - 1);
  const players = save.players.map((player) => {
    const normalized = normalizePlayerModel(player, save.seed);
    const rng = createRng(`${save.seed}:weekly-training:${save.currentWeek}:${normalized.id}`);
    const staffGrade = coachDevelopmentGrade(save.staff, normalized.teamId, normalized.position);
    const workDrive = clamp(normalized.development.workEthic * 0.52 + normalized.makeup.workEthic * 0.48, 20, 99);
    const learning = normalized.development.learning;
    const volatility = normalized.development.volatility;
    const responsiveness = clamp((workDrive - 55) * 0.012 + (learning - 55) * 0.01 + (staffGrade - 60) * 0.006, -0.45, 1.2);
    const lazyDrag = workDrive < 48 ? clamp((48 - workDrive) * 0.014, 0.04, 0.35) : 0;
    const setbackRisk = clamp(0.02 + (volatility - 50) * 0.0015 + lazyDrag * 0.35, 0.01, 0.18);
    const setback = rng.bool(setbackRisk);
    const intensity = Math.max(0, responsiveness - lazyDrag - (setback ? rng.float(0.25, 0.55) : 0));
    const body = weeklyBodyAdjustments(normalized.body, normalized.training.bodyPlan, intensity, rng);
    const skillBuckets = weeklySkillAdjustments(normalized.skillBuckets, normalized.training.skillPlan, normalized.position, normalized.training.targetPosition ?? normalized.position, intensity, rng);
    const training = developTrainingState(normalized.position, body, skillBuckets, normalized.training, intensity, rng);
    const nextPosition = training.autoPosition ? bestPositionForModel(normalized.position, body, skillBuckets, training) : normalized.position;
    const report = {
      seasonYear,
      week: save.currentWeek,
      summary: setback ? "Progress stalled this week and the staff flagged a rough workload response." : "The weekly plan produced steady gains.",
      bodySummary: bodyPlanDisplay[normalized.training.bodyPlan],
      footballSummary: skillPlanDisplay[normalized.training.skillPlan],
      risk: setback ? "Readiness dip risk triggered." : intensity < 0.08 ? "Low-engagement week blunted gains." : "Risk stayed manageable.",
      readinessDelta: Math.round((body.explosiveReadiness - normalized.body.explosiveReadiness) * 10) / 10,
      changedPrimaryPosition: nextPosition !== normalized.position,
      previousPrimaryPosition: normalized.position,
      nextPrimaryPosition: nextPosition
    };
    return normalizePlayerModel(
      {
        ...normalized,
        position: nextPosition,
        body,
        skillBuckets,
        training: {
          ...training,
          lastReport: report
        }
      },
      save.seed
    );
  });

  const prospects = save.prospects.map((prospect) => normalizeProspectModel(prospect, `${save.seed}:prospect`));

  return {
    ...save,
    players,
    prospects
  };
}
