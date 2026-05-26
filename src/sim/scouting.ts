import { clamp, createRng } from "../lib/rng";
import type {
  CollegeProgram,
  CollegeReport,
  GameSave,
  Position,
  PositionGroup,
  Prospect,
  ProspectBoardLens,
  ProspectConcernRanges,
  ScoutingAssignment,
  ScoutingAssignmentType,
  ScoutingPlan,
  ScoutingRecapEntry,
  ScoutingRegion,
  ScoutingSide,
  ScoutingWeeklyRecap,
  StaffMember
} from "../types";
import { concernRangesForProspect, consensusConcernAdjustment, floorConcernPenalty as makeupFloorConcernPenalty, teamConcernAdjustment } from "./concerns";
import { ratingRangesFor, tightenRatingRanges } from "./ratings";
import { versatilityBonus } from "./positionEligibility";
import { normalizeScoutingRegion, scoutingRegionList } from "./regions";
import { rosterNeeds, scoutingQuality, staffForTeam } from "./selectors";
import { scoutSpecialtyTags, staffOverall } from "./staffModel";

export const scoutingRegions: ScoutingRegion[] = scoutingRegionList;
export const scoutingSides: ScoutingSide[] = ["Offense", "Defense", "Special Teams"];
export const assignmentTypes: ScoutingAssignmentType[] = ["prospect", "position", "side", "region", "conference"];
export const positionGroups: PositionGroup[] = ["QB", "Skill", "OL", "Front Seven", "Secondary", "Specialists"];

export type ScoutingRatingChip = {
  label: string;
  value: number;
};

export type ScoutingPreviewTarget = {
  id: string;
  name: string;
  position: Position;
  schoolName: string;
  conference: string;
  progress: number;
  teamRank: number;
  consensusRank: number;
  valuePickScore: number;
  gainRange: [number, number];
};

export type ScoutingAssignmentPreview = {
  count: number;
  minGain: number;
  maxGain: number;
  fit: number;
  ratingChips: ScoutingRatingChip[];
  targets: ScoutingPreviewTarget[];
  warnings: string[];
  recommendation: string;
};

