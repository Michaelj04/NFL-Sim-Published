import { clamp } from "../lib/rng";
import { POSITIONS, type Player, type Position, type Prospect, type RatingVector } from "../types";
import { medicalAvailabilityPenalty } from "./medical";
import { calculateOverallFromRatings, ratingValue } from "./ratings";

export type PositionEligible = Pick<Player | Prospect, "position" | "ratings" | "positionFits" | "traits">;

const minimumNormalFit = 64;
const emergencyFit = 35;

const offensiveLine = new Set<Position>(["LT", "LG", "C", "RG", "RT"]);
const specialists = new Set<Position>(["K", "P"]);

function isPosition(value: string): value is Position {
  return (POSITIONS as readonly string[]).includes(value);
}

function setFit(fits: Partial<Record<Position, number>>, position: Position, value: number): void {
  if (value < minimumNormalFit) return;
  fits[position] = Math.round(clamp(Math.max(fits[position] ?? 0, value), minimumNormalFit, 100));
}

function athleticCrossover(ratings: RatingVector): number {
  return Math.round(
    (ratingValue(ratings, "speed") +
      ratingValue(ratings, "acceleration") +
      ratingValue(ratings, "agility") +
      ratingValue(ratings, "changeOfDirection")) /
      4
  );
}

function receivingCrossover(ratings: RatingVector): number {
  return Math.round(
    (ratingValue(ratings, "passCatching") +
      ratingValue(ratings, "shortRoute") +
      ratingValue(ratings, "mediumRoute") +
      ratingValue(ratings, "separation") +
      ratingValue(ratings, "yardsAfterCatch")) /
      5
  );
}

function blockingCrossover(ratings: RatingVector): number {
  return Math.round(
    (ratingValue(ratings, "runBlock") +
      ratingValue(ratings, "passBlock") +
      ratingValue(ratings, "anchor") +
      ratingValue(ratings, "handTechnique")) /
      4
  );
}

function defensiveFrontCrossover(ratings: RatingVector): number {
  return Math.round(
    (ratingValue(ratings, "blockShedding") +
      ratingValue(ratings, "runDefense") +
      ratingValue(ratings, "powerRush") +
      ratingValue(ratings, "tackling") +
      ratingValue(ratings, "pursuit")) /
      5
  );
}

function coverageCrossover(ratings: RatingVector): number {
  return Math.round(
    (ratingValue(ratings, "manCoverage") +
      ratingValue(ratings, "zoneCoverage") +
      ratingValue(ratings, "playRecognition") +
      ratingValue(ratings, "closingSpeed") +
      ratingValue(ratings, "tackling")) /
      5
  );
}

function traitBoost(entity: Pick<PositionEligible, "traits">): number {
  return entity.traits?.includes("Versatile alignment") ? 3 : 0;
}

export function generatePositionFits(entity: Pick<PositionEligible, "position" | "ratings" | "traits">): Partial<Record<Position, number>> {
  const fits: Partial<Record<Position, number>> = { [entity.position]: 100 };
  const ratings = entity.ratings;
  const boost = traitBoost(entity);
  const position = entity.position;

  if (position === "QB" || specialists.has(position)) return fits;

  if (position === "LG") {
    setFit(fits, "RG", 92 + boost);
    setFit(fits, "C", 88 + boost);
    setFit(fits, "LT", 72 + boost);
    setFit(fits, "RT", 68 + boost);
  } else if (position === "RG") {
    setFit(fits, "LG", 92 + boost);
    setFit(fits, "C", 88 + boost);
    setFit(fits, "RT", 72 + boost);
    setFit(fits, "LT", 68 + boost);
  } else if (position === "C") {
    setFit(fits, "LG", 90 + boost);
    setFit(fits, "RG", 90 + boost);
    setFit(fits, "LT", 65 + boost);
    setFit(fits, "RT", 65 + boost);
  } else if (position === "LT") {
    setFit(fits, "RT", 88 + boost);
    setFit(fits, "LG", 74 + boost);
    setFit(fits, "RG", 68 + boost);
  } else if (position === "RT") {
    setFit(fits, "LT", 88 + boost);
    setFit(fits, "RG", 76 + boost);
    setFit(fits, "LG", 68 + boost);
  }

  if (position === "CB") {
    setFit(fits, "S", 72 + boost + Math.round((coverageCrossover(ratings) - 60) * 0.12));
  } else if (position === "S") {
    setFit(fits, "CB", 66 + boost + Math.round((coverageCrossover(ratings) - 60) * 0.11));
  }

  if (position === "EDGE") {
    setFit(fits, "DL", 74 + boost + Math.round((defensiveFrontCrossover(ratings) - 60) * 0.1));
    setFit(fits, "LB", 66 + boost + Math.round((athleticCrossover(ratings) + coverageCrossover(ratings) - 120) * 0.05));
  } else if (position === "DL") {
    setFit(fits, "EDGE", 68 + boost + Math.round((athleticCrossover(ratings) + defensiveFrontCrossover(ratings) - 120) * 0.05));
  } else if (position === "LB") {
    setFit(fits, "EDGE", 66 + boost + Math.round((athleticCrossover(ratings) + defensiveFrontCrossover(ratings) - 120) * 0.05));
    setFit(fits, "S", 62 + boost + Math.round((coverageCrossover(ratings) - 60) * 0.12));
  }

  if (position === "RB") {
    setFit(fits, "WR", 58 + boost + Math.round((athleticCrossover(ratings) + receivingCrossover(ratings) - 120) * 0.1));
  } else if (position === "WR") {
    setFit(fits, "RB", 56 + boost + Math.round((athleticCrossover(ratings) + ratingValue(ratings, "ballSecurity") - 120) * 0.08));
    setFit(fits, "TE", 54 + boost + Math.round((ratingValue(ratings, "strength") + blockingCrossover(ratings) + receivingCrossover(ratings) - 180) * 0.06));
  } else if (position === "TE") {
    setFit(fits, "WR", 60 + boost + Math.round((athleticCrossover(ratings) + receivingCrossover(ratings) - 120) * 0.08));
  }

  for (const candidate of POSITIONS) {
    if (candidate !== position && (fits[candidate] ?? 0) < minimumNormalFit) delete fits[candidate];
  }
  fits[position] = 100;
  return fits;
}

