import { collegePrograms } from "../data/collegePrograms";
import { generatedName } from "../data/names";
import { nflTeams } from "../data/nflTeams";
import { prospectSchoolWeight } from "../data/prospectTierRankings";
import { clamp, createRng, slugify, type Rng } from "../lib/rng";
import {
  POSITIONS,
  type Attributes,
  type CareerScenario,
  type CollegeProgram,
  type DraftPick,
  type DraftState,
  type FranchiseGoals,
  type Game,
  type GameSave,
  type InboxItem,
  type NewCareerOptions,
  type NFLTeam,
  type Player,
  type PlayerStats,
  type Position,
  type PositionGroup,
  type Prospect,
  type SaveMode,
  type ScoutingAssignment,
  type ScoutingPlan,
  type ScoutingRegion,
  type StaffCandidate,
  type StaffMarketState,
  type StaffMember,
  type TeamRecord
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
import { makeContract, normalizeCapState, NFL_SALARY_CAP_2026 } from "./cap";
import { generateDevelopmentProfile, playerPotentialFor, prospectPotentialFor } from "./development";
import { FREE_AGENT_TEAM_ID } from "./freeAgents";
import { normalizePlayerModel, normalizeProspectModel } from "./playerModel";
import { practiceSquadPositionPlan, practiceSquadSalary, toPracticeSquadPlayer } from "./practiceSquad";
import { generatePositionFits, versatilityBonus } from "./positionEligibility";
import { geographicRegionForSchool, scoutingRegionList } from "./regions";
import { leagueYearStartDate, refreshCalendar } from "./calendar";
import { divisionRanksFromPlayers, generateLeagueSchedule, generateSchedule } from "./schedule";
import { applyScoutingProjection, ensureProspectConcerns, positionDraftValue, rankProspectBoard } from "./scouting";
import { collegeConferences, createStaffMemberForSlot, staffDepartmentFor, staffOverall, staffSlotDefinitions, staffValueScore } from "./staffModel";

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

const emptyStats = (): PlayerStats => ({
  games: 0,
  snaps: 0,
  offenseSnaps: 0,
  defenseSnaps: 0,
  specialTeamsSnaps: 0,
  passYards: 0,
  rushYards: 0,
  receivingYards: 0,
  tackles: 0,
  sacks: 0,
  interceptions: 0,
  touchdowns: 0
});

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
  const base = Math.pow(clamp((overall - 38) / 42, 0.04, 1.35), 2.15) * 22 * positionPremium[position];
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
  const score = overall * 0.64 + potential * 0.36 + positionDraftValue(position) * 0.42;
  if (score >= 64) return 1;
  if (score >= 60) return 2;
  if (score >= 56) return 3;
  if (score >= 53) return 4;
  if (score >= 50) return 5;
  if (score >= 47) return 6;
  return 7;
}

function scoutingNote(prospect: Pick<Prospect, "traits" | "production">, school: CollegeProgram, rng: Rng): string {
  const lead = school.subdivision === "FCS" ? "Small-school profile" : "Power-conference sample";
  const trait = rng.pick(prospect.traits);
  const production = prospect.production > 80 ? "dominant production" : prospect.production > 65 ? "steady production" : "uneven production";
  return `${lead}; ${production}; ${trait.toLowerCase()} stands out.`;
}

const regionCycle: ScoutingRegion[] = ["East", "South", "Midwest", "West"];
const prospectPositionWeights: Array<[Position, number]> = [
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
      prospectPositionWeights.filter(([candidate]) => (positionCounts.get(candidate) ?? 0) < positionCap(candidate)),
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
  draftYear: number
): Pick<GameSave, "prospects" | "draftPicks" | "draftState" | "scoutingPlan"> {
  const rng = createRng(`${seed}:season-draft-assets:${draftYear}`);
  const selectedScouting =
    staff
      .filter((member) => member.teamId === selectedTeamId && member.department === "Scouting")
      .reduce((sum, member) => sum + member.ratings.scouting, 0) / 7 || 50;
  const prospects = generateProspects(schools, rng.fork("prospects"), selectedScouting, `${seed}:${draftYear}`);
  const draftPicks = createDraftPicks(teams, selectedTeamId, neutralScenarioProfile, rng.fork("draft-picks"), draftYear, { includeSeededCompPicks: false });
  return {
    prospects,
    draftPicks,
    draftState: createDraftState(draftPicks),
    scoutingPlan: createScoutingPlan(staff, selectedTeamId, prospects)
  };
}

