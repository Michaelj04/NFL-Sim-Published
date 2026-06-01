import { clamp, createRng, type Rng } from "../lib/rng";
import type { AnnualTransferPortalState, CollegeProgram, CollegeRosterPlayer, CollegeTrainingBankEntry, GameSave, NFLTeam, Player, SchoolProfile } from "../types";
import { annualRuntimeDebug, annualTransferDestinationWeights, annualTransferReasons, annualTransferTransitionProbability } from "./annualRuntime";
import { isPracticeSquadPlayer } from "./practiceSquad";

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

function transferEntryScore(player: Player, rng: Rng): number {
  const depthFrustration = isPracticeSquadPlayer(player) ? 18 : player.stats.snaps < 150 ? 12 : player.stats.snaps < 400 ? 5 : -8;
  const ageWindow = player.age <= 25 ? 8 : player.age <= 28 ? 2 : -10;
  const potentialGap = Math.max(0, player.potential - player.overall) * 0.55;
  return depthFrustration + ageWindow + potentialGap + rng.normal(0, 8);
}

function collegeTransferEntryScore(player: CollegeRosterPlayer, rng: Rng, morale?: { morale: number; promisePressure: number; transferRisk: number }, training?: CollegeTrainingBankEntry): number {
  const classWindow = player.classYear === "FR" ? 2 : player.classYear === "SO" || player.classYear === "RS-SO" ? 9 : player.classYear === "JR" ? 7 : -12;
  const potentialGap = Math.max(0, player.collegePotential - player.collegeOverall) * 0.48;
  const rolePressure = player.collegeOverall < 66 ? 12 : player.collegeOverall > 82 ? 5 : 2;
  const moralePressure = morale ? (100 - morale.morale) * 0.18 + morale.promisePressure * 0.12 + morale.transferRisk * 0.2 : 0;
  const personalityPressure = training ? (training.portalRiskMult - 1) * 12 + training.playingTimeSensitivity * 4 - (training.loyaltyMult - 1) * 8 : 0;
  return classWindow + potentialGap + rolePressure + moralePressure + personalityPressure + rng.normal(0, 8);
}

function destinationScore(team: NFLTeam, player: Player, componentWeights: Array<{ component: string; weight: number }>, rng: Rng): number {
  const weighted = componentWeights.reduce((sum, component) => {
    if (component.component === "playing_time_opportunity") return sum + component.weight * rng.float(35, 95);
    if (component.component === "prestige") return sum + component.weight * team.marketSize;
    if (component.component === "scheme_fit") return sum + component.weight * rng.float(30, 90);
    if (component.component === "development") return sum + component.weight * (player.potential - player.overall + 65);
    return sum + component.weight * rng.float(25, 85);
  }, 0);
  return Math.round(clamp(weighted, 0, 100));
}

function levelForSchool(school: CollegeProgram, profile?: SchoolProfile): string {
  if (profile?.subdivisionLevel) return profile.subdivisionLevel;
  if (school.subdivision === "FCS") return school.prestige >= 62 ? "FCS_TOP" : "FCS_LOW";
  return school.prestige >= 80 ? "FBS_POWER" : "FBS_G5";
}

function collegeDestinationScore(
  school: CollegeProgram,
  player: CollegeRosterPlayer,
  componentWeights: Array<{ component: string; weight: number }>,
  rng: Rng,
  fromProfile?: SchoolProfile,
  toProfile?: SchoolProfile,
  rosterNeed = 50
): number {
  const fromLevel = fromProfile?.subdivisionLevel ?? "FBS_G5";
  const transitionFit = annualTransferTransitionProbability(fromLevel, levelForSchool(school, toProfile)) * 100;
  const weighted = componentWeights.reduce((sum, component) => {
    if (component.component === "playing_time_opportunity") return sum + component.weight * (rosterNeed * 0.65 + rng.float(20, 96) * 0.35);
    if (component.component === "nil_offer") return sum + component.weight * (toProfile?.nilPower ?? school.prestige);
    if (component.component === "prestige") return sum + component.weight * (toProfile?.prestige ?? school.prestige);
    if (component.component === "distance_fit") return sum + component.weight * geographyFit(fromProfile, toProfile, rng);
    if (component.component === "scheme_fit") return sum + component.weight * rng.float(35, 92);
    if (component.component === "development") return sum + component.weight * ((toProfile?.competition ?? school.competition) * 0.45 + (toProfile?.prestige ?? school.prestige) * 0.2 + Math.max(0, player.collegePotential - player.collegeOverall));
    if (component.component === "academic_fit") return sum + component.weight * (100 - Math.abs((toProfile?.academicStrictness ?? 55) - 55));
    if (component.component === "prior_relationship") return sum + component.weight * transitionFit;
    return sum + component.weight * rng.float(25, 88);
  }, 0);
  const aggression = toProfile?.transferAggression ?? 50;
  return Math.round(clamp(weighted * 0.86 + transitionFit * 0.08 + aggression * 0.06, 0, 100));
}

