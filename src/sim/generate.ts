import { collegePrograms } from "../data/collegePrograms";
import { generatedName } from "../data/names";
import { nflTeams } from "../data/nflTeams";
import { prospectSchoolWeight } from "../data/prospectTierRankings";
import { clamp, createRng, slugify, type Rng } from "../lib/rng";
import {
  POSITIONS,
  type Attributes,
  type CareerScenario,
  type CareerType,
  type CollegeManagementState,
  type CollegeProgram,
  type CollegeAwardResult,
  type CollegeInjuryResult,
  type CollegeRosterPlayer,
  type CollegeRosterState,
  type CollegeSeasonResultsState,
  type DraftPick,
  type DraftState,
  type FranchiseGoals,
  type Game,
  type GameSave,
  type MedicalHistoryEntry,
  type NewCareerOptions,
  type NFLTeam,
  type Player,
  type PlayerSeasonStatsHistoryEntry,
  type PlayerStats,
  type Position,
  type PositionGroup,
  type Prospect,
  type RatingVector,
  type SaveMode,
  type ScoutingAssignment,
  type ScoutingPlan,
  type ScoutingRegion,
  type StaffCandidate,
  type StaffMarketState,
  type StaffMember,
  type TeamRecord,
  type YearZeroDraftProspect,
  type YearZeroNflPlayer,
  type YearZeroNflReserveStatus,
  type YearZeroProductionSeason
} from "../types";
import {
  calculateOverallFromRatings,
  calibratePotential,
  deriveRatingsFromAttributes,
  generateRatings,
  legacyAttributesFromRatings,
  ratingRangesFor,
  ratingValue
} from "./ratings";
import { CONCERN_PROFILE_VERSION, generateConcernProfile } from "./concerns";
import { makeContract, normalizeCapState, NFL_SALARY_CAP_2026, syncPlayerContractFields } from "./cap";
import { generateDevelopmentProfile, playerPotentialFor, prospectPotentialFor } from "./development";
import { FREE_AGENT_TEAM_ID } from "./freeAgents";
import { normalizePlayerModel, normalizeProspectModel } from "./playerModel";
import { practiceSquadPositionPlan, practiceSquadSalary, toPracticeSquadPlayer } from "./practiceSquad";
import { generatePositionFits, versatilityBonus } from "./positionEligibility";
import { geographicRegionForSchool, scoutingRegionList } from "./regions";
import { leagueYearStartDate, refreshCalendar } from "./calendar";
import { divisionRanksFromPlayers, generateLeagueSchedule, generateSchedule } from "./schedule";
import { applyScoutingProjection, ensureProspectConcerns, prospectPositionPremium, rankProspectBoard } from "./scouting";
import { collegeConferences, createStaffMemberForSlot, staffDepartmentFor, staffOverall, staffSlotDefinitions, staffValueScore } from "./staffModel";
import { annualProspectPositionWeights, annualRuntimeDebug } from "./annualRuntime";
import { generateAnnualRecruitClass } from "./annualRecruitClass";
import { generateAnnualRecruitingState } from "./annualRecruiting";
import { generateAnnualRosterImportPlan } from "./annualRosterImport";
import { createInitialCollegeRosterState } from "./collegeRoster";
import { generateCollegeSeasonResults } from "./collegeSeasonResults";
import { generateCollegeMoraleState } from "./collegeMorale";
import { generateCollegeTrainingBanks } from "./collegeTraining";
import { applyDraftEvaluationToProspects, generateDraftEvaluationState } from "./draftEvaluation";
import { buildSchoolProfileState } from "./schoolProfiles";
import { loadPipelineDataBundle } from "./pipelineData";
import { createYearZeroBootstrapState } from "./yearZero/yearZeroBootstrap";
import { emptyPlayerStats, normalizePlayerStats } from "./stats";

export { generateLeagueSchedule, generateSchedule } from "./schedule";

const traits = [
  "High motor",
  "Film junkie",
  "Late bloomer",
  "Team captain",
  "Explosive first step",
  "Reliable hands",
  "Press specialist",
  "Pocket poise",
  "Power finisher",
  "Quick processor",
  "Special teams value",
  "Injury bounce-back",
  "Versatile alignment",
  "Red-zone weapon",
  "Developmental upside"
];

const rosterTemplate: Array<[Position, number]> = [
  ["QB", 3],
  ["RB", 4],
  ["WR", 6],
  ["TE", 3],
  ["LT", 2],
  ["LG", 2],
  ["C", 2],
  ["RG", 1],
  ["RT", 2],
  ["EDGE", 5],
  ["DL", 5],
  ["LB", 6],
  ["CB", 6],
  ["S", 4],
  ["K", 1],
  ["P", 1]
];

const freeAgentTemplate: Array<[Position, number]> = [
  ["QB", 8],
  ["RB", 10],
  ["WR", 18],
  ["TE", 10],
  ["LT", 8],
  ["LG", 8],
  ["C", 8],
  ["RG", 8],
  ["RT", 8],
  ["EDGE", 12],
  ["DL", 14],
  ["LB", 14],
  ["CB", 16],
  ["S", 10],
  ["K", 4],
  ["P", 4]
];

const positionPremium: Record<Position, number> = {
  QB: 1.95,
  RB: 0.82,
  WR: 1.15,
  TE: 0.82,
  LT: 1.15,
  LG: 0.75,
  C: 0.8,
  RG: 0.75,
  RT: 1,
  EDGE: 1.35,
  DL: 1.05,
  LB: 0.9,
  CB: 1.25,
  S: 0.85,
  K: 0.42,
  P: 0.38
};

type DraftCapitalProfile = "extra" | "normal" | "thin";

interface ScenarioProfile {
  rosterBias: number;
  staffBias: number;
  budgetBias: number;
  goalTier: "rebuild" | "balanced" | "win-now";
  draftCapital: DraftCapitalProfile;
}

const neutralScenarioProfile: ScenarioProfile = {
  rosterBias: 0,
  staffBias: 0,
  budgetBias: 0,
  goalTier: "balanced",
  draftCapital: "normal"
};

export const careerScenarioLabels: Record<CareerScenario, string> = {
  worst: "Worst Roster",
  neutral: "Neutral",
  contender: "Contender",
  random: "Random"
};

function scenarioProfileFor(scenario: CareerScenario, seed: string, selectedTeamId: string): ScenarioProfile {
  if (scenario === "worst") {
    return {
      rosterBias: -9,
      staffBias: -9,
      budgetBias: 42,
      goalTier: "rebuild",
      draftCapital: "extra"
    };
  }

  if (scenario === "contender") {
    return {
      rosterBias: 8,
      staffBias: 11,
      budgetBias: -24,
      goalTier: "win-now",
      draftCapital: "thin"
    };
  }

  if (scenario === "random") {
    const rng = createRng(`${seed}:${selectedTeamId}:career-scenario`);
    const rosterBias = rng.int(-9, 8);
    return {
      rosterBias,
      staffBias: Math.round(rosterBias * 0.65 + rng.int(-2, 3)),
      budgetBias: rosterBias <= -8 ? rng.int(24, 42) : rosterBias >= 8 ? rng.int(-28, -12) : rng.int(-8, 12),
      goalTier: rosterBias <= -8 ? "rebuild" : rosterBias >= 8 ? "win-now" : "balanced",
      draftCapital: rosterBias <= -8 ? "extra" : rosterBias >= 8 ? "thin" : "normal"
    };
  }

  return neutralScenarioProfile;
}

const emptyStats = (): PlayerStats => emptyPlayerStats();

export function calculateOverall(position: Position, attributes: Attributes): number {
  return calculateOverallFromRatings(position, deriveRatingsFromAttributes(position, attributes, "legacy-overall"));
}

function attributesFor(position: Position, base: number, rng: Rng): Attributes {
  const value = (offset = 0, dev = 8) => Math.round(clamp(rng.normal(base + offset, dev), 30, 99));
  const attrs: Attributes = {
    speed: value(),
    strength: value(),
    athleticism: value(),
    awareness: value(),
    passing: value(-12),
    rushing: value(-4),
    receiving: value(-4),
    blocking: value(-6),
    tackling: value(-6),
    coverage: value(-8),
    kicking: value(-18),
    durability: value(2, 7),
    discipline: value(1, 7)
  };

  if (position === "QB") {
    attrs.passing = value(8, 7);
    attrs.awareness = value(5, 7);
  }
  if (["RB", "WR", "CB", "S"].includes(position)) {
    attrs.speed = value(7, 7);
    attrs.athleticism = value(5, 7);
  }
  if (["LT", "LG", "C", "RG", "RT", "DL"].includes(position)) {
    attrs.strength = value(8, 7);
    attrs.blocking = value(position === "DL" ? -10 : 10, 7);
  }
  if (["EDGE", "DL", "LB", "S"].includes(position)) {
    attrs.tackling = value(9, 7);
  }
  if (["CB", "S", "LB"].includes(position)) {
    attrs.coverage = value(7, 7);
  }
  if (position === "K" || position === "P") {
    attrs.kicking = value(15, 6);
    attrs.strength = value(-10, 7);
  }

  return attrs;
}

function playerSalary(position: Position, overall: number, rng: Rng): number {
  const base = Math.pow(clamp((overall - 42) / 36, 0.02, 1.45), 2.08) * 18 * positionPremium[position];
  return Number(clamp(0.75 + base + rng.float(-0.25, 1.35), 0.75, position === "QB" ? 45 : 28).toFixed(1));
}

function initialTeamStartSeason(age: number, contractYears: number, seasonYear: number, rng: Rng): number {
  const experienceYears = Math.max(0, age - 22);
  const maxYearsWithTeam = Math.max(1, Math.min(experienceYears + 1, contractYears + 2, 8));
  const yearsWithTeam = rng.int(1, maxYearsWithTeam);
  return seasonYear - (yearsWithTeam - 1);
}

function initialDraftYear(age: number, seasonYear: number): number {
  const nflYears = Math.max(0, age - 21);
  return seasonYear - nflYears;
}

