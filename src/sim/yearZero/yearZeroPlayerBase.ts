import { generatedName } from "../../data/names";
import { clamp, createRng, type Rng } from "../../lib/rng";
import type { CollegeProgram, ContractOrigin, InjurySeverity, NFLTeam, PlayerStats, Position, ScoutingRegion, YearZeroAwardHistory, YearZeroCollegePlayer, YearZeroDraftProspect, YearZeroHighSchoolRecruit, YearZeroInjuryHistory, YearZeroNflAgingSnapshot, YearZeroNflContractHistoryEvent, YearZeroNflPlayer, YearZeroNflReserveStatus, YearZeroProductionSeason, YearZeroScoutingView, YearZeroTeamStrengthContext, YearZeroTransferPortalEntry, YearZeroUdfaPath } from "../../types";
import { emptyPlayerStats } from "../stats";
import { POSITIONS } from "../../types";
import { PRACTICE_SQUAD_EXPERIENCED_LIMIT, PRACTICE_SQUAD_SIZE, PRACTICE_SQUAD_VETERAN_LIMIT } from "../practiceSquad";
import type { YearZeroBundleStore, YearZeroRecord } from "./yearZeroBundleLoader";

const collegeRosterTemplate: Array<[Position, number]> = [
  ["QB", 6],
  ["RB", 8],
  ["WR", 14],
  ["TE", 7],
  ["LT", 6],
  ["LG", 6],
  ["C", 5],
  ["RG", 6],
  ["RT", 6],
  ["EDGE", 9],
  ["DL", 10],
  ["LB", 10],
  ["CB", 8],
  ["S", 6],
  ["K", 2],
  ["P", 1]
];