function geographyFit(fromProfile: SchoolProfile | undefined, toProfile: SchoolProfile | undefined, rng: Rng): number {
  if (!fromProfile || !toProfile) return rng.float(35, 85);
  if (fromProfile.state === toProfile.state) return 92;
  if (fromProfile.campusRegion === toProfile.campusRegion) return 76;
  return 48;
}

function rosterNeedForDestination(save: GameSave, schoolId: string, position: CollegeRosterPlayer["position"]): number {
  const active = save.collegeRoster?.players.filter((player) => player.schoolId === schoolId && player.position === position && !player.cutSeason && !player.graduatedSeason && !player.draftDeclaredSeason).length ?? 0;
  const target = position === "QB" ? 4 : position === "WR" ? 12 : position === "DL" || position === "EDGE" || position === "LB" || position === "CB" ? 8 : 5;
  return Math.round(clamp(48 + (target - active) * 8, 10, 95));
}

function selectCollegeTransferReason(
  reasons: Array<{ reason: string; weight: number; threshold: string }>,
  player: CollegeRosterPlayer,
  morale: { morale: number; promisePressure: number; transferRisk: number; reasons: string[] } | undefined,
  training: CollegeTrainingBankEntry | undefined,
  rng: Rng
): { reason: string; signal: number } {
  const scored = reasons.map((reason) => {
    const signal = collegeReasonSignal(reason.threshold, reason.reason, player, morale, training);
    return {
      ...reason,
      signal,
      adjustedWeight: reason.weight * (0.2 + signal / 100)
    };
  });
  const selected = weightedPick(scored, rng, (item) => item.adjustedWeight);
  return { reason: selected.reason, signal: Math.round(selected.signal) };
}

function collegeReasonSignal(
  threshold: string,
  reason: string,
  player: CollegeRosterPlayer,
  morale: { morale: number; promisePressure: number; transferRisk: number; reasons: string[] } | undefined,
  training: CollegeTrainingBankEntry | undefined
): number {
  if (threshold === "low_snap_share" || reason === "playing_time") return morale?.reasons.includes("playing_time") ? 95 : clamp((training?.playingTimeSensitivity ?? 0.5) * 60 + (morale?.promisePressure ?? 0) * 0.35, 0, 100);
  if (threshold === "promise_status_broken" || reason === "broken_promise") return morale?.reasons.includes("broken_promise") ? 100 : clamp((morale?.promisePressure ?? 0) * 0.85, 0, 100);
  if (threshold === "nil_below_expected" || reason === "nil") return clamp((training?.nilSensitivity ?? 0.5) * 75 + Math.max(0, player.collegeOverall - 76) * 2, 0, 100);
  if (threshold === "distance_sensitivity_high" || reason === "homesick") return clamp((training?.distanceSensitivity ?? 0.5) * 100, 0, 100);
  if (threshold === "staff_change" || reason === "coaching_change") return clamp((100 - (morale?.morale ?? 65)) * 0.55 + (training?.decommitRiskMult ?? 1) * 18, 0, 100);
  if (threshold === "team_success_low" || reason === "team_quality") return clamp((100 - (morale?.morale ?? 60)) * 0.65, 0, 100);
  if (threshold === "draft_signal_needs_boost" || reason === "draft_showcase") return clamp(Math.max(0, player.collegeOverall - 78) * 4 + (training?.earlyDeclareAggression ?? 0.5) * 35, 0, 100);
  return clamp(morale?.transferRisk ?? 50, 0, 100);
}