const offensePositions = new Set<Position>(["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
const defensePositions = new Set<Position>(["EDGE", "DL", "LB", "CB", "S"]);
const specialPositions = new Set<Position>(["K", "P"]);
const allPositions = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "EDGE", "DL", "LB", "CB", "S", "K", "P"] as Position[];

export function positionGroupFor(position: Position): PositionGroup {
  if (position === "QB") return "QB";
  if (["RB", "WR", "TE"].includes(position)) return "Skill";
  if (["LT", "LG", "C", "RG", "RT"].includes(position)) return "OL";
  if (["EDGE", "DL", "LB"].includes(position)) return "Front Seven";
  if (["CB", "S"].includes(position)) return "Secondary";
  return "Specialists";
}

export function sideForPosition(position: Position): ScoutingSide {
  if (defensePositions.has(position)) return "Defense";
  if (specialPositions.has(position)) return "Special Teams";
  return "Offense";
}

export function positionDraftValue(position: Position): number {
  if (position === "QB") return 10;
  if (["LT", "EDGE", "CB", "WR"].includes(position)) return 5;
  if (["RT", "DL"].includes(position)) return 2;
  if (["LG", "C", "RG", "LB", "S"].includes(position)) return 0;
  if (position === "TE" || position === "RB") return -1.5;
  if (position === "K" || position === "P") return -24;
  return 0;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 50;
}

function schoolSizeFor(school: Pick<CollegeProgram, "subdivision"> | undefined): "Large School" | "Small School" {
  return school?.subdivision === "FBS" ? "Large School" : "Small School";
}

function schoolContextPenalty(school: CollegeProgram | undefined): number {
  if (!school) return 1.5;
  const sizePenalty = school.subdivision === "FCS" ? 3 : 0;
  const competitionPenalty = clamp((58 - school.competition) / 10, 0, 4);
  return sizePenalty + competitionPenalty;
}

export function ensureProspectConcerns(prospect: Prospect): Pick<Prospect, "concernVisibility" | "concernDetails"> {
  return {
    concernVisibility: {
      medical: true,
      character: true,
      workEthic: true
    },
    concernDetails: prospect.concernDetails ?? {
      medical: prospect.medical < 45 ? "Medical range carries meaningful risk." : "Medical range looks stable.",
      character: prospect.character < 45 ? "Character range carries meaningful risk." : "Character range looks stable.",
      workEthic: prospect.workEthic < 45 ? "Work ethic range carries meaningful risk." : "Work ethic range looks stable."
    }
  };
}

export function applyScoutingProjection(prospect: Prospect, progress: number, seed: string, school?: CollegeProgram, scoutFit = 64): Prospect {
  const nextProgress = Math.round(clamp(progress, 5, 100));
  const rng = createRng(`${seed}:scout-projection:${prospect.id}:${nextProgress}:${Math.round(scoutFit)}`);
  const context = schoolContextPenalty(school);
  const scoutPenalty = clamp((65 - scoutFit) * 0.04, -1.5, 3);
  const overallWidth = Math.round(clamp(18 - nextProgress * 0.15 + context + scoutPenalty + rng.int(-1, 2), 2, 26));
  const potentialWidth = Math.round(clamp(28 - nextProgress * 0.17 + context * 1.4 + scoutPenalty + rng.int(-1, 4), 5, 34));
  const low = Math.round(clamp(prospect.trueOverall - Math.ceil(overallWidth * rng.float(0.42, 0.62)), 20, prospect.trueOverall));
  const high = Math.round(clamp(prospect.trueOverall + Math.ceil(overallWidth * rng.float(0.38, 0.58)), prospect.trueOverall, 99));
  const potentialLow = Math.round(clamp(prospect.potential - Math.ceil(potentialWidth * rng.float(0.35, 0.55)), prospect.trueOverall, prospect.potential));
  const potentialHigh = Math.round(clamp(prospect.potential + Math.ceil(potentialWidth * rng.float(0.45, 0.68)), prospect.potential, 99));
  const concerns = concernRangesForProspect(prospect, nextProgress, seed, school, scoutFit);
  return {
    ...prospect,
    concernVisibility: { medical: true, character: true, workEthic: true },
    scouted: {
      ...prospect.scouted,
      low,
      high,
      potentialLow,
      potentialHigh,
      concerns,
      progress: nextProgress,
      confidence: nextProgress,
      watchedTape: prospect.scouted.watchedTape || nextProgress >= 45,
      ratingRanges: nextProgress >= 100
        ? ratingRangesFor(prospect.ratings, 88, rng.fork("full-ranges"))
        : tightenRatingRanges(prospect.scouted.ratingRanges, prospect.ratings, nextProgress)
    }
  };
}

function consensusGradeFor(prospect: Prospect, school: CollegeProgram | undefined, seed: string): number {
  const rng = createRng(`${seed}:consensus:${prospect.id}`);
  const progress = prospect.consensusProgress ?? 45;
  const noise = rng.normal(0, clamp((92 - progress) / 7, 1.8, 10.5));
  const tierBonus = clamp((school?.prestige ?? 50) / 18 + (school?.competition ?? 50) / 26, 2, 8);
  const score =
    (prospect.trueOverall + noise) * 0.54 +
    (prospect.potential + noise * 0.65) * 0.28 +
    prospect.production * 0.08 +
    prospect.stock * 0.08 +
    positionDraftValue(prospect.position) +
    versatilityBonus(prospect) * 0.25 +
    tierBonus +
    consensusConcernAdjustment(prospect, school, seed);
  return Number(score.toFixed(2));
}

function teamGradeFor(prospect: Prospect): number {
  const ovrMid = (prospect.scouted.low + prospect.scouted.high) / 2;
  const potMid = (prospect.scouted.potentialLow + prospect.scouted.potentialHigh) / 2;
  const uncertaintyPenalty =
    (prospect.scouted.high - prospect.scouted.low) * 0.06 +
    (prospect.scouted.potentialHigh - prospect.scouted.potentialLow) * 0.035;
  const score =
    ovrMid * 0.55 +
    potMid * 0.31 +
    prospect.production * 0.07 +
    prospect.stock * 0.07 +
    positionDraftValue(prospect.position) +
    versatilityBonus(prospect) * 0.3 +
    teamConcernAdjustment(prospect.scouted.concerns) -
    uncertaintyPenalty;
  return Number(score.toFixed(2));
}

function valueLabel(score: number): string {
  if (score >= 80) return "Major steal";
  if (score >= 40) return "Value";
  if (score >= 15) return "Slight value";
  if (score <= -50) return "Overdraft risk";
  if (score <= -20) return "Reach";
  return "Fair";
}

export function rankProspectBoard(prospects: Prospect[], schools: CollegeProgram[], seed: string): Prospect[] {
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const withConsensus = prospects.map((prospect) => ({
    ...prospect,
    consensusGrade: consensusGradeFor(prospect, schoolById.get(prospect.schoolId), seed)
  }));
  const consensusRank = new Map(
    [...withConsensus]
      .sort((a, b) => b.consensusGrade - a.consensusGrade || a.id.localeCompare(b.id))
      .map((prospect, index) => [prospect.id, index + 1])
  );
  const withTeamGrade = withConsensus.map((prospect) => ({
    ...prospect,
    consensusRank: consensusRank.get(prospect.id) ?? 999,
    teamGrade: teamGradeFor(prospect)
  }));
  const teamRank = new Map(
    [...withTeamGrade]
      .sort((a, b) => b.teamGrade - a.teamGrade || a.consensusRank - b.consensusRank)
      .map((prospect, index) => [prospect.id, index + 1])
  );
  return withTeamGrade
    .map((prospect) => {
      const rank = teamRank.get(prospect.id) ?? 999;
      const valuePickScore = (prospect.consensusRank ?? 999) - rank;
      return {
        ...prospect,
        teamRank: rank,
        valuePickScore,
        valuePickLabel: valueLabel(valuePickScore)
      };
    })
    .sort((a, b) => a.teamRank - b.teamRank);
}

export function prospectBoardLensScore(prospect: Prospect, lens: ProspectBoardLens): number {
  const progress = prospect.scouted.progress ?? prospect.scouted.confidence;
  const uncertainty =
    (prospect.scouted.high - prospect.scouted.low) * 0.08 +
    (prospect.scouted.potentialHigh - prospect.scouted.potentialLow) * 0.05;
  if (lens === "upside") {
    return (
      prospect.scouted.potentialHigh * 0.52 +
      prospect.scouted.high * 0.22 +
      Math.max(0, prospect.scouted.potentialHigh - prospect.scouted.low) * 0.12 +
      prospect.production * 0.05 +
      positionDraftValue(prospect.position) -
      makeupFloorConcernPenalty(prospect.scouted.concerns) * 0.35
    );
  }
  if (lens === "floor") {
    return (
      prospect.scouted.low * 0.5 +
      prospect.scouted.potentialLow * 0.18 +
      prospect.production * 0.12 +
      progress * 0.03 +
      positionDraftValue(prospect.position) -
      makeupFloorConcernPenalty(prospect.scouted.concerns) -
      uncertainty
    );
  }
  if (lens === "value") return prospect.valuePickScore;
  if (lens === "progress") return progress;
  if (lens === "consensus") return -prospect.consensusRank;
  return -prospect.teamRank;
}

export function compareProspectsForLens(a: Prospect, b: Prospect, lens: ProspectBoardLens): number {
  if (lens === "position") return a.position.localeCompare(b.position) || a.teamRank - b.teamRank;
  const diff = prospectBoardLensScore(b, lens) - prospectBoardLensScore(a, lens);
  return diff || a.teamRank - b.teamRank || a.consensusRank - b.consensusRank;
}

function normalizeLegacyAssignment(save: GameSave, assignment: Partial<ScoutingAssignment> & {
  region?: unknown;
  conference?: string;
  schoolSize?: string;
  positionGroup?: PositionGroup;
}, index: number): ScoutingAssignment {
  if (assignment.type && assignment.focusId) {
    return {
      id: assignment.id ?? `assignment-${assignment.scoutId ?? index}`,
      scoutId: assignment.scoutId ?? staffForTeam(save, save.selectedTeamId)[index]?.id ?? `scout-${index + 1}`,
      type: assignment.type,
      focusId: assignment.focusId,
      locked: Boolean(assignment.locked),
      prospectIds: assignment.prospectIds ?? []
    };
  }
  const region = normalizeScoutingRegion(assignment.region);
  if (assignment.conference) {
    return { id: assignment.id ?? `assignment-${index}`, scoutId: assignment.scoutId ?? "", type: "conference", focusId: assignment.conference, locked: Boolean(assignment.locked), prospectIds: assignment.prospectIds ?? [] };
  }
  if (assignment.positionGroup) {
    const side = assignment.positionGroup === "Front Seven" || assignment.positionGroup === "Secondary" ? "Defense" : assignment.positionGroup === "Specialists" ? "Special Teams" : "Offense";
    return { id: assignment.id ?? `assignment-${index}`, scoutId: assignment.scoutId ?? "", type: "side", focusId: side, locked: Boolean(assignment.locked), prospectIds: assignment.prospectIds ?? [] };
  }
  return { id: assignment.id ?? `assignment-${index}`, scoutId: assignment.scoutId ?? "", type: "region", focusId: String(assignment.region) === "Small School" ? "National" : region, locked: Boolean(assignment.locked), prospectIds: assignment.prospectIds ?? [] };
}

function defaultFocus(save: GameSave, type: ScoutingAssignmentType, index: number): string {
  const conferences = [...new Set(save.schools.map((school) => school.conference))].sort((a, b) => a.localeCompare(b));
  const topProspect = save.prospects[index % Math.max(1, save.prospects.length)];
  if (type === "prospect") return topProspect?.id ?? "";
  if (type === "position") return ["QB", "WR", "EDGE", "CB", "LT", "DL", "RB"][index % 7];
  if (type === "side") return scoutingSides[index % scoutingSides.length];
  if (type === "conference") return conferences[index % Math.max(1, conferences.length)] ?? "";
  return scoutingRegions[index % scoutingRegions.length];
}

function defaultAssignments(save: GameSave): ScoutingAssignment[] {
  const scouts = staffForTeam(save, save.selectedTeamId).filter((member) => member.department === "Scouting");
  const defaults: Array<{ type: ScoutingAssignmentType; focusId: string }> = [
    { type: "prospect", focusId: save.prospects[0]?.id ?? "" },
    { type: "position", focusId: "QB" },
    { type: "side", focusId: "Offense" },
    { type: "region", focusId: "South" },
    { type: "conference", focusId: defaultFocus(save, "conference", 4) },
    { type: "side", focusId: "Defense" },
    { type: "position", focusId: "CB" }
  ];
  return scouts.slice(0, 7).map((scout, index) => {
    const fallback = defaults[index] ?? { type: "region" as const, focusId: defaultFocus(save, "region", index) };
    return {
      id: `assignment-${scout.id}`,
      scoutId: scout.id,
      type: fallback.type,
      focusId: fallback.focusId,
      locked: false,
      prospectIds: []
    };
  });
}

function assignmentKey(assignment: Pick<ScoutingAssignment, "type" | "focusId">): string {
  return `${assignment.type}:${assignment.focusId}`;
}

function firstAvailableFocus(save: GameSave, type: ScoutingAssignmentType, used: Set<string>, index: number): string | undefined {
  const candidates = focusValuesForType(save, type, index);
  return candidates.find((focusId) => !used.has(`${type}:${focusId}`));
}

function focusValuesForType(save: GameSave, type: ScoutingAssignmentType, index = 0): string[] {
  if (type === "prospect") return save.prospects.slice().sort((a, b) => a.teamRank - b.teamRank).slice(0, 160).map((prospect) => prospect.id);
  if (type === "position") return allPositions;
  if (type === "side") return scoutingSides;
  if (type === "conference") return [...new Set(save.schools.map((school) => school.conference))].sort((a, b) => a.localeCompare(b));
  const regions = [...scoutingRegions];
  return index % 2 === 0 ? regions : regions.reverse();
}

function uniqueAssignments(save: GameSave, assignments: ScoutingAssignment[]): ScoutingAssignment[] {
  const used = new Set<string>();
  return assignments.map((assignment, index) => {
    const key = assignmentKey(assignment);
    if (!used.has(key) && assignment.focusId) {
      used.add(key);
      return assignment;
    }
    const sameTypeFocus = firstAvailableFocus(save, assignment.type, used, index);
    if (sameTypeFocus) {
      used.add(`${assignment.type}:${sameTypeFocus}`);
      return { ...assignment, focusId: sameTypeFocus };
    }
    for (const type of assignmentTypes) {
      const focusId = firstAvailableFocus(save, type, used, index);
      if (focusId) {
        used.add(`${type}:${focusId}`);
        return { ...assignment, type, focusId };
      }
    }
    return assignment;
  });
}

export function ensureScoutingPlan(save: GameSave): ScoutingPlan {
  const plan = save.scoutingPlan;
  const scoutIds = new Set(staffForTeam(save, save.selectedTeamId).filter((member) => member.department === "Scouting").map((member) => member.id));
  const normalizedAssignments = plan?.assignments?.map((assignment, index) => normalizeLegacyAssignment(save, assignment, index)) ?? [];
  const hasCurrentScouts = normalizedAssignments.length === 7 && normalizedAssignments.every((assignment) => scoutIds.has(assignment.scoutId));
  const assignments = uniqueAssignments(save, hasCurrentScouts ? normalizedAssignments : defaultAssignments(save));
  return {
    assignments,
    reports: (plan?.reports ?? []).map((report) => ({
      ...report,
      region: normalizeScoutingRegion(report.region)
    })),
    recaps: (plan?.recaps ?? []).map((recap) => ({
      ...recap,
      risers: recap.risers ?? [],
      fallers: recap.fallers ?? []
    })),
    lastProcessedWeek: plan?.lastProcessedWeek ?? 0
  };
}

function scoutFitForProspect(scout: StaffMember | undefined, prospect: Prospect, school: CollegeProgram | undefined): number {
  const profile = scout?.skillProfile.scout;
  if (!profile) return 55;
  const side = sideForPosition(prospect.position);
  const sideRating = side === "Defense" ? profile.defense : side === "Special Teams" ? profile.specialTeams : profile.offense;
  const sizeRating = schoolSizeFor(school) === "Large School" ? profile.largeSchool : profile.smallSchool;
  return Math.round(
    profile.positions[prospect.position] * 0.34 +
      sideRating * 0.18 +
      profile.regions[prospect.region] * 0.18 +
      (school ? profile.conferences[school.conference] ?? 55 : 55) * 0.18 +
      sizeRating * 0.12
  );
}

function focusFitForAssignment(save: GameSave, assignment: ScoutingAssignment, scout: StaffMember | undefined): number {
  const profile = scout?.skillProfile.scout;
  if (!profile) return 55;
  if (assignment.type === "position") return profile.positions[assignment.focusId as Position] ?? 55;
  if (assignment.type === "side") {
    return assignment.focusId === "Defense" ? profile.defense : assignment.focusId === "Special Teams" ? profile.specialTeams : profile.offense;
  }
  if (assignment.type === "region") return profile.regions[assignment.focusId as ScoutingRegion] ?? 55;
  if (assignment.type === "conference") return profile.conferences[assignment.focusId] ?? 55;
  const prospect = save.prospects.find((item) => item.id === assignment.focusId);
  const school = prospect ? save.schools.find((item) => item.id === prospect.schoolId) : undefined;
  return prospect ? scoutFitForProspect(scout, prospect, school) : 55;
}

function matchesAssignment(assignment: ScoutingAssignment, prospect: Prospect, school: CollegeProgram | undefined): boolean {
  if (assignment.type === "prospect") return prospect.id === assignment.focusId;
  if (assignment.type === "position") return prospect.position === assignment.focusId;
  if (assignment.type === "side") return sideForPosition(prospect.position) === assignment.focusId;
  if (assignment.type === "region") return assignment.focusId === "National" || prospect.region === assignment.focusId;
  return school?.conference === assignment.focusId;
}

function assignmentBaseRange(type: ScoutingAssignmentType): [number, number] {
  if (type === "prospect") return [25, 55];
  if (type === "position") return [8, 18];
  if (type === "side") return [4, 10];
  if (type === "region") return [4, 11];
  return [5, 13];
}

function assignmentTargetCount(type: ScoutingAssignmentType, fit: number): number {
  if (type === "prospect") return 1;
  if (type === "position") return Math.round(clamp(5 + fit / 11, 7, 16));
  if (type === "side") return Math.round(clamp(14 + fit / 6.8, 18, 34));
  if (type === "region") return Math.round(clamp(15 + fit / 6.5, 20, 38));
  return Math.round(clamp(12 + fit / 7, 15, 30));
}

function assignmentProgressRange(type: ScoutingAssignmentType, fit: number): [number, number] {
  const [baseLow, baseHigh] = assignmentBaseRange(type);
  const fitBoost = (fit - 60) / 12;
  return [
    Math.round(clamp(baseLow + fitBoost, 2, 60)),
    Math.round(clamp(baseHigh + fitBoost * 1.5, 3, 62))
  ];
}

function progressFor(prospect: Prospect): number {
  return prospect.scouted.progress ?? prospect.scouted.confidence;
}

function isFullyScouted(prospect: Prospect): boolean {
  return progressFor(prospect) >= 100;
}

function saturationMultiplier(prospect: Prospect): number {
  const progress = progressFor(prospect);
  if (progress >= 100) return 0;
  if (progress >= 95) return 0.04;
  if (progress >= 90) return 0.12;
  if (progress >= 85) return 0.25;
  if (progress >= 75) return 0.55;
  return clamp(1.28 - progress / 220, 0.78, 1.24);
}

function sideRatingForScout(scout: StaffMember | undefined, side: ScoutingSide): number {
  const profile = scout?.skillProfile.scout;
  if (!profile) return 55;
  if (side === "Defense") return profile.defense;
  if (side === "Special Teams") return profile.specialTeams;
  return profile.offense;
}

function ratingChipsForAssignment(save: GameSave, assignment: ScoutingAssignment, scout: StaffMember | undefined): ScoutingRatingChip[] {
  const profile = scout?.skillProfile.scout;
  if (!profile) return [{ label: "Fit", value: 55 }];
  if (assignment.type === "prospect") {
    const prospect = save.prospects.find((item) => item.id === assignment.focusId);
    const school = prospect ? save.schools.find((item) => item.id === prospect.schoolId) : undefined;
    if (!prospect) return [{ label: "Fit", value: 55 }];
    const side = sideForPosition(prospect.position);
    const size = schoolSizeFor(school);
    return [
      { label: prospect.position, value: profile.positions[prospect.position] ?? 55 },
      { label: side, value: sideRatingForScout(scout, side) },
      { label: prospect.region, value: profile.regions[prospect.region] ?? 55 },
      { label: school?.conference ?? "Conference", value: school ? profile.conferences[school.conference] ?? 55 : 55 },
      { label: size, value: size === "Large School" ? profile.largeSchool : profile.smallSchool }
    ];
  }
  if (assignment.type === "position") {
    const position = assignment.focusId as Position;
    const side = sideForPosition(position);
    return [
      { label: position, value: profile.positions[position] ?? 55 },
      { label: side, value: sideRatingForScout(scout, side) }
    ];
  }
  if (assignment.type === "side") {
    const side = assignment.focusId as ScoutingSide;
    return [
      { label: side, value: sideRatingForScout(scout, side) },
      { label: "Large", value: profile.largeSchool },
      { label: "Small", value: profile.smallSchool }
    ];
  }
  if (assignment.type === "region") {
    const region = assignment.focusId as ScoutingRegion;
    return [
      { label: region, value: profile.regions[region] ?? 55 },
      { label: "Large", value: profile.largeSchool },
      { label: "Small", value: profile.smallSchool }
    ];
  }
  return [
    { label: assignment.focusId, value: profile.conferences[assignment.focusId] ?? 55 },
    { label: "Large", value: profile.largeSchool },
    { label: "Small", value: profile.smallSchool }
  ];
}

function targetScoreForAssignment(
  assignment: ScoutingAssignment,
  prospect: Prospect,
  scout: StaffMember | undefined,
  school: CollegeProgram | undefined
): number {
  if (isFullyScouted(prospect)) return -9999;
  const profile = scout?.skillProfile.scout;
  const fit = assignment.type === "prospect"
    ? scoutFitForProspect(scout, prospect, school)
    : assignment.type === "position"
      ? profile?.positions[assignment.focusId as Position] ?? 55
      : assignment.type === "side"
        ? sideRatingForScout(scout, assignment.focusId as ScoutingSide)
        : assignment.type === "region"
          ? profile?.regions[assignment.focusId as ScoutingRegion] ?? 55
          : profile?.conferences[assignment.focusId] ?? 55;
  const progress = progressFor(prospect);
  const uncertainty = (prospect.scouted.high - prospect.scouted.low) * 0.85 + (prospect.scouted.potentialHigh - prospect.scouted.potentialLow) * 1.1;
  const upside = clamp(prospect.scouted.potentialHigh - 58, 0, 28) + clamp(prospect.scouted.potentialHigh - prospect.scouted.low, 0, 34) * 0.4;
  const valueGap = clamp(prospect.valuePickScore, -35, 90) * 0.2;
  const blindSpot = clamp(((prospect.consensusRank ?? 520) - (prospect.teamRank ?? 520)) / 8, 0, 28);
  const contextBonus = school?.subdivision === "FCS" ? 4 : clamp((78 - (school?.competition ?? 68)) / 8, 0, 3);
  return (
    ((100 - progress) * 0.48 +
      uncertainty +
      upside +
      blindSpot +
      valueGap +
      fit * 0.26 +
      positionDraftValue(prospect.position) * 1.15 +
      contextBonus +
      (prospect.favorite ? 8 : 0)) *
    saturationMultiplier(prospect)
  );
}

function likelyTargetsForAssignment(save: GameSave, assignment: ScoutingAssignment, scout: StaffMember | undefined, count: number, gainRange: [number, number]): ScoutingPreviewTarget[] {
  const schoolById = new Map(save.schools.map((school) => [school.id, school]));
  const matches = save.prospects
    .filter((prospect) => !prospect.hidden && matchesAssignment(assignment, prospect, schoolById.get(prospect.schoolId)));
  const meaningful = matches.filter((prospect) => !isFullyScouted(prospect));
  return (meaningful.length ? meaningful : matches)
    .sort((a, b) => {
      if (assignment.type === "prospect") return a.id === assignment.focusId ? -1 : b.id === assignment.focusId ? 1 : a.teamRank - b.teamRank;
      const diff = targetScoreForAssignment(assignment, b, scout, schoolById.get(b.schoolId)) - targetScoreForAssignment(assignment, a, scout, schoolById.get(a.schoolId));
      return diff || a.teamRank - b.teamRank || a.id.localeCompare(b.id);
    })
    .slice(0, Math.min(count, 5))
    .map((prospect) => {
      const school = schoolById.get(prospect.schoolId);
      return {
        id: prospect.id,
        name: `${prospect.firstName[0]}. ${prospect.lastName}`,
        position: prospect.position,
        schoolName: school?.name ?? "Unknown",
        conference: school?.conference ?? "",
        progress: progressFor(prospect),
        teamRank: prospect.teamRank,
        consensusRank: prospect.consensusRank,
        valuePickScore: prospect.valuePickScore,
        gainRange
      };
    });
}

function previewRecommendation(assignment: ScoutingAssignment, fit: number, count: number, targets: ScoutingPreviewTarget[]): string {
  if (count === 0) return "No active prospects match this focus.";
  const top = targets[0];
  const targetText = top ? `${top.position} ${top.name}` : `${count} prospects`;
  if (fit >= 78) return `Strong fit. This scout should get clean reads on ${targetText}.`;
  if (fit <= 54) return `Weak fit. Consider a focus that better matches this scout's coverage.`;
  if (assignment.type === "prospect") return `Deep dive focus with a large progress jump for ${targetText}.`;
  return `Balanced coverage across ${count} prospects, led by ${targetText}.`;
}

export function scoutingAssignmentPreview(save: GameSave, assignment: ScoutingAssignment): ScoutingAssignmentPreview {
  const scout = save.staff.find((member) => member.id === assignment.scoutId);
  const fit = focusFitForAssignment(save, assignment, scout);
  const schoolById = new Map(save.schools.map((school) => [school.id, school]));
  const matches = save.prospects.filter((prospect) => !prospect.hidden && matchesAssignment(assignment, prospect, schoolById.get(prospect.schoolId)));
  const meaningfulCount = matches.filter((prospect) => !isFullyScouted(prospect)).length;
  const matchCount = meaningfulCount || matches.length;
  const count = Math.min(matchCount, assignmentTargetCount(assignment.type, fit));
  const [minGain, maxGain] = assignmentProgressRange(assignment.type, fit);
  const targets = likelyTargetsForAssignment(save, assignment, scout, count, [minGain, maxGain]);
  const plan = ensureScoutingPlan(save);
  const duplicate = plan.assignments.some((item) => item.id !== assignment.id && assignmentKey(item) === assignmentKey(assignment));
  const warnings = [
    duplicate ? "Duplicate" : "",
    fit <= 54 ? "Weak fit" : "",
    count === 0 ? "No targets" : "",
    assignment.locked ? "Locked" : ""
  ].filter(Boolean);
  return {
    count,
    minGain,
    maxGain,
    fit,
    ratingChips: ratingChipsForAssignment(save, assignment, scout).slice(0, 5),
    targets,
    warnings,
    recommendation: previewRecommendation(assignment, fit, count, targets)
  };
}

export function scoutingFocusOptions(save: GameSave, assignment: ScoutingAssignment, scout?: StaffMember): Array<{ value: string; label: string; disabled?: boolean }> {
  const profile = scout?.skillProfile.scout;
  const taken = new Set(
    ensureScoutingPlan(save).assignments
      .filter((item) => item.id !== assignment.id)
      .map((item) => assignmentKey(item))
  );
  const withDisabled = (items: Array<{ value: string; label: string }>) =>
    items.map((item) => ({ ...item, disabled: taken.has(`${assignment.type}:${item.value}`) }));
  if (assignment.type === "prospect") {
    return withDisabled(save.prospects
      .slice()
      .sort((a, b) => a.teamRank - b.teamRank)
      .slice(0, 120)
      .map((prospect) => ({
        value: prospect.id,
        label: `#${prospect.teamRank || "?"} ${prospect.firstName[0]}. ${prospect.lastName} ${prospect.position} ${prospect.scouted.progress ?? prospect.scouted.confidence}%`
      })));
  }
  if (assignment.type === "position") {
    return withDisabled(allPositions.map((position) => ({
      value: position,
      label: `${position} ${profile?.positions[position] ?? 55}`
    })));
  }
  if (assignment.type === "side") {
    return withDisabled(scoutingSides.map((side) => ({
      value: side,
      label: `${side} ${side === "Defense" ? profile?.defense ?? 55 : side === "Special Teams" ? profile?.specialTeams ?? 55 : profile?.offense ?? 55}`
    })));
  }
  if (assignment.type === "region") {
    return withDisabled(scoutingRegions.map((region) => ({
      value: region,
      label: `${region} ${profile?.regions[region] ?? 55}`
    })));
  }
  const conferences = [...new Set(save.schools.map((school) => school.conference))].sort((a, b) => a.localeCompare(b));
  return withDisabled(conferences.map((conference) => ({
    value: conference,
    label: `${conference} ${profile?.conferences[conference] ?? 55}`
  })));
}

type AssignmentCandidate = Pick<ScoutingAssignment, "type" | "focusId"> & {
  score: number;
};

function needScoresByPosition(save: GameSave): Record<Position, number> {
  const scores = Object.fromEntries(allPositions.map((position) => [position, 8])) as Record<Position, number>;
  for (const need of rosterNeeds(save, save.selectedTeamId)) {
    scores[need.position] = Math.round(clamp((66 - need.grade) * 1.25, 3, 26));
  }
  return scores;
}

function prospectOptimizationScore(prospect: Prospect, scout: StaffMember | undefined, school: CollegeProgram | undefined, needScores: Record<Position, number>): number {
  if (isFullyScouted(prospect)) return -9999;
  const progress = progressFor(prospect);
  const fit = scoutFitForProspect(scout, prospect, school);
  const uncertainty = (prospect.scouted.high - prospect.scouted.low) * 1.15 + (prospect.scouted.potentialHigh - prospect.scouted.potentialLow) * 1.28;
  const upside = clamp(prospect.scouted.potentialHigh - 58, 0, 30) * 0.78 + clamp(prospect.scouted.potentialHigh - prospect.scouted.low, 0, 38) * 0.34;
  const valueGap = clamp(prospect.valuePickScore, -35, 95) * 0.26;
  const consensusBlindSpot = clamp(((prospect.consensusRank ?? 520) - (prospect.teamRank ?? 520)) / 6.5, 0, 36);
  const lowConsensusAttention = prospect.teamRank <= 180 ? clamp(((prospect.consensusRank ?? 520) - 110) / 18, 0, 16) : 0;
  const schoolContext = school?.subdivision === "FCS" ? 6 : clamp((74 - (school?.competition ?? 68)) / 7, 0, 4);
  const usefulUnknown = (100 - progress) * 0.72 + uncertainty;
  const boardQuality = clamp((520 - (prospect.teamRank || 520)) / 18, 0, 24);
  const raw =
    usefulUnknown +
    upside +
    valueGap +
    consensusBlindSpot +
    lowConsensusAttention +
    schoolContext +
    fit * 0.34 +
    needScores[prospect.position] * 0.58 +
    boardQuality +
    positionDraftValue(prospect.position) * 1.1 +
    (prospect.favorite ? 8 : 0);
  return raw * saturationMultiplier(prospect);
}

function focusFitForCandidate(type: ScoutingAssignmentType, focusId: string, scout: StaffMember | undefined): number {
  const profile = scout?.skillProfile.scout;
  if (!profile) return 55;
  if (type === "position") return profile.positions[focusId as Position] ?? 55;
  if (type === "side") return sideRatingForScout(scout, focusId as ScoutingSide);
  if (type === "region") return profile.regions[focusId as ScoutingRegion] ?? 55;
  if (type === "conference") return profile.conferences[focusId] ?? 55;
  return 55;
}

function broadCandidateScore(
  type: Exclude<ScoutingAssignmentType, "prospect">,
  focusId: string,
  prospects: Prospect[],
  scout: StaffMember | undefined,
  schoolById: Map<string, CollegeProgram>,
  needScores: Record<Position, number>
): number {
  const fit = focusFitForCandidate(type, focusId, scout);
  const targetCount = assignmentTargetCount(type, fit);
  const [minGain, maxGain] = assignmentProgressRange(type, fit);
  const unsaturated = prospects.filter((prospect) => !isFullyScouted(prospect));
  if (!unsaturated.length) return -9999;
  const top = unsaturated
    .slice()
    .sort((a, b) => prospectOptimizationScore(b, scout, schoolById.get(b.schoolId), needScores) - prospectOptimizationScore(a, scout, schoolById.get(a.schoolId), needScores))
    .slice(0, targetCount);
  const topScores = top.map((prospect) => prospectOptimizationScore(prospect, scout, schoolById.get(prospect.schoolId), needScores)).filter((score) => score > 0);
  if (!topScores.length) return -9999;
  const coverage = clamp(Math.sqrt(topScores.length) * 8.5, 7, 46);
  const gainValue = ((minGain + maxGain) / 2) * clamp(topScores.length / Math.max(1, targetCount), 0.45, 1);
  const lowProgressShare = top.filter((prospect) => progressFor(prospect) < 60).length / Math.max(1, top.length);
  return average(topScores) * 0.72 + coverage + gainValue + fit * 0.18 + lowProgressShare * 13;
}

function candidateAssignmentsForScout(save: GameSave, scout: StaffMember | undefined): AssignmentCandidate[] {
  const schoolById = new Map(save.schools.map((school) => [school.id, school]));
  const needScores = needScoresByPosition(save);
  const activeProspects = save.prospects.filter((prospect) => !prospect.hidden && !isFullyScouted(prospect));
  const candidates: AssignmentCandidate[] = [];

  activeProspects
    .slice()
    .sort((a, b) => prospectOptimizationScore(b, scout, schoolById.get(b.schoolId), needScores) - prospectOptimizationScore(a, scout, schoolById.get(a.schoolId), needScores))
    .slice(0, 38)
    .forEach((prospect) => {
      candidates.push({
        type: "prospect",
        focusId: prospect.id,
        score: prospectOptimizationScore(prospect, scout, schoolById.get(prospect.schoolId), needScores) + assignmentProgressRange("prospect", scoutFitForProspect(scout, prospect, schoolById.get(prospect.schoolId)))[1] * 0.34
      });
    });

  for (const position of allPositions) {
    const pool = activeProspects.filter((prospect) => prospect.position === position);
    candidates.push({
      type: "position",
      focusId: position,
      score: broadCandidateScore("position", position, pool, scout, schoolById, needScores) + needScores[position] * 0.35 + positionDraftValue(position) * 0.8
    });
  }

  for (const side of scoutingSides) {
    const pool = activeProspects.filter((prospect) => sideForPosition(prospect.position) === side);
    candidates.push({
      type: "side",
      focusId: side,
      score: broadCandidateScore("side", side, pool, scout, schoolById, needScores)
    });
  }

  for (const region of scoutingRegions) {
    const pool = activeProspects.filter((prospect) => region === "National" || prospect.region === region);
    candidates.push({
      type: "region",
      focusId: region,
      score: broadCandidateScore("region", region, pool, scout, schoolById, needScores) + (region === "National" ? 3 : 0)
    });
  }

  const conferences = [...new Set(save.schools.map((school) => school.conference))].sort((a, b) => a.localeCompare(b));
  for (const conference of conferences) {
    const pool = activeProspects.filter((prospect) => schoolById.get(prospect.schoolId)?.conference === conference);
    if (!pool.length) continue;
    candidates.push({
      type: "conference",
      focusId: conference,
      score: broadCandidateScore("conference", conference, pool, scout, schoolById, needScores)
    });
  }

  return candidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || assignmentKey(a).localeCompare(assignmentKey(b)));
}