function initialInbox(selectedTeam: NFLTeam, staff: StaffMember[], prospects: Prospect[]): InboxItem[] {
  const headCoach = staff.find((member) => member.teamId === selectedTeam.id && member.role === "Head Coach");
  const leadScout = staff.find((member) => member.teamId === selectedTeam.id && member.department === "Scouting");
  const topProspect = prospects[0];
  return [
    {
      id: "welcome",
      week: 0,
      category: "staff",
      title: `${selectedTeam.fullName} war room is open`,
      body: `${headCoach?.firstName ?? "Your coach"} ${headCoach?.lastName ?? ""} recommends setting the depth chart around the best 53 now, then revisiting after Week 3 trends settle.`,
      priority: "high",
      read: false
    },
    {
      id: "scouting-kickoff",
      week: 0,
      category: "scouting",
      title: "Initial national scouting board",
      body: `${leadScout?.lastName ?? "Scouting"} has ${topProspect.firstName} ${topProspect.lastName}, ${topProspect.position} from ${topProspect.projectedRound <= 2 ? "a premium tier" : "the top watch list"}, as an early Round ${topProspect.projectedRound} target.`,
      priority: "normal",
      read: false
    },
    {
      id: "budget-snapshot",
      week: 0,
      category: "budget",
      title: "Cap desk is live",
      body: "Contracts now track yearly cap hits, guarantees, dead money, restructures, tags, tenders, and compensatory-pick impact.",
      priority: "low",
      read: false
    }
  ];
}

function normalizeCareerOptions(
  selectedTeamOrOptions: string | NewCareerOptions = "chi",
  legacyMode: SaveMode = "goals",
  legacySeed?: string
): Required<NewCareerOptions> {
  if (typeof selectedTeamOrOptions === "object") {
    const selectedTeamId = selectedTeamOrOptions.selectedTeamId ?? "chi";
    return {
      selectedTeamId,
      mode: selectedTeamOrOptions.mode ?? "goals",
      seed: selectedTeamOrOptions.seed?.trim() || `2026-${selectedTeamId}`,
      scenario: selectedTeamOrOptions.scenario ?? "neutral"
    };
  }

  return {
    selectedTeamId: selectedTeamOrOptions,
    mode: legacyMode,
    seed: legacySeed ?? `2026-${selectedTeamOrOptions}`,
    scenario: "neutral"
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
  const seed = options.seed;
  const rng = createRng(seed);
  const teams = nflTeams;
  const schools = collegePrograms;
  const selectedTeam = teams.find((team) => team.id === options.selectedTeamId) ?? teams[0];
  const scenario = options.scenario;
  const mode = options.mode;
  const scenarioProfile = scenarioProfileFor(scenario, seed, selectedTeam.id);
  const rosterPlayers = teams.flatMap((team) =>
    generateRoster(team, schools, rng.fork(`${team.id}:roster`), team.id === selectedTeam.id ? scenarioProfile.rosterBias : 0)
  );
  const practiceSquadPlayers = teams.flatMap((team) => generatePracticeSquad(team, schools, rng.fork(`${team.id}:practice-squad`), 2026));
  const players = [...rosterPlayers, ...practiceSquadPlayers, ...generateFreeAgentPool(teams, schools, seed)];
  const staff = teams.flatMap((team) =>
    generateStaff(team, rng.fork(`${team.id}:staff`), team.id === selectedTeam.id ? scenarioProfile.staffBias : 0)
  );
  const selectedScouting = staff
    .filter((member) => member.teamId === selectedTeam.id && member.department === "Scouting")
    .reduce((sum, member) => sum + member.ratings.scouting, 0) / 7;
  const prospects = generateProspects(schools, rng.fork("prospects"), selectedScouting, seed);
  const previousSeasonRanks = divisionRanksFromPlayers(teams, players, seed);
  const schedule = generateLeagueSchedule(teams, seed, previousSeasonRanks, 2026);
  const staffMarket = generateStaffMarket(teams, seed, 1);
  const draftPicks = createDraftPicks(teams, selectedTeam.id, scenarioProfile, rng.fork("draft-picks"));

  const rawSave: GameSave = {
    version: 1,
    seed,
    seasonYear: 2026,
    previousSeasonRanks,
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
    schedule,
    records: createRecords(teams),
    inbox: initialInbox(selectedTeam, staff, prospects),
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
    medicalHistory: [],
    careerEndedRecords: [],
    irReturnUsage: Object.fromEntries(teams.map((team) => [team.id, 0]))
  };
  return refreshCalendar(normalizeCapState(rawSave));
}
