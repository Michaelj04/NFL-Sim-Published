import { clamp, createRng, type Rng } from "../../lib/rng";
import type { NFLTeam, YearZeroBootstrapState, YearZeroProgressStep, YearZeroTeamStrengthContext } from "../../types";
import type { CollegeProgram } from "../../types";
import { YEAR_ZERO_GAMEPLAY_CATEGORIES, YEAR_ZERO_NON_GAMEPLAY_CATEGORIES, loadYearZeroBundles, type YearZeroBundleStore, type YearZeroRecord } from "./yearZeroBundleLoader";
import { extractYearZeroTransferPortal, generateYearZeroCollegeHistories, generateYearZeroCollegePlayers, generateYearZeroDraftClass, generateYearZeroHighSchoolRecruits, generateYearZeroNflHistories, generateYearZeroNflPlayers, generateYearZeroNflReserveStatuses, generateYearZeroSupplementalScoutingViews } from "./yearZeroPlayerBase";

function textPayload(record: YearZeroRecord, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record.payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function numberPayload(record: YearZeroRecord, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = record.payload[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function weightedPick<T>(items: T[], rng: Rng, weightFor: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightFor(item)), 0);
  if (total <= 0) return items[0];
  let roll = rng.float(0, total);
  for (const item of items) {
    roll -= Math.max(0, weightFor(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

export function loadYearZeroProgressTemplate(store = loadYearZeroBundles()): YearZeroProgressStep[] {
  return store
    .getYearZeroRuntimeRecords("year_zero_core", "year_zero_loading_progress_steps")
    .map((record, index) => ({
      id: textPayload(record, ["step_id", "phase_id", "id"], `year-zero-step-${index + 1}`),
      label: textPayload(record, ["label", "step_label", "phase_label", "name"], `Year Zero step ${index + 1}`),
      detail: textPayload(record, ["description", "detail", "notes"], "Building the starting football universe."),
      sortOrder: numberPayload(record, ["sort_order", "display_order", "step_number"], index + 1)
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function generateYearZeroTeamStrength(seed: string, teams: NFLTeam[], store = loadYearZeroBundles()): YearZeroTeamStrengthContext[] {
  const rng = createRng(`${seed}:year-zero:nfl-team-strength`);
  const tierDefinitions = store.getYearZeroDefinitionRows("nfl_team_strength", "nfl_team_strength_tier_definitions");
  const tierWeights = store.getYearZeroWeightRows("nfl_team_strength", "nfl_team_strength_league_tier_distribution");
  const tiers = (tierDefinitions.length > 0 ? tierDefinitions : tierWeights).map((record) => ({
    id: textPayload(record, ["tier_id", "tier", "team_tier", "row_key"], record.rowKey),
    weight: numberPayload(record, ["weight", "target_share", "share", "teams"], 1),
    bias: numberPayload(record, ["roster_bias", "quality_modifier", "overall_modifier", "rating_modifier"], 0)
  }));
  const fallbackTiers = tiers.length > 0 ? tiers : [
    { id: "elite", weight: 2, bias: 8 },
    { id: "strong", weight: 6, bias: 4 },
    { id: "average", weight: 16, bias: 0 },
    { id: "weak", weight: 6, bias: -4 },
    { id: "rebuild", weight: 2, bias: -8 }
  ];
  return rng.shuffle(teams).map((team) => {
    const tier = weightedPick(fallbackTiers, rng.fork(team.id), (item) => item.weight);
    return {
      teamId: team.id,
      tier: tier.id,
      rosterBias: Math.round(clamp(tier.bias + rng.int(-2, 2), -12, 12)),
      capHealth: rng.pick(["tight", "balanced", "flexible"]),
      draftCapital: rng.pick(["thin", "normal", "extra"])
    };
  }).sort((a, b) => a.teamId.localeCompare(b.teamId));
}

export function createYearZeroBootstrapState(seed: string, teams: NFLTeam[], schools: CollegeProgram[], store: YearZeroBundleStore = loadYearZeroBundles()): YearZeroBootstrapState {
  const initialCollegePlayers = generateYearZeroCollegePlayers(seed, schools, store);
  const { retainedCollegePlayers: collegePlayers, transferPortal } = extractYearZeroTransferPortal(seed, schools, initialCollegePlayers, store);
  const { recruits: highSchoolRecruits, scoutingViews: highSchoolScoutingViews } = generateYearZeroHighSchoolRecruits(seed, teams, store);
  const draftClass = generateYearZeroDraftClass(seed, collegePlayers, store);
  const teamStrength = generateYearZeroTeamStrength(seed, teams, store);
  const nflPlayers = generateYearZeroNflPlayers(seed, teams, schools, teamStrength, store);
  const nflReserveStatuses = generateYearZeroNflReserveStatuses(seed, nflPlayers, store);
  const scoutingViews = [
    ...highSchoolScoutingViews,
    ...generateYearZeroSupplementalScoutingViews(seed, teams, transferPortal, draftClass, nflPlayers, store)
  ];
  const collegeHistories = generateYearZeroCollegeHistories(seed, collegePlayers, highSchoolRecruits, store);
  const nflHistories = generateYearZeroNflHistories(seed, nflPlayers, store);
  return {
    version: "v11_6_4",
    status: "complete",
    seed,
    completedAt: new Date(0).toISOString(),
    bundleCount: store.bundleFiles.length,
    bundledRows: store.bundledRows,
    progressSteps: loadYearZeroProgressTemplate(store),
    teamStrength,
    collegePlayers,
    transferPortal,
    highSchoolRecruits,
    scoutingViews,
    productionHistory: [...collegeHistories.productionHistory, ...nflHistories.nflProductionHistory],
    awardHistory: [...collegeHistories.awardHistory, ...nflHistories.nflAwardHistory],
    injuryHistory: [...collegeHistories.injuryHistory, ...nflHistories.nflInjuryHistory],
    draftClass,
    nflPlayers,
    nflReserveStatuses,
    nflContractHistory: nflHistories.nflContractHistory,
    nflAgingSnapshots: nflHistories.nflAgingSnapshots,
    udfaPaths: nflHistories.udfaPaths,
    debugSummary: {
      loadedRuntimeBundles: store.bundleFiles,
      gameplayCategories: [...YEAR_ZERO_GAMEPLAY_CATEGORIES],
      validationOnlyCategories: [...YEAR_ZERO_NON_GAMEPLAY_CATEGORIES],
      annualSystemsUseNormalRuntimeCsvs: true,
      hardcodedInitialNflGenerationReplaced: true,
      collegeRosterPlayersGenerated: collegePlayers.length,
      transferPortalEntriesGenerated: transferPortal.length,
      highSchoolRecruitsGenerated: highSchoolRecruits.length,
      scoutingViewsGenerated: scoutingViews.length,
      productionHistoryGenerated: collegeHistories.productionHistory.length + nflHistories.nflProductionHistory.length,
      collegeProductionHistoryGenerated: collegeHistories.productionHistory.length,
      nflProductionHistoryGenerated: nflHistories.nflProductionHistory.length,
      awardHistoryGenerated: collegeHistories.awardHistory.length + nflHistories.nflAwardHistory.length,
      injuryHistoryGenerated: collegeHistories.injuryHistory.length + nflHistories.nflInjuryHistory.length,
      draftProspectsGenerated: draftClass.length,
      nflPlayersGenerated: nflPlayers.length,
      nflReserveStatusesGenerated: nflReserveStatuses.length,
      nflContractHistoryGenerated: nflHistories.nflContractHistory.length,
      nflAgingSnapshotsGenerated: nflHistories.nflAgingSnapshots.length,
      udfaPathsGenerated: nflHistories.udfaPaths.length,
      initialDraftBoardDerivedFromYearZeroCollegePlayers: true
    }
  };
}