function chooseOptimizedCandidate(
  save: GameSave,
  scout: StaffMember | undefined,
  used: Set<string>,
  staleKeys: Set<string>,
  typeCounts: Record<ScoutingAssignmentType, number>,
  typeCaps: Record<ScoutingAssignmentType, number>,
  index: number
): AssignmentCandidate {
  const usedTypeCount = assignmentTypes.filter((type) => typeCounts[type] > 0).length;
  const adjustScore = (candidate: AssignmentCandidate): AssignmentCandidate => {
    const key = assignmentKey(candidate);
    const stalePenalty = staleKeys.has(key) ? (candidate.type === "prospect" ? 30 : 19) : 0;
    const diversityBonus = typeCounts[candidate.type] === 0 ? (usedTypeCount < 3 ? 30 : 14) : 0;
    const crowdingPenalty = typeCounts[candidate.type] * (candidate.type === "prospect" ? 15 : 11);
    return { ...candidate, score: candidate.score + diversityBonus - stalePenalty - crowdingPenalty };
  };
  const candidates = candidateAssignmentsForScout(save, scout)
    .filter((item) => !used.has(assignmentKey(item)))
    .map(adjustScore)
    .sort((a, b) => b.score - a.score || assignmentKey(a).localeCompare(assignmentKey(b)));
  const candidate = candidates.find((item) => typeCounts[item.type] < typeCaps[item.type] && item.score > 0)
    ?? candidates.find((item) => item.score > 95);
  if (candidate) return candidate;
  for (const type of assignmentTypes.filter((assignmentType) => assignmentType !== "prospect")) {
    const focusId = firstAvailableFocus(save, type, used, index);
    if (focusId) return { type, focusId, score: 0 };
  }
  return { type: "region", focusId: "National", score: 0 };
}

