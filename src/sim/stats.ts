import type { GameSave, Player, PlayerSeasonStatsHistoryEntry, PlayerStats, Position, TeamGameStats } from "../types";

export const playerStatKeys: Array<keyof PlayerStats> = [
  "games",
  "gamesStarted",
  "snaps",
  "offenseSnaps",
  "defenseSnaps",
  "specialTeamsSnaps",
  "qbWins",
  "qbLosses",
  "qbTies",
  "passAttempts",
  "passCompletions",
  "passYards",
  "passTouchdowns",
  "interceptionsThrown",
  "sacksTaken",
  "sackYardsLost",
  "passingFirstDowns",
  "passingSuccesses",
  "passingLong",
  "fourthQuarterComebacks",
  "gameWinningDrives",
  "qbPressuresFaced",
  "qbHitsTaken",
  "rushAttempts",
  "rushYards",
  "rushTouchdowns",
  "rushingFirstDowns",
  "rushingSuccesses",
  "rushingLong",
  "fumbles",
  "targets",
  "receptions",
  "receivingYards",
  "receivingTouchdowns",
  "receivingFirstDowns",
  "receivingSuccesses",
  "receivingLong",
  "drops",
  "tackles",
  "tacklesForLoss",
  "sacks",
  "sackYards",
  "interceptions",
  "passesDefended",
  "forcedFumbles",
  "fumbleRecoveries",
  "defensiveTouchdowns",
  "safeties",
  "qbPressures",
  "qbHits",
  "coverageTargets",
  "completionsAllowed",
  "yardsAllowed",
  "touchdownsAllowed",
  "fieldGoalAttempts",
  "fieldGoalsMade",
  "fieldGoalLong",
  "extraPointAttempts",
  "extraPointsMade",
  "punts",
  "puntYards",
  "puntInside20",
  "puntLong",
  "puntTouchbacks",
  "touchdowns"
];

export const teamGameStatKeys: Array<Exclude<keyof TeamGameStats, "teamId">> = [
  "plays",
  "offensivePlays",
  "defensivePlays",
  "drives",
  "scoringDrives",
  "timeOfPossession",
  "totalYards",
  "passingYards",
  "rushingYards",
  "firstDowns",
  "passingFirstDowns",
  "rushingFirstDowns",
  "successfulPlays",
  "explosivePlays",
  "turnovers",
  "takeaways",
  "sacks",
  "sacksAllowed",
  "sackYards",
  "sackYardsAllowed",
  "thirdDownAttempts",
  "thirdDownConversions",
  "fourthDownAttempts",
  "fourthDownConversions",
  "redZoneTrips",
  "redZoneTouchdowns",
  "fieldGoalAttempts",
  "fieldGoalsMade",
  "punts",
  "puntYards",
  "puntTouchbacks",
  "penalties",
  "penaltyYards"
];

export function emptyPlayerStats(): PlayerStats {
  return Object.fromEntries(playerStatKeys.map((key) => [key, 0])) as unknown as PlayerStats;
}

export function normalizePlayerStats(stats?: Partial<PlayerStats>): PlayerStats {
  const normalized = emptyPlayerStats();
  for (const key of playerStatKeys) {
    const value = stats?.[key];
    normalized[key] = Number.isFinite(value) ? Number(value) : 0;
  }
  normalized.touchdowns =
    normalized.touchdowns ||
    normalized.rushTouchdowns + normalized.receivingTouchdowns + normalized.defensiveTouchdowns;
  return normalized;
}

export function mergePlayerStats(base?: Partial<PlayerStats>, added?: Partial<PlayerStats>): PlayerStats {
  const next = normalizePlayerStats(base);
  const increment = normalizePlayerStats(added);
  for (const key of playerStatKeys) {
    next[key] += increment[key];
  }
  return next;
}

export function hasPlayerStatProduction(stats?: Partial<PlayerStats>): boolean {
  const normalized = normalizePlayerStats(stats);
  return playerStatKeys.some((key) => normalized[key] !== 0);
}

export function emptyTeamGameStats(teamId: string): TeamGameStats {
  return {
    teamId,
    ...Object.fromEntries(teamGameStatKeys.map((key) => [key, 0]))
  } as TeamGameStats;
}