const nflActiveRosterTemplate: Array<[Position, number]> = [
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

const yearZeroFreeAgentTemplate: Array<[Position, number]> = [
  ["QB", 14],
  ["RB", 22],
  ["WR", 42],
  ["TE", 22],
  ["LT", 18],
  ["LG", 18],
  ["C", 18],
  ["RG", 18],
  ["RT", 18],
  ["EDGE", 28],
  ["DL", 30],
  ["LB", 30],
  ["CB", 34],
  ["S", 24],
  ["K", 12],
  ["P", 10]
];

function targetTemplateFromRows(store: YearZeroBundleStore, domain: string, sourceTable: string, fallback: Array<[Position, number]>): Array<[Position, number]> {
  let rows: YearZeroRecord[];
  try {
    rows = store.getYearZeroRecords(domain, sourceTable);
  } catch {
    return fallback;
  }
  if (!rows.length) return fallback;
  const grouped = new Map<string, Array<[Position, number]>>();
  for (const row of rows) {
    const position = textPayload(row, ["position"], row.rowKey) as Position;
    if (!POSITIONS.includes(position)) continue;
    const target = Math.max(0, Math.round(numberPayload(row, ["target_count", "target_players"], 0)));
    if (target <= 0) continue;
    const profileId = textPayload(row, ["profile_id", "exact_sum_group"], "default");
    grouped.set(profileId, [...(grouped.get(profileId) ?? []), [position, target]]);
  }
  const candidates = [...grouped.values()].filter((template) => template.length > 0);
  if (!candidates.length) return fallback;
  return candidates
    .sort((a, b) => Math.abs(templateCount(a) - templateCount(fallback)) - Math.abs(templateCount(b) - templateCount(fallback)))
    [0];
}

function templateCount(template: Array<[Position, number]>): number {
  return template.reduce((sum, [, count]) => sum + count, 0);
}

function numberPayload(record: Pick<YearZeroRecord, "payload">, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = record.payload[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function textPayload(record: Pick<YearZeroRecord, "payload">, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record.payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function schoolQualityBase(school: CollegeProgram, store: YearZeroBundleStore): number {
  const rows = store.getYearZeroRuntimeRecords("college_rosters", "initial_college_roster_quality_by_program");
  const prestigeBase = 43 + school.prestige * 0.22 + school.competition * 0.07;
  const packageMidpoint = rows.length > 0
    ? rows.reduce((sum, row) => sum + numberPayload(row, ["overall_mid", "mean", "rating", "college_overall"], 58), 0) / rows.length
    : 58;
  return clamp(prestigeBase * 0.78 + packageMidpoint * 0.22, 36, 70);
}

function classYearForSlot(slot: number, rng: Rng): YearZeroCollegePlayer["classYear"] {
  if (slot % 5 === 0) return "RS-SO";
  return rng.pick(["FR", "SO", "JR", "SR"]);
}

export function generateYearZeroCollegePlayers(seed: string, schools: CollegeProgram[], store: YearZeroBundleStore): YearZeroCollegePlayer[] {
  // Touch the required gameplay source tables so missing package data fails before generation.
  store.getYearZeroRuntimeRecords("college_rosters", "initial_college_position_min_max_bounds");
  store.getYearZeroWeightRows("college_rosters", "initial_college_class_distribution");
  store.getYearZeroWeightRows("college_rosters", "initial_college_role_distribution");
  store.getYearZeroWeightRows("college_rosters", "initial_college_roster_source_mix_by_class");
  const rosterTemplate = targetTemplateFromRows(store, "college_rosters", "initial_college_position_targets_by_profile", collegeRosterTemplate);

  return schools.flatMap((school) => {
    const rng = createRng(`${seed}:year-zero:college-roster:${school.id}`);
    const usedNames = new Set<string>();
    const base = schoolQualityBase(school, store);
    let counter = 0;
    return rosterTemplate.flatMap(([position, count]) =>
      Array.from({ length: count }, (_, slotIndex) => {
        counter += 1;
        const identity = generatedName(rng, usedNames);
        const slot = slotIndex + 1;
        const target = collegeRoleRatingTarget(position, slot, base, school);
        const collegeOverall = Math.round(clamp(rng.normal(target.mean, target.deviation), target.min, target.max));
        return {
          id: `yz-college-${school.id}-${counter}`,
          ...identity,
          schoolId: school.id,
          position,
          classYear: classYearForSlot(counter, rng),
          age: rng.int(18, 23),
          collegeOverall,
          collegePotential: Math.round(clamp(collegeOverall + rng.int(2, 18), collegeOverall, 99)),
          ratingScaleContext: "college",
          source: "year_zero_college_roster"
        } satisfies YearZeroCollegePlayer;
      })
    );
  });
}

function collegeStarterSlots(position: Position): number {
  if (position === "QB" || position === "TE" || position === "K" || position === "P") return 1;
  if (["RB", "EDGE", "DL", "S"].includes(position)) return 2;
  if (position === "WR" || position === "LB" || position === "CB") return 3;
  return 1;
}

function collegeRoleRatingTarget(position: Position, slot: number, schoolBase: number, school: CollegeProgram): { mean: number; deviation: number; min: number; max: number } {
  const strength = clamp((schoolBase - 54) / 16, -1.15, 1.25);
  const starterSlots = collegeStarterSlots(position);
  const premium = ["QB", "EDGE", "LT", "CB", "WR"].includes(position) ? 1.2 : position === "K" || position === "P" ? -1.6 : 0;
  if (slot <= starterSlots) {
    const eliteChance = clamp((school.prestige - 72) / 900 + (school.competition - 72) / 1300, 0, 0.08);
    return {
      mean: 60 + strength * 5.4 + premium - (slot - 1) * 1.2,
      deviation: 4.1,
      min: 47,
      max: schoolBase >= 62 && eliteChance > 0.025 ? 84 : 78
    };
  }
  if (slot <= starterSlots + 3) {
    return {
      mean: 50 + strength * 4.2 + premium * 0.5 - (slot - starterSlots - 1) * 1.4,
      deviation: 4.8,
      min: 34,
      max: 66
    };
  }
  return {
    mean: 40 + strength * 3.5 - (slot - starterSlots - 4) * 0.75,
    deviation: 5.4,
    min: 25,
    max: 58
  };
}

function translateCollegeToNfl(collegeOverall: number, store: YearZeroBundleStore): number {
  const rows = store.getYearZeroRuntimeRecords("draft_translation", "college_to_nfl_rating_translation");
  const midpoint = rows.length > 0
    ? rows.slice(0, 60).reduce((sum, row) => sum + numberPayload(row, ["nfl_rating", "nfl_value", "output_rating"], 58), 0) / Math.min(60, rows.length)
    : 58;
  return Math.round(clamp(collegeOverall * 0.82 + midpoint * 0.18 - 11, 28, 76));
}

function projectedRoundFor(nflOverall: number, position: Position): number {
  const maxPremium = position === "QB" ? 4.5 : ["EDGE", "LT"].includes(position) ? 3 : ["CB", "WR"].includes(position) ? 2.5 : 1;
  const gate = position === "QB" ? 57 : 54;
  const premium = nflOverall < gate || position === "K" || position === "P"
    ? position === "K" || position === "P" ? -12 : 0
    : clamp(maxPremium * ((nflOverall - gate) / 8), 0, maxPremium);
  const score = nflOverall + premium;
  if (score >= 58) return 1;
  if (score >= 55) return 2;
  if (score >= 52) return 3;
  if (score >= 49) return 4;
  if (score >= 46) return 5;
  if (score >= 43) return 6;
  return 7;
}

function isDraftEligibleClass(classYear: YearZeroCollegePlayer["classYear"]): classYear is YearZeroDraftProspect["classYear"] {
  return classYear === "JR" || classYear === "SR" || classYear === "RS-SO";
}

export function generateYearZeroDraftClass(seed: string, collegePlayers: YearZeroCollegePlayer[], store: YearZeroBundleStore): YearZeroDraftProspect[] {
  store.getYearZeroRuleRows("draft_translation", "draft_class_eligibility_rules");
  store.getYearZeroWeightRows("draft_translation", "draft_class_selection_weights");
  store.getYearZeroRuntimeRecords("draft_translation", "college_to_nfl_position_translation_profiles");
  store.getYearZeroRuntimeRecords("draft_translation", "draft_tier_rookie_rating_anchors");
  const rng = createRng(`${seed}:year-zero:draft-class`);
  const sortedEligible = collegePlayers
    .filter((player): player is YearZeroCollegePlayer & { classYear: YearZeroDraftProspect["classYear"] } => isDraftEligibleClass(player.classYear))
    .map((player) => ({ player, score: player.collegeOverall + (player.classYear === "SR" ? 5 : 0) + rng.float(0, 14) }))
    .sort((a, b) => b.score - a.score);
  const positionCaps = new Map<Position, number>([
    ["QB", 18],
    ["K", 10],
    ["P", 10]
  ]);
  const selectedCounts = new Map<Position, number>();
  const eligible: typeof sortedEligible = [];
  for (const candidate of sortedEligible) {
    const cap = positionCaps.get(candidate.player.position) ?? 80;
    const current = selectedCounts.get(candidate.player.position) ?? 0;
    if (current >= cap) continue;
    eligible.push(candidate);
    selectedCounts.set(candidate.player.position, current + 1);
    if (eligible.length >= 760) break;
  }
  const positionCounts = new Map<Position, number>(POSITIONS.map((position) => [position, 0]));
  return eligible.map(({ player }, index) => {
    const nflOverall = translateCollegeToNfl(player.collegeOverall, store);
    positionCounts.set(player.position, (positionCounts.get(player.position) ?? 0) + 1);
    return {
      id: `yz-draft-${index + 1}-${player.id}`,
      collegePlayerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      schoolId: player.schoolId,
      position: player.position,
      classYear: player.classYear,
      collegeOverall: player.collegeOverall,
      nflOverall,
      nflPotential: Math.round(clamp(nflOverall + rng.int(1, 12), nflOverall, 79)),
      projectedRound: projectedRoundFor(nflOverall, player.position),
      ratingScaleContext: "nfl",
      source: "year_zero_draft_class"
    } satisfies YearZeroDraftProspect;
  });
}

export function extractYearZeroTransferPortal(
  seed: string,
  schools: CollegeProgram[],
  collegePlayers: YearZeroCollegePlayer[],
  store: YearZeroBundleStore
): { retainedCollegePlayers: YearZeroCollegePlayer[]; transferPortal: YearZeroTransferPortalEntry[] } {
  store.getYearZeroWeightRows("transfer_portal", "initial_transfer_portal_class_mix");
  store.getYearZeroWeightRows("transfer_portal", "transfer_portal_quality_distribution");
  const reasonRows = store.getYearZeroWeightRows("transfer_portal", "transfer_portal_reason_weights");
  store.getYearZeroRuleRows("transfer_portal", "transfer_portal_origin_destination_rules");
  store.getYearZeroRuleRows("transfer_portal", "transfer_portal_roster_repair_rules");
  store.getYearZeroRuntimeRecords("transfer_repair", "transfer_repair_quality_caps");
  store.getYearZeroRuleRows("transfer_repair", "transfer_repair_external_addition_rules");
  store.getYearZeroRuleRows("transfer_repair", "transfer_roster_accounting_rules");

  const rng = createRng(`${seed}:year-zero:transfer-portal`);
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const removedIds = new Set<string>();
  const portal: YearZeroTransferPortalEntry[] = [];
  const repaired: YearZeroCollegePlayer[] = [];

  for (const school of schools) {
    const roster = collegePlayers.filter((player) => player.schoolId === school.id);
    const entrantCount = Math.max(1, Math.round(roster.length * 0.045));
    const candidates = rng.shuffle(roster.filter((player) => player.classYear !== "FR")).slice(0, entrantCount);
    const usedNames = new Set<string>();
    for (const player of candidates) {
      removedIds.add(player.id);
      const destinations = schools.filter((candidate) => candidate.id !== school.id);
      const desiredSchool = rng.pick(destinations);
      const reasonRow = reasonRows.length > 0 ? rng.pick(reasonRows) : undefined;
      const repairIdentity = generatedName(rng.fork(`repair:${player.id}`), usedNames);
      const repairedPlayer: YearZeroCollegePlayer = {
        id: `yz-transfer-repair-${school.id}-${player.id}`,
        ...repairIdentity,
        schoolId: school.id,
        position: player.position,
        classYear: rng.pick(["FR", "SO", "JR"]),
        age: rng.int(18, 22),
        collegeOverall: Math.round(clamp(player.collegeOverall - rng.int(4, 12), 32, 82)),
        collegePotential: Math.round(clamp(player.collegePotential - rng.int(0, 7), 35, 92)),
        ratingScaleContext: "college",
        source: "year_zero_college_roster"
      };
      repaired.push(repairedPlayer);
      portal.push({
        id: `yz-transfer-${player.id}`,
        playerId: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        originSchoolId: school.id,
        desiredSchoolId: schoolById.has(desiredSchool.id) ? desiredSchool.id : schools[0].id,
        position: player.position,
        classYear: player.classYear,
        collegeOverall: player.collegeOverall,
        reason: reasonRow ? textPayload(reasonRow, ["reason", "reason_id", "row_key"], reasonRow.rowKey) : "playing_time",
        repairedByPlayerId: repairedPlayer.id
      });
    }
  }

  return {
    retainedCollegePlayers: [...collegePlayers.filter((player) => !removedIds.has(player.id)), ...repaired],
    transferPortal: portal
  };
}

function convertBroadPosition(position: string, rng: Rng): Position {
  if (position === "ATH") return rng.pick(["WR", "CB", "S", "RB"]);
  if (position === "ST") return rng.pick(["K", "P"]);
  if (position === "OT") return rng.pick(["LT", "RT"]);
  if (position === "IOL") return rng.pick(["LG", "C", "RG"]);
  if (position === "IDL") return "DL";
  return POSITIONS.includes(position as Position) ? position as Position : rng.pick(POSITIONS);
}

export function generateYearZeroHighSchoolRecruits(seed: string, teams: NFLTeam[], store: YearZeroBundleStore): { recruits: YearZeroHighSchoolRecruit[]; scoutingViews: YearZeroScoutingView[] } {
  const positionRows = store.getYearZeroWeightRows("high_school_recruits", "hs_recruit_generation_position_distribution");
  const starRows = store.getYearZeroWeightRows("high_school_recruits", "star_distribution");
  store.getYearZeroDefinitionRows("high_school_recruits", "recruit_star_band_definitions");
  store.getYearZeroRuntimeRecords("high_school_recruits", "high_school_scouting_uncertainty");
  store.getYearZeroRuleRows("high_school_recruits", "star_scouting_visibility_rules");
  store.getYearZeroRuntimeRecords("high_school_recruits", "team_specific_scouting_uncertainty");
  store.getYearZeroRuntimeRecords("scouting", "scouting_base_uncertainty_by_pool_position_group");
  store.getYearZeroWeightRows("scouting", "scouting_bias_profile_weights");
  store.getYearZeroModifierRows("scouting", "scouting_team_context_confidence_modifiers");

  const rng = createRng(`${seed}:year-zero:high-school-recruits`);
  const regions: ScoutingRegion[] = ["East", "South", "Midwest", "West"];
  const usedNames = new Set<string>();
  type ChoiceRow = Pick<YearZeroRecord, "rowKey" | "payload">;
  const positionChoices: ChoiceRow[] = positionRows.length > 0 ? positionRows : POSITIONS.map((position) => ({ rowKey: position, payload: { position, weight: 1 } }));
  const starChoices: ChoiceRow[] = starRows.length > 0 ? starRows : [1, 2, 3, 4, 5].map((stars) => ({ rowKey: `${stars}`, payload: { stars, weight: stars === 5 ? 4 : stars === 4 ? 12 : stars === 3 ? 42 : 25 } }));
  const recruits = Array.from({ length: 6000 }, (_, index) => {
    const identity = generatedName(rng, usedNames);
    const positionRow = rng.pick(positionChoices);
    const starRow = rng.pick(starChoices);
    const stars = Math.round(clamp(numberPayload(starRow, ["stars", "star", "star_rating"], Number(starRow.rowKey) || 3), 1, 5)) as YearZeroHighSchoolRecruit["stars"];
    const projection = Math.round(clamp(38 + stars * 8 + rng.normal(0, 7), 30, 92));
    return {
      id: `yz-hs-${index + 1}`,
      ...identity,
      position: convertBroadPosition(textPayload(positionRow, ["position", "generation_position", "row_key"], positionRow.rowKey), rng),
      stars,
      region: rng.pick(regions),
      collegeProjection: projection,
      collegePotential: Math.round(clamp(projection + rng.int(3, 18), projection, 99)),
      visibleRankBand: stars >= 5 ? "national_blue_chip" : stars === 4 ? "national" : stars === 3 ? "regional" : "developmental",
      ratingScaleContext: "college",
      source: "year_zero_high_school_recruit"
    } satisfies YearZeroHighSchoolRecruit;
  });

  const scoutingViews = teams.flatMap((team) =>
    recruits.slice(0, 50).map((recruit) => {
      const viewRng = createRng(`${seed}:year-zero:hs-scout:${team.id}:${recruit.id}`);
      const confidence = viewRng.int(25, 68);
      const spread = Math.round(clamp(24 - confidence * 0.22, 6, 18));
      return {
        id: `yz-scout-${team.id}-${recruit.id}`,
        teamId: team.id,
        subjectType: "high_school_recruit",
        subjectId: recruit.id,
        visibleOverallLow: Math.max(1, recruit.collegeProjection - spread),
        visibleOverallHigh: Math.min(100, recruit.collegeProjection + spread),
        confidence,
        note: `${recruit.region} evaluation on a ${recruit.stars}-star ${recruit.position}.`
      } satisfies YearZeroScoutingView;
    })
  );

  return { recruits, scoutingViews };
}

interface YearZeroContractProfile {
  salary: number;
  contractYears: number;
  contractOrigin: ContractOrigin;
  draftYear?: number;
  draftRound?: number;
  draftOverallPick?: number;
  rookieContractYear?: number;
  fifthYearOptionEligible?: boolean;
}

function money(value: number): number {
  return Number(Math.max(0, value).toFixed(2));
}

function rookieDraftRound(position: Position, overall: number, potential: number, rng: Rng): number | undefined {
  const premiumBoost = position === "QB" ? 3 : ["EDGE", "LT", "CB", "WR"].includes(position) ? 1.5 : 0;
  const grade = overall * 0.72 + potential * 0.28 + premiumBoost + rng.float(-2.2, 2.2);
  if (grade >= 71) return 1;
  if (grade >= 66.5) return 2;
  if (grade >= 62.5) return 3;
  if (grade >= 59) return rng.float(0, 1) < 0.58 ? 4 : 5;
  if (grade >= 55.5) return rng.float(0, 1) < 0.55 ? 6 : 7;
  return rng.float(0, 1) < 0.35 ? 7 : undefined;
}

function rookieOverallPick(round: number, overall: number, potential: number, rng: Rng): number {
  const roundStart = (round - 1) * 32 + 1;
  const grade = clamp((overall * 0.68 + potential * 0.32 - 52) / 28, 0, 1);
  const pickInRound = Math.round(clamp(33 - grade * 26 + rng.normal(0, 4.5), 1, 32));
  return roundStart + pickInRound - 1;
}

function rookieScaleApy(position: Position, round: number | undefined, overallPick: number | undefined, overall: number, potential: number): number {
  if (!round) {
    return money(clamp(0.78 + Math.max(0, overall - 50) * 0.018, 0.78, 1.18));
  }
  const topPick = overallPick ?? (round - 1) * 32 + 16;
  const premium = position === "QB" ? 1.2 : ["EDGE", "LT", "CB", "WR"].includes(position) ? 1.08 : 1;
  const ceilingBump = clamp((potential - 72) * 0.035, 0, 0.7);
  const baseByRound = round === 1
    ? topPick <= 5 ? 7.6 : topPick <= 16 ? 5.25 : 3.45
    : round === 2 ? 2.05
      : round === 3 ? 1.45
        : round === 4 ? 1.15
          : round === 5 ? 1.02
            : round === 6 ? 0.94
              : 0.88;
  const maxByRound = round === 1 ? (position === "QB" && topPick <= 5 ? 10.2 : 8.8) : round === 2 ? 3.1 : round === 3 ? 2 : 1.45;
  return money(clamp(baseByRound * premium + ceilingBump + Math.max(0, overall - 66) * 0.08, 0.82, maxByRound));
}

function veteranContractApy(position: Position, overall: number, age: number, pool: YearZeroNflPlayer["pool"], rng: Rng): number {
  const ageFactor = age >= 33 ? 0.82 : age >= 30 ? 0.92 : age <= 23 ? 0.9 : 1;
  const marketNoise = rng.float(-0.35, 0.55);
  let apy: number;
  if (position === "QB") {
    apy = overall >= 76
      ? 38 + (overall - 76) * 2.4
      : overall >= 70
        ? 18 + (overall - 70) * 2.4
        : overall >= 63
          ? 6 + (overall - 63) * 1.25
          : overall >= 56
            ? 2.2 + (overall - 56) * 0.42
            : 0.95 + Math.max(0, overall - 48) * 0.12;
  } else if (position === "K" || position === "P") {
    apy = 0.85 + Math.max(0, overall - 55) * 0.16;
  } else {
    const premium = ["EDGE", "LT", "CB", "WR"].includes(position) ? 1.16 : ["RT", "DL", "S", "LB"].includes(position) ? 0.98 : 0.82;
    const starterScore = Math.pow(clamp((overall - 52) / 26, 0, 1.25), 1.62);
    apy = 0.95 + starterScore * 16.5 * premium;
  }
  const poolFactor = pool === "free_agent" ? 0.78 : 1;
  const maxSalary = position === "QB" ? 48 : position === "K" || position === "P" ? 4.6 : ["EDGE", "LT", "CB", "WR"].includes(position) ? 24 : 18;
  return money(clamp((apy + marketNoise) * ageFactor * poolFactor, 0.75, maxSalary));
}

function veteranContractYears(age: number, overall: number, pool: YearZeroNflPlayer["pool"], rng: Rng): number {
  if (pool === "free_agent") return overall >= 66 && age <= 29 ? rng.int(1, 3) : rng.int(1, 2);
  if (age >= 32) return rng.int(1, 2);
  if (overall >= 72 && age <= 29) return rng.int(3, 5);
  if (overall >= 64 && age <= 30) return rng.int(2, 4);
  return rng.int(1, 3);
}

function yearZeroContractProfile(
  player: Pick<YearZeroNflPlayer, "pool" | "position" | "age" | "experience" | "overall" | "potential">,
  seasonYear: number,
  rng: Rng
): YearZeroContractProfile {
  if (player.pool === "practice_squad") {
    return { salary: 0.25, contractYears: 1, contractOrigin: "practice-squad" };
  }
  if (player.pool === "active_roster" && player.experience <= 3 && player.age <= 25) {
    const draftYear = seasonYear - player.experience;
    const draftRound = rookieDraftRound(player.position, player.overall, player.potential, rng.fork("round"));
    const draftOverallPick = draftRound ? rookieOverallPick(draftRound, player.overall, player.potential, rng.fork("pick")) : undefined;
    const contractOrigin: ContractOrigin = draftRound ? "rookie" : "udfa";
    const originalYears = contractOrigin === "rookie" ? 4 : 3;
    const rookieContractYear = Math.min(originalYears, player.experience + 1);
    return {
      salary: rookieScaleApy(player.position, draftRound, draftOverallPick, player.overall, player.potential),
      contractYears: Math.max(1, originalYears - player.experience),
      contractOrigin,
      draftYear,
      draftRound,
      draftOverallPick,
      rookieContractYear,
      fifthYearOptionEligible: draftRound === 1
    };
  }
  return {
    salary: veteranContractApy(player.position, player.overall, player.age, player.pool, rng.fork("veteran-apy")),
    contractYears: veteranContractYears(player.age, player.overall, player.pool, rng.fork("veteran-years")),
    contractOrigin: player.pool === "free_agent" ? "free-agent" : "generated",
    draftYear: Math.max(1990, seasonYear - Math.max(0, player.experience))
  };
}

function withYearZeroContractProfile(player: YearZeroNflPlayer, seasonYear: number, rng: Rng): YearZeroNflPlayer {
  const profile = yearZeroContractProfile(player, seasonYear, rng);
  return { ...player, ...profile };
}

function adjustYearZeroOverall(player: YearZeroNflPlayer, overall: number, rng: Rng): YearZeroNflPlayer {
  const nextOverall = Math.round(clamp(overall, 34, 90));
  const potential = Math.round(clamp(Math.max(nextOverall, player.potential - Math.max(0, player.overall - nextOverall)), nextOverall, 96));
  return withYearZeroContractProfile({ ...player, overall: nextOverall, potential }, 2026, rng.fork("contract-resync"));
}

function calibrateYearZeroActiveRoster(players: YearZeroNflPlayer[], teamContext: YearZeroTeamStrengthContext | undefined, rng: Rng): YearZeroNflPlayer[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  const qbs = players
    .filter((player) => player.position === "QB")
    .sort((a, b) => b.overall - a.overall || b.potential - a.potential);
  if (qbs[0] && qbs[0].overall < 56) {
    byId.set(qbs[0].id, adjustYearZeroOverall(qbs[0], 56 + Math.max(0, Math.round((teamContext?.rosterBias ?? 0) / 4)), rng.fork(`qb-floor:${qbs[0].id}`)));
  }
  qbs.slice(1).forEach((qb, index) => {
    const starter = byId.get(qbs[0]?.id ?? "") ?? qbs[0];
    const maxBackup = index === 0
      ? starter && starter.overall >= 70 ? 65 : 63
      : 58;
    if (qb.overall > maxBackup) {
      byId.set(qb.id, adjustYearZeroOverall(qb, maxBackup - rng.fork(`qb-cap:${qb.id}`).int(0, 2), rng.fork(`qb-cap:${qb.id}`)));
    }
  });

  const rosterBias = teamContext?.rosterBias ?? 0;
  const maxBlueChip = rosterBias >= 5 ? 4 : rosterBias >= 1 ? 3 : rosterBias <= -5 ? 1 : 2;
  const blueChip = [...byId.values()]
    .filter((player) => player.overall >= 75 && !["K", "P"].includes(player.position))
    .sort((a, b) => b.overall - a.overall || b.potential - a.potential);
  blueChip.slice(maxBlueChip).forEach((player, index) => {
    byId.set(player.id, adjustYearZeroOverall(player, 72 - Math.min(2, index % 3), rng.fork(`blue-chip-cap:${player.id}`)));
  });

  const reprofiled = players.map((player) => withYearZeroContractProfile(byId.get(player.id) ?? player, 2026, rng.fork(`contract:${player.id}`)));
  const capHealth = teamContext?.capHealth ?? "balanced";
  const payrollTarget = clamp(226 + rosterBias * 4.2 + (capHealth === "tight" ? 18 : capHealth === "flexible" ? -16 : 0), 188, 276);
  const activePayroll = reprofiled.reduce((sum, player) => sum + player.salary, 0);
  if (activePayroll <= payrollTarget) return reprofiled;

  const scalable = reprofiled.filter((player) => player.contractOrigin === "generated");
  const protectedPayroll = reprofiled.reduce((sum, player) => sum + (player.contractOrigin === "generated" ? 0 : player.salary), 0);
  const scalablePayroll = scalable.reduce((sum, player) => sum + player.salary, 0);
  const scale = scalablePayroll > 0 ? clamp((payrollTarget - protectedPayroll) / scalablePayroll, 0.68, 1) : 1;
  return reprofiled.map((player) => {
    if (player.contractOrigin !== "generated") return player;
    const minimum = player.position === "QB"
      ? player.overall >= 70 ? 14 : player.overall >= 62 ? 4 : 1.1
      : player.position === "K" || player.position === "P" ? 0.82
        : player.overall >= 70 ? 7.5
          : player.overall >= 62 ? 2.4
            : 0.85;
    return { ...player, salary: money(Math.max(minimum, player.salary * scale)) };
  });
}

function nflRoleRatingBand(roleTier: string, rosterBias: number, position: Position, sourceBand: ActiveRosterQualityBand): ActiveRosterQualityBand {
  const teamShift = clamp(rosterBias * 0.28, -3, 3);
  const premiumShift = ["QB", "EDGE", "LT", "CB", "WR"].includes(position) ? 1 : position === "K" || position === "P" ? -2 : 0;
  const normalizedRole = roleTier.includes("star") && roleTier.includes("quality")
    ? "quality_starter"
    : roleTier.includes("star") || roleTier.includes("elite")
      ? "star"
      : roleTier.includes("starter") && (roleTier.includes("quality") || roleTier.includes("plus"))
        ? "quality_starter"
        : roleTier.includes("starter")
          ? "starter"
          : roleTier.includes("rotation")
            ? "rotation"
            : roleTier.includes("depth") || roleTier.includes("backup")
              ? "depth"
              : roleTier;
  const fallback = {
    star: [70, 79],
    quality_starter: [64, 71],
    starter: [57, 64],
    rotation: [49, 59],
    depth: [36, 52]
  }[normalizedRole] ?? [42, 57];
  const csvMidpoint = (sourceBand.overallMin + sourceBand.overallMax) / 2;
  const csvInfluence = clamp((csvMidpoint - 60) * 0.12, -2.5, 2.5);
  const min = Math.round(clamp(fallback[0] + teamShift + premiumShift * 0.5 + csvInfluence, 28, 88));
  const max = Math.round(clamp(fallback[1] + teamShift + premiumShift + csvInfluence, min, 90));
  return { ...sourceBand, overallMin: min, overallMax: max };
}

function weightedPick<T>(items: T[], rng: Rng, weightFor: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightFor(item)), 0);
  if (items.length === 0) {
    throw new Error("weightedPick requires at least one item.");
  }
  if (total <= 0) return items[0];
  let roll = rng.float(0, total);
  for (const item of items) {
    roll -= Math.max(0, weightFor(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

type PracticeSquadTeamContext =
  | "rebuilding_low_depth"
  | "contender_cap_stressed"
  | "neutral"
  | "qb_uncertain"
  | "injury_riddled"
  | "specialist_unstable";

interface PracticeSquadPositionTarget {
  position: Position;
  minPlayers: number;
  targetPlayers: number;
  maxPlayers: number;
  selectionWeight: number;
}

interface PracticeSquadQualityTier {
  qualityTier: string;
  currentMin: number;
  currentMax: number;
  potentialMin: number;
  potentialMax: number;
}

interface PracticeSquadAgeExperienceBand {
  qualityTier: string;
  ageMin: number;
  ageMax: number;
  experienceMin: number;
  experienceMax: number;
  weight: number;
}

interface ActiveRosterQualityBand {
  positionGroup: string;
  roleTier: string;
  overallMin: number;
  overallMax: number;
  weight: number;
}

interface ActiveRosterTierTarget {
  teamTier: string;
  roleTier: string;
  countMin: number;
  countMax: number;
}

type PracticeSquadBuildPlayer = Pick<YearZeroNflPlayer, "experience" | "overall" | "yearZeroQualityTier">;

const teamStrengthToRosterQualityTier: Record<string, string> = {
  elite_contender: "super_bowl_contender",
  strong_playoff: "playoff_contender",
  wildcard_median: "middle_class",
  volatile_retool: "retooling",
  deep_rebuild: "rebuild"
};

function practiceSquadTeamContextFor(context: YearZeroTeamStrengthContext | undefined): PracticeSquadTeamContext {
  if (!context) return "neutral";
  if (context.capHealth === "tight" && context.rosterBias >= 4) return "contender_cap_stressed";
  if (context.rosterBias <= -5 && context.draftCapital === "extra") return "rebuilding_low_depth";
  if (context.rosterBias <= 1 && context.capHealth !== "tight" && context.draftCapital !== "thin") return "qb_uncertain";
  if (context.rosterBias >= 2 && context.capHealth === "balanced" && context.draftCapital === "thin") return "specialist_unstable";
  if (context.rosterBias <= -2 && context.capHealth === "tight") return "injury_riddled";
  return "neutral";
}

function practiceSquadPositionGroupFor(position: Position): string {
  if (["LT", "LG", "C", "RG", "RT"].includes(position)) return "OL";
  if (position === "K" || position === "P") return "SPECIALIST";
  return position;
}

function activeRosterPositionGroupFor(position: Position): string {
  if (position === "QB") return "QB";
  if (["RB", "WR", "TE"].includes(position)) return "Skill";
  if (["LT", "LG", "C", "RG", "RT"].includes(position)) return "OL";
  if (["EDGE", "DL", "LB"].includes(position)) return "Front7";
  if (["CB", "S"].includes(position)) return "Secondary";
  return "Specialist";
}

function activeSlotPriority(position: Position, slot: number): number {
  const positionPremium = position === "QB"
    ? slot === 1 ? 12 : slot === 2 ? 1 : -2
    : ["EDGE", "CB", "LT", "WR"].includes(position) ? 8
      : ["RT", "DL", "S", "LB"].includes(position) ? 5
        : ["K", "P"].includes(position) ? -3
          : 2;
  return positionPremium - slot * 1.25;
}

const roleOrder = ["depth", "rotation", "starter", "quality_starter", "star"];

function capRole(roleTier: string, maxRole: string): string {
  const roleIndex = roleOrder.indexOf(roleTier);
  const maxIndex = roleOrder.indexOf(maxRole);
  if (roleIndex < 0 || maxIndex < 0) return roleTier;
  return roleOrder[Math.min(roleIndex, maxIndex)];
}

function activeSlotRoleCap(position: Position, slot: number): string {
  if (position === "QB") return slot === 1 ? "star" : slot === 2 ? "rotation" : "depth";
  if (position === "K" || position === "P") return "starter";
  if (position === "RB") return slot === 1 ? "quality_starter" : slot === 2 ? "starter" : slot === 3 ? "rotation" : "depth";
  if (position === "WR") return slot <= 1 ? "star" : slot === 2 ? "quality_starter" : slot === 3 ? "starter" : slot === 4 ? "rotation" : "depth";
  if (position === "TE") return slot === 1 ? "quality_starter" : slot === 2 ? "rotation" : "depth";
  if (["LT", "LG", "C", "RG", "RT"].includes(position)) return slot === 1 ? "quality_starter" : "rotation";
  if (position === "EDGE") return slot <= 2 ? "star" : slot <= 4 ? "rotation" : "depth";
  if (position === "DL" || position === "LB" || position === "CB") return slot <= 2 ? "quality_starter" : slot <= 4 ? "rotation" : "depth";
  if (position === "S") return slot <= 2 ? "quality_starter" : "rotation";
  return "starter";
}

function activeRosterRoleQueue(
  teamContext: YearZeroTeamStrengthContext | undefined,
  tierTargets: ActiveRosterTierTarget[],
  totalPlayers: number,
  rng: Rng
): string[] {
  const rosterTier = teamStrengthToRosterQualityTier[teamContext?.tier ?? ""] ?? "middle_class";
  const targets = tierTargets.filter((target) => target.teamTier === rosterTier);
  const targetCount = (role: string, fallback: number): number => {
    const row = targets.find((target) => target.roleTier === role);
    if (!row) return fallback;
    return rng.int(row.countMin, row.countMax);
  };
  const starCount = Math.min(totalPlayers, targetCount("star", (teamContext?.rosterBias ?? 0) > 4 ? 3 : 1), (teamContext?.rosterBias ?? 0) > 4 ? 4 : 2);
  const starterCount = Math.min(totalPlayers - starCount, targetCount("starter", 14), (teamContext?.rosterBias ?? 0) > 4 ? 18 : 15);
  const qualityStarterCount = Math.round(starterCount * 0.32);
  const normalStarterCount = Math.max(0, starterCount - qualityStarterCount);
  const remaining = Math.max(0, totalPlayers - starCount - starterCount);
  const depthShare = clamp(0.24 - (teamContext?.rosterBias ?? 0) * 0.012, 0.12, 0.42);
  const depthCount = Math.round(remaining * depthShare);
  const rotationCount = Math.max(0, remaining - depthCount);
  return [
    ...Array.from({ length: starCount }, () => "star"),
    ...Array.from({ length: qualityStarterCount }, () => "quality_starter"),
    ...Array.from({ length: normalStarterCount }, () => "starter"),
    ...Array.from({ length: rotationCount }, () => "rotation"),
    ...Array.from({ length: depthCount }, () => "depth")
  ].slice(0, totalPlayers);
}

function activeRosterQualityBand(
  position: Position,
  roleTier: string,
  qualityBands: ActiveRosterQualityBand[],
  rng: Rng
): ActiveRosterQualityBand {
  const group = activeRosterPositionGroupFor(position);
  const exact = qualityBands.filter((band) => band.positionGroup === group && band.roleTier === roleTier);
  if (exact.length > 0) return weightedPick(exact, rng, (band) => band.weight);
  const groupBands = qualityBands.filter((band) => band.positionGroup === group);
  if (groupBands.length > 0) return weightedPick(groupBands, rng, (band) => band.weight);
  throw new Error(`No active roster quality band available for ${group}/${roleTier}.`);
}

function buildPracticeSquadPositions(
  profileId: string,
  rosterBias: number,
  rng: Rng,
  profileRows: YearZeroRecord[],
  targetRows: PracticeSquadPositionTarget[]
): Position[] {
  const targetByPosition = new Map(targetRows.map((row) => [row.position, row]));
  const counts = new Map<Position, number>();
  const positions: Position[] = [];
  const profile = profileRows
    .filter((row) => textPayload(row, ["profile_id"], row.rowKey) === profileId)
    .map((row) => ({
      positionOrGroup: textPayload(row, ["position_or_group"], row.rowKey),
      targetPlayers: Math.max(0, Math.round(numberPayload(row, ["target_players"], 0)))
    }));

  const expandGroup = (positionOrGroup: string, slotIndex: number): Position => {
    const groupCandidates = targetRows.filter((target) => practiceSquadPositionGroupFor(target.position) === positionOrGroup);
    const allowed = groupCandidates.filter((target) => (counts.get(target.position) ?? 0) < target.maxPlayers);
    const pool = allowed.length > 0 ? allowed : groupCandidates;
    const preferredTarget = positionOrGroup === "OL" && rosterBias >= 3 ? new Set<Position>(["LT", "RT"]) : undefined;
    const pick = weightedPick(pool, rng.fork(`expand:${positionOrGroup}:${slotIndex}`), (candidate) => {
      const current = counts.get(candidate.position) ?? 0;
      const underTargetBoost = current < candidate.targetPlayers ? 1.2 : 0.8;
      const edgeBoost = preferredTarget?.has(candidate.position) ? 1.15 : 1;
      return candidate.selectionWeight * underTargetBoost * edgeBoost;
    });
    return pick.position;
  };

  for (const row of profile) {
    for (let index = 0; index < row.targetPlayers; index += 1) {
      const target = targetByPosition.get(row.positionOrGroup as Position);
      const position = target ? target.position : expandGroup(row.positionOrGroup, positions.length);
      positions.push(position);
      counts.set(position, (counts.get(position) ?? 0) + 1);
    }
  }

  return positions.slice(0, PRACTICE_SQUAD_SIZE);
}

function practiceSquadExperienceCounts(players: Array<Pick<YearZeroNflPlayer, "experience">>): { veteran: number; experienced: number } {
  return players.reduce((totals, player) => ({
    veteran: totals.veteran + (player.experience > 2 ? 1 : 0),
    experienced: totals.experienced + (player.experience > 0 ? 1 : 0)
  }), { veteran: 0, experienced: 0 });
}

function samplePracticeSquadBand(
  qualityTier: string,
  currentPlayers: PracticeSquadBuildPlayer[],
  ageExperienceRows: PracticeSquadAgeExperienceBand[],
  rng: Rng
): PracticeSquadAgeExperienceBand {
  const matching = ageExperienceRows.filter((row) => row.qualityTier === qualityTier);
  const counts = practiceSquadExperienceCounts(currentPlayers);
  const allowed = matching.filter((row) => {
    const projectedVeteran = counts.veteran + (row.experienceMax > 2 ? 1 : 0);
    const projectedExperienced = counts.experienced + (row.experienceMax > 0 ? 1 : 0);
    return projectedVeteran <= PRACTICE_SQUAD_VETERAN_LIMIT && projectedExperienced <= PRACTICE_SQUAD_EXPERIENCED_LIMIT;
  });
  const pool = allowed.length > 0
    ? allowed
    : matching
      .filter((row) => row.experienceMax <= 2)
      .sort((a, b) => a.experienceMax - b.experienceMax || a.ageMin - b.ageMin);
  return weightedPick(pool.length > 0 ? pool : matching, rng, (row) => row.weight);
}

function practiceSquadFallbackQuality(
  positionGroup: string,
  qualityMixRows: YearZeroRecord[],
  qualityTiers: PracticeSquadQualityTier[],
  currentPlayers: PracticeSquadBuildPlayer[],
  rng: Rng
): PracticeSquadQualityTier {
  const rows = qualityMixRows.filter((row) => textPayload(row, ["position_group"], row.rowKey) === positionGroup);
  if (rows.length === 0) throw new Error(`No practice squad quality mix rows available for position group ${positionGroup}.`);
  const counts = practiceSquadExperienceCounts(currentPlayers);
  const premiumCount = currentPlayers.filter((player) => player.yearZeroQualityTier === "ps_premium_stash").length;
  const highCurrentCount = currentPlayers.filter((player) => player.overall >= 59).length;
  const allowedRows = rows.filter((row) => {
    const tier = textPayload(row, ["quality_tier"], row.rowKey);
    if (tier === "ps_veteran_emergency" && counts.veteran >= PRACTICE_SQUAD_VETERAN_LIMIT) return false;
    if (tier === "ps_premium_stash" && premiumCount >= 1) return false;
    if (highCurrentCount >= 2 && (tier === "ps_premium_stash" || tier === "ps_game_day_depth" || tier === "ps_veteran_emergency")) return false;
    return true;
  });
  if (allowedRows.length === 0) throw new Error(`No eligible practice squad quality rows remain for ${positionGroup}.`);
  const chosenTierId = textPayload(weightedPick(allowedRows, rng, (row) => numberPayload(row, ["weight"], 1)), ["quality_tier"], rows[0]?.rowKey ?? "ps_game_day_depth");
  const tier = qualityTiers.find((candidate) => candidate.qualityTier === chosenTierId);
  if (!tier) throw new Error(`Practice squad quality tier ${chosenTierId} is referenced by ${positionGroup} but missing from quality tiers.`);
  return tier;
}

function makePracticeSquadPlayer(
  idPrefix: string,
  teamId: string,
  position: Position,
  slot: number,
  rosterBias: number,
  qualityTier: PracticeSquadQualityTier,
  band: PracticeSquadAgeExperienceBand,
  currentPlayers: PracticeSquadBuildPlayer[],
  rng: Rng,
  usedNames: Set<string>,
  schools: CollegeProgram[]
): YearZeroNflPlayer {
  const identity = generatedName(rng, usedNames);
  const counts = practiceSquadExperienceCounts(currentPlayers);
  const veteranCap = counts.veteran >= PRACTICE_SQUAD_VETERAN_LIMIT ? 2 : band.experienceMax;
  const experiencedCap = counts.experienced >= PRACTICE_SQUAD_EXPERIENCED_LIMIT ? 0 : veteranCap;
  const experienceUpper = Math.max(0, Math.min(band.experienceMax, experiencedCap));
  const experienceLower = Math.min(band.experienceMin, experienceUpper);
  const experience = rng.int(experienceLower, experienceUpper);
  const minimumAge = Math.max(band.ageMin, 21 + experience);
  const age = rng.int(minimumAge, Math.max(minimumAge, band.ageMax));
  const biasBump = rosterBias >= 5 ? 1 : rosterBias <= -6 ? -1 : 0;
  const highCurrentCount = currentPlayers.filter((player) => player.overall >= 54).length;
  const tierMax = qualityTier.qualityTier === "ps_premium_stash" ? 59 : 54;
  const currentMax = Math.min(qualityTier.currentMax, tierMax, highCurrentCount >= 2 ? 54 : 59);
  const currentMin = Math.min(qualityTier.currentMin, currentMax);
  const overall = Math.round(clamp(rng.normal((currentMin + currentMax) / 2 + biasBump, 2.8), currentMin, currentMax));
  const potentialFloor = Math.max(overall, qualityTier.potentialMin);
  const potential = Math.round(clamp(rng.normal((potentialFloor + qualityTier.potentialMax) / 2, 3.4), potentialFloor, qualityTier.potentialMax));
  return {
    id: `${idPrefix}-${position.toLowerCase()}-${slot}`,
    ...identity,
    teamId,
    pool: "practice_squad",
    yearZeroQualityTier: qualityTier.qualityTier,
    position,
    age,
    experience,
    collegeId: rng.pick(schools).id,
    overall,
    potential,
    salary: 0.25,
    contractYears: 1,
    contractOrigin: "practice-squad",
    ratingScaleContext: "nfl",
    source: "year_zero_nfl_player"
  };
}

export function generateYearZeroNflPlayers(
  seed: string,
  teams: NFLTeam[],
  schools: CollegeProgram[],
  teamStrength: YearZeroTeamStrengthContext[],
  store: YearZeroBundleStore
): YearZeroNflPlayer[] {
  store.getYearZeroWeightRows("nfl_rosters", "initial_nfl_quality_distribution");
  store.getYearZeroRuntimeRecords("nfl_rosters", "initial_nfl_roster_quality_by_team_tier");
  store.getYearZeroRuntimeRecords("nfl_rosters", "nfl_veteran_career_path_templates");
  store.getYearZeroRuntimeRecords("nfl_practice_squad", "nfl_practice_squad_composition_profiles");
  store.getYearZeroWeightRows("nfl_practice_squad", "nfl_practice_squad_profile_weights_by_team_context");
  store.getYearZeroWeightRows("nfl_practice_squad", "nfl_practice_squad_quality_mix_by_position_group");
  store.getYearZeroRecords("nfl_practice_squad", "nfl_practice_squad_position_targets");
  store.getYearZeroRuntimeRecords("nfl_practice_squad", "nfl_practice_squad_quality_tiers");
  store.getYearZeroRuntimeRecords("nfl_practice_squad", "nfl_practice_squad_age_experience_by_quality");
  store.getYearZeroRuntimeRecords("nfl_free_agents", "nfl_free_agent_age_experience_by_role");
  store.getYearZeroWeightRows("nfl_free_agents", "nfl_free_agent_role_quality_mix_by_position");
  store.getYearZeroRuntimeRecords("nfl_contracts", "nfl_initial_contract_generation_matrix");
  store.getYearZeroWeightRows("nfl_contracts", "nfl_initial_contract_source_mix_by_roster_pool");

  const activeRosterTemplate = targetTemplateFromRows(store, "nfl_rosters", "initial_nfl_roster_targets", nflActiveRosterTemplate);
  const activeQualityBands = store
    .getYearZeroWeightRows("nfl_rosters", "initial_nfl_quality_distribution")
    .filter((row) => textPayload(row, ["pool"], "") === "active_roster")
    .map((row) => ({
      positionGroup: textPayload(row, ["position_group"], row.rowKey),
      roleTier: textPayload(row, ["role_tier"], row.rowKey),
      overallMin: Math.round(numberPayload(row, ["nfl_ovr_min"], 45)),
      overallMax: Math.round(numberPayload(row, ["nfl_ovr_max"], 60)),
      weight: Math.max(0.01, numberPayload(row, ["weight"], 1))
    } satisfies ActiveRosterQualityBand));
  const activeTierTargets = store
    .getYearZeroRuntimeRecords("nfl_rosters", "initial_nfl_roster_quality_by_team_tier")
    .map((row) => ({
      teamTier: textPayload(row, ["team_tier"], row.rowKey),
      roleTier: textPayload(row, ["role_tier"], row.rowKey),
      countMin: Math.max(0, Math.round(numberPayload(row, ["expected_count_min"], 0))),
      countMax: Math.max(0, Math.round(numberPayload(row, ["expected_count_max"], 0)))
    } satisfies ActiveRosterTierTarget));
  const strengthByTeam = new Map(teamStrength.map((context) => [context.teamId, context]));
  const practiceProfileRows = store.getYearZeroRuntimeRecords("nfl_practice_squad", "nfl_practice_squad_composition_profiles");
  const practiceProfileWeightRows = store.getYearZeroWeightRows("nfl_practice_squad", "nfl_practice_squad_profile_weights_by_team_context");
  const practiceQualityMixRows = store.getYearZeroWeightRows("nfl_practice_squad", "nfl_practice_squad_quality_mix_by_position_group");
  const practicePositionTargets = store
    .getYearZeroRecords("nfl_practice_squad", "nfl_practice_squad_position_targets")
    .map((row) => ({
      position: textPayload(row, ["position"], row.rowKey) as Position,
      minPlayers: Math.max(0, Math.round(numberPayload(row, ["min_players"], 0))),
      targetPlayers: Math.max(0, Math.round(numberPayload(row, ["target_players"], 0))),
      maxPlayers: Math.max(1, Math.round(numberPayload(row, ["max_players"], 1))),
      selectionWeight: Math.max(0.01, numberPayload(row, ["selection_weight"], 1))
    } satisfies PracticeSquadPositionTarget));
  const practiceQualityTiers = store
    .getYearZeroRuntimeRecords("nfl_practice_squad", "nfl_practice_squad_quality_tiers")
    .map((row) => ({
      qualityTier: textPayload(row, ["quality_tier"], row.rowKey),
      currentMin: Math.round(numberPayload(row, ["nfl_current_min"], 48)),
      currentMax: Math.round(numberPayload(row, ["nfl_current_max"], 58)),
      potentialMin: Math.round(numberPayload(row, ["nfl_potential_min"], 58)),
      potentialMax: Math.round(numberPayload(row, ["nfl_potential_max"], 70))
    } satisfies PracticeSquadQualityTier));
  const practiceAgeExperienceRows = store
    .getYearZeroRuntimeRecords("nfl_practice_squad", "nfl_practice_squad_age_experience_by_quality")
    .map((row) => ({
      qualityTier: textPayload(row, ["quality_tier"], row.rowKey),
      ageMin: Math.round(numberPayload(row, ["age_min"], 21)),
      ageMax: Math.round(numberPayload(row, ["age_max"], 24)),
      experienceMin: Math.round(numberPayload(row, ["experience_min"], 0)),
      experienceMax: Math.round(numberPayload(row, ["experience_max"], 1)),
      weight: Math.max(0.01, numberPayload(row, ["weight"], 1))
    } satisfies PracticeSquadAgeExperienceBand));
  const makePlayer = (
    idPrefix: string,
    teamId: string,
    pool: YearZeroNflPlayer["pool"],
    position: Position,
    slot: number,
    base: number,
    rng: Rng,
    usedNames: Set<string>
  ): YearZeroNflPlayer => {
    const identity = generatedName(rng, usedNames);
    const age = pool === "practice_squad" ? rng.int(21, 27) : pool === "free_agent" ? rng.int(23, 34) : Math.round(clamp(rng.normal(25.8 + slot * 0.32, 3.5), 21, 36));
    const overall = Math.round(clamp(rng.normal(base - slot * (pool === "active_roster" ? 1.65 : 0.32), pool === "practice_squad" ? 5.8 : 7.2), 34, pool === "practice_squad" ? 69 : 94));
    const potential = Math.round(clamp(overall + rng.int(pool === "practice_squad" ? 4 : 0, pool === "practice_squad" ? 16 : 8), overall, 96));
    const experience = Math.max(0, age - 21);
    const player = {
      id: `${idPrefix}-${position.toLowerCase()}-${slot}`,
      ...identity,
      teamId,
      previousTeamId: pool === "free_agent" ? rng.pick(teams).id : undefined,
      pool,
      position,
      age,
      experience,
      collegeId: rng.pick(schools).id,
      overall,
      potential,
      salary: 1,
      contractYears: 1,
      ratingScaleContext: "nfl",
      source: "year_zero_nfl_player"
    } satisfies YearZeroNflPlayer;
    return withYearZeroContractProfile(player, 2026, rng.fork("contract"));
  };
  const makeActivePlayer = (
    teamId: string,
    position: Position,
    slot: number,
    roleTier: string,
    rng: Rng,
    usedNames: Set<string>
  ): YearZeroNflPlayer => {
    const identity = generatedName(rng, usedNames);
    const cappedRoleTier = capRole(roleTier, activeSlotRoleCap(position, slot));
    const rawBand = activeRosterQualityBand(position, cappedRoleTier, activeQualityBands, rng.fork("quality-band"));
    const band = nflRoleRatingBand(cappedRoleTier, teamStrength.find((context) => context.teamId === teamId)?.rosterBias ?? 0, position, rawBand);
    const midpoint = (band.overallMin + band.overallMax) / 2;
    const spread = Math.max(1.8, (band.overallMax - band.overallMin) / 5);
    const overall = Math.round(clamp(rng.normal(midpoint, spread), band.overallMin, band.overallMax));
    const age = position === "QB" && slot === 2
      ? rng.float(0, 1) < 0.62 ? rng.int(22, 25) : rng.int(28, 34)
      : position === "QB" && slot >= 3
        ? rng.int(22, 27)
        : Math.round(clamp(rng.normal((cappedRoleTier === "depth" ? 24.2 : cappedRoleTier === "rotation" ? 25.1 : 26.1) + slot * 0.18, 3.1), 21, 36));
    const experience = Math.max(0, age - 21);
    const youngBackupUpside = position === "QB" && slot > 1 && age <= 25 ? rng.int(7, 15) : 0;
    const potential = Math.round(clamp(overall + Math.max(youngBackupUpside, rng.int(0, cappedRoleTier === "depth" ? 10 : 8)), overall, 96));
    const player = {
      id: `yz-nfl-${teamId}-${position.toLowerCase()}-${slot}`,
      ...identity,
      teamId,
      pool: "active_roster",
      yearZeroRoleTier: band.roleTier,
      position,
      age,
      experience,
      collegeId: rng.pick(schools).id,
      overall,
      potential,
      salary: 1,
      contractYears: 1,
      ratingScaleContext: "nfl",
      source: "year_zero_nfl_player"
    } satisfies YearZeroNflPlayer;
    return withYearZeroContractProfile(player, 2026, rng.fork("contract"));
  };

  const teamPlayers = teams.flatMap((team) => {
    const rng = createRng(`${seed}:year-zero:nfl:${team.id}`);
    const usedNames = new Set<string>();
    const teamContext = strengthByTeam.get(team.id);
    const rosterBias = teamContext?.rosterBias ?? 0;
    const activeSlots = activeRosterTemplate.flatMap(([position, count]) =>
      Array.from({ length: count }, (_, index) => ({ position, slot: index + 1 }))
    );
    const activeRoles = activeRosterRoleQueue(teamContext, activeTierTargets, activeSlots.length, rng.fork("active-roles"));
    const activeRaw = activeSlots
      .map((slot, index) => ({ ...slot, sortKey: activeSlotPriority(slot.position, slot.slot) + rng.fork(`active-priority:${slot.position}:${slot.slot}`).float(-0.4, 0.4), index }))
      .sort((a, b) => b.sortKey - a.sortKey)
      .map((slot, index) => makeActivePlayer(team.id, slot.position, slot.slot, activeRoles[index] ?? "depth", rng.fork(`active:${slot.position}:${slot.slot}`), usedNames));
    const active = calibrateYearZeroActiveRoster(activeRaw, teamContext, rng.fork("active-calibration"));
    const profileContext = practiceSquadTeamContextFor(teamContext);
    const profileWeights = practiceProfileWeightRows.filter((row) => textPayload(row, ["team_context"], row.rowKey) === profileContext);
    const selectedProfileId = textPayload(
      weightedPick(profileWeights, rng.fork(`practice-profile:${profileContext}`), (row) => numberPayload(row, ["weight"], 1)),
      ["profile_id"],
      "balanced_default"
    );
    const practicePositions = buildPracticeSquadPositions(selectedProfileId, rosterBias, rng.fork(`practice-positions:${selectedProfileId}`), practiceProfileRows, practicePositionTargets);
    const adjustedPractice: YearZeroNflPlayer[] = [];
    for (const [index, position] of practicePositions.entries()) {
      const positionGroup = practiceSquadPositionGroupFor(position);
      const slotRng = rng.fork(`practice-adjusted:${selectedProfileId}:${position}:${index}`);
      const qualityTier = practiceSquadFallbackQuality(positionGroup, practiceQualityMixRows, practiceQualityTiers, adjustedPractice, slotRng.fork("quality"));
      const chosenBand = samplePracticeSquadBand(qualityTier.qualityTier, adjustedPractice, practiceAgeExperienceRows, slotRng.fork("band"));
      adjustedPractice.push(makePracticeSquadPlayer(
        `yz-ps-${team.id}`,
        team.id,
        position,
        index + 1,
        rosterBias,
        qualityTier,
        chosenBand,
        adjustedPractice,
        slotRng,
        usedNames,
        schools
      ));
    }
    return [...active, ...adjustedPractice];
  });

  const freeAgentRng = createRng(`${seed}:year-zero:nfl:free-agents`);
  const freeAgentNames = new Set<string>();
  const freeAgents = yearZeroFreeAgentTemplate.flatMap(([position, count]) =>
    Array.from({ length: count }, (_, index) => makePlayer("yz-fa", "FA", "free_agent", position, index + 1, 51, freeAgentRng.fork(`${position}:${index}`), freeAgentNames))
  );
  return [...teamPlayers, ...freeAgents];
}

export function generateYearZeroNflReserveStatuses(seed: string, nflPlayers: YearZeroNflPlayer[], store: YearZeroBundleStore): YearZeroNflReserveStatus[] {
  store.getYearZeroDefinitionRows("nfl_reserve_status", "nfl_reserve_status_rulebook");
  store.getYearZeroRuleRows("nfl_reserve_status", "nfl_reserve_status_contract_rules");
  store.getYearZeroRuleRows("nfl_reserve_status", "nfl_reserve_status_duration_rules");
  store.getYearZeroRuleRows("nfl_reserve_status", "nfl_reserve_status_history_generation_rules");
  store.getYearZeroRuleRows("nfl_reserve_status", "nfl_reserve_status_transition_rules");
  store.getYearZeroRuntimeRecords("nfl_reserve_status", "nfl_reserve_status_injury_family_eligibility");
  store.getYearZeroRuntimeRecords("nfl_reserve_status", "nfl_reserve_status_roster_cap_accounting");
  store.getYearZeroWeightRows("nfl_reserve_status", "nfl_reserve_status_mix_by_team_profile");
  store.getYearZeroWeightRows("nfl_reserve_status", "nfl_reserve_status_player_role_selection_weights");
  store.getYearZeroWeightRows("nfl_reserve_status", "nfl_reserve_status_position_risk_weights");
  store.getYearZeroWeightRows("nfl_reserve_status", "nfl_reserve_status_quality_mix");
  store.getYearZeroModifierRows("nfl_reserve_status", "nfl_reserve_status_team_context_modifiers");

  const rng = createRng(`${seed}:year-zero:nfl-reserve-status`);
  const statuses: YearZeroNflReserveStatus["status"][] = ["injured_reserve", "physically_unable", "non_football_injury"];
  const activeByTeam = new Map<string, YearZeroNflPlayer[]>();
  for (const player of nflPlayers.filter((candidate) => candidate.pool === "active_roster")) {
    activeByTeam.set(player.teamId, [...(activeByTeam.get(player.teamId) ?? []), player]);
  }
  return [...activeByTeam.entries()].flatMap(([teamId, players]) => {
    const teamRng = rng.fork(teamId);
    const reserveCount = teamRng.int(1, 3);
    return teamRng.shuffle(players.filter((player) => !["K", "P"].includes(player.position)))
      .slice(0, reserveCount)
      .map((player, index) => {
        const status = teamRng.pick(statuses);
        return {
          id: `yz-reserve-${teamId}-${index + 1}-${player.id}`,
          playerId: player.id,
          teamId,
          status,
          weeksRemaining: status === "injured_reserve" ? teamRng.int(4, 14) : teamRng.int(2, 8),
          countsAgainstRoster: false,
          medicalFlag: true
        } satisfies YearZeroNflReserveStatus;
      });
  });
}

export function generateYearZeroSupplementalScoutingViews(
  seed: string,
  teams: NFLTeam[],
  transferPortal: YearZeroTransferPortalEntry[],
  draftClass: YearZeroDraftProspect[],
  nflPlayers: YearZeroNflPlayer[],
  store: YearZeroBundleStore
): YearZeroScoutingView[] {
  store.getYearZeroRuntimeRecords("scouting", "evaluator_scouting_bias_profiles");
  store.getYearZeroRuntimeRecords("scouting", "scouting_bias_profile_effects");
  store.getYearZeroRuntimeRecords("scouting", "scouting_evaluator_contexts");
  store.getYearZeroDefinitionRows("scouting", "scouting_subject_pool_definitions");
  store.getYearZeroDefinitionRows("scouting", "scouting_visibility_dimension_taxonomy");
  store.getYearZeroRuleRows("scouting", "scouting_confidence_progression_rules");
  store.getYearZeroRuleRows("scouting", "scouting_confidence_to_range_width_rules");
  store.getYearZeroRuleRows("scouting", "scouting_disagreement_rules");
  store.getYearZeroRuleRows("scouting", "scouting_display_band_rules");
  store.getYearZeroRuleRows("scouting", "scouting_information_source_rules");
  store.getYearZeroRuleRows("scouting", "scouting_medical_character_visibility_rules");
  store.getYearZeroRuleRows("scouting", "scouting_red_flag_visibility_rules");
  store.getYearZeroRuleRows("scouting", "scouting_update_event_rules");
  store.getYearZeroWeightRows("scouting", "scouting_noise_distribution_rules");
  store.getYearZeroModifierRows("scouting", "scouting_draft_tier_uncertainty_modifiers");
  store.getYearZeroModifierRows("scouting", "scouting_regional_pipeline_modifiers");
  store.getYearZeroModifierRows("scouting", "scouting_staff_quality_modifiers");
  store.getYearZeroModifierRows("scouting", "scouting_star_band_uncertainty_modifiers");

  const visibleRange = (teamId: string, subjectId: string, rating: number, confidenceBase: number) => {
    const viewRng = createRng(`${seed}:year-zero:scouting:${teamId}:${subjectId}`);
    const confidence = Math.round(clamp(confidenceBase + viewRng.normal(0, 9), 18, 88));
    const spread = Math.round(clamp(22 - confidence * 0.18, 5, 19));
    return { confidence, low: Math.max(1, rating - spread), high: Math.min(100, rating + spread) };
  };
  const teamSlice = teams.slice(0, Math.min(teams.length, 8));
  const transferViews = teamSlice.flatMap((team) => transferPortal.slice(0, 40).map((entry) => {
    const range = visibleRange(team.id, entry.id, entry.collegeOverall, 48);
    return {
      id: `yz-scout-transfer-${team.id}-${entry.id}`,
      teamId: team.id,
      subjectType: "transfer",
      subjectId: entry.id,
      visibleOverallLow: range.low,
      visibleOverallHigh: range.high,
      confidence: range.confidence,
      note: `${entry.position} transfer read: ${entry.reason}.`
    } satisfies YearZeroScoutingView;
  }));
  const draftViews = teams.flatMap((team) => draftClass.slice(0, 64).map((prospect) => {
    const range = visibleRange(team.id, prospect.id, prospect.nflOverall, prospect.projectedRound <= 2 ? 62 : 48);
    return {
      id: `yz-scout-draft-${team.id}-${prospect.id}`,
      teamId: team.id,
      subjectType: "draft_prospect",
      subjectId: prospect.id,
      visibleOverallLow: range.low,
      visibleOverallHigh: range.high,
      confidence: range.confidence,
      note: `Round ${prospect.projectedRound} ${prospect.position} translation from college scale.`
    } satisfies YearZeroScoutingView;
  }));
  const freeAgentViews = teamSlice.flatMap((team) => nflPlayers.filter((player) => player.pool === "free_agent").slice(0, 40).map((player) => {
    const range = visibleRange(team.id, player.id, player.overall, 56);
    return {
      id: `yz-scout-fa-${team.id}-${player.id}`,
      teamId: team.id,
      subjectType: "nfl_free_agent",
      subjectId: player.id,
      visibleOverallLow: range.low,
      visibleOverallHigh: range.high,
      confidence: range.confidence,
      note: `${player.position} free-agent pro scouting view.`
    } satisfies YearZeroScoutingView;
  }));
  return [...transferViews, ...draftViews, ...freeAgentViews];
}

export function generateYearZeroCollegeHistories(
  seed: string,
  collegePlayers: YearZeroCollegePlayer[],
  highSchoolRecruits: YearZeroHighSchoolRecruit[],
  store: YearZeroBundleStore
): {
  productionHistory: YearZeroProductionSeason[];
  awardHistory: YearZeroAwardHistory[];
  injuryHistory: YearZeroInjuryHistory[];
} {
  store.getYearZeroRuntimeRecords("college_production", "college_production_career_arc_templates");
  store.getYearZeroWeightRows("college_production", "college_production_role_weights_by_class_position");
  store.getYearZeroRuntimeRecords("college_production", "college_production_stat_categories");
  store.getYearZeroRuleRows("college_production", "college_production_stat_consistency_rules");
  const collegeAwardRows = store.getYearZeroWeightRows("college_awards", "college_award_selection_weights");
  store.getYearZeroRuleRows("college_awards", "college_award_history_generation_rules");
  store.getYearZeroDefinitionRows("college_awards", "college_award_taxonomy");
  const injuryFamilies = store.getYearZeroDefinitionRows("injuries", "injury_family_taxonomy");
  store.getYearZeroRuntimeRecords("injuries", "injury_history_frequency_by_pool_role_position");
  store.getYearZeroWeightRows("injuries", "injury_history_phase_placement_weights");
  store.getYearZeroWeightRows("injuries", "injury_severity_distribution_by_family");
  store.getYearZeroRuleRows("injuries", "injury_missed_time_rules");

  const rng = createRng(`${seed}:year-zero:college-histories`);
  const severities: InjurySeverity[] = ["minor", "moderate", "major", "catastrophic"];
  const seasonYearForOffset = (offset: number) => 2026 + offset;
  const collegeSeasonsForClass = (classYear: YearZeroCollegePlayer["classYear"]): number => {
    if (classYear === "FR") return 0;
    if (classYear === "SO" || classYear === "RS-SO") return 1;
    if (classYear === "JR") return 2;
    return 3;
  };
  const roleForProduction = (score: number): string => score >= 82 ? "star" : score >= 68 ? "starter" : score >= 52 ? "rotation" : "depth";
  const collegeStatsFor = (position: Position, games: number, gamesStarted: number, snapShare: number, productionScore: number, statRng: Rng): Record<string, number> => {
    const snaps = Math.round(games * 58 * snapShare);
    const quality = clamp(productionScore / 70, 0.25, 1.7);
    const stats: Record<string, number> = { snaps };
    if (position === "QB") {
      const attempts = Math.round(games * (18 + snapShare * 18) * clamp(quality, 0.55, 1.35));
      stats.pass_att = attempts;
      stats.pass_cmp = Math.round(attempts * clamp(0.48 + productionScore / 330 + statRng.normal(0, 0.025), 0.43, 0.72));
      stats.pass_yds = Math.round(stats.pass_cmp * clamp(10.2 + productionScore / 22 + statRng.normal(0, 0.8), 8, 14.8));
      stats.pass_td = Math.max(0, Math.round(stats.pass_yds / clamp(145 - productionScore * 0.7, 70, 150) + statRng.normal(0, 1.6)));
      stats.pass_int = Math.max(0, Math.round(attempts * clamp(0.037 - productionScore * 0.00022, 0.008, 0.045)));
      stats.rush_att = Math.round(games * statRng.float(2, 6));
      stats.rush_yds = Math.round(stats.rush_att * statRng.float(2.2, 6.8));
    } else if (position === "RB") {
      stats.rush_att = Math.round(games * snapShare * clamp(18 * quality, 5, 24));
      stats.rush_yds = Math.round(stats.rush_att * clamp(3.4 + productionScore / 42 + statRng.normal(0, 0.35), 2.8, 7.2));
      stats.rush_td = Math.max(0, Math.round(stats.rush_yds / clamp(130 - productionScore * 0.4, 65, 140)));
      stats.rec = Math.round(games * snapShare * statRng.float(1.2, 3.4));
      stats.rec_yds = Math.round(stats.rec * statRng.float(6, 11));
    } else if (position === "WR" || position === "TE") {
      stats.targets = Math.round(games * snapShare * (position === "WR" ? 7.2 : 5.2) * quality);
      stats.rec = Math.round(stats.targets * clamp(0.47 + productionScore / 330, 0.38, 0.74));
      stats.rec_yds = Math.round(stats.rec * clamp(position === "WR" ? 11 + productionScore / 35 : 8.5 + productionScore / 45, 7, 17));
      stats.rec_td = Math.max(0, Math.round(stats.rec_yds / clamp(160 - productionScore * 0.55, 70, 170)));
    } else if (["K"].includes(position)) {
      stats.fga = Math.round(games * statRng.float(1.1, 2.1));
      stats.fgm = Math.round(stats.fga * clamp(0.58 + productionScore / 260, 0.55, 0.92));
      stats.xpa = Math.round(games * statRng.float(2.2, 4.4));
      stats.xpm = Math.round(stats.xpa * clamp(0.88 + productionScore / 800, 0.86, 0.99));
    } else if (["P"].includes(position)) {
      stats.punts = Math.round(games * statRng.float(3.5, 5.6));
      stats.punt_yds = Math.round(stats.punts * clamp(36 + productionScore / 7, 34, 49));
      stats.punt_i20 = Math.round(stats.punts * clamp(0.18 + productionScore / 500, 0.12, 0.38));
    } else {
      const defenseFactor = ["EDGE", "DL", "LB"].includes(position) ? 1.15 : 0.88;
      stats.tackles = Math.round(games * snapShare * quality * 5.8 * defenseFactor);
      stats.tfl = Math.round(games * snapShare * quality * (position === "EDGE" ? 1.05 : position === "DL" ? 0.75 : 0.45));
      stats.sacks = Number(Math.max(0, games * snapShare * quality * (position === "EDGE" ? 0.62 : position === "DL" ? 0.42 : 0.12) + statRng.normal(0, 0.8)).toFixed(1));
      stats.int = Math.max(0, Math.round(games * snapShare * quality * (position === "CB" || position === "S" ? 0.22 : 0.04)));
      stats.pd = Math.max(0, Math.round(games * snapShare * quality * (position === "CB" ? 0.85 : position === "S" ? 0.55 : 0.18)));
    }
    return stats;
  };
  const productionHistory = collegePlayers.flatMap((player) => {
    const seasons = collegeSeasonsForClass(player.classYear);
    return Array.from({ length: seasons }, (_, index) => ({
      id: `yz-prod-${player.id}-${index + 1}`,
      playerId: player.id,
      level: "college",
      schoolId: player.schoolId,
      seasonOffset: index - seasons,
      seasonYear: seasonYearForOffset(index - seasons),
      age: Math.max(18, player.age - (seasons - index)),
      position: player.position,
      games: rng.int(8, 13),
      gamesStarted: 0,
      snapShare: 0,
      productionScore: Math.round(clamp(player.collegeOverall + rng.normal(0, 12) - (seasons - index) * 1.5, 20, 99)),
      role: "rotation",
      awards: [] as string[]
    } satisfies YearZeroProductionSeason)).map((row) => {
      const snapShare = Number(clamp(((row.productionScore - 36) / 68) + rng.normal(0, 0.08), 0.04, row.productionScore >= 72 ? 0.96 : 0.72).toFixed(2));
      const gamesStarted = row.productionScore >= 64 ? Math.round(row.games * clamp(snapShare * 1.08, 0.35, 1)) : Math.round(row.games * clamp(snapShare * 0.38, 0, 0.45));
      return {
        ...row,
        gamesStarted,
        snapShare,
        role: roleForProduction(row.productionScore),
        stats: collegeStatsFor(player.position, row.games, gamesStarted, snapShare, row.productionScore, rng.fork(`college-stats:${row.id}`))
      };
    });
  });

  const awardCandidates = productionHistory.filter((row) => row.productionScore >= 78);
  const awardHistory = rng.shuffle(awardCandidates).slice(0, Math.max(40, Math.round(collegePlayers.length * 0.012))).map((row, index) => {
    const award = collegeAwardRows.length > 0 ? rng.pick(collegeAwardRows) : undefined;
    const awardId = award ? textPayload(award, ["award_id", "award", "row_key"], award.rowKey) : "all_conference";
    row.awards = [...(row.awards ?? []), awardId];
    return {
      id: `yz-college-award-${index + 1}`,
      playerId: row.playerId,
      level: "college",
      awardId,
      seasonOffset: row.seasonOffset
    } satisfies YearZeroAwardHistory;
  });

  const collegeInjuries = rng.shuffle(collegePlayers).slice(0, Math.round(collegePlayers.length * 0.08)).map((player, index) => {
    const family = injuryFamilies.length > 0 ? rng.pick(injuryFamilies) : undefined;
    const severity = rng.pick(severities);
    const seasonOffset = -rng.int(1, Math.max(1, collegeSeasonsForClass(player.classYear)));
    return {
      id: `yz-college-injury-${index + 1}`,
      playerId: player.id,
      level: "college",
      seasonOffset,
      seasonYear: seasonYearForOffset(seasonOffset),
      injuryFamily: family ? textPayload(family, ["family_id", "injury_family", "row_key"], family.rowKey) : "soft_tissue",
      severity,
      gamesMissed: severity === "minor" ? rng.int(0, 2) : severity === "moderate" ? rng.int(2, 6) : severity === "major" ? rng.int(6, 12) : rng.int(12, 24),
      medicalFlag: severity === "major" || severity === "catastrophic"
    } satisfies YearZeroInjuryHistory;
  });
  const recruitInjuries = rng.shuffle(highSchoolRecruits).slice(0, Math.round(highSchoolRecruits.length * 0.025)).map((recruit, index) => ({
    id: `yz-hs-injury-${index + 1}`,
    playerId: recruit.id,
    level: "high_school",
    injuryFamily: "pre_college_medical",
    severity: rng.pick(["minor", "moderate"] as InjurySeverity[]),
    gamesMissed: rng.int(0, 5),
    medicalFlag: false
  } satisfies YearZeroInjuryHistory));

  return { productionHistory, awardHistory, injuryHistory: [...collegeInjuries, ...recruitInjuries] };
}

export function generateYearZeroNflHistories(
  seed: string,
  nflPlayers: YearZeroNflPlayer[],
  store: YearZeroBundleStore
): {
  nflContractHistory: YearZeroNflContractHistoryEvent[];
  nflAgingSnapshots: YearZeroNflAgingSnapshot[];
  nflProductionHistory: YearZeroProductionSeason[];
  nflAwardHistory: YearZeroAwardHistory[];
  nflInjuryHistory: YearZeroInjuryHistory[];
  udfaPaths: YearZeroUdfaPath[];
} {
  const contractEvents = store.getYearZeroWeightRows("nfl_contracts", "nfl_contract_history_event_weights_by_origin");
  store.getYearZeroRuntimeRecords("nfl_contracts", "nfl_contract_history_path_templates");
  store.getYearZeroRuleRows("nfl_contracts", "nfl_contract_history_generation_rules");
  store.getYearZeroRuntimeRecords("nfl_aging_decline", "nfl_age_curve_by_position");
  store.getYearZeroRuntimeRecords("nfl_aging_decline", "nfl_development_decline_backfill_curve_v2_2");
  store.getYearZeroWeightRows("nfl_aging_decline", "nfl_decline_event_weights");
  const nflAwardRows = store.getYearZeroWeightRows("nfl_awards", "nfl_award_selection_weights");
  store.getYearZeroRuleRows("nfl_awards", "nfl_award_history_generation_rules");
  store.getYearZeroDefinitionRows("nfl_awards", "nfl_award_taxonomy");
  store.getYearZeroDefinitionRows("udfa", "udfa_career_path_taxonomy");
  store.getYearZeroWeightRows("udfa", "udfa_first_year_path_weights_by_position_priority");
  store.getYearZeroWeightRows("udfa", "udfa_long_term_career_outcome_weights");
  store.getYearZeroRuleRows("udfa", "udfa_history_generation_rules");

  const rng = createRng(`${seed}:year-zero:nfl-histories`);
  const veteranPlayers = nflPlayers.filter((player) => player.experience > 0);
  const seasonYearForOffset = (offset: number) => 2026 + offset;
  const roleShareFor = (player: YearZeroNflPlayer, score: number): number => {
    if (player.pool !== "active_roster") return clamp((score - 42) / 90, 0.02, 0.44);
    if (player.position === "K" || player.position === "P") return score >= 58 ? 0.78 : 0.42;
    if (player.position === "QB") return score >= 68 ? 0.92 : score >= 60 ? 0.24 : 0.08;
    if (player.yearZeroRoleTier?.includes("starter") || score >= 66) return clamp((score - 34) / 55, 0.58, 0.94);
    return clamp((score - 38) / 78, 0.08, 0.58);
  };
  const gamesStartedFor = (player: YearZeroNflPlayer, games: number, snapShare: number, score: number): number => {
    if (games <= 0) return 0;
    if (player.position === "K" || player.position === "P") return games;
    if (player.position === "QB") {
      if (score >= 68 && player.pool === "active_roster") return Math.round(games * clamp(snapShare + 0.08, 0.65, 1));
      return Math.round(games * clamp(snapShare * 0.22, 0, 0.28));
    }
    return Math.round(games * clamp(snapShare * (score >= 64 ? 1.05 : 0.62), 0, 1));
  };
  const nflStatsFor = (player: YearZeroNflPlayer, games: number, gamesStarted: number, snapShare: number, productionScore: number, statRng: Rng): PlayerStats => {
    const stats = emptyPlayerStats();
    const quality = clamp(productionScore / 66, 0.28, 1.65);
    stats.games = games;
    stats.gamesStarted = gamesStarted;
    stats.snaps = Math.round(games * 61 * snapShare);
    if (["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"].includes(player.position)) stats.offenseSnaps = stats.snaps;
    if (["EDGE", "DL", "LB", "CB", "S"].includes(player.position)) stats.defenseSnaps = stats.snaps;
    if (player.position === "K" || player.position === "P" || snapShare < 0.28) stats.specialTeamsSnaps = Math.round(games * statRng.float(4, 11));

    if (player.position === "QB") {
      stats.passAttempts = Math.round(games * clamp(9 + snapShare * 29, 8, 38) * clamp(quality, 0.62, 1.25));
      stats.passCompletions = Math.round(stats.passAttempts * clamp(0.52 + productionScore / 460 + statRng.normal(0, 0.018), 0.47, 0.70));
      stats.passYards = Math.round(stats.passCompletions * clamp(9.4 + productionScore / 31 + statRng.normal(0, 0.45), 7.5, 13.5));
      stats.passTouchdowns = Math.max(0, Math.round(stats.passYards / clamp(215 - productionScore * 1.35, 92, 225) + statRng.normal(0, 1.2)));
      stats.interceptionsThrown = Math.max(0, Math.round(stats.passAttempts * clamp(0.039 - productionScore * 0.00024 + statRng.normal(0, 0.003), 0.008, 0.052)));
      stats.sacksTaken = Math.max(0, Math.round(stats.passAttempts * clamp(0.083 - productionScore * 0.00032 + statRng.normal(0, 0.006), 0.025, 0.12)));
      stats.sackYardsLost = Math.round(stats.sacksTaken * statRng.float(5.7, 7.8));
      stats.passingFirstDowns = Math.round(stats.passCompletions * clamp(0.37 + productionScore / 700, 0.28, 0.55));
      stats.passingSuccesses = Math.round(stats.passAttempts * clamp(0.38 + productionScore / 700, 0.30, 0.58));
      stats.passingLong = stats.passYards > 0 ? Math.round(clamp(statRng.normal(36 + productionScore / 3.2, 10), 12, 85)) : 0;
      stats.rushAttempts = Math.round(games * statRng.float(1.2, 4.8));
      stats.rushYards = Math.round(stats.rushAttempts * statRng.float(1.8, 5.8));
      stats.rushTouchdowns = Math.max(0, Math.round(stats.rushAttempts * statRng.float(0.015, 0.055)));
      const wins = Math.round(gamesStarted * clamp(0.34 + productionScore / 260 + statRng.normal(0, 0.06), 0.08, 0.84));
      stats.qbWins = Math.min(gamesStarted, wins);
      stats.qbTies = gamesStarted >= 12 && statRng.next() < 0.06 ? 1 : 0;
      stats.qbLosses = Math.max(0, gamesStarted - stats.qbWins - stats.qbTies);
      stats.fourthQuarterComebacks = Math.max(0, Math.round(stats.qbWins * clamp((productionScore - 50) / 190 + statRng.normal(0, 0.03), 0, 0.24)));
      stats.gameWinningDrives = Math.max(stats.fourthQuarterComebacks, Math.round(stats.qbWins * clamp((productionScore - 45) / 155 + statRng.normal(0, 0.04), 0, 0.32)));
    } else if (player.position === "RB") {
      stats.rushAttempts = Math.round(games * snapShare * clamp(12.5 * quality, 3, 19));
      stats.rushYards = Math.round(stats.rushAttempts * clamp(3.15 + productionScore / 52 + statRng.normal(0, 0.18), 2.6, 5.6));
      stats.rushTouchdowns = Math.max(0, Math.round(stats.rushYards / clamp(155 - productionScore * 0.6, 75, 170)));
      stats.rushingFirstDowns = Math.round(stats.rushAttempts * clamp(0.18 + productionScore / 640, 0.12, 0.34));
      stats.rushingSuccesses = Math.round(stats.rushAttempts * clamp(0.36 + productionScore / 760, 0.25, 0.56));
      stats.rushingLong = stats.rushYards > 0 ? Math.round(clamp(statRng.normal(24 + productionScore / 5, 9), 5, 82)) : 0;
      stats.targets = Math.round(games * snapShare * statRng.float(1.4, 4.2));
      stats.receptions = Math.round(stats.targets * clamp(0.64 + productionScore / 900, 0.48, 0.86));
      stats.receivingYards = Math.round(stats.receptions * statRng.float(5.5, 9.2));
    } else if (player.position === "WR" || player.position === "TE") {
      stats.targets = Math.round(games * snapShare * (player.position === "WR" ? 7.8 : 5.6) * clamp(quality, 0.55, 1.35));
      stats.receptions = Math.round(stats.targets * clamp(0.50 + productionScore / 430 + statRng.normal(0, 0.018), 0.38, 0.78));
      stats.receivingYards = Math.round(stats.receptions * clamp(player.position === "WR" ? 10.6 + productionScore / 38 : 8.2 + productionScore / 55, 6.5, 17.6));
      stats.receivingTouchdowns = Math.max(0, Math.round(stats.receivingYards / clamp(175 - productionScore * 0.65, 82, 190)));
      stats.receivingFirstDowns = Math.round(stats.receptions * clamp(0.44 + productionScore / 760, 0.30, 0.64));
      stats.receivingSuccesses = Math.round(stats.targets * clamp(0.41 + productionScore / 830, 0.28, 0.60));
      stats.receivingLong = stats.receivingYards > 0 ? Math.round(clamp(statRng.normal(player.position === "WR" ? 32 + productionScore / 4.3 : 24 + productionScore / 5.6, 9), 6, 86)) : 0;
      stats.drops = Math.max(0, Math.round(stats.targets * clamp(0.082 - productionScore * 0.00034, 0.012, 0.10)));
    } else if (player.position === "K") {
      stats.fieldGoalAttempts = Math.round(games * statRng.float(1.15, 2.1));
      stats.fieldGoalsMade = Math.round(stats.fieldGoalAttempts * clamp(0.70 + productionScore / 520, 0.62, 0.93));
      stats.fieldGoalLong = stats.fieldGoalAttempts > 0 ? Math.round(clamp(statRng.normal(45 + productionScore / 7, 5), 33, 63)) : 0;
      stats.extraPointAttempts = Math.round(games * statRng.float(2.0, 3.7));
      stats.extraPointsMade = Math.round(stats.extraPointAttempts * clamp(0.89 + productionScore / 900, 0.86, 0.995));
    } else if (player.position === "P") {
      stats.punts = Math.round(games * statRng.float(3.3, 5.6));
      stats.puntYards = Math.round(stats.punts * clamp(39 + productionScore / 7.5, 38, 51));
      stats.puntInside20 = Math.round(stats.punts * clamp(0.20 + productionScore / 520, 0.13, 0.41));
      stats.puntLong = stats.punts > 0 ? Math.round(clamp(statRng.normal(51 + productionScore / 9, 5), 40, 75)) : 0;
      stats.puntTouchbacks = Math.round(stats.punts * clamp(0.04 + (80 - productionScore) / 900, 0.02, 0.12));
    } else {
      const frontSeven = ["EDGE", "DL", "LB"].includes(player.position);
      const coverage = player.position === "CB" || player.position === "S";
      const tackleBase = player.position === "LB" ? 6.2 : coverage ? 4.3 : 3.3;
      stats.tackles = Math.round(games * snapShare * tackleBase * clamp(quality, 0.52, 1.45));
      stats.tacklesForLoss = Math.round(games * snapShare * (player.position === "EDGE" ? 0.72 : player.position === "DL" ? 0.55 : player.position === "LB" ? 0.38 : 0.08) * quality);
      stats.sacks = Math.max(0, Math.round(games * snapShare * (player.position === "EDGE" ? 0.48 : player.position === "DL" ? 0.31 : player.position === "LB" ? 0.12 : 0.01) * quality));
      stats.sackYards = Math.round(stats.sacks * statRng.float(5.4, 8.1));
      stats.interceptions = Math.max(0, Math.round(games * snapShare * (coverage ? 0.16 : 0.035) * quality));
      stats.passesDefended = Math.max(0, Math.round(games * snapShare * (player.position === "CB" ? 0.72 : player.position === "S" ? 0.48 : 0.14) * quality));
      stats.forcedFumbles = Math.max(0, Math.round(games * snapShare * statRng.float(0.025, frontSeven ? 0.09 : 0.055) * quality));
      stats.fumbleRecoveries = Math.max(0, Math.round(games * snapShare * statRng.float(0.02, 0.07) * quality));
      stats.qbPressures = Math.round(games * snapShare * (player.position === "EDGE" ? 2.3 : player.position === "DL" ? 1.55 : player.position === "LB" ? 0.65 : 0.08) * quality);
      stats.qbHits = Math.round(stats.qbPressures * statRng.float(0.24, 0.38));
      stats.coverageTargets = coverage ? Math.round(games * snapShare * statRng.float(3.1, 5.8)) : 0;
      stats.completionsAllowed = Math.round(stats.coverageTargets * clamp(0.72 - productionScore / 420, 0.45, 0.76));
      stats.yardsAllowed = Math.round(stats.completionsAllowed * statRng.float(8.8, 13.4));
      stats.touchdownsAllowed = Math.max(0, Math.round(stats.coverageTargets * clamp(0.075 - productionScore * 0.00038, 0.012, 0.085)));
    }
    stats.touchdowns = stats.rushTouchdowns + stats.receivingTouchdowns + stats.defensiveTouchdowns;
    return stats;
  };
  const nflContractHistory = veteranPlayers.flatMap((player) => {
    const events = Math.min(player.experience, rng.int(1, 4));
    return Array.from({ length: events }, (_, index) => {
      const eventRow = contractEvents.length > 0 ? rng.pick(contractEvents) : undefined;
      return {
        id: `yz-contract-${player.id}-${index + 1}`,
        playerId: player.id,
        teamId: player.teamId,
        eventType: eventRow ? textPayload(eventRow, ["event_type", "event_id", "row_key"], eventRow.rowKey) : "signed_contract",
        seasonOffset: -events + index,
        apy: Number(clamp(player.salary * rng.float(0.72, 1.18), 0.75, 48).toFixed(1))
      } satisfies YearZeroNflContractHistoryEvent;
    });
  });

  const nflAgingSnapshots = veteranPlayers.map((player) => ({
    id: `yz-aging-${player.id}`,
    playerId: player.id,
    age: player.age,
    wearScore: Math.round(clamp(player.experience * 7 + rng.normal(0, 12), 0, 100)),
    declineRisk: Math.round(clamp((player.age - 27) * 8 + rng.normal(0, 12), 0, 100))
  } satisfies YearZeroNflAgingSnapshot));

  const nflAwardHistory = rng.shuffle(nflPlayers.filter((player) => player.pool === "active_roster" && player.overall >= 78)).slice(0, 120).map((player, index) => {
    const award = nflAwardRows.length > 0 ? rng.pick(nflAwardRows) : undefined;
    return {
      id: `yz-nfl-award-${index + 1}`,
      playerId: player.id,
      level: "nfl",
      awardId: award ? textPayload(award, ["award_id", "award", "row_key"], award.rowKey) : "pro_bowl",
      seasonOffset: -rng.int(1, Math.max(1, player.experience))
    } satisfies YearZeroAwardHistory;
  });

  const nflInjuryHistory = rng.shuffle(veteranPlayers).slice(0, Math.round(veteranPlayers.length * 0.12)).map((player, index) => {
    const severity = rng.pick(["minor", "moderate", "major"] as InjurySeverity[]);
    const seasonOffset = -rng.int(1, Math.max(1, player.experience));
    return {
      id: `yz-nfl-injury-${index + 1}`,
      playerId: player.id,
      level: "nfl",
      seasonOffset,
      seasonYear: seasonYearForOffset(seasonOffset),
      injuryFamily: "veteran_wear",
      severity,
      gamesMissed: severity === "minor" ? rng.int(0, 2) : severity === "moderate" ? rng.int(2, 7) : rng.int(7, 16),
      medicalFlag: severity === "major"
    } satisfies YearZeroInjuryHistory;
  });

  const awardsByPlayerOffset = new Map<string, string[]>();
  for (const award of nflAwardHistory) {
    const key = `${award.playerId}:${award.seasonOffset}`;
    awardsByPlayerOffset.set(key, [...(awardsByPlayerOffset.get(key) ?? []), award.awardId]);
  }
  const injuriesByPlayerOffset = new Map<string, YearZeroInjuryHistory[]>();
  for (const injury of nflInjuryHistory) {
    const key = `${injury.playerId}:${injury.seasonOffset ?? -1}`;
    injuriesByPlayerOffset.set(key, [...(injuriesByPlayerOffset.get(key) ?? []), injury]);
  }
  const nflProductionHistory = veteranPlayers.flatMap((player) => {
    const completedSeasons = Math.max(0, player.experience);
    return Array.from({ length: completedSeasons }, (_, index) => {
      const seasonOffset = index - completedSeasons;
      const seasonYear = seasonYearForOffset(seasonOffset);
      const age = Math.max(21, player.age + seasonOffset);
      const seasonRng = rng.fork(`nfl-production:${player.id}:${seasonYear}`);
      const developmentLift = player.experience <= 4 ? (index - completedSeasons + 1) * 1.6 : age <= 29 ? 0 : -(age - 29) * 1.7;
      const productionScore = Math.round(clamp(player.overall + developmentLift + seasonRng.normal(0, 6.5), 24, 97));
      const injuries = injuriesByPlayerOffset.get(`${player.id}:${seasonOffset}`) ?? [];
      const injuryMissed = injuries.reduce((sum, injury) => sum + injury.gamesMissed, 0);
      const baseGames = Math.round(clamp(16.2 - injuryMissed + seasonRng.normal(0, 1.4), 0, 17));
      const games = Math.max(0, Math.min(17, baseGames));
      const snapShare = Number(roleShareFor(player, productionScore).toFixed(2));
      const gamesStarted = gamesStartedFor(player, games, snapShare, productionScore);
      const stats = nflStatsFor(player, games, gamesStarted, snapShare, productionScore, seasonRng.fork("stats"));
      return {
        id: `yz-nfl-prod-${player.id}-${seasonYear}`,
        playerId: player.id,
        level: "nfl",
        teamId: player.teamId,
        seasonOffset,
        seasonYear,
        age,
        position: player.position,
        games,
        gamesStarted,
        snapShare,
        productionScore,
        role: productionScore >= 82 ? "star" : productionScore >= 66 ? "starter" : productionScore >= 54 ? "rotation" : "depth",
        stats,
        awards: awardsByPlayerOffset.get(`${player.id}:${seasonOffset}`) ?? []
      } satisfies YearZeroProductionSeason;
    });
  });

  const udfaPaths = rng.shuffle(nflPlayers.filter((player) => player.pool !== "active_roster" || player.overall < 58)).slice(0, 180).map((player, index) => ({
    id: `yz-udfa-path-${index + 1}`,
    playerId: player.id,
    pathType: player.pool === "practice_squad" ? "practice_squad_development" : "camp_competition",
    longTermOutcome: rng.pick(["depth", "spot_starter", "practice_squad", "out_of_league"])
  } satisfies YearZeroUdfaPath));

  return { nflContractHistory, nflAgingSnapshots, nflProductionHistory, nflAwardHistory, nflInjuryHistory, udfaPaths };
}