export function optimizeWeeklyScoutingPlan(save: GameSave): GameSave {
  const plan = ensureScoutingPlan(save);
  const scoutById = new Map(save.staff.map((member) => [member.id, member]));
  const used = new Set(plan.assignments.filter((assignment) => assignment.locked).map((assignment) => assignmentKey(assignment)));
  const staleKeys = new Set(plan.assignments.filter((assignment) => !assignment.locked).map((assignment) => assignmentKey(assignment)));
  const typeCaps: Record<ScoutingAssignmentType, number> = {
    prospect: 3,
    position: 2,
    side: 2,
    region: 2,
    conference: 2
  };
  const typeCounts = Object.fromEntries(assignmentTypes.map((type) => [type, 0])) as Record<ScoutingAssignmentType, number>;
  for (const assignment of plan.assignments) {
    if (assignment.locked) typeCounts[assignment.type] += 1;
  }
  const assignments = [...plan.assignments];
  const unlocked = plan.assignments
    .map((assignment, index) => ({ assignment, index, scout: scoutById.get(assignment.scoutId) }))
    .filter(({ assignment }) => !assignment.locked)
    .sort((a, b) => (b.scout ? staffOverall(b.scout) : 55) - (a.scout ? staffOverall(a.scout) : 55) || a.index - b.index);

  for (const item of unlocked) {
    const candidate = chooseOptimizedCandidate(save, item.scout, used, staleKeys, typeCounts, typeCaps, item.index);
    used.add(assignmentKey(candidate));
    typeCounts[candidate.type] += 1;
    assignments[item.index] = {
      ...item.assignment,
      type: candidate.type,
      focusId: candidate.focusId
    };
  }

  const topNeedPositions = rosterNeeds(save, save.selectedTeamId).slice(0, 4).map((need) => need.position);
  const touchesTopNeed = assignments.some((assignment) => {
    if (assignment.type === "position") return topNeedPositions.includes(assignment.focusId as Position);
    if (assignment.type !== "prospect") return false;
    const prospect = save.prospects.find((item) => item.id === assignment.focusId);
    return prospect ? topNeedPositions.includes(prospect.position) : false;
  });
  if (!touchesTopNeed) {
    const usedKeys = new Set(assignments.map((assignment) => assignmentKey(assignment)));
    const needPosition = topNeedPositions.find((position) => !usedKeys.has(`position:${position}`));
    const replacement = assignments.findIndex((assignment) => !assignment.locked);
    if (needPosition && replacement >= 0) {
      assignments[replacement] = {
        ...assignments[replacement],
        type: "position",
        focusId: needPosition
      };
    }
  }

  return {
    ...save,
    scoutingPlan: {
      ...plan,
      assignments
    }
  };
}