function generatePlayer(
  team: NFLTeam,
  position: Position,
  slot: number,
  schools: CollegeProgram[],
  rng: Rng,
  rosterBias = 0,
  usedNames?: Set<string>,
  modelSeed = team.id,
  seasonYear = 2026
): Player {
  const identity = generatedName(rng, usedNames);
  const marketBump = (team.marketSize - 70) / 38;
  const slotPenalty = Math.max(0, slot - 1) * rng.float(3.8, 5.8);
  const base = clamp(rng.normal(52.5 + marketBump + rosterBias - slotPenalty, 5.4), 24, 88);
  const ratings = generateRatings(position, base, rng);
  const overall = calculateOverallFromRatings(position, ratings);
  const attributes = legacyAttributesFromRatings(position, ratings);
  const school = rng.pick(schools);
  const age = Math.round(clamp(rng.normal(25.8 + slot * 0.45, 3.7), 21, 36));
  const contractYears = rng.int(1, 5);
  const makeup = generateConcernProfile(`${team.id}:${position}:${slot}`, `${identity.firstName}-${identity.lastName}`);
  const development = generateDevelopmentProfile(age, makeup.workEthic, rng.fork("development"));
  const playerTraits = rng.shuffle(traits).slice(0, rng.int(1, 3));
  let positionFits = generatePositionFits({ position, ratings, traits: playerTraits });
  if (versatilityBonus({ position, ratings, traits: playerTraits, positionFits }) >= 3 && !playerTraits.includes("Versatile alignment")) {
    if (playerTraits.length >= 3) playerTraits[playerTraits.length - 1] = "Versatile alignment";
    else playerTraits.push("Versatile alignment");
    positionFits = generatePositionFits({ position, ratings, traits: playerTraits });
  }
  const versatilitySalaryBump = 1 + versatilityBonus({ position, ratings, traits: playerTraits, positionFits }) * 0.012;

  const salary = Number((playerSalary(position, overall, rng) * versatilitySalaryBump).toFixed(1));
  const playerShell = {
    id: `${team.id}-${position.toLowerCase()}-${slot}-${slugify(identity.firstName)}-${slugify(identity.lastName)}`,
    ...identity,
    position,
    teamId: team.id,
    teamStartSeason: initialTeamStartSeason(age, contractYears, seasonYear, rng.fork("team-start")),
    draftYear: initialDraftYear(age, seasonYear),
    collegeId: school.id,
    age,
    overall,
    potential: playerPotentialFor(overall, age, development, rng.fork("potential")),
    ratings,
    attributes,
    positionFits,
    salary,
    contractYears,
    contract: makeContract({ position, salary, contractYears, age, overall, potential: overall }, seasonYear, { origin: "generated" }),
    medical: makeup.medical,
    status: "active",
    injuryWeeks: 0,
    injury: undefined,
    suspensionWeeks: 0,
    makeup,
    traits: playerTraits,
    development,
    stats: emptyStats(),
    playoffStats: emptyStats()
  } as Player;
  return normalizePlayerModel({
    ...playerShell,
    contract: makeContract({ ...playerShell, potential: playerShell.potential }, seasonYear, { origin: "generated" })
  } as Player, `${modelSeed}:${position}:${slot}`);
}

function generateRoster(team: NFLTeam, schools: CollegeProgram[], rng: Rng, rosterBias = 0): Player[] {
  const usedNames = new Set<string>();
  return rosterTemplate.flatMap(([position, count]) =>
    Array.from({ length: count }, (_, index) =>
      generatePlayer(team, position, index + 1, schools, rng.fork(`${team.id}-${position}-${index}`), rosterBias, usedNames, team.id)
    )
  );
}

function generatePracticeSquad(team: NFLTeam, schools: CollegeProgram[], rng: Rng, seasonYear: number): Player[] {
  const usedNames = new Set<string>();
  return Array.from({ length: 16 }, (_, index) => {
    const position = practiceSquadPositionPlan(index);
    const player = generatePlayer(team, position, (index % 2) + 3, schools, rng.fork(`${team.id}-ps-${position}-${index}`), -18, usedNames, `${team.id}:practice`);
    const age = index < 10 ? rng.int(21, 23) : rng.int(24, 28);
    const adjustedPlayer = {
      ...player,
      age,
      draftYear: seasonYear - Math.max(0, age - 21)
    };
    const squadPlayer = toPracticeSquadPlayer(adjustedPlayer, { seasonYear, currentWeek: 1 });
    return {
      ...squadPlayer,
      id: `${team.id}-ps-${position.toLowerCase()}-${index + 1}-${slugify(player.firstName)}-${slugify(player.lastName)}`,
      salary: practiceSquadSalary({ seasonYear } as GameSave, adjustedPlayer),
      contractYears: 1,
      contract: makeContract({ ...adjustedPlayer, salary: practiceSquadSalary({ seasonYear } as GameSave, adjustedPlayer), contractYears: 1 }, seasonYear, {
        origin: "practice-squad",
        years: 1,
        apy: practiceSquadSalary({ seasonYear } as GameSave, adjustedPlayer),
        signingBonus: 0,
        guaranteedTotal: 0
      }),
      practiceSquadOriginalSalary: player.salary
    };
  });
}

export function generateFreeAgentPool(teams: NFLTeam[], schools: CollegeProgram[], seed: string): Player[] {
  const rng = createRng(`${seed}:free-agent-market`);
  const marketTeam: NFLTeam = {
    ...(teams[0] ?? nflTeams[0]),
    id: FREE_AGENT_TEAM_ID,
    abbreviation: "FA",
    city: "Free Agent",
    name: "Market",
    fullName: "Free Agent Market",
    marketSize: 58
  };
  const usedNames = new Set<string>();
  return freeAgentTemplate.flatMap(([position, count]) =>
    Array.from({ length: count }, (_, index) => {
      const player = generatePlayer(marketTeam, position, index + 1, schools, rng.fork(`${position}-${index}`), -5, usedNames, "free-agent-market");
      const rights = "ufa" as const;
      return {
        ...player,
        id: `fa-${position.toLowerCase()}-${index + 1}-${slugify(player.firstName)}-${slugify(player.lastName)}`,
        teamId: FREE_AGENT_TEAM_ID,
        status: "active" as const,
        previousTeamId: undefined,
        contract: makeContract(player, 2026, {
          origin: "free-agent",
          rights,
          years: player.contractYears,
          apy: player.salary
        })
      };
    })
  );
}

export { staffDepartmentFor } from "./staffModel";

function generateStaff(team: NFLTeam, rng: Rng, staffBias = 0): StaffMember[] {
  const usedNames = new Set<string>();
  const conferences = collegeConferences(collegePrograms);
  return staffSlotDefinitions.map((slot, index) =>
    createStaffMemberForSlot(team, slot, rng.fork(`${team.id}-${slot.id}-${index}`), staffBias, conferences, usedNames)
  );
}

export function generateStaffMarket(teams: NFLTeam[], seed: string, weekGenerated = 1): StaffMarketState {
  const rng = createRng(`${seed}:staff-market:${weekGenerated}`);
  const openTeam = { ...teams[0], id: "market", fullName: "Open Market" };
  const usedNames = new Set<string>();
  const conferences = collegeConferences(collegePrograms);
  const candidates = staffSlotDefinitions.flatMap((slot) =>
    Array.from({ length: slot.department === "Scouting" ? 3 : slot.department === "Coaching" ? 4 : 3 }, (_, index) => {
      const member = createStaffMemberForSlot(openTeam, slot, rng.fork(`${slot.id}-${index}`), rng.int(-4, 8), conferences, usedNames);
      const overall = staffOverall(member);
      const marketRate = member.salary * (0.84 + overall / 170);
      const demandSalary = Number(clamp(marketRate * rng.float(0.84, 1.22), 0.8, 15).toFixed(1));
      const demandYears = rng.int(1, 5);
      const candidateShell = {
        ...member,
        demandSalary,
        demandYears
      };
      return {
        ...candidateShell,
        id: `candidate-${slot.id}-${index}-${member.id}`,
        marketId: `market-${slot.id}-${index}`,
        teamId: "FA",
        interestedTeamIds: rng.shuffle(teams).slice(0, rng.int(12, 32)).map((team) => team.id),
        interviewed: false,
        hired: false,
        valueScore: staffValueScore(candidateShell, slot)
      } satisfies StaffCandidate;
    })
  );
  return { weekGenerated, candidates };
}

function positionGroupFor(position: Position): PositionGroup {
  if (position === "QB") return "QB";
  if (["RB", "WR", "TE"].includes(position)) return "Skill";
  if (["LT", "LG", "C", "RG", "RT"].includes(position)) return "OL";
  if (["EDGE", "DL", "LB"].includes(position)) return "Front Seven";
  if (["CB", "S"].includes(position)) return "Secondary";
  return "Specialists";
}

function riskFlagsFor(production: number, potential: number, trueOverall: number, rng: Rng, makeup: { medical: number; character: number; workEthic: number }): string[] {
  const flags: string[] = [];
  if (production < 52) flags.push("Production");
  if (potential - trueOverall > 14) flags.push("Projection");
  if (makeup.medical < 60 || rng.bool(0.04)) flags.push("Medical");
  if (makeup.character < 60 || rng.bool(0.04)) flags.push("Character");
  if (makeup.workEthic < 45) flags.push("Work Ethic");
  if (rng.bool(0.1)) flags.push("Scheme");
  return flags.slice(0, 3);
}

function prospectBaseFor(school: CollegeProgram, position: Position, rng: Rng): number {
  const strengthBump = school.strengths.includes(position) ? rng.int(3, 8) : 0;
  const subdivisionPenalty = school.subdivision === "FCS" ? rng.int(4, 11) : 0;
  const gemRoll = school.subdivision === "FCS" && rng.bool(0.07) ? rng.int(8, 18) : 0;
  return clamp(27 + school.prestige * 0.11 + school.competition * 0.06 + strengthBump + gemRoll + rng.normal(0, 5.8) - subdivisionPenalty, 22, 80);
}

function projectedRoundFor(overall: number, potential: number, position: Position): number {
  const abilityScore = overall * 0.64 + potential * 0.36;
  const score = abilityScore + prospectPositionPremium(position, abilityScore);
  if (score >= 58) return 1;
  if (score >= 55) return 2;
  if (score >= 52) return 3;
  if (score >= 49) return 4;
  if (score >= 46) return 5;
  if (score >= 43) return 6;
  return 7;
}

function scoutingNote(prospect: Pick<Prospect, "traits" | "production">, school: CollegeProgram, rng: Rng): string {
  const lead = school.subdivision === "FCS" ? "Small-school profile" : "Power-conference sample";
  const trait = rng.pick(prospect.traits);
  const production = prospect.production > 80 ? "dominant production" : prospect.production > 65 ? "steady production" : "uneven production";
  return `${lead}; ${production}; ${trait.toLowerCase()} stands out.`;
}

const regionCycle: ScoutingRegion[] = ["East", "South", "Midwest", "West"];
const fallbackProspectPositionWeights: Array<[Position, number]> = [
  ["QB", 20],
  ["RB", 30],
  ["WR", 56],
  ["TE", 24],
  ["LT", 20],
  ["LG", 18],
  ["C", 16],
  ["RG", 18],
  ["RT", 20],
  ["EDGE", 40],
  ["DL", 44],
  ["LB", 40],
  ["CB", 52],
  ["S", 32],
  ["K", 6],
  ["P", 6]
];

