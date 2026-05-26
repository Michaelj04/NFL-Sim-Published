import { POSITIONS, type GameSave, type NFLTeam, type Player, type Position, type StaffMember, type StaffRole, type TeamRecord } from "../types";
import { buildDepthChart, calculateSnapPlan, isPlayablePlayer, starterCountsByPosition } from "./personnel";
import { staffOverall } from "./staffModel";

export function teamById(save: GameSave, teamId: string): NFLTeam {
  const team = save.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Unknown team ${teamId}`);
  return team;
}

export function playersForTeam(save: GameSave, teamId: string): Player[] {
  return save.players.filter((player) => player.teamId === teamId);
}

export function activePlayersForTeam(save: GameSave, teamId: string): Player[] {
  return playersForTeam(save, teamId).filter(isPlayablePlayer);
}

export function depthChart(save: GameSave, teamId: string): Record<Position, Player[]> {
  return buildDepthChart(save, teamId);
}

function unitGradeFromPlan(plan: ReturnType<typeof calculateSnapPlan>, positions: Position[]): number {
  const entries = plan.entries.filter((entry) => entry.player && positions.includes(entry.position) && entry.snapShare > 0);
  const totalWeight = entries.reduce((sum, entry) => sum + entry.snapShare, 0);
  if (totalWeight <= 0) return 50;
  return Math.round(entries.reduce((sum, entry) => sum + entry.effectiveOverall * entry.snapShare, 0) / totalWeight);
}

export function unitGrade(save: GameSave, teamId: string, positions: Position[]): number {
  return unitGradeFromPlan(calculateSnapPlan(save, teamId), positions);
}

export function teamOverall(save: GameSave, teamId: string): number {
  const plan = calculateSnapPlan(save, teamId);
  const offense = unitGradeFromPlan(plan, ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
  const defense = unitGradeFromPlan(plan, ["EDGE", "DL", "LB", "CB", "S"]);
  const special = unitGradeFromPlan(plan, ["K", "P"]);
  return Math.round(offense * 0.48 + defense * 0.46 + special * 0.06);
}

export function staffForTeam(save: GameSave, teamId: string): StaffMember[] {
  return save.staff.filter((member) => member.teamId === teamId);
}

export function staffQuality(save: GameSave, teamId: string, role?: StaffRole): number {
  const staff = role ? staffForTeam(save, teamId).filter((member) => member.role === role) : staffForTeam(save, teamId);
  if (staff.length === 0) return 50;
  return Math.round(staff.reduce((sum, member) => sum + member.ratings.advice * 0.85 + staffOverall(member) * 0.15, 0) / staff.length);
}

export function scoutingQuality(save: GameSave, teamId: string): number {
  const scoutingStaff = staffForTeam(save, teamId).filter((member) => member.department === "Scouting");
  if (scoutingStaff.length === 0) return 50;
  return Math.round(scoutingStaff.reduce((sum, member) => sum + staffOverall(member), 0) / scoutingStaff.length);
}

export function medicalQuality(save: GameSave, teamId: string): number {
  const trainer = staffForTeam(save, teamId).find((member) => member.role === "Trainer");
  const health = trainer?.skillProfile.health;
  return health ? Math.round((health.prevention + health.recovery + health.rehab + health.medicalEvaluation) / 4) : trainer?.ratings.medical ?? 50;
}

export function payroll(save: GameSave, teamId: string): number {
  return Number(playersForTeam(save, teamId).reduce((sum, player) => sum + player.salary, 0).toFixed(1));
}

export function rosterNeeds(save: GameSave, teamId: string): Array<{ position: Position; grade: number }> {
  const plan = calculateSnapPlan(save, teamId);
  return POSITIONS
    .map((position) => {
      const entries = plan.entries.filter((entry) => entry.position === position && entry.player && entry.snapShare > 0);
      const totalWeight = entries.reduce((sum, entry) => sum + entry.snapShare, 0);
      const grade =
        totalWeight > 0
          ? Math.round(entries.reduce((sum, entry) => sum + (entry.effectiveOverall - (entry.primaryPosition === position ? 0 : 1.5)) * entry.snapShare, 0) / totalWeight)
          : 40;
      return { position, grade };
    })
    .sort((a, b) => a.grade - b.grade);
}

export function starterCount(position: Position): number {
  return starterCountsByPosition[position];
}

export function teamSchedule(save: GameSave, teamId: string) {
  return save.schedule
    .filter((game) => game.homeTeamId === teamId || game.awayTeamId === teamId)
    .sort((a, b) => a.week - b.week);
}

export function weekGames(save: GameSave, week: number) {
  return save.schedule.filter((game) => game.week === week).sort((a, b) => a.id.localeCompare(b.id));
}

export function winningPct(record: TeamRecord): number {
  const total = record.wins + record.losses + record.ties;
  if (total === 0) return 0;
  return (record.wins + record.ties * 0.5) / total;
}

export function rankedTeams(save: GameSave): Array<{ team: NFLTeam; record: TeamRecord; overall: number }> {
  return save.teams
    .map((team) => ({
      team,
      record: save.records[team.id],
      overall: teamOverall(save, team.id)
    }))
    .sort((a, b) => compareRecordRows(a, b));
}

export function selectedTeam(save: GameSave): NFLTeam {
  return teamById(save, save.selectedTeamId);
}

function compareRecordRows(
  a: { team: NFLTeam; record: TeamRecord; overall: number },
  b: { team: NFLTeam; record: TeamRecord; overall: number }
): number {
  const pct = winningPct(b.record) - winningPct(a.record);
  if (pct !== 0) return pct;
  const diffA = a.record.pointsFor - a.record.pointsAgainst;
  const diffB = b.record.pointsFor - b.record.pointsAgainst;
  if (diffA !== diffB) return diffB - diffA;
  if (a.overall !== b.overall) return b.overall - a.overall;
  return a.team.id.localeCompare(b.team.id);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function teamGames(record: TeamRecord): number {
  return record.wins + record.losses + record.ties;
}

function pointDiff(record: TeamRecord): number {
  return record.pointsFor - record.pointsAgainst;
}

function recordPower(record: TeamRecord, rosterOverall: number): number {
  const games = teamGames(record);
  if (!games) return rosterOverall;
  const diffPerGame = pointDiff(record) / games;
  return clamp(38 + winningPct(record) * 42 + diffPerGame * 0.85, 25, 92);
}

function availabilityPower(save: GameSave, teamId: string): number {
  const roster = playersForTeam(save, teamId);
  if (!roster.length) return 50;
  const missing = roster.reduce((sum, player) => sum + (player.status === "injured" || player.status === "suspended" ? Math.max(0.4, player.overall / 100) : 0), 0);
  return Math.round(clamp(88 - missing * 1.6, 35, 92));
}

function futurePower(players: Player[]): number {
  const young = players
    .filter((player) => player.age <= 29)
    .sort((a, b) => b.potential - a.potential || b.overall - a.overall)
    .slice(0, 24);
  if (!young.length) return 45;
  return Math.round(young.reduce((sum, player) => sum + player.potential * 0.62 + player.overall * 0.38 - Math.max(0, player.age - 25) * 0.45, 0) / young.length);
}

function youngCorePower(players: Player[]): number {
  const young = players
    .filter((player) => player.age <= 25)
    .sort((a, b) => b.potential - a.potential || b.overall - a.overall)
    .slice(0, 16);
  if (!young.length) return 40;
  return Math.round(young.reduce((sum, player) => sum + player.potential * 0.68 + player.overall * 0.32, 0) / young.length);
}

export function positionPowerGrade(save: GameSave, teamId: string, position: Position): number {
  return unitGrade(save, teamId, [position]);
}

export interface PowerRankingRow {
  team: NFLTeam;
  record: TeamRecord;
  rank: number;
  score: number;
  rosterOverall: number;
  offense: number;
  defense: number;
  specialTeams: number;
  availability: number;
  futureOutlook: number;
  youngCore: number;
  positions: Record<Position, number>;
}

export function powerRankings(save: GameSave): PowerRankingRow[] {
  const rows = save.teams.map((team) => {
    const record = save.records[team.id];
    const plan = calculateSnapPlan(save, team.id);
    const offense = unitGradeFromPlan(plan, ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
    const defense = unitGradeFromPlan(plan, ["EDGE", "DL", "LB", "CB", "S"]);
    const specialTeams = unitGradeFromPlan(plan, ["K", "P"]);
    const rosterOverall = Math.round(offense * 0.48 + defense * 0.46 + specialTeams * 0.06);
    const availability = availabilityPower(save, team.id);
    const score = rosterOverall * 0.55 + recordPower(record, rosterOverall) * 0.25 + clamp(60 + pointDiff(record) * 0.12, 32, 90) * 0.15 + availability * 0.05;
    return {
      team,
      record,
      rank: 0,
      score: Number(score.toFixed(2)),
      rosterOverall,
      offense,
      defense,
      specialTeams,
      availability,
      futureOutlook: futurePower(playersForTeam(save, team.id)),
      youngCore: youngCorePower(playersForTeam(save, team.id)),
      positions: Object.fromEntries(POSITIONS.map((position) => [position, unitGradeFromPlan(plan, [position])])) as Record<Position, number>
    };
  });

  return rows
    .sort((a, b) => b.score - a.score || b.rosterOverall - a.rosterOverall || a.team.id.localeCompare(b.team.id))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function powerRankByTeam(save: GameSave): Record<string, number> {
  return Object.fromEntries(powerRankings(save).map((row) => [row.team.id, row.rank]));
}

export interface PlayoffSeedRow {
  seed: number;
  team: NFLTeam;
  record: TeamRecord;
  overall: number;
  kind: "division" | "wildcard";
}

export function playoffSeeds(save: GameSave): Record<"AFC" | "NFC", PlayoffSeedRow[]> {
  const rows = rankedTeams(save);
  const result = { AFC: [] as PlayoffSeedRow[], NFC: [] as PlayoffSeedRow[] };
  for (const conference of ["AFC", "NFC"] as const) {
    const conferenceRows = rows.filter((row) => row.team.conference === conference);
    const divisionWinners = ["East", "North", "South", "West"]
      .map((division) => conferenceRows.filter((row) => row.team.division === division).sort(compareRecordRows)[0])
      .filter(Boolean)
      .sort(compareRecordRows);
    const winnerIds = new Set(divisionWinners.map((row) => row.team.id));
    const wildcards = conferenceRows.filter((row) => !winnerIds.has(row.team.id)).sort(compareRecordRows).slice(0, 3);
    result[conference] = [...divisionWinners, ...wildcards].map((row, index) => ({
      seed: index + 1,
      team: row.team,
      record: row.record,
      overall: row.overall,
      kind: index < divisionWinners.length ? "division" : "wildcard"
    }));
  }
  return result;
}

export function teamStreak(save: GameSave, teamId: string): string {
  const finals = teamSchedule(save, teamId).filter((game) => game.status === "final").sort((a, b) => b.week - a.week);
  if (!finals.length) return "-";
  const outcomeFor = (game: (typeof finals)[number]) => {
    const teamScore = game.homeTeamId === teamId ? game.homeScore : game.awayScore;
    const opponentScore = game.homeTeamId === teamId ? game.awayScore : game.homeScore;
    return teamScore > opponentScore ? "W" : teamScore < opponentScore ? "L" : "T";
  };
  const outcome = outcomeFor(finals[0]);
  let count = 0;
  for (const game of finals) {
    if (outcomeFor(game) !== outcome) break;
    count += 1;
  }
  return `${outcome}${count}`;
}