export function updateScoutingAssignmentLock(save: GameSave, assignmentId: string, locked: boolean): GameSave {
  const plan = ensureScoutingPlan(save);
  return {
    ...save,
    scoutingPlan: {
      ...plan,
      assignments: plan.assignments.map((assignment) => (assignment.id === assignmentId ? { ...assignment, locked } : assignment))
    }
  };
}

export function quickFocusProspect(save: GameSave, prospectId: string): GameSave {
  const plan = ensureScoutingPlan(save);
  const prospect = save.prospects.find((item) => item.id === prospectId);
  if (!prospect) return save;
  if (plan.assignments.some((assignment) => assignment.type === "prospect" && assignment.focusId === prospectId)) return save;
  const school = save.schools.find((item) => item.id === prospect.schoolId);
  const taken = new Set(plan.assignments.map((assignment) => assignmentKey(assignment)));
  const available = plan.assignments
    .filter((assignment) => !assignment.locked)
    .map((assignment) => {
      const scout = save.staff.find((member) => member.id === assignment.scoutId);
      return {
        assignment,
        score: scoutFitForProspect(scout, prospect, school) + (scout ? staffOverall(scout) : 55) * 0.16
      };
    })
    .filter(({ assignment }) => !taken.has(`prospect:${prospectId}`) || assignmentKey(assignment) === `prospect:${prospectId}`)
    .sort((a, b) => b.score - a.score || a.assignment.id.localeCompare(b.assignment.id));
  const best = available[0]?.assignment;
  return best ? updateScoutingAssignment(save, best.id, { type: "prospect", focusId: prospectId }) : save;
}