export function normalizeTeamGameStats(teamId: string, stats?: Partial<TeamGameStats>): TeamGameStats {
  const normalized = emptyTeamGameStats(teamId);
  for (const key of teamGameStatKeys) {
    const value = stats?.[key];
    normalized[key] = Number.isFinite(value) ? Number(value) : 0;
  }
  return { ...normalized, teamId };
}

export function mergeTeamGameStats(teamId: string, base?: Partial<TeamGameStats>, added?: Partial<TeamGameStats>): TeamGameStats {
  const next = normalizeTeamGameStats(teamId, base);
  const increment = normalizeTeamGameStats(teamId, added);
  for (const key of teamGameStatKeys) {
    next[key] += increment[key];
  }
  return next;
}

export function addGameStatsToPlayer(player: Player, gameStats: Partial<PlayerStats> | undefined, bucket: "stats" | "playoffStats" = "stats"): Player {
  if (!gameStats) return player;
  return {
    ...player,
    [bucket]: mergePlayerStats(player[bucket], gameStats)
  };
}

export function archivePlayerSeasonStats(player: Player, save: Pick<GameSave, "seasonYear" | "teams">): Player {
  const stats = normalizePlayerStats(player.stats);
  const playoffStats = normalizePlayerStats(player.playoffStats);
  if (!hasPlayerStatProduction(stats) && !hasPlayerStatProduction(playoffStats)) {
    return { ...player, stats, playoffStats, statHistory: player.statHistory ?? [] };
  }
  const team = save.teams.find((candidate) => candidate.id === player.teamId);
  const entry: PlayerSeasonStatsHistoryEntry = {
    id: `${player.id}-${save.seasonYear}`,
    seasonYear: save.seasonYear,
    teamId: player.teamId,
    teamName: team?.fullName,
    age: player.age,
    position: player.position,
    overall: player.overall,
    potential: player.potential,
    stats,
    playoffStats,
    awards: []
  };
  const history = (player.statHistory ?? []).filter((row) => row.seasonYear !== save.seasonYear);
  return {
    ...player,
    stats,
    playoffStats,
    statHistory: [...history, entry].sort((a, b) => b.seasonYear - a.seasonYear)
  };
}

export function rate(numerator: number, denominator: number, multiplier = 1): number | undefined {
  if (!denominator) return undefined;
  return (numerator / denominator) * multiplier;
}

export function formatRate(value: number | undefined, digits = 1, suffix = ""): string {
  return Number.isFinite(value) ? `${value!.toFixed(digits)}${suffix}` : "-";
}

export function passingEfficiency(stats: PlayerStats): number | undefined {
  if (!stats.passAttempts) return undefined;
  const comp = rate(stats.passCompletions, stats.passAttempts, 100) ?? 0;
  const yards = rate(stats.passYards, stats.passAttempts) ?? 0;
  const td = rate(stats.passTouchdowns, stats.passAttempts, 100) ?? 0;
  const int = rate(stats.interceptionsThrown, stats.passAttempts, 100) ?? 0;
  return comp * 0.32 + yards * 4.8 + td * 2.1 - int * 2.9;
}

export function totalPlayerStats(player: Player): PlayerStats {
  return (player.statHistory ?? []).reduce((sum, row) => mergePlayerStats(mergePlayerStats(sum, row.stats), row.playoffStats), mergePlayerStats(player.stats, player.playoffStats));
}

export function passerRating(stats: PlayerStats): number | undefined {
  if (!stats.passAttempts) return undefined;
  const a = Math.max(0, Math.min(2.375, ((stats.passCompletions / stats.passAttempts) - 0.3) * 5));
  const b = Math.max(0, Math.min(2.375, ((stats.passYards / stats.passAttempts) - 3) * 0.25));
  const c = Math.max(0, Math.min(2.375, (stats.passTouchdowns / stats.passAttempts) * 20));
  const d = Math.max(0, Math.min(2.375, 2.375 - (stats.interceptionsThrown / stats.passAttempts) * 25));
  return ((a + b + c + d) / 6) * 100;
}

export function adjustedYardsPerAttempt(stats: PlayerStats): number | undefined {
  return rate(stats.passYards + stats.passTouchdowns * 20 - stats.interceptionsThrown * 45, stats.passAttempts);
}

