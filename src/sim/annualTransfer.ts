import { clamp, createRng, type Rng } from "../lib/rng";
import type { AnnualTransferPortalState, CollegeProgram, CollegeRosterPlayer, GameSave, NFLTeam, Player } from "../types";
import { annualRuntimeDebug, annualTransferDestinationWeights, annualTransferReasons } from "./annualRuntime";
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

function collegeTransferEntryScore(player: CollegeRosterPlayer, rng: Rng, morale?: { morale: number; promisePressure: number; transferRisk: number }): number {
  const classWindow = player.classYear === "FR" ? 2 : player.classYear === "SO" || player.classYear === "RS-SO" ? 9 : player.classYear === "JR" ? 7 : -12;
  const potentialGap = Math.max(0, player.collegePotential - player.collegeOverall) * 0.48;
  const rolePressure = player.collegeOverall < 66 ? 12 : player.collegeOverall > 82 ? 5 : 2;
  const moralePressure = morale ? (100 - morale.morale) * 0.18 + morale.promisePressure * 0.12 + morale.transferRisk * 0.2 : 0;
  return classWindow + potentialGap + rolePressure + moralePressure + rng.normal(0, 8);
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

function collegeDestinationScore(school: CollegeProgram, player: CollegeRosterPlayer, componentWeights: Array<{ component: string; weight: number }>, rng: Rng): number {
  const weighted = componentWeights.reduce((sum, component) => {
    if (component.component === "playing_time_opportunity") return sum + component.weight * rng.float(35, 96);
    if (component.component === "prestige") return sum + component.weight * school.prestige;
    if (component.component === "scheme_fit") return sum + component.weight * rng.float(35, 92);
    if (component.component === "development") return sum + component.weight * (school.competition * 0.45 + school.prestige * 0.2 + Math.max(0, player.collegePotential - player.collegeOverall));
    return sum + component.weight * rng.float(25, 88);
  }, 0);
  return Math.round(clamp(weighted, 0, 100));
}

export function generateAnnualTransferPortalState(save: GameSave, seasonYear = save.seasonYear): AnnualTransferPortalState {
  const rng = createRng(`${save.seed}:annual-transfer-portal:${seasonYear}`);
  const reasons = annualTransferReasons();
  const destinationWeights = annualTransferDestinationWeights();
  if (save.collegeRoster?.players.length) {
    const moraleByPlayerId = new Map((save.collegeMorale?.entries ?? []).map((entry) => [entry.playerId, entry]));
    const candidates = save.collegeRoster.players
      .filter((player) => !player.graduatedSeason && !player.draftDeclaredSeason && !player.cutSeason && player.rosterStatus !== "redshirt" && player.rosterStatus !== "cut")
      .map((player) => ({ player, score: collegeTransferEntryScore(player, rng.fork(player.id), moraleByPlayerId.get(player.id)) }))
      .filter((item) => item.score > 17)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(40, Math.round(save.schools.length * 0.18)));
    const entries = candidates.map(({ player }, index) => {
      const entryRng = rng.fork(`college-entry:${player.id}`);
      const reason = weightedPick(reasons, entryRng, (item) => item.weight);
      const destinationScores = save.schools
        .filter((school) => school.id !== player.schoolId)
        .map((school) => ({
          teamId: school.id,
          score: collegeDestinationScore(school, player, destinationWeights, entryRng.fork(school.id))
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
        reason: reason.reason,
        destinationScores,
        status: destinationScores[0]?.score >= 86 ? "committed" as const : "open" as const
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