export function normalizePositionFits(entity: Pick<PositionEligible, "position" | "ratings" | "traits"> & { positionFits?: Partial<Record<Position, number>> }): Partial<Record<Position, number>> {
  const generated = generatePositionFits(entity);
  const normalized: Partial<Record<Position, number>> = { ...generated };
  for (const [position, value] of Object.entries(entity.positionFits ?? {})) {
    if (!isPosition(position) || typeof value !== "number") continue;
    if (position === entity.position) {
      normalized[position] = 100;
    } else {
      normalized[position] = Math.round(clamp(value, 20, 100));
    }
  }
  normalized[entity.position] = 100;
  return normalized;
}

export function positionFitFor(entity: Pick<PositionEligible, "position" | "ratings" | "traits"> & { positionFits?: Partial<Record<Position, number>> }, position: Position): number {
  if (position === entity.position) return 100;
  const fit = entity.positionFits?.[position];
  if (typeof fit === "number") return Math.round(clamp(fit, 0, 100));
  return generatePositionFits(entity)[position] ?? emergencyFit;
}

export function isPrimaryPosition(entity: Pick<PositionEligible, "position">, position: Position): boolean {
  return entity.position === position;
}

export function skillOverallAtPosition(
  entity: Pick<PositionEligible, "ratings">,
  position: Position
): number {
  return calculateOverallFromRatings(position, entity.ratings);
}

export function eligiblePositionsFor(entity: Pick<PositionEligible, "position" | "ratings" | "traits"> & { positionFits?: Partial<Record<Position, number>> }): Position[] {
  const fits = normalizePositionFits(entity);
  return POSITIONS.filter((position) => (fits[position] ?? 0) >= minimumNormalFit).sort((a, b) => {
    if (a === entity.position) return -1;
    if (b === entity.position) return 1;
    return effectiveOverallAtPosition(entity, b) - effectiveOverallAtPosition(entity, a) || a.localeCompare(b);
  });
}

export function familiarityPenaltyForFit(fit: number): number {
  if (fit >= 100) return 0;
  if (fit >= 90) return Math.round((100 - fit) * 0.3);
  if (fit >= 80) return Math.round(3 + (90 - fit) * 0.4);
  if (fit >= 70) return Math.round(7 + (80 - fit) * 0.4);
  if (fit >= 60) return Math.round(11 + (70 - fit) * 0.55);
  if (fit >= 50) return Math.round(18 + (60 - fit) * 0.8);
  if (fit >= 40) return Math.round(28 + (50 - fit) * 1.1);
  return Math.round(clamp(42 + (40 - fit) * 0.8, 42, 58));
}

export function effectiveOverallAtPosition(
  entity: Pick<PositionEligible, "position" | "ratings" | "traits"> & { positionFits?: Partial<Record<Position, number>> },
  position: Position,
  options: { emergency?: boolean } = {}
): number {
  const targetOverall = skillOverallAtPosition(entity, position);
  const fit = positionFitFor(entity, position);
  const penalty = familiarityPenaltyForFit(options.emergency && fit < emergencyFit ? emergencyFit : fit);
  const floor = fit >= minimumNormalFit || options.emergency ? 20 : 10;
  return Math.round(clamp(targetOverall - penalty, floor, 99));
}

export function availabilityPenalty(entity: { status?: Player["status"]; injury?: Player["injury"] }): number {
  return medicalAvailabilityPenalty(entity);
}

export function effectivePlayerOverallAtPosition(
  player: Pick<PositionEligible, "position" | "ratings" | "traits"> & { positionFits?: Partial<Record<Position, number>>; status?: Player["status"]; injury?: Player["injury"] },
  position: Position,
  options: { emergency?: boolean } = {}
): number {
  return Math.round(clamp(effectiveOverallAtPosition(player, position, options) - availabilityPenalty(player), 0, 99));
}

export function versatilityBonus(entity: Pick<PositionEligible, "position" | "ratings" | "traits"> & { positionFits?: Partial<Record<Position, number>> }): number {
  if (entity.position === "QB" || specialists.has(entity.position)) return 0;
  const fits = normalizePositionFits(entity);
  const alternates = POSITIONS.filter((position) => position !== entity.position && (fits[position] ?? 0) >= minimumNormalFit);
  if (!alternates.length) return 0;
  const bestAlt = Math.max(...alternates.map((position) => effectiveOverallAtPosition(entity, position)));
  const primary = effectiveOverallAtPosition(entity, entity.position);
  const usefulAlternates = alternates.filter((position) => effectiveOverallAtPosition(entity, position) >= primary - 12).length;
  const familyBonus = offensiveLine.has(entity.position) ? 1 : 0;
  return Math.round(clamp((bestAlt - primary + 12) * 0.12 + usefulAlternates * 0.85 + familyBonus, 0, 5));
}