function reportFor(save: GameSave, assignment: ScoutingAssignment, prospects: Prospect[], scout?: StaffMember): CollegeReport {
  const rng = createRng(`${save.seed}:college-report:${save.currentWeek}:${assignment.id}`);
  const featured = prospects.slice(0, 3);
  const lead = featured[0];
  const region = assignment.type === "region" ? normalizeScoutingRegion(assignment.focusId) : "National";
  const tags = scout ? scoutSpecialtyTags(scout).slice(0, 3).join(", ") : "general coverage";
  const title = lead
    ? `${assignment.type} report: ${lead.lastName} moving`
    : `${assignment.type} scouting report`;
  const body = lead
    ? `${lead.firstName} ${lead.lastName} (${lead.position}) is ${lead.stock >= 0 ? "rising" : "volatile"} after ${lead.productionTrend >= 0 ? "strong" : "uneven"} college production. Scout tags: ${tags}.`
    : `${assignment.type} coverage found no clear priority prospects this week. Scout tags: ${tags}.`;
  return {
    id: `college-${save.currentWeek}-${assignment.id}-${rng.int(100, 999)}`,
    week: save.currentWeek,
    region,
    title,
    body,
    prospectIds: featured.map((prospect) => prospect.id)
  };
}

function cloneConcernRanges(ranges: ProspectConcernRanges): ProspectConcernRanges {
  return {
    medical: [...ranges.medical],
    character: [...ranges.character],
    workEthic: [...ranges.workEthic]
  };
}