function weightedPick<T>(items: T[], rng: Rng, weightFor: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0.01, weightFor(item)), 0);
  let roll = rng.float(0, total);
  for (const item of items) {
    roll -= Math.max(0.01, weightFor(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function duplicateBucketForPosition(position: Position): string {
  if (["LT", "LG", "C", "RG", "RT"].includes(position)) return "OL";
  return position;
}

function duplicateLimitForSchoolPosition(school: CollegeProgram, position: Position): number {
  const eliteBump = school.prestige >= 78 || prospectSchoolWeight(school.name, 1) >= 3.25 ? 1 : 0;
  if (["QB", "K", "P"].includes(position)) return 1;
  if (["RB", "TE", "LB", "S"].includes(position)) return 1 + (school.prestige >= 82 ? 1 : 0);
  if (["WR", "CB", "DL", "EDGE", "LT", "LG", "C", "RG", "RT"].includes(position)) return 2 + eliteBump;
  return 1;
}

function positionCap(position: Position): number {
  if (position === "QB") return 32;
  if (position === "K" || position === "P") return 12;
  return 999;
}

function initialTeamProgress(projectedRound: number, school: CollegeProgram, rng: Rng): number {
  const hype = projectedRound === 1 ? 13 : projectedRound === 2 ? 9 : projectedRound <= 4 ? 4 : -2;
  const schoolBoost = school.subdivision === "FBS" ? clamp(prospectSchoolWeight(school.name, 1) * 2.1, 0, 10) : -5;
  return Math.round(clamp(18 + hype + schoolBoost + rng.normal(0, 8), 5, 50));
}

function consensusProgress(projectedRound: number, school: CollegeProgram, rng: Rng): number {
  const hype = projectedRound === 1 ? rng.int(12, 28) : projectedRound === 2 ? rng.int(6, 18) : projectedRound <= 4 ? rng.int(0, 10) : rng.int(-16, 6);
  const size = school.subdivision === "FBS" ? rng.int(1, 10) : rng.int(-12, 1);
  const tier = Math.round(clamp(prospectSchoolWeight(school.name, 1) * 3, 0, 14));
  return Math.round(clamp(42 + hype + size + tier + rng.normal(0, 9), 15, 82));
}

function generateProspects(schools: CollegeProgram[], rng: Rng, scoutingQuality: number, seed: string): Prospect[] {
  const schoolsByRegion = new Map<ScoutingRegion, CollegeProgram[]>();
  for (const school of schools) {
    const region = geographicRegionForSchool(school);
    schoolsByRegion.set(region, [...(schoolsByRegion.get(region) ?? []), school]);
  }
  const usedNames = new Set<string>();
  const schoolPositionCounts = new Map<string, number>();
  const positionCounts = new Map<Position, number>();
  const annualPositionWeights = annualProspectPositionWeights();
  const prospects: Prospect[] = [];
  let guard = 0;
  while (prospects.length < 460 && guard < 12000) {
    const index = prospects.length;
    guard += 1;
    const targetRegion = regionCycle[index % regionCycle.length];
    const regionSchools = schoolsByRegion.get(targetRegion) ?? schools;
    const school = weightedPick(regionSchools, rng, (candidate) => {
      const tierWeight = prospectSchoolWeight(candidate.name, Math.max(0.25, candidate.prestige / 55));
      const conferenceBump = candidate.subdivision === "FBS" ? 0.55 : -0.08;
      return Math.max(0.05, tierWeight + conferenceBump + rng.float(-0.08, 0.18));
    });
    const position = weightedPick(
      (annualPositionWeights.length > 0 ? annualPositionWeights : fallbackProspectPositionWeights).filter(([candidate]) => (positionCounts.get(candidate) ?? 0) < positionCap(candidate)),
      rng,
      ([, weight]) => weight
    )[0];
    const duplicateKey = `${school.id}:${duplicateBucketForPosition(position)}`;
    if ((schoolPositionCounts.get(duplicateKey) ?? 0) >= duplicateLimitForSchoolPosition(school, position)) continue;
    schoolPositionCounts.set(duplicateKey, (schoolPositionCounts.get(duplicateKey) ?? 0) + 1);
    positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
    const identity = generatedName(rng, usedNames);
    const archetype = rng.next() < 0.18 ? "ceiling" : rng.next() < 0.36 ? "floor" : "balanced";
    const base = prospectBaseFor(school, position, rng) + (archetype === "floor" ? rng.int(2, 5) : archetype === "ceiling" ? -rng.int(1, 5) : rng.int(-1, 2));
    const ratings = generateRatings(position, base, rng.fork(`prospect-ratings-${index}`));
    const trueOverall = calculateOverallFromRatings(position, ratings);
    const classYear = rng.pick(["JR", "SR", "RS-SO"] as const);
    const age = classYear === "SR" ? rng.int(21, 23) : rng.int(20, 22);
    const concernProfile = generateConcernProfile(seed, `prospect-${index + 1}-${identity.firstName}-${identity.lastName}`);
    const development = generateDevelopmentProfile(age, ratingValue(ratings, "workEthic"), rng.fork(`prospect-development-${index}`));
    const rawPotential = prospectPotentialFor(trueOverall, age, development, rng.fork(`prospect-potential-${index}`));
    const potential =
      archetype === "ceiling"
        ? calibratePotential(trueOverall, rawPotential + rng.int(6, 16))
        : archetype === "floor"
          ? calibratePotential(trueOverall, rawPotential - rng.int(2, 8))
          : rawPotential;
    const production = Math.round(clamp(trueOverall + school.competition * 0.12 + rng.normal(0, 11), 20, 99));
    const medical = concernProfile.medical;
    const character = concernProfile.character;
    const workEthic = concernProfile.workEthic;
    const prospectTraits = rng.shuffle(traits).slice(0, rng.int(1, 3));
    let positionFits = generatePositionFits({ position, ratings, traits: prospectTraits });
    if (versatilityBonus({ position, ratings, traits: prospectTraits, positionFits }) >= 3 && !prospectTraits.includes("Versatile alignment")) {
      if (prospectTraits.length >= 3) prospectTraits[prospectTraits.length - 1] = "Versatile alignment";
      else prospectTraits.push("Versatile alignment");
      positionFits = generatePositionFits({ position, ratings, traits: prospectTraits });
    }
    const prospectShell = {
      id: `prospect-${index + 1}-${slugify(identity.firstName)}-${slugify(identity.lastName)}`,
      ...identity,
      position,
      positionFits,
      schoolId: school.id,
      classYear,
      age,
      trueOverall,
      potential,
      ratings,
      production,
      combine: {
        speed: ratingValue(ratings, "speed"),
        strength: ratingValue(ratings, "strength"),
        agility: ratingValue(ratings, "agility"),
        explosion: ratingValue(ratings, "explosiveness")
      },
      traits: prospectTraits,
      development,
      projectedRound: projectedRoundFor(trueOverall, potential, position)
    };
    const region = geographicRegionForSchool(school);
    const productionTrend = Math.round(clamp(rng.normal((production - 60) * 0.35, 9), -25, 25));
    const riskFlags = riskFlagsFor(production, potential, trueOverall, rng, concernProfile);
    const progress = initialTeamProgress(prospectShell.projectedRound, school, rng.fork(`team-progress-${index}`));
    const ratingRanges = ratingRangesFor(ratings, progress, rng.fork(`prospect-ranges-${index}`));
    const baseProspect = {
      ...prospectShell,
      region,
      stock: Math.round(clamp((trueOverall - 56) * 1.4 + productionTrend * 0.45 + rng.normal(0, 8), -35, 35)),
      riskFlags,
      medical,
      character,
      workEthic,
      concernProfileVersion: CONCERN_PROFILE_VERSION,
      consensusRank: 999,
      consensusGrade: 0,
      consensusProgress: consensusProgress(prospectShell.projectedRound, school, rng.fork(`consensus-progress-${index}`)),
      teamRank: 999,
      teamGrade: 0,
      valuePickScore: 0,
      valuePickLabel: "Fair",
      concernVisibility: {
        medical: true,
        character: true,
        workEthic: true
      },
      concernDetails: {
        medical: medical < 45 ? "Medical red flag; teams may shade availability and recovery." : "Medical range looks stable.",
        character: character < 45 ? "Character red flag; teams may shade off-field availability." : "Character range looks stable.",
        workEthic: workEthic < 45 ? "Work ethic red flag; teams may shade development projection." : "Work ethic range looks stable."
      },
      schemeFit: school.scheme,
      productionTrend,
      favorite: false,
      hidden: false,
      scoutReports: [`${region} scout baseline: ${positionGroupFor(position)} profile with ${productionTrend >= 0 ? "rising" : "uneven"} production trend.`],
      scouted: {
        low: trueOverall,
        high: trueOverall,
        potentialLow: potential,
        potentialHigh: potential,
        confidence: progress,
        progress,
        concerns: {
          medical: [medical, medical],
          character: [character, character],
          workEthic: [workEthic, workEthic]
        },
        watchedTape: progress > 45,
        ratingRanges,
        note: scoutingNote(prospectShell, school, rng)
      }
    } as Prospect;
    const normalizedProspect = normalizeProspectModel({ ...baseProspect, ...ensureProspectConcerns(baseProspect) } as Prospect, `${seed}:${school.id}`);
    prospects.push(applyScoutingProjection(normalizedProspect, progress, seed, school, scoutingQuality));
  }
  return rankProspectBoard(prospects, schools, seed);
}

export function createScoutingPlan(staff: StaffMember[], selectedTeamId: string, prospects: Prospect[] = []): ScoutingPlan {
  const scouts = staff.filter((member) => member.teamId === selectedTeamId && member.department === "Scouting");
  const conferences = [...new Set(collegePrograms.map((school) => school.conference))].sort((a, b) => a.localeCompare(b));
  const types = ["prospect", "position", "side", "region", "conference", "side", "position"] as const;
  const focusByIndex = ["", "QB", "Offense", "South", "", "Defense", "CB"];
  const assignments: ScoutingAssignment[] = scouts.slice(0, 7).map((scout, index) => ({
    id: `assignment-${scout.id}`,
    scoutId: scout.id,
    type: types[index % types.length],
    focusId:
      types[index % types.length] === "position"
        ? focusByIndex[index] || "QB"
        : types[index % types.length] === "side"
          ? focusByIndex[index] || "Offense"
          : types[index % types.length] === "conference"
            ? conferences[index % conferences.length]
            : types[index % types.length] === "region"
              ? focusByIndex[index] || scoutingRegionList[index % scoutingRegionList.length]
              : prospects[index % Math.max(1, prospects.length)]?.id ?? "",
    prospectIds: []
  }));
  return {
    assignments,
    reports: [],
    recaps: [],
    lastProcessedWeek: 0
  };
}

export function createRecords(teams: NFLTeam[]): Record<string, TeamRecord> {
  return Object.fromEntries(
    teams.map((team) => [
      team.id,
      {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0
      }
    ])
  );
}

function createBudget(players: Player[], teams: NFLTeam[], selectedTeamId: string, scenarioProfile: ScenarioProfile): Record<string, number> {
  return Object.fromEntries(
    teams.map((team) => {
      const payroll = players.filter((player) => player.teamId === team.id).reduce((sum, player) => sum + player.salary, 0);
      const selectedBudgetBias = team.id === selectedTeamId ? scenarioProfile.budgetBias : 0;
      const budget = NFL_SALARY_CAP_2026 + selectedBudgetBias;
      return [team.id, Number((budget - payroll).toFixed(1))];
    })
  );
}

function createDraftPicks(
  teams: NFLTeam[],
  selectedTeamId: string,
  scenarioProfile: ScenarioProfile,
  rng: Rng,
  draftYear = 2027,
  options: { includeSeededCompPicks?: boolean } = {}
): DraftPick[] {
  const currentPicks = teams.flatMap((team, teamIndex) =>
    Array.from({ length: 7 }, (_, index) => {
      const round = index + 1;
      const pickInRound = teamIndex + 1;
      const overallPick = (round - 1) * teams.length + pickInRound;
      return {
        id: `${draftYear}-${round}-${team.id}`,
        draftYear,
        round,
        pickInRound,
        overallPick,
        originalTeamId: team.id,
        currentTeamId: team.id
      };
    })
  );
  const futureYear = draftYear + 1;
  const futurePicks = teams.flatMap((team, teamIndex) =>
    Array.from({ length: 7 }, (_, index) => {
      const round = index + 1;
      const pickInRound = teamIndex + 1;
      const overallPick = (round - 1) * teams.length + pickInRound;
      return {
        id: `${futureYear}-${round}-${team.id}`,
        draftYear: futureYear,
        round,
        pickInRound,
        overallPick,
        originalTeamId: team.id,
        currentTeamId: team.id
      };
    })
  );
  const seededCompPicks = options.includeSeededCompPicks === false ? [] : seedFirstYearCompPicks(teams, rng.fork("seeded-comp-picks"), draftYear);
  const picks = [...currentPicks, ...seededCompPicks, ...futurePicks];

  const otherTeams = rng.shuffle(teams.filter((team) => team.id !== selectedTeamId));

  if (scenarioProfile.draftCapital === "extra") {
    [2, 3, 5].forEach((round, index) => {
      const sourceTeam = otherTeams[index % otherTeams.length];
      const pick = picks.find((draftPick) => draftPick.originalTeamId === sourceTeam.id && draftPick.round === round);
      if (pick) pick.currentTeamId = selectedTeamId;
    });
  }

  if (scenarioProfile.draftCapital === "thin") {
    [3, 4, 5].forEach((round, index) => {
      const destinationTeam = otherTeams[index % otherTeams.length];
      const pick = picks.find((draftPick) => draftPick.originalTeamId === selectedTeamId && draftPick.round === round);
      if (pick) pick.currentTeamId = destinationTeam.id;
    });
  }

  return assignDraftOverallOrder(picks);
}

function assignDraftOverallOrder(picks: DraftPick[]): DraftPick[] {
  const years = [...new Set(picks.map((pick) => pick.draftYear))];
  return years.flatMap((draftYear) =>
    picks
      .filter((pick) => pick.draftYear === draftYear)
      .sort((a, b) => a.round - b.round || a.pickInRound - b.pickInRound || a.originalTeamId.localeCompare(b.originalTeamId))
      .map((pick, index) => ({ ...pick, overallPick: index + 1 }))
  );
}

function seedFirstYearCompPicks(teams: NFLTeam[], rng: Rng, draftYear: number): DraftPick[] {
  const total = rng.int(24, 32);
  const counts = new Map<string, number>();
  const candidates = teams
    .flatMap((team) => Array.from({ length: 4 }, (_, slot) => ({
      team,
      slot,
      score: team.marketSize * 0.08 + rng.float(0, 100)
    })))
    .sort((a, b) => b.score - a.score);
  const selected: Array<{ team: NFLTeam; round: number; value: number }> = [];
  for (const candidate of candidates) {
    if (selected.length >= total) break;
    const current = counts.get(candidate.team.id) ?? 0;
    if (current >= 4) continue;
    counts.set(candidate.team.id, current + 1);
    const roll = rng.float(0, 1);
    const round = roll < 0.07 ? 3 : roll < 0.23 ? 4 : roll < 0.48 ? 5 : roll < 0.76 ? 6 : 7;
    selected.push({ team: candidate.team, round, value: candidate.score });
  }
  const byRound = new Map<number, Array<{ team: NFLTeam; value: number }>>();
  for (const item of selected) {
    byRound.set(item.round, [...(byRound.get(item.round) ?? []), { team: item.team, value: item.value }]);
  }
  return [...byRound.entries()].flatMap(([round, items]) =>
    items
      .sort((a, b) => b.value - a.value || a.team.id.localeCompare(b.team.id))
      .map((item, index) => ({
        id: `comp-seeded-${draftYear}-${round}-${item.team.id}-${index + 1}`,
        draftYear,
        round,
        pickInRound: teams.length + index + 1,
        overallPick: (round - 1) * teams.length + teams.length + index + 1,
        originalTeamId: item.team.id,
        currentTeamId: item.team.id,
        compensatory: true,
        compSource: "seeded" as const,
        compLabel: "Seeded comp"
      }))
  );
}

export function createDraftState(draftPicks: DraftPick[]): DraftState {
  const draftYear = draftPicks[0]?.draftYear ?? 2027;
  const order = [...draftPicks].filter((pick) => pick.draftYear === draftYear).sort((a, b) => a.overallPick - b.overallPick).map((pick) => pick.id);
  return {
    draftYear,
    order,
    currentPickIndex: 0,
    history: [],
    tradeOffers: [],
    tradeLog: [],
    eventLog: [],
    clockSeconds: 180,
    pickTimeLimit: 180,
    simSpeed: 1,
    skipCpuTradeNotifications: false,
    completed: false
  };
}

function createGoals(team: NFLTeam, mode: SaveMode, scenarioProfile: ScenarioProfile): FranchiseGoals {
  if (mode === "sandbox") {
    return {
      mode,
      targetWins: 0,
      makePlayoffs: false,
      budgetDiscipline: 100,
      fanApproval: 100,
      ownerTrust: 100
    };
  }

  if (scenarioProfile.goalTier === "rebuild") {
    return {
      mode,
      targetWins: 4,
      makePlayoffs: false,
      budgetDiscipline: 64,
      fanApproval: 44,
      ownerTrust: 46
    };
  }

  if (scenarioProfile.goalTier === "win-now") {
    return {
      mode,
      targetWins: 11,
      makePlayoffs: true,
      budgetDiscipline: 78,
      fanApproval: 72,
      ownerTrust: 62
    };
  }

  return {
    mode,
    targetWins: team.marketSize > 84 ? 10 : team.marketSize > 72 ? 8 : 6,
    makePlayoffs: team.marketSize > 80,
    budgetDiscipline: 72,
    fanApproval: 62,
    ownerTrust: 58
  };
}

export function generateSeasonDraftAssets(
  teams: NFLTeam[],
  schools: CollegeProgram[],
  staff: StaffMember[],
  selectedTeamId: string,
  seed: string,
  draftYear: number,
  collegeRoster?: CollegeRosterState,
  collegeSeasonResults?: CollegeSeasonResultsState,
  schoolProfiles?: GameSave["schoolProfiles"]
): Pick<GameSave, "prospects" | "draftPicks" | "draftState" | "scoutingPlan" | "annualPipeline" | "annualRecruiting" | "annualRecruitClass" | "draftEvaluation"> {
  const rng = createRng(`${seed}:season-draft-assets:${draftYear}`);
  const annualDebug = annualRuntimeDebug();
  const pipelineData = loadPipelineDataBundle();
  const selectedScouting =
    staff
      .filter((member) => member.teamId === selectedTeamId && member.department === "Scouting")
      .reduce((sum, member) => sum + member.ratings.scouting, 0) / 7 || 50;
  const initialProspects = draftProspectsFromCollegeRoster(collegeRoster, collegeSeasonResults, schools, selectedScouting, `${seed}:${draftYear}`, draftYear);
  const draftEvaluation = generateDraftEvaluationState(seed, draftYear, initialProspects, 1, schools);
  const prospects = applyDraftEvaluationToProspects(initialProspects, draftEvaluation, schools, `${seed}:${draftYear}:evaluated`);
  const annualRecruitClass = generateAnnualRecruitClass(seed, draftYear - 1);
  const draftPicks = createDraftPicks(teams, selectedTeamId, neutralScenarioProfile, rng.fork("draft-picks"), draftYear, { includeSeededCompPicks: false });
  return {
    prospects,
    draftPicks,
    draftState: createDraftState(draftPicks),
    scoutingPlan: createScoutingPlan(staff, selectedTeamId, prospects),
    draftEvaluation,
    annualPipeline: {
      version: "v11_6_4",
      lastGeneratedDraftYear: draftYear,
      runtimeCsvs: annualDebug.loadedRuntimeCsvs,
      rngStreams: annualDebug.rngStreams,
      schemaValidatedCsvs: annualDebug.schemaValidatedCsvs,
      schemaValidatedColumns: annualDebug.schemaValidatedColumns,
      parserRulesApplied: annualDebug.parserRulesApplied,
      fallbackAuditCount: pipelineData.validation.fallbackAudit.length,
      validationErrors: pipelineData.validation.errors,
      usesYearZeroBundles: annualDebug.usesYearZeroBundles
    },
    annualRecruitClass,
    annualRecruiting: generateAnnualRecruitingState(seed, draftYear - 1, schools, annualRecruitClass.recruits, 1, schoolProfiles, collegeRoster)
  };
}

function yearZeroDraftClassToLiveProspects(
  draftClass: YearZeroDraftProspect[],
  schools: CollegeProgram[],
  selectedScouting: number,
  seed: string,
  productionHistory: YearZeroProductionSeason[] = []
): Prospect[] {
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const collegeHistoryByPlayerId = new Map<string, YearZeroProductionSeason[]>();
  for (const row of productionHistory) {
    if (row.level && row.level !== "college") continue;
    collegeHistoryByPlayerId.set(row.playerId, [...(collegeHistoryByPlayerId.get(row.playerId) ?? []), row]);
  }
  const summarizeCollegeHistory = (rows: YearZeroProductionSeason[], position: Position): string | undefined => {
    if (rows.length === 0) return undefined;
    const sorted = [...rows].sort((a, b) => (a.seasonYear ?? 0) - (b.seasonYear ?? 0));
    const averageProduction = Math.round(sorted.reduce((sum, row) => sum + row.productionScore, 0) / sorted.length);
    const awards = sorted.flatMap((row) => row.awards ?? []);
    const latest = sorted[sorted.length - 1];
    const stats = latest.stats as Record<string, number> | undefined;
    const statLine = stats
      ? position === "QB"
        ? `${Math.round(stats.pass_yds ?? 0)} pass yds, ${Math.round(stats.pass_td ?? 0)} TD`
        : position === "RB"
          ? `${Math.round(stats.rush_yds ?? 0)} rush yds, ${Math.round(stats.rush_td ?? 0)} TD`
          : position === "WR" || position === "TE"
            ? `${Math.round(stats.rec_yds ?? 0)} rec yds, ${Math.round(stats.rec_td ?? 0)} TD`
            : position === "K"
              ? `${Math.round(stats.fgm ?? 0)}/${Math.round(stats.fga ?? 0)} FG`
              : position === "P"
                ? `${Math.round(stats.punts ?? 0)} punts`
                : `${Math.round(stats.tackles ?? 0)} tackles, ${Math.round(stats.sacks ?? 0)} sacks`
      : undefined;
    return `Prior college production: ${rows.length} completed season${rows.length === 1 ? "" : "s"}, ${averageProduction} avg grade${statLine ? `; latest ${statLine}` : ""}${awards.length > 0 ? `; awards ${awards.slice(0, 3).join(", ")}` : ""}.`;
  };
  const prospects = draftClass.map((source, index) => {
    const rng = createRng(`${seed}:year-zero:live-prospect:${source.id}`);
    const school = schoolById.get(source.schoolId) ?? schools[index % schools.length];
    const historicalRows = [...(collegeHistoryByPlayerId.get(source.collegePlayerId) ?? [])].sort((a, b) => (a.seasonYear ?? 0) - (b.seasonYear ?? 0));
    const historicalAverage = historicalRows.length > 0
      ? historicalRows.reduce((sum, row) => sum + row.productionScore, 0) / historicalRows.length
      : source.collegeOverall;
    const historicalTrend = historicalRows.length >= 2
      ? historicalRows[historicalRows.length - 1].productionScore - historicalRows[0].productionScore
      : rng.normal((source.collegeOverall - 60) * 0.25, 8);
    const historicalAwards = historicalRows.flatMap((row) => row.awards ?? []);
    const historicalReport = summarizeCollegeHistory(historicalRows, source.position);
    const ratings = generateRatings(source.position, source.nflOverall, rng.fork("ratings"));
    const trueOverall = calculateOverallFromRatings(source.position, ratings);
    const development = generateDevelopmentProfile(source.classYear === "SR" ? 22 : 21, 70, rng.fork("development"));
    const traitsForProspect = rng.shuffle(traits).slice(0, rng.int(1, 3));
    const positionFits = generatePositionFits({ position: source.position, ratings, traits: traitsForProspect });
    const progress = Math.round(clamp(selectedScouting * 0.32 + rng.int(4, 14), 12, 50));
    const concernProfile = generateConcernProfile(seed, `year-zero-draft-${source.id}`);
    const medical = concernProfile.medical;
    const character = concernProfile.character;
    const workEthic = concernProfile.workEthic;
    const region = geographicRegionForSchool(school);
    const baseProspect = {
      id: source.id,
      collegePlayerId: source.collegePlayerId,
      draftSource: "year_zero_college_roster",
      collegeOverall: source.collegeOverall,
      firstName: source.firstName,
      lastName: source.lastName,
      position: source.position,
      positionFits,
      schoolId: source.schoolId,
      classYear: source.classYear,
      age: source.classYear === "SR" ? rng.int(22, 24) : rng.int(20, 22),
      trueOverall,
      potential: source.nflPotential,
      ratings,
      production: Math.round(clamp(source.collegeOverall * 0.72 + historicalAverage * 0.28 + historicalAwards.length * 1.5 + rng.normal(0, 5), 35, 99)),
      combine: {
        speed: ratingValue(ratings, "speed"),
        strength: ratingValue(ratings, "strength"),
        agility: ratingValue(ratings, "agility"),
        explosion: ratingValue(ratings, "explosiveness")
      },
      traits: traitsForProspect,
      development,
      projectedRound: source.projectedRound,
      region,
      stock: Math.round(clamp((trueOverall - 58) * 1.4 + rng.normal(0, 8), -35, 35)),
      riskFlags: riskFlagsFor(source.collegeOverall, source.nflPotential, trueOverall, rng, { medical, character, workEthic }),
      medical,
      character,
      workEthic,
      concernProfileVersion: CONCERN_PROFILE_VERSION,
      consensusRank: 999,
      consensusGrade: 0,
      consensusProgress: Math.round(clamp(progress + rng.int(0, 8), 10, 50)),
      teamRank: 999,
      teamGrade: 0,
      valuePickScore: 0,
      valuePickLabel: "Fair",
      concernVisibility: { medical: true, character: true, workEthic: true },
      concernDetails: {
        medical: medical < 45 ? "Medical red flag; teams may shade availability and recovery." : "Medical range looks stable.",
        character: character < 45 ? "Character red flag; teams may shade off-field availability." : "Character range looks stable.",
        workEthic: workEthic < 45 ? "Work ethic red flag; teams may shade development projection." : "Work ethic range looks stable."
      },
      schemeFit: school.scheme,
      productionTrend: Math.round(clamp(historicalTrend + historicalAwards.length * 1.5, -25, 25)),
      favorite: false,
      hidden: false,
      scoutReports: [
        `Year Zero board: ${region} scout translated ${source.collegeOverall} college scale to ${trueOverall} NFL scale.`,
        ...(historicalReport ? [historicalReport] : [])
      ],
      scouted: {
        low: trueOverall,
        high: trueOverall,
        potentialLow: source.nflPotential,
        potentialHigh: source.nflPotential,
        confidence: progress,
        progress,
        concerns: { medical: [medical, medical], character: [character, character], workEthic: [workEthic, workEthic] },
        watchedTape: progress > 45,
        ratingRanges: ratingRangesFor(ratings, progress, rng.fork("rating-ranges")),
        note: scoutingNote({ traits: traitsForProspect, production: source.collegeOverall }, school, rng)
      }
    } as Prospect;
    return applyScoutingProjection(normalizeProspectModel({ ...baseProspect, ...ensureProspectConcerns(baseProspect) }, `${seed}:year-zero`), progress, seed, school, selectedScouting);
  });
  return rankProspectBoard(prospects, schools, seed);
}

function calibrateFreshDraftProspect(prospect: Prospect, seed: string): Prospect {
  const roundCap = prospect.projectedRound === 1 ? 59 : prospect.projectedRound === 2 ? 57 : prospect.projectedRound <= 4 ? 55 : 53;
  const targetOverall = Math.round(clamp(prospect.trueOverall - 14, 34, roundCap));
  const potentialCap = prospect.projectedRound === 1 ? 82 : prospect.projectedRound === 2 ? 79 : 77;
  const potential = Math.round(clamp(prospect.potential - 7, targetOverall, potentialCap));
  const rng = createRng(`${seed}:fresh-draft-scale:${prospect.id}`);
  let ratings = generateRatings(prospect.position, targetOverall, rng.fork("ratings"));
  let trueOverall = calculateOverallFromRatings(prospect.position, ratings);
  for (let attempt = 0; attempt < 5 && trueOverall > roundCap; attempt += 1) {
    ratings = ratings.map((value) => Math.round(clamp(value - Math.min(8, trueOverall - roundCap), 20, 99)));
    trueOverall = calculateOverallFromRatings(prospect.position, ratings);
  }
  const scoutedOverallShift = trueOverall - prospect.trueOverall;
  const scoutedPotentialShift = potential - prospect.potential;
  return {
    ...prospect,
    trueOverall,
    potential,
    ratings,
    combine: {
      speed: ratingValue(ratings, "speed"),
      strength: ratingValue(ratings, "strength"),
      agility: ratingValue(ratings, "agility"),
      explosion: ratingValue(ratings, "explosiveness")
    },
    scouted: {
      ...prospect.scouted,
      low: Math.round(clamp(prospect.scouted.low + scoutedOverallShift, 20, trueOverall)),
      high: Math.round(clamp(prospect.scouted.high + scoutedOverallShift, trueOverall, 99)),
      potentialLow: Math.round(clamp(prospect.scouted.potentialLow + scoutedPotentialShift, trueOverall, potential)),
      potentialHigh: Math.round(clamp(prospect.scouted.potentialHigh + scoutedPotentialShift, potential, 99)),
      ratingRanges: ratingRangesFor(ratings, prospect.scouted.progress, rng.fork("rating-ranges"))
    }
  };
}

function applySchoolPositionDuplicateCaps(prospects: Prospect[], schools: CollegeProgram[]): Prospect[] {
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const counts = new Map<string, number>();
  const selected: Prospect[] = [];
  for (const prospect of prospects) {
    const school = schoolById.get(prospect.schoolId);
    const bucket = duplicateBucketForPosition(prospect.position);
    const key = `${prospect.schoolId}:${bucket}`;
    const limit = school ? duplicateLimitForSchoolPosition(school, prospect.position) : bucket === "QB" || bucket === "K" || bucket === "P" ? 1 : 2;
    const current = counts.get(key) ?? 0;
    if (current >= limit) continue;
    selected.push(prospect);
    counts.set(key, current + 1);
  }
  return selected;
}

function collegePlayerToDraftProspect(
  player: CollegeRosterPlayer,
  schools: CollegeProgram[],
  scoutingQuality: number,
  seed: string,
  seasonContext?: {
    productionScore?: number;
    awards: CollegeAwardResult[];
    injury?: CollegeInjuryResult;
    historicalProduction?: YearZeroProductionSeason[];
    historicalInjuries?: CollegeRosterPlayer["injuryHistory"];
  }
): Prospect {
  const rng = createRng(`${seed}:college-roster-draft:${player.id}`);
  const school = schools.find((candidate) => candidate.id === player.schoolId) ?? schools[0];
  const productionSignal = seasonContext?.productionScore ?? player.collegeOverall;
  const historicalProduction = seasonContext?.historicalProduction ?? player.productionHistory ?? [];
  const historicalAverage = historicalProduction.length > 0
    ? historicalProduction.reduce((sum, row) => sum + row.productionScore, 0) / historicalProduction.length
    : productionSignal;
  const historicalTrend = historicalProduction.length >= 2
    ? historicalProduction[historicalProduction.length - 1].productionScore - historicalProduction[0].productionScore
    : 0;
  const historicalAwards = historicalProduction.flatMap((row) => row.awards ?? []);
  const historicalInjuries = seasonContext?.historicalInjuries ?? player.injuryHistory ?? [];
  const awardDraftBonus = Math.min(10, seasonContext?.awards.reduce((sum, award) => sum + award.draftBoardBonus, 0) ?? 0);
  const awardMediaBonus = Math.min(8, seasonContext?.awards.reduce((sum, award) => sum + award.mediaBonus, 0) ?? 0);
  const awardBump = Math.min(6, awardDraftBonus * 0.55 + awardMediaBonus * 0.12 + historicalAwards.length * 0.55);
  const concernProfile = generateConcernProfile(seed, `college-declaration-${player.id}`);
  const injuryDrag = seasonContext?.injury
    ? (seasonContext.injury.severity === "catastrophic" ? 5 : seasonContext.injury.severity === "major" ? 3 : seasonContext.injury.severity === "moderate" ? 1 : 0)
      + seasonContext.injury.potentialLoss * 0.8
      + seasonContext.injury.longTermWear * 0.08
    : 0;
  const medicalPenalty = seasonContext?.injury?.draftMedicalPenalty ?? injuryDrag * 7;
  const medicalGrade = Math.round(clamp(concernProfile.medical - medicalPenalty, 20, 99));
  const nflOverall = Math.round(clamp(player.collegeOverall - 6 + (productionSignal - 65) * 0.035 + (historicalAverage - 65) * 0.025 + awardBump - injuryDrag + rng.normal(0, 2), 35, 88));
  const nflPotential = calibratePotential(nflOverall, Math.round(clamp(player.collegePotential - 4 + awardBump * 0.5 - injuryDrag * 0.75 + rng.normal(0, 3), nflOverall, 95)));
  const ratings = generateRatings(player.position, nflOverall, rng.fork("ratings"));
  const trueOverall = calculateOverallFromRatings(player.position, ratings);
  const classYear = player.classYear === "RS-SO" ? "RS-SO" : player.classYear === "JR" ? "JR" : "SR";
  const development = generateDevelopmentProfile(player.age, concernProfile.workEthic, rng.fork("development"));
  const production = Math.round(clamp(productionSignal * 0.68 + historicalAverage * 0.24 + historicalAwards.length * 1.2 + rng.normal(0, 4), 25, 99));
  const prospectTraits = rng.shuffle(traits).slice(0, rng.int(1, 3));
  const positionFits = generatePositionFits({ position: player.position, ratings, traits: prospectTraits });
  const projectedRound = projectedRoundFor(trueOverall, nflPotential, player.position);
  const region = geographicRegionForSchool(school);
  const productionTrend = Math.round(clamp(rng.normal((production - 60) * 0.2 + historicalTrend * 0.75 + awardBump * 2 - injuryDrag * 2, 6), -25, 25));
  const progress = initialTeamProgress(projectedRound, school, rng.fork("team-progress"));
  const ratingRanges = ratingRangesFor(ratings, progress, rng.fork("rating-ranges"));
  const baseProspect = {
    id: `college-declare-${player.draftDeclaredSeason ?? "eligible"}-${player.id}`,
    collegePlayerId: player.id,
    draftSource: player.source === "year_zero_college_roster" ? "year_zero_college_roster" as const : "college_roster" as const,
    collegeOverall: player.collegeOverall,
    draftDeclaredSeason: player.draftDeclaredSeason,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    positionFits,
    schoolId: player.schoolId,
    classYear,
    age: player.age,
    trueOverall,
    potential: nflPotential,
    ratings,
    production,
    combine: {
      speed: ratingValue(ratings, "speed"),
      strength: ratingValue(ratings, "strength"),
      agility: ratingValue(ratings, "agility"),
      explosion: ratingValue(ratings, "explosiveness")
    },
    traits: prospectTraits,
    development,
    projectedRound,
    region,
    stock: Math.round(clamp((trueOverall - 56) * 1.3 + productionTrend * 0.45 + awardDraftBonus * 0.8 + rng.normal(0, 7), -35, 35)),
    riskFlags: seasonContext?.injury ? [...riskFlagsFor(production, nflPotential, trueOverall, rng, concernProfile), "Medical"] : riskFlagsFor(production, nflPotential, trueOverall, rng, concernProfile),
    medical: medicalGrade,
    character: concernProfile.character,
    workEthic: concernProfile.workEthic,
    concernProfileVersion: CONCERN_PROFILE_VERSION,
    consensusRank: 999,
    consensusGrade: 0,
    consensusProgress: consensusProgress(projectedRound, school, rng.fork("consensus-progress")),
    teamRank: 999,
    teamGrade: 0,
    valuePickScore: 0,
    valuePickLabel: "Fair",
    concernVisibility: { medical: true, character: true, workEthic: true },
    concernDetails: {
      medical: seasonContext?.injury ? `${seasonContext.injury.severity} ${seasonContext.injury.injuryFamily} history; missed ${seasonContext.injury.missedGames} games, recurrence risk ${Math.round(seasonContext.injury.recurrenceRisk * 100)}%, long-term wear ${Math.round(seasonContext.injury.longTermWear)}.` : concernProfile.medical < 45 ? "Medical red flag; teams may shade availability and recovery." : "Medical range looks stable.",
      character: concernProfile.character < 45 ? "Character red flag; teams may shade off-field availability." : "Character range looks stable.",
      workEthic: concernProfile.workEthic < 45 ? "Work ethic red flag; teams may shade development projection." : "Work ethic range looks stable."
    },
    schemeFit: school.scheme,
    productionTrend,
    favorite: false,
    hidden: false,
    scoutReports: [
      `College roster declaration: ${player.collegeOverall} college scale translated to ${trueOverall} NFL scale. Production ${production}; award draft bonus ${Math.round(awardDraftBonus * 10) / 10}; injury drag ${Math.round(injuryDrag * 10) / 10}; medical penalty ${Math.round(medicalPenalty)}.`,
      ...(historicalProduction.length > 0 ? [`Prior production: ${historicalProduction.length} completed season${historicalProduction.length === 1 ? "" : "s"}, ${Math.round(historicalAverage)} avg grade${historicalAwards.length > 0 ? `, awards ${historicalAwards.slice(0, 3).join(", ")}` : ""}.`] : []),
      ...(historicalInjuries.length > 0 ? [`Medical context: ${historicalInjuries.length} prior college injury note${historicalInjuries.length === 1 ? "" : "s"} on file.`] : [])
    ],
    scouted: {
      low: trueOverall,
      high: trueOverall,
      potentialLow: nflPotential,
      potentialHigh: nflPotential,
      confidence: progress,
      progress,
      concerns: {
        medical: [medicalGrade, medicalGrade],
        character: [concernProfile.character, concernProfile.character],
        workEthic: [concernProfile.workEthic, concernProfile.workEthic]
      },
      watchedTape: progress > 45,
      ratingRanges,
      note: scoutingNote({ traits: prospectTraits, production }, school, rng)
    }
  } as Prospect;
  return applyScoutingProjection(normalizeProspectModel({ ...baseProspect, ...ensureProspectConcerns(baseProspect) }, seed), progress, seed, school, scoutingQuality);
}

function isDraftEligibleCollegeClass(player: CollegeRosterPlayer): boolean {
  return player.classYear === "JR" || player.classYear === "SR" || player.classYear === "RS-SO";
}

function expandedDraftEligibleCollegePlayers(
  collegeRoster: CollegeRosterState | undefined,
  collegeSeasonResults: CollegeSeasonResultsState | undefined,
  draftYear: number
): CollegeRosterPlayer[] {
  const productionByPlayerId = new Map((collegeSeasonResults?.production ?? []).map((row) => [row.playerId, row.productionScore]));
  const declared: CollegeRosterPlayer[] = [];
  const supplemental: CollegeRosterPlayer[] = [];
  for (const player of collegeRoster?.players ?? []) {
    if (!isDraftEligibleCollegeClass(player) || player.cutSeason || player.rosterStatus === "cut") continue;
    const isDeclared = player.draftDeclaredSeason === draftYear;
    if (isDeclared) {
      declared.push(player);
      continue;
    }
    if (player.graduatedSeason || player.draftDeclaredSeason) continue;
    supplemental.push(player);
  }
  const score = (player: CollegeRosterPlayer) =>
    player.collegeOverall * 0.62 +
    player.collegePotential * 0.16 +
    (productionByPlayerId.get(player.id) ?? player.collegeOverall) * 0.14 +
    (player.classYear === "SR" ? 5 : player.classYear === "JR" ? 2 : 0);
  const sortByDraftValue = (a: CollegeRosterPlayer, b: CollegeRosterPlayer) => score(b) - score(a) || a.id.localeCompare(b.id);
  return [...declared.sort(sortByDraftValue), ...supplemental.sort(sortByDraftValue)].slice(0, 460);
}

function draftProspectsFromCollegeRoster(
  collegeRoster: CollegeRosterState | undefined,
  collegeSeasonResults: CollegeSeasonResultsState | undefined,
  schools: CollegeProgram[],
  scoutingQuality: number,
  seed: string,
  draftYear: number
): Prospect[] {
  const productionByPlayerId = new Map((collegeSeasonResults?.production ?? []).map((row) => [row.playerId, row.productionScore]));
  const awardsByPlayerId = new Map<string, CollegeAwardResult[]>();
  for (const award of collegeSeasonResults?.awards ?? []) {
    awardsByPlayerId.set(award.playerId, [...(awardsByPlayerId.get(award.playerId) ?? []), award]);
  }
  const injuryByPlayerId = new Map((collegeSeasonResults?.injuries ?? []).map((row) => [row.playerId, row]));
  const declared = expandedDraftEligibleCollegePlayers(collegeRoster, collegeSeasonResults, draftYear);
  return rankProspectBoard(declared.map((player) => collegePlayerToDraftProspect(player, schools, scoutingQuality, seed, {
    productionScore: productionByPlayerId.get(player.id),
    awards: awardsByPlayerId.get(player.id) ?? [],
    injury: injuryByPlayerId.get(player.id),
    historicalProduction: player.productionHistory,
    historicalInjuries: player.injuryHistory
  })), schools, seed);
}

function reserveInjuryFor(status: YearZeroNflReserveStatus, seasonYear: number): NonNullable<Player["injury"]> {
  const severity = status.weeksRemaining >= 12 ? "major" : status.weeksRemaining >= 5 ? "moderate" : "minor";
  const label = status.status === "injured_reserve" ? "Year Zero injured reserve" : status.status === "physically_unable" ? "Year Zero PUP designation" : "Year Zero NFI designation";
  return {
    id: `yz-live-injury-${status.id}`,
    typeId: status.status,
    name: label,
    severity,
    status: "injured",
    weeksRemaining: status.weeksRemaining,
    initialWeeks: status.weeksRemaining,
    limitedWeeksRemaining: 0,
    ovrPenalty: severity === "major" ? 8 : severity === "moderate" ? 5 : 3,
    recurrenceTag: "year-zero-reserve",
    occurredWeek: 1,
    occurredDate: leagueYearStartDate(seasonYear),
    description: `${label} imported from the Year Zero reserve-status bundle.`,
    permanentOverallDelta: 0,
    permanentPotentialDelta: 0,
    careerEnding: false
  };
}

function yearZeroReserveMedicalHistory(players: Player[], reserveStatuses: YearZeroNflReserveStatus[], seasonYear: number): MedicalHistoryEntry[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  return reserveStatuses.flatMap((reserve): MedicalHistoryEntry[] => {
    const player = playerById.get(reserve.playerId);
    if (!player) return [];
    const injury = reserveInjuryFor(reserve, seasonYear);
    return [{
      ...injury,
      playerId: player.id,
      teamId: player.teamId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      medical: player.medical,
      source: "setback"
    }];
  });
}

function calibrateYearZeroRatings(
  position: Position,
  sourceOverall: number,
  rng: Rng,
  maxOverall = sourceOverall + 1
): { ratings: RatingVector; overall: number } {
  const minOverall = Math.max(20, sourceOverall - 1);
  const cappedMaxOverall = Math.max(minOverall, maxOverall);
  let ratings = generateRatings(position, sourceOverall, rng);
  let overall = calculateOverallFromRatings(position, ratings);
  for (let attempt = 0; attempt < 6 && (overall < minOverall || overall > cappedMaxOverall); attempt += 1) {
    const target = overall > cappedMaxOverall ? cappedMaxOverall : minOverall;
    const adjustment = clamp(target - overall, -14, 14);
    ratings = ratings.map((value) => Math.round(clamp(value + adjustment, 20, 99)));
    overall = calculateOverallFromRatings(position, ratings);
  }
  return { ratings, overall };
}

function yearZeroNflProductionToStatHistory(
  row: YearZeroProductionSeason,
  source: YearZeroNflPlayer,
  teamById: Map<string, NFLTeam>
): PlayerSeasonStatsHistoryEntry {
  const teamId = row.teamId ?? source.teamId;
  const team = teamById.get(teamId);
  return {
    id: `history-${row.id}`,
    seasonYear: row.seasonYear ?? 2026 + row.seasonOffset,
    teamId,
    teamName: team?.fullName,
    age: row.age ?? Math.max(21, source.age + row.seasonOffset),
    position: row.position ?? source.position,
    overall: Math.round(clamp(row.productionScore, 20, 99)),
    potential: Math.max(Math.round(clamp(row.productionScore, 20, 99)), source.potential),
    stats: normalizePlayerStats(row.stats as Partial<PlayerStats> | undefined),
    playoffStats: emptyStats(),
    awards: row.awards ?? []
  };
}

function yearZeroNflPlayersToLivePlayers(
  sources: YearZeroNflPlayer[],
  teams: NFLTeam[],
  schools: CollegeProgram[],
  seed: string,
  seasonYear = 2026,
  reserveStatuses: YearZeroNflReserveStatus[] = [],
  productionHistory: YearZeroProductionSeason[] = []
): Player[] {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const reserveByPlayerId = new Map(reserveStatuses.map((status) => [status.playerId, status]));
  const proHistoryByPlayerId = new Map<string, YearZeroProductionSeason[]>();
  for (const row of productionHistory) {
    if (row.level !== "nfl") continue;
    proHistoryByPlayerId.set(row.playerId, [...(proHistoryByPlayerId.get(row.playerId) ?? []), row]);
  }
  const marketTeam: NFLTeam = {
    ...(teams[0] ?? nflTeams[0]),
    id: FREE_AGENT_TEAM_ID,
    abbreviation: "FA",
    city: "Free Agent",
    name: "Market",
    fullName: "Free Agent Market",
    marketSize: 58
  };
  return sources.map((source) => {
    const rng = createRng(`${seed}:year-zero:live-nfl:${source.id}`);
    const team = source.pool === "free_agent" ? marketTeam : teamById.get(source.teamId) ?? teams[0];
    const calibrated = calibrateYearZeroRatings(source.position, source.overall, rng.fork("ratings"), source.pool === "practice_squad" ? Math.min(64, source.overall + 1) : source.overall + 1);
    const ratings = calibrated.ratings;
    const overall = calibrated.overall;
    const attributes = legacyAttributesFromRatings(source.position, ratings);
    const makeup = generateConcernProfile(source.id, `${source.firstName}-${source.lastName}`);
    const development = generateDevelopmentProfile(source.age, makeup.workEthic, rng.fork("development"));
    const playerTraits = rng.shuffle(traits).slice(0, rng.int(1, 3));
    const positionFits = generatePositionFits({ position: source.position, ratings, traits: playerTraits });
    const contractOrigin = source.contractOrigin ?? (source.pool === "practice_squad" ? "practice-squad" : source.pool === "free_agent" ? "free-agent" : "generated");
    const salary = source.pool === "practice_squad" ? 0.25 : source.salary;
    const contractYears = Math.max(1, source.contractYears);
    const draftYear = source.draftYear ?? seasonYear - source.experience;
    const reserve = reserveByPlayerId.get(source.id);
    const reserveInjury = reserve && source.pool === "active_roster" ? reserveInjuryFor(reserve, seasonYear) : undefined;
    const shell = {
      id: source.id,
      firstName: source.firstName,
      lastName: source.lastName,
      position: source.position,
      teamId: source.pool === "free_agent" ? FREE_AGENT_TEAM_ID : team.id,
      previousTeamId: source.previousTeamId,
      teamStartSeason: source.pool === "free_agent" ? undefined : contractOrigin === "rookie" || contractOrigin === "udfa" ? draftYear : initialTeamStartSeason(source.age, contractYears, seasonYear, rng.fork("team-start")),
      draftYear,
      draftRound: source.draftRound,
      draftOverallPick: source.draftOverallPick,
      draftOriginalTeamId: source.draftRound ? team.id : undefined,
      acquisitionSource: source.pool === "free_agent" ? "free-agent" : "year-zero",
      collegeId: source.collegeId,
      age: source.age,
      overall,
      potential: Math.max(overall, source.potential),
      ratings,
      attributes,
      positionFits,
      salary,
      contractYears,
      contract: makeContract({ position: source.position, salary, contractYears, age: source.age, overall, potential: source.potential }, seasonYear, {
        origin: contractOrigin,
        rights: source.pool === "free_agent" ? "ufa" : "none",
        years: contractYears,
        apy: salary,
        signingBonus: source.pool === "practice_squad" ? 0 : undefined,
        guaranteedTotal: source.pool === "practice_squad" ? 0 : undefined,
        fifthYearOption: source.fifthYearOptionEligible ? {
          eligible: true,
          seasonYear: (source.draftYear ?? draftYear) + 4
        } : undefined
      }),
      medical: makeup.medical,
      status: source.pool === "practice_squad" ? "practice" : reserveInjury ? "injured" : "active",
      practiceSquad: source.pool === "practice_squad",
      practiceSquadSignedWeek: source.pool === "practice_squad" ? 1 : undefined,
      practiceSquadSignedSeason: source.pool === "practice_squad" ? seasonYear : undefined,
      practiceSquadOriginalSalary: source.pool === "practice_squad" ? Math.max(0.75, source.salary * 2.8) : undefined,
      reserveStatus: reserveInjury ? "ir" as const : undefined,
      irPlacedWeek: reserveInjury ? 1 : undefined,
      irPlacedDate: reserveInjury ? leagueYearStartDate(seasonYear) : undefined,
      irPlacedSeason: reserveInjury ? seasonYear : undefined,
      irEligibleWeek: reserveInjury ? 1 + Math.max(4, Math.min(12, reserveInjury.weeksRemaining)) : undefined,
      injuryWeeks: reserveInjury?.weeksRemaining ?? 0,
      injury: reserveInjury,
      suspensionWeeks: 0,
      makeup,
      traits: playerTraits,
      development,
      stats: emptyStats(),
      playoffStats: emptyStats(),
      statHistory: (proHistoryByPlayerId.get(source.id) ?? [])
        .sort((a, b) => (b.seasonYear ?? 2026 + b.seasonOffset) - (a.seasonYear ?? 2026 + a.seasonOffset))
        .map((row) => yearZeroNflProductionToStatHistory(row, source, teamById))
    } as Player;
    const normalized = normalizePlayerModel(shell, `${seed}:year-zero:nfl:${source.id}`);
    if (source.pool === "practice_squad") {
      return toPracticeSquadPlayer(normalized, { seasonYear, currentWeek: 1 });
    }
    return normalized;
  });
}

type NormalizedCareerOptions = Required<Pick<NewCareerOptions, "selectedTeamId" | "mode" | "seed" | "scenario">> & {
  careerType: CareerType;
  selectedSchoolId?: string;
};

function generatedContractApyBounds(player: Pick<Player, "position" | "overall">): { min: number; max: number } {
  if (player.position === "QB") {
    return player.overall >= 74 ? { min: 24, max: 48 } : player.overall >= 66 ? { min: 8, max: 26 } : { min: 0.95, max: 12 };
  }
  if (player.position === "K" || player.position === "P") return { min: 0.82, max: 4.6 };
  if (["EDGE", "LT", "CB", "WR"].includes(player.position)) return player.overall >= 70 ? { min: 8, max: 24 } : { min: 0.85, max: 14 };
  return player.overall >= 70 ? { min: 5.5, max: 18 } : { min: 0.85, max: 11 };
}

function resyncScenarioContract(player: Player, seasonYear: number, rosterBias: number): Player {
  if (!player.contract) return player;
  if (player.contract.origin !== "generated") return syncPlayerContractFields(player, seasonYear);
  const remainingYears = Math.max(1, player.contract.seasons.filter((season) => !season.voidYear && season.seasonYear >= seasonYear).length || player.contractYears || 1);
  const multiplier = clamp(1 + rosterBias * 0.022, 0.82, 1.18);
  const bounds = generatedContractApyBounds(player);
  const apy = Number(clamp(player.contract.apy * multiplier, bounds.min, bounds.max).toFixed(2));
  return syncPlayerContractFields({
    ...player,
    contract: makeContract(player, seasonYear, {
      origin: player.contract.origin,
      rights: player.contract.rights,
      years: remainingYears,
      apy,
      security: player.contract.security
    })
  }, seasonYear);
}

function normalizeCareerOptions(
  selectedTeamOrOptions: string | NewCareerOptions = "chi",
  legacyMode: SaveMode = "goals",
  legacySeed?: string
): NormalizedCareerOptions {
  if (typeof selectedTeamOrOptions === "object") {
    const selectedTeamId = selectedTeamOrOptions.selectedTeamId ?? "chi";
    return {
      careerType: selectedTeamOrOptions.careerType ?? "nfl",
      selectedTeamId,
      selectedSchoolId: selectedTeamOrOptions.selectedSchoolId,
      mode: selectedTeamOrOptions.mode ?? "goals",
      seed: selectedTeamOrOptions.seed?.trim() || `2026-${selectedTeamId}`,
      scenario: selectedTeamOrOptions.scenario ?? "neutral"
    };
  }

  return {
    careerType: "nfl",
    selectedTeamId: selectedTeamOrOptions,
    mode: legacyMode,
    seed: legacySeed ?? `2026-${selectedTeamOrOptions}`,
    scenario: "neutral"
  };
}

function createCollegeManagementState(schools: CollegeProgram[]): CollegeManagementState {
  return {
    recruitingPriorities: {},
    hiddenRecruitIds: [],
    depthOverrides: Object.fromEntries(schools.map((school) => [school.id, {}])),
    trainingFocus: Object.fromEntries(schools.map((school) => [school.id, "balanced"])),
    fatiguePosture: Object.fromEntries(schools.map((school) => [school.id, "standard"])),
    nilAllocationByPosition: Object.fromEntries(schools.map((school) => [school.id, {}])),
    transferWatchlist: [],
    jobMarketOpen: false
  };
}

export function createNewSave(): GameSave;
export function createNewSave(options: NewCareerOptions): GameSave;
export function createNewSave(selectedTeamId: string, mode?: SaveMode, seed?: string): GameSave;
export function createNewSave(
  selectedTeamOrOptions: string | NewCareerOptions = "chi",
  legacyMode: SaveMode = "goals",
  legacySeed?: string
): GameSave {
  const options = normalizeCareerOptions(selectedTeamOrOptions, legacyMode, legacySeed);
  const pipelineData = loadPipelineDataBundle();
  const seed = options.seed;
  const rng = createRng(seed);
  const teams = nflTeams;
  const schools = collegePrograms;
  const selectedTeam = teams.find((team) => team.id === options.selectedTeamId) ?? teams[0];
  const selectedSchool = schools.find((school) => school.id === options.selectedSchoolId) ?? schools[0];
  const scenario = options.scenario;
  const mode = options.mode;
  const scenarioProfile = scenarioProfileFor(scenario, seed, selectedTeam.id);
  const yearZero = createYearZeroBootstrapState(seed, teams, schools);
  const baseNflPlayers = yearZeroNflPlayersToLivePlayers(yearZero.nflPlayers, teams, schools, seed, 2026, yearZero.nflReserveStatuses, yearZero.productionHistory);
  const selectedTeamQbRank = new Map(baseNflPlayers
    .filter((player) => player.teamId === selectedTeam.id && player.position === "QB" && !player.practiceSquad)
    .sort((a, b) => b.overall - a.overall || b.potential - a.potential)
    .map((player, index) => [player.id, index]));
  const players = baseNflPlayers.map((player) => {
    if (player.teamId !== selectedTeam.id || player.practiceSquad) return player;
    const playerRng = createRng(`${seed}:scenario-bias:${selectedTeam.id}:${player.id}`);
    const qbRank = selectedTeamQbRank.get(player.id);
    const appliedBias = player.position === "QB" && qbRank !== undefined && qbRank > 0 && scenarioProfile.rosterBias > 0
      ? qbRank === 1 ? Math.min(3, Math.round(scenarioProfile.rosterBias * 0.35)) : Math.min(1, Math.round(scenarioProfile.rosterBias * 0.15))
      : scenarioProfile.rosterBias;
    const qbCap = player.position === "QB" && qbRank !== undefined && qbRank > 0 ? qbRank === 1 ? 66 : 58 : 95;
    const targetOverall = Math.round(clamp(player.overall + appliedBias, 35, qbCap));
    const calibrated = calibrateYearZeroRatings(player.position, targetOverall, playerRng.fork("ratings"), Math.min(qbCap, targetOverall + 1));
    const overall = calibrated.overall;
    const ratings = calibrated.ratings;
    return resyncScenarioContract({
      ...player,
      overall,
      potential: Math.max(overall, Math.round(clamp(player.potential + scenarioProfile.rosterBias, overall, 98))),
      ratings,
      attributes: legacyAttributesFromRatings(player.position, ratings),
      positionFits: generatePositionFits({ position: player.position, ratings, traits: player.traits })
    }, 2026, appliedBias);
  });
  const staff = teams.flatMap((team) =>
    generateStaff(team, rng.fork(`${team.id}:staff`), team.id === selectedTeam.id ? scenarioProfile.staffBias : 0)
  );
  const selectedScouting = staff
    .filter((member) => member.teamId === selectedTeam.id && member.department === "Scouting")
    .reduce((sum, member) => sum + member.ratings.scouting, 0) / 7;
  const yearZeroProspects = yearZeroDraftClassToLiveProspects(yearZero.draftClass, schools, selectedScouting, seed, yearZero.productionHistory);
  const cappedProspectPool = applySchoolPositionDuplicateCaps(yearZeroProspects, schools);
  const initialProspects = rankProspectBoard(cappedProspectPool, schools, seed).slice(0, 460).map((prospect) => {
    const scaled = calibrateFreshDraftProspect(prospect, seed);
    return {
      ...scaled,
      consensusProgress: Math.min(50, scaled.consensusProgress),
      scouted: {
        ...scaled.scouted,
        confidence: Math.min(50, scaled.scouted.confidence),
        progress: Math.min(50, scaled.scouted.progress)
      }
    };
  });
  const draftEvaluation = generateDraftEvaluationState(seed, 2027, initialProspects, 1, schools);
  const prospects = applyDraftEvaluationToProspects(initialProspects, draftEvaluation, schools, `${seed}:2027:evaluated`).map((prospect) => ({
    ...prospect,
    consensusProgress: Math.min(50, prospect.consensusProgress),
    scouted: {
      ...prospect.scouted,
      confidence: Math.min(50, prospect.scouted.confidence),
      progress: Math.min(50, prospect.scouted.progress)
    }
  }));
  const annualRecruitClass = generateAnnualRecruitClass(seed, 2026);
  const annualDebug = annualRuntimeDebug();
  const previousSeasonRanks = divisionRanksFromPlayers(teams, players, seed);
  const schedule = generateLeagueSchedule(teams, seed, previousSeasonRanks, 2026);
  const staffMarket = generateStaffMarket(teams, seed, 1);
  const draftPicks = createDraftPicks(teams, selectedTeam.id, scenarioProfile, rng.fork("draft-picks"));
  const collegeRoster = createInitialCollegeRosterState(yearZero, 2026);
  const collegeSeasonResults = generateCollegeSeasonResults(seed, collegeRoster, 2026);
  const collegeTraining = generateCollegeTrainingBanks(seed, 2026, collegeRoster, collegeSeasonResults);
  const schoolProfiles = buildSchoolProfileState(schools, seed, 2026);
  const annualRecruiting = generateAnnualRecruitingState(seed, 2026, schools, annualRecruitClass.recruits, 1, schoolProfiles, collegeRoster);

  const rawSave: GameSave = {
    version: 1,
    yearZero,
    collegeRoster,
    collegeTraining,
    schoolProfiles,
    collegeSeasonResults,
    collegeMorale: generateCollegeMoraleState(seed, 2026, collegeRoster, collegeSeasonResults, annualRecruiting, collegeTraining),
    draftEvaluation,
    seed,
    seasonYear: 2026,
    previousSeasonRanks,
    careerType: options.careerType,
    selectedSchoolId: options.careerType === "college" ? selectedSchool.id : undefined,
    careerEmployment: {
      level: options.careerType,
      organizationId: options.careerType === "college" ? selectedSchool.id : selectedTeam.id,
      contractStartSeason: 2026,
      contractEndSeason: 2029,
      status: "active",
      history: [{
        level: options.careerType,
        organizationId: options.careerType === "college" ? selectedSchool.id : selectedTeam.id,
        startSeason: 2026,
        status: "active",
        summary: options.careerType === "college" ? `Hired by ${selectedSchool.name}.` : `Hired by ${selectedTeam.fullName}.`
      }]
    },
    collegeManagement: createCollegeManagementState(schools),
    selectedTeamId: selectedTeam.id,
    mode,
    scenario,
    currentWeek: 1,
    currentDate: leagueYearStartDate(2026),
    leagueYearStartDate: leagueYearStartDate(2026),
    calendarPhase: "league-year",
    seasonCalendar: [],
    phase: "free-agency",
    teams,
    schools,
    players,
    staff,
    prospects,
    annualPipeline: {
      version: "v11_6_4",
      lastGeneratedDraftYear: 2027,
      runtimeCsvs: annualDebug.loadedRuntimeCsvs,
      rngStreams: annualDebug.rngStreams,
      schemaValidatedCsvs: annualDebug.schemaValidatedCsvs,
      schemaValidatedColumns: annualDebug.schemaValidatedColumns,
      parserRulesApplied: annualDebug.parserRulesApplied,
      fallbackAuditCount: pipelineData.validation.fallbackAudit.length,
      validationErrors: pipelineData.validation.errors,
      usesYearZeroBundles: annualDebug.usesYearZeroBundles
    },
    annualRecruiting,
    annualRecruitClass,
    schedule,
    records: createRecords(teams),
    inbox: [],
    draftPicks,
    draftState: createDraftState(draftPicks),
    scoutingPlan: createScoutingPlan(staff, selectedTeam.id, prospects),
    staffMarket,
    budget: createBudget(players, teams, selectedTeam.id, scenarioProfile),
    capSettings: Object.fromEntries(teams.map((team) => [team.id, {
      salaryCap: NFL_SALARY_CAP_2026 + (team.id === selectedTeam.id ? scenarioProfile.budgetBias : 0),
      rookieReserve: 0,
      franchiseTagUsed: false,
      transitionTagUsed: false
    }])),
    deadMoney: [],
    compPickLedger: { seasonYear: 2026, entries: [], projections: [] },
    freeAgencyMarket: { seasonYear: 2026, currentWave: 1, offers: [], decisions: [] },
    goals: createGoals(selectedTeam, mode, scenarioProfile),
    depthOverrides: Object.fromEntries(teams.map((team) => [team.id, {}])),
    freeAgencyLog: [],
    developmentReports: [],
    medicalHistory: yearZeroReserveMedicalHistory(players, yearZero.nflReserveStatuses, 2026),
    careerEndedRecords: [],
    irReturnUsage: Object.fromEntries(teams.map((team) => [team.id, 0]))
  };
  return refreshCalendar(normalizeCapState({
    ...rawSave,
    annualRosterImportPlan: generateAnnualRosterImportPlan(rawSave, 2026)
  }));
}
