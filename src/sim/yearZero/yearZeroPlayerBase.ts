import { generatedName } from "../../data/names";
import { clamp, createRng, type Rng } from "../../lib/rng";
import type { CollegeProgram, InjurySeverity, NFLTeam, Position, ScoutingRegion, YearZeroAwardHistory, YearZeroCollegePlayer, YearZeroDraftProspect, YearZeroHighSchoolRecruit, YearZeroInjuryHistory, YearZeroNflAgingSnapshot, YearZeroNflContractHistoryEvent, YearZeroNflPlayer, YearZeroProductionSeason, YearZeroScoutingView, YearZeroTeamStrengthContext, YearZeroTransferPortalEntry, YearZeroUdfaPath } from "../../types";
import { POSITIONS } from "../../types";
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
  const prestigeBase = 45 + school.prestige * 0.32 + school.competition * 0.08;
  const packageMidpoint = rows.length > 0
    ? rows.reduce((sum, row) => sum + numberPayload(row, ["overall_mid", "mean", "rating", "college_overall"], 58), 0) / rows.length
    : 58;
  return clamp(prestigeBase * 0.72 + packageMidpoint * 0.28, 38, 82);
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

  return schools.flatMap((school) => {
    const rng = createRng(`${seed}:year-zero:college-roster:${school.id}`);
    const usedNames = new Set<string>();
    const base = schoolQualityBase(school, store);
    let counter = 0;
    return collegeRosterTemplate.flatMap(([position, count]) =>
      Array.from({ length: count }, () => {
        counter += 1;
        const identity = generatedName(rng, usedNames);
        const collegeOverall = Math.round(clamp(rng.normal(base - counter * 0.18, 8.5), 32, 96));
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

function translateCollegeToNfl(collegeOverall: number, store: YearZeroBundleStore): number {
  const rows = store.getYearZeroRuntimeRecords("draft_translation", "college_to_nfl_rating_translation");
  const midpoint = rows.length > 0
    ? rows.slice(0, 60).reduce((sum, row) => sum + numberPayload(row, ["nfl_rating", "nfl_value", "output_rating"], 58), 0) / Math.min(60, rows.length)
    : 58;
  return Math.round(clamp(collegeOverall * 0.72 + midpoint * 0.28 - 4, 35, 84));
}

function projectedRoundFor(nflOverall: number, position: Position): number {
  const premium = position === "QB" ? 5 : ["EDGE", "LT", "CB", "WR"].includes(position) ? 2 : 0;
  const score = nflOverall + premium;
  if (score >= 73) return 1;
  if (score >= 68) return 2;
  if (score >= 63) return 3;
  if (score >= 59) return 4;
  if (score >= 55) return 5;
  if (score >= 51) return 6;
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
  const eligible = collegePlayers
    .filter((player): player is YearZeroCollegePlayer & { classYear: YearZeroDraftProspect["classYear"] } => isDraftEligibleClass(player.classYear))
    .map((player) => ({ player, score: player.collegeOverall + (player.classYear === "SR" ? 5 : 0) + rng.float(0, 14) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 257);
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
      nflPotential: Math.round(clamp(nflOverall + rng.int(1, 15), nflOverall, 92)),
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
    recruits.slice(0, 200).map((recruit) => {
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

function playerSalary(position: Position, overall: number, pool: YearZeroNflPlayer["pool"], rng: Rng): number {
  const premium = position === "QB" ? 1.95 : ["EDGE", "CB", "LT", "WR"].includes(position) ? 1.22 : ["K", "P"].includes(position) ? 0.42 : 0.86;
  const poolDiscount = pool === "practice_squad" ? 0.16 : pool === "free_agent" ? 0.74 : 1;
  const base = Math.pow(clamp((overall - 36) / 44, 0.04, 1.35), 2.1) * 20 * premium * poolDiscount;
  return Number(clamp(0.75 + base + rng.float(0, 1.1), 0.75, position === "QB" ? 45 : 28).toFixed(1));
}

function practiceSquadPosition(index: number): Position {
  return ["WR", "CB", "EDGE", "LB", "RB", "TE", "DL", "S", "QB", "LT", "C", "RT", "WR", "CB", "K", "P"][index % 16] as Position;
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
  store.getYearZeroWeightRows("nfl_practice_squad", "nfl_practice_squad_quality_mix_by_position_group");
  store.getYearZeroRuntimeRecords("nfl_free_agents", "nfl_free_agent_age_experience_by_role");
  store.getYearZeroWeightRows("nfl_free_agents", "nfl_free_agent_role_quality_mix_by_position");
  store.getYearZeroRuntimeRecords("nfl_contracts", "nfl_initial_contract_generation_matrix");
  store.getYearZeroWeightRows("nfl_contracts", "nfl_initial_contract_source_mix_by_roster_pool");

  const strengthByTeam = new Map(teamStrength.map((context) => [context.teamId, context]));
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
    const contractYears = pool === "practice_squad" ? 1 : rng.int(1, 5);
    return {
      id: `${idPrefix}-${position.toLowerCase()}-${slot}`,
      ...identity,
      teamId,
      previousTeamId: pool === "free_agent" ? rng.pick(teams).id : undefined,
      pool,
      position,
      age,
      experience: Math.max(0, age - 21),
      collegeId: rng.pick(schools).id,
      overall,
      potential: Math.round(clamp(overall + rng.int(pool === "practice_squad" ? 4 : 0, pool === "practice_squad" ? 16 : 8), overall, 96)),
      salary: playerSalary(position, overall, pool, rng),
      contractYears,
      ratingScaleContext: "nfl",
      source: "year_zero_nfl_player"
    };
  };

  const teamPlayers = teams.flatMap((team) => {
    const rng = createRng(`${seed}:year-zero:nfl:${team.id}`);
    const usedNames = new Set<string>();
    const rosterBias = strengthByTeam.get(team.id)?.rosterBias ?? 0;
    const active = nflActiveRosterTemplate.flatMap(([position, count]) =>
      Array.from({ length: count }, (_, index) => makePlayer(`yz-nfl-${team.id}`, team.id, "active_roster", position, index + 1, 55 + rosterBias, rng.fork(`active:${position}:${index}`), usedNames))
    );
    const practice = Array.from({ length: 16 }, (_, index) => {
      const position = practiceSquadPosition(index);
      return makePlayer(`yz-ps-${team.id}`, team.id, "practice_squad", position, index + 1, 48 + rosterBias * 0.35, rng.fork(`practice:${position}:${index}`), usedNames);
    });
    return [...active, ...practice];
  });

  const freeAgentRng = createRng(`${seed}:year-zero:nfl:free-agents`);
  const freeAgentNames = new Set<string>();
  const freeAgents = yearZeroFreeAgentTemplate.flatMap(([position, count]) =>
    Array.from({ length: count }, (_, index) => makePlayer("yz-fa", "FA", "free_agent", position, index + 1, 51, freeAgentRng.fork(`${position}:${index}`), freeAgentNames))
  );
  return [...teamPlayers, ...freeAgents];
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
  const productionHistory = collegePlayers.flatMap((player) => {
    const seasons = player.classYear === "FR" ? 1 : player.classYear === "SO" || player.classYear === "RS-SO" ? 2 : player.classYear === "JR" ? 3 : 4;
    return Array.from({ length: seasons }, (_, index) => ({
      id: `yz-prod-${player.id}-${index + 1}`,
      playerId: player.id,
      schoolId: player.schoolId,
      seasonOffset: index - seasons,
      games: rng.int(8, 13),
      productionScore: Math.round(clamp(player.collegeOverall + rng.normal(0, 12) - (seasons - index) * 1.5, 20, 99)),
      role: player.collegeOverall >= 78 ? "star" : player.collegeOverall >= 64 ? "starter" : "rotation"
    } satisfies YearZeroProductionSeason));
  });

  const awardCandidates = collegePlayers.filter((player) => player.collegeOverall >= 76);
  const awardHistory = rng.shuffle(awardCandidates).slice(0, Math.max(40, Math.round(collegePlayers.length * 0.012))).map((player, index) => {
    const award = collegeAwardRows.length > 0 ? rng.pick(collegeAwardRows) : undefined;
    return {
      id: `yz-college-award-${index + 1}`,
      playerId: player.id,
      level: "college",
      awardId: award ? textPayload(award, ["award_id", "award", "row_key"], award.rowKey) : "all_conference",
      seasonOffset: -rng.int(0, 3)
    } satisfies YearZeroAwardHistory;
  });

  const collegeInjuries = rng.shuffle(collegePlayers).slice(0, Math.round(collegePlayers.length * 0.08)).map((player, index) => {
    const family = injuryFamilies.length > 0 ? rng.pick(injuryFamilies) : undefined;
    const severity = rng.pick(severities);
    return {
      id: `yz-college-injury-${index + 1}`,
      playerId: player.id,
      level: "college",
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
      seasonOffset: -rng.int(0, Math.max(1, player.experience))
    } satisfies YearZeroAwardHistory;
  });

  const nflInjuryHistory = rng.shuffle(veteranPlayers).slice(0, Math.round(veteranPlayers.length * 0.12)).map((player, index) => {
    const severity = rng.pick(["minor", "moderate", "major"] as InjurySeverity[]);
    return {
      id: `yz-nfl-injury-${index + 1}`,
      playerId: player.id,
      level: "nfl",
      injuryFamily: "veteran_wear",
      severity,
      gamesMissed: severity === "minor" ? rng.int(0, 2) : severity === "moderate" ? rng.int(2, 7) : rng.int(7, 16),
      medicalFlag: severity === "major"
    } satisfies YearZeroInjuryHistory;
  });

  const udfaPaths = rng.shuffle(nflPlayers.filter((player) => player.pool !== "active_roster" || player.overall < 58)).slice(0, 180).map((player, index) => ({
    id: `yz-udfa-path-${index + 1}`,
    playerId: player.id,
    pathType: player.pool === "practice_squad" ? "practice_squad_development" : "camp_competition",
    longTermOutcome: rng.pick(["depth", "spot_starter", "practice_squad", "out_of_league"])
  } satisfies YearZeroUdfaPath));

  return { nflContractHistory, nflAgingSnapshots, nflAwardHistory, nflInjuryHistory, udfaPaths };
}