function recapEntry(before: Prospect, after: Prospect): ScoutingRecapEntry {
  return {
    prospectId: after.id,
    firstName: after.firstName,
    lastName: after.lastName,
    position: after.position,
    schoolId: after.schoolId,
    teamRankBefore: before.teamRank,
    teamRankAfter: after.teamRank,
    consensusRank: before.consensusRank,
    progressBefore: before.scouted.progress ?? before.scouted.confidence,
    progressAfter: after.scouted.progress ?? after.scouted.confidence,
    overallBefore: [before.scouted.low, before.scouted.high],
    overallAfter: [after.scouted.low, after.scouted.high],
    potentialBefore: [before.scouted.potentialLow, before.scouted.potentialHigh],
    potentialAfter: [after.scouted.potentialLow, after.scouted.potentialHigh],
    valuePickScoreBefore: before.valuePickScore,
    valuePickScoreAfter: after.valuePickScore,
    valuePickLabelBefore: before.valuePickLabel,
    valuePickLabelAfter: after.valuePickLabel,
    concernsBefore: cloneConcernRanges(before.scouted.concerns),
    concernsAfter: cloneConcernRanges(after.scouted.concerns),
    note: after.scouted.note
  };
}

function recapRankMultiplier(rank: number): number {
  if (rank <= 10) return 8;
  if (rank <= 32) return 6;
  if (rank <= 64) return 4.5;
  if (rank <= 100) return 3.25;
  if (rank <= 150) return 2.25;
  if (rank <= 250) return 1.4;
  return 1;
}

function recapAnchorRank(entry: ScoutingRecapEntry, direction: "riser" | "faller"): number {
  return direction === "riser" ? entry.teamRankAfter : entry.teamRankBefore;
}

function recapMovement(entry: ScoutingRecapEntry): number {
  return Math.abs(entry.teamRankAfter - entry.teamRankBefore);
}

export function scoutingRecapImpact(entry: ScoutingRecapEntry, direction: "riser" | "faller"): number {
  return Math.round(recapMovement(entry) * recapRankMultiplier(recapAnchorRank(entry, direction)));
}