export function netYardsPerAttempt(stats: PlayerStats): number | undefined {
  return rate(stats.passYards - stats.sackYardsLost, stats.passAttempts + stats.sacksTaken);
}

export function adjustedNetYardsPerAttempt(stats: PlayerStats): number | undefined {
  return rate(stats.passYards + stats.passTouchdowns * 20 - stats.interceptionsThrown * 45 - stats.sackYardsLost, stats.passAttempts + stats.sacksTaken);
}

export function qbrApprox(stats: PlayerStats): number | undefined {
  if (!stats.passAttempts && !stats.rushAttempts) return undefined;
  const efficiency = adjustedNetYardsPerAttempt(stats) ?? 0;
  const success = rate(stats.passingSuccesses + stats.rushingSuccesses, stats.passAttempts + stats.sacksTaken + stats.rushAttempts, 100) ?? 0;
  const turnoverPenalty = (stats.interceptionsThrown + stats.fumbles) * 3.8;
  const scoring = (stats.passTouchdowns + stats.rushTouchdowns) * 1.7;
  return Math.max(0, Math.min(100, 32 + efficiency * 4.2 + success * 0.32 + scoring - turnoverPenalty));
}

export function approximateValue(stats: PlayerStats, position: Position): number {
  const games = Math.max(1, stats.games);
  if (position === "QB") {
    return Math.round(Math.max(0, (stats.passYards / 520) + stats.passTouchdowns * 0.42 - stats.interceptionsThrown * 0.28 + (qbrApprox(stats) ?? 45) / 14));
  }
  if (position === "RB") return Math.round(Math.max(0, stats.rushYards / 180 + stats.receivingYards / 260 + stats.touchdowns * 0.55 + stats.rushingFirstDowns / 18));
  if (position === "WR" || position === "TE") return Math.round(Math.max(0, stats.receivingYards / 190 + stats.receivingTouchdowns * 0.62 + stats.receivingFirstDowns / 14));
  if (position === "K") return Math.round(Math.max(0, stats.fieldGoalsMade * 0.18 + stats.extraPointsMade * 0.035 + (rate(stats.fieldGoalsMade, stats.fieldGoalAttempts, 100) ?? 0) / 30));
  if (position === "P") return Math.round(Math.max(0, stats.punts / 16 + (rate(stats.puntYards, stats.punts) ?? 0) / 12 + stats.puntInside20 / 9));
  return Math.round(Math.max(0, stats.tackles / 16 + stats.sacks * 0.9 + stats.interceptions * 1.1 + stats.forcedFumbles * 0.75 + stats.passesDefended * 0.22 + stats.qbHits * 0.18));
}

export function qbRecord(stats: PlayerStats): string {
  const total = stats.qbWins + stats.qbLosses + stats.qbTies;
  if (!total) return "-";
  return `${stats.qbWins}-${stats.qbLosses}${stats.qbTies ? `-${stats.qbTies}` : ""}`;
}

export function formatStatNumber(value: number | undefined, digits = 0): string {
  if (!Number.isFinite(value)) return "-";
  return digits > 0 ? value!.toFixed(digits) : Math.round(value!).toString();
}

export function successRate(stats: PlayerStats, kind: "pass" | "rush" | "receive" | "total"): number | undefined {
  if (kind === "pass") return rate(stats.passingSuccesses, stats.passAttempts + stats.sacksTaken, 100);
  if (kind === "rush") return rate(stats.rushingSuccesses, stats.rushAttempts, 100);
  if (kind === "receive") return rate(stats.receivingSuccesses, stats.targets, 100);
  return rate(stats.passingSuccesses + stats.rushingSuccesses + stats.receivingSuccesses, stats.passAttempts + stats.sacksTaken + stats.rushAttempts + stats.targets, 100);
}

export function playerPrimaryStatCategory(position: Position): "passing" | "rushing" | "receiving" | "defense" | "kicking" | "punting" {
  if (position === "QB") return "passing";
  if (position === "RB") return "rushing";
  if (position === "WR" || position === "TE") return "receiving";
  if (position === "K") return "kicking";
  if (position === "P") return "punting";
  return "defense";
}