export function generateAnnualTransferPortalState(save: GameSave, seasonYear = save.seasonYear): AnnualTransferPortalState {
  const rng = createRng(`${save.seed}:annual-transfer-portal:${seasonYear}`);
  const reasons = annualTransferReasons();
  const destinationWeights = annualTransferDestinationWeights();
  if (save.collegeRoster?.players.length) {
    const moraleByPlayerId = new Map((save.collegeMorale?.entries ?? []).map((entry) => [entry.playerId, entry]));
    const trainingByPlayerId = new Map((save.collegeTraining?.entries ?? []).map((entry) => [entry.playerId, entry]));
    const profileBySchool = new Map((save.schoolProfiles?.profiles ?? []).map((profile) => [profile.schoolId, profile]));
    const candidates = save.collegeRoster.players
      .filter((player) => !player.graduatedSeason && !player.draftDeclaredSeason && !player.cutSeason && player.rosterStatus !== "redshirt" && player.rosterStatus !== "cut")
      .map((player) => ({ player, score: collegeTransferEntryScore(player, rng.fork(player.id), moraleByPlayerId.get(player.id), trainingByPlayerId.get(player.id)) }))
      .filter((item) => item.score > 17)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(40, Math.round(save.schools.length * 0.18)));
    const entries = candidates.map(({ player }, index) => {
      const entryRng = rng.fork(`college-entry:${player.id}`);
      const reason = selectCollegeTransferReason(reasons, player, moraleByPlayerId.get(player.id), trainingByPlayerId.get(player.id), entryRng.fork("reason"));
      const fromProfile = profileBySchool.get(player.schoolId);
      const destinationScores = save.schools
        .filter((school) => school.id !== player.schoolId)
        .map((school) => ({
          teamId: school.id,
          score: collegeDestinationScore(school, player, destinationWeights, entryRng.fork(school.id), fromProfile, profileBySchool.get(school.id), rosterNeedForDestination(save, school.id, player.position))
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
      return {
        id: `annual-college-transfer-${seasonYear}-${index + 1}-${player.id}`,
        playerPool: "college" as const,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        fromTeamId: player.schoolId,
        position: player.position,
        reason: `${reason.reason}:${reason.signal}`,
        destinationScores,
        status: destinationScores[0]?.score >= 86 ? "committed" as const : "open" as const
      };
    });
    return {
      seasonYear,
      generatedWeek: save.currentWeek,
      entries,
      runtimeCsvs: [...new Set([...annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("transfer_")), ...(save.collegeTraining?.runtimeCsvs ?? [])])],
      usesYearZeroBundles: false
    };
  }
  const candidates = save.players
    .filter((player) => player.teamId !== "FA" && player.age <= 28)
    .map((player) => ({ player, score: transferEntryScore(player, rng.fork(player.id)) }))
    .filter((item) => item.score > 16)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(24, Math.round(save.teams.length * 1.25)));
  const entries = candidates.map(({ player }, index) => {
    const entryRng = rng.fork(`entry:${player.id}`);
    const reason = weightedPick(reasons, entryRng, (item) => item.weight);
    const destinationScores = save.teams
      .filter((team) => team.id !== player.teamId)
      .map((team) => ({
        teamId: team.id,
        score: destinationScore(team, player, destinationWeights, entryRng.fork(team.id))
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return {
      id: `annual-transfer-${seasonYear}-${index + 1}-${player.id}`,
      playerPool: "nfl" as const,
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      fromTeamId: player.teamId,
      position: player.position,
      reason: reason.reason,
      destinationScores,
      status: destinationScores[0]?.score >= 88 ? "committed" as const : "open" as const
    };
  });
  return {
    seasonYear,
    generatedWeek: save.currentWeek,
    entries,
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("transfer_")),
    usesYearZeroBundles: false
  };
}