function compareRecapImpact(direction: "riser" | "faller") {
  return (a: ScoutingRecapEntry, b: ScoutingRecapEntry) => {
    const impactDiff = scoutingRecapImpact(b, direction) - scoutingRecapImpact(a, direction);
    if (impactDiff !== 0) return impactDiff;
    const anchorDiff = recapAnchorRank(a, direction) - recapAnchorRank(b, direction);
    if (anchorDiff !== 0) return anchorDiff;
    const movementDiff = recapMovement(b) - recapMovement(a);
    if (movementDiff !== 0) return movementDiff;
    return a.teamRankAfter - b.teamRankAfter;
  };
}

export function buildWeeklyScoutingRecap(week: number, beforeProspects: Prospect[], afterProspects: Prospect[]): ScoutingWeeklyRecap {
  const afterById = new Map(afterProspects.map((prospect) => [prospect.id, prospect]));
  const entries = beforeProspects
    .map((before) => {
      const after = afterById.get(before.id);
      return after ? recapEntry(before, after) : undefined;
    })
    .filter((entry): entry is ScoutingRecapEntry => entry !== undefined && entry.teamRankBefore !== entry.teamRankAfter);
  const risers = entries
    .filter((entry) => entry.teamRankAfter < entry.teamRankBefore)
    .sort(compareRecapImpact("riser"));
  const fallers = entries
    .filter((entry) => entry.teamRankAfter > entry.teamRankBefore)
    .sort(compareRecapImpact("faller"));
  return {
    id: `scouting-recap-${week}`,
    week,
    risers,
    fallers
  };
}

export function applyWeeklyScoutingPlan(save: GameSave): GameSave {
  const plan = ensureScoutingPlan(save);
  const quality = scoutingQuality(save, save.selectedTeamId);
  const rng = createRng(`${save.seed}:weekly-scouting:${save.currentWeek}`);
  const reports: CollegeReport[] = [];
  const schoolById = new Map(save.schools.map((school) => [school.id, school]));
  const scoutById = new Map(save.staff.map((member) => [member.id, member]));
  const updates = new Map<string, { progress: number; fit: number; assignment: ScoutingAssignment }>();

  for (const assignment of plan.assignments) {
    const scout = scoutById.get(assignment.scoutId);
    const fit = focusFitForAssignment(save, assignment, scout);
    const targetCount = assignmentTargetCount(assignment.type, fit);
    const [minGain, maxGain] = assignmentProgressRange(assignment.type, fit);
    const matches = save.prospects
      .filter((prospect) => !prospect.hidden && matchesAssignment(assignment, prospect, schoolById.get(prospect.schoolId)))
      .sort((a, b) => {
        if (assignment.type === "prospect") return a.id === assignment.focusId ? -1 : b.id === assignment.focusId ? 1 : 0;
        const aProgress = a.scouted.progress ?? a.scouted.confidence;
        const bProgress = b.scouted.progress ?? b.scouted.confidence;
        const aSchool = schoolById.get(a.schoolId);
        const bSchool = schoolById.get(b.schoolId);
        const aScore =
          (100 - aProgress) * 0.42 +
          clamp((520 - a.teamRank) / 12, 0, 35) +
          scoutFitForProspect(scout, a, aSchool) * 0.18 +
          rng.float(-6, 6);
        const bScore =
          (100 - bProgress) * 0.42 +
          clamp((520 - b.teamRank) / 12, 0, 35) +
          scoutFitForProspect(scout, b, bSchool) * 0.18 +
          rng.float(-6, 6);
        return bScore - aScore;
      });
    const selected = matches.slice(0, targetCount);
    for (const prospect of selected) {
      const prospectFit = assignment.type === "prospect" ? scoutFitForProspect(scout, prospect, schoolById.get(prospect.schoolId)) : fit;
      const gain = Math.round(clamp(rng.int(minGain, Math.max(minGain, maxGain)) + (prospectFit - 60) / 24 + quality / 90, 1, 65));
      const current = updates.get(prospect.id);
      const progress = Math.max(current?.progress ?? prospect.scouted.progress ?? prospect.scouted.confidence, clamp((prospect.scouted.progress ?? prospect.scouted.confidence) + gain, 5, 100));
      updates.set(prospect.id, { progress, fit: Math.max(current?.fit ?? 0, prospectFit), assignment });
    }
    reports.push(reportFor(save, assignment, selected, scout));
  }

  const beforeTouchedProspects = [...updates.keys()]
    .map((id) => save.prospects.find((prospect) => prospect.id === id))
    .filter((prospect): prospect is Prospect => Boolean(prospect));
  const prospects = save.prospects.map((prospect) => {
    const hit = updates.get(prospect.id);
    if (!hit) return prospect;
    const school = schoolById.get(prospect.schoolId);
    const improved = applyScoutingProjection(prospect, hit.progress, save.seed, school, hit.fit);
    return {
      ...improved,
      scoutReports: [`${hit.assignment.type} assignment: progress rose to ${improved.scouted.progress}%.`, ...(prospect.scoutReports ?? [])].slice(0, 6)
    };
  });
  const rankedProspects = rankProspectBoard(prospects, save.schools, save.seed);
  const recap = buildWeeklyScoutingRecap(save.currentWeek, beforeTouchedProspects, rankedProspects);

  return {
    ...save,
    prospects: rankedProspects,
    scoutingPlan: {
      ...plan,
      reports: [...reports, ...(plan.reports ?? [])].slice(0, 42),
      recaps: [recap, ...(plan.recaps ?? []).filter((item) => item.week !== save.currentWeek)].slice(0, 24),
      lastProcessedWeek: save.currentWeek
    }
  };
}

export function updateScoutingAssignment(
  save: GameSave,
  assignmentId: string,
  updates: Partial<Pick<ScoutingAssignment, "type" | "focusId">>
): GameSave {
  const plan = ensureScoutingPlan(save);
  const current = plan.assignments.find((assignment) => assignment.id === assignmentId);
  if (!current) return save;
  const requestedType = updates.type ?? current.type;
  const requestedFocus = updates.type && !updates.focusId ? "" : updates.focusId ?? current.focusId;
  const taken = new Set(
    plan.assignments
      .filter((assignment) => assignment.id !== assignmentId)
      .map((assignment) => assignmentKey(assignment))
  );
  const availableFocus = firstAvailableFocus(save, requestedType, taken, plan.assignments.findIndex((assignment) => assignment.id === assignmentId));
  const focusId = requestedFocus && !taken.has(`${requestedType}:${requestedFocus}`)
    ? requestedFocus
    : availableFocus;
  if (!focusId) return save;
  return {
    ...save,
    scoutingPlan: {
      ...plan,
      assignments: plan.assignments.map((assignment) => {
        if (assignment.id !== assignmentId) return assignment;
        return {
          ...assignment,
          type: requestedType,
          focusId
        };
      })
    }
  };
}

export function updateProspectBoard(
  save: GameSave,
  prospectId: string,
  updates: Partial<Pick<Prospect, "favorite" | "hidden">>
): GameSave {
  const prospects = save.prospects.map((prospect) => (prospect.id === prospectId ? { ...prospect, ...updates } : prospect));
  return {
    ...save,
    prospects
  };
}
