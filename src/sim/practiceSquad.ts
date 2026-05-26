import { POSITIONS, type GameSave, type InboxItem, type Player, type Position } from "../types";
import { makeContract, playerCapHit, recalculateBudgets } from "./cap";
import { activeRosterSize, clearIrState, isOnIr } from "./ir";
import { effectivePlayerOverallAtPosition } from "./positionEligibility";

const FREE_AGENT_TEAM_ID = "FA";
const MAX_ACTIVE_ROSTER_SIZE = 53;

export const PRACTICE_SQUAD_SIZE = 16;
export const PRACTICE_SQUAD_PROTECTION_LIMIT = 4;
export const PRACTICE_SQUAD_WEEKLY_ELEVATION_LIMIT = 2;
export const PRACTICE_SQUAD_PLAYER_ELEVATION_LIMIT = 3;
export const PRACTICE_SQUAD_VETERAN_LIMIT = 6;
export const PRACTICE_SQUAD_EXPERIENCED_LIMIT = 10;

export interface PracticeSquadActionCheck {
  ok: boolean;
  reason?: string;
}

export type PracticeSquadMoveType =
  | "practice-signing"
  | "practice-release"
  | "practice-promotion"
  | "practice-elevation"
  | "practice-protection"
  | "practice-poach";

export function isPracticeSquadPlayer(player: Pick<Player, "practiceSquad" | "status">): boolean {
  return player.practiceSquad === true || player.status === "practice" || player.status === "elevated";
}

export function isPracticeSquadElevated(player: Pick<Player, "practiceSquadElevatedWeek">, week: number): boolean {
  return player.practiceSquadElevatedWeek === week;
}

export function clearPracticeSquadState<T extends Player>(player: T): T {
  const {
    practiceSquad: _practiceSquad,
    practiceSquadSignedWeek: _practiceSquadSignedWeek,
    practiceSquadSignedDate: _practiceSquadSignedDate,
    practiceSquadSignedSeason: _practiceSquadSignedSeason,
    practiceSquadElevations: _practiceSquadElevations,
    practiceSquadElevatedWeek: _practiceSquadElevatedWeek,
    practiceSquadElevatedDate: _practiceSquadElevatedDate,
    practiceSquadProtectedWeek: _practiceSquadProtectedWeek,
    practiceSquadProtectedDate: _practiceSquadProtectedDate,
    practiceSquadOriginalSalary: _practiceSquadOriginalSalary,
    ...rest
  } = player;
  return rest as T;
}

export function practiceSquadPlayers(save: GameSave, teamId: string): Player[] {
  return save.players.filter((player) => player.teamId === teamId && isPracticeSquadPlayer(player));
}

export function activeRosterPlayers(save: GameSave, teamId: string): Player[] {
  return save.players.filter((player) => player.teamId === teamId && !isOnIr(player) && !isPracticeSquadPlayer(player));
}

export function practiceSquadSize(save: GameSave, teamId: string): number {
  return practiceSquadPlayers(save, teamId).length;
}

export function elevatedPracticeSquadPlayers(save: GameSave, teamId: string): Player[] {
  return practiceSquadPlayers(save, teamId).filter((player) => isPracticeSquadElevated(player, save.currentWeek));
}

export function protectedPracticeSquadPlayers(save: GameSave, teamId: string): Player[] {
  return practiceSquadPlayers(save, teamId).filter((player) => player.practiceSquadProtectedWeek === save.currentWeek);
}

export function experienceYearsForPracticeSquad(save: Pick<GameSave, "seasonYear">, player: Player): number {
  if (player.traits.includes("Rookie")) return 0;
  if (player.draftYear) return Math.max(0, save.seasonYear - player.draftYear);
  return Math.max(0, player.age - 22);
}

function isVeteranException(save: GameSave, player: Player): boolean {
  return experienceYearsForPracticeSquad(save, player) > 2;
}

function isExperiencedBucket(save: GameSave, player: Player): boolean {
  return experienceYearsForPracticeSquad(save, player) > 0;
}

export function practiceSquadSalary(save: GameSave, player: Player): number {
  const exp = experienceYearsForPracticeSquad(save, player);
  return Number((exp <= 2 ? 0.25 : 0.38).toFixed(2));
}

export function activeMinimumSalary(save: GameSave, player: Player): number {
  const exp = experienceYearsForPracticeSquad(save, player);
  return Number(Math.min(1.45, 0.78 + exp * 0.08).toFixed(2));
}

export function toPracticeSquadPlayer(player: Player, save: Pick<GameSave, "seasonYear" | "currentWeek"> & { currentDate?: string }): Player {
  return clearIrState({
    ...player,
    practiceSquad: true,
    practiceSquadSignedSeason: save.seasonYear,
    practiceSquadSignedWeek: save.currentWeek,
    practiceSquadSignedDate: save.currentDate,
    practiceSquadElevations: player.practiceSquadElevations ?? 0,
    practiceSquadElevatedWeek: undefined,
    practiceSquadProtectedWeek: undefined,
    practiceSquadOriginalSalary: player.practiceSquadOriginalSalary ?? player.salary,
    status: "practice" as const,
    injuryWeeks: 0,
    injury: undefined,
    suspensionWeeks: 0
  });
}

export function normalizePracticeSquadState(player: Player, seasonYear: number): Player {
  if (!isPracticeSquadPlayer(player)) {
    return {
      ...player,
      practiceSquad: undefined,
      practiceSquadSignedWeek: undefined,
      practiceSquadSignedDate: undefined,
      practiceSquadSignedSeason: undefined,
      practiceSquadElevations: undefined,
      practiceSquadElevatedWeek: undefined,
      practiceSquadElevatedDate: undefined,
      practiceSquadProtectedWeek: undefined,
      practiceSquadProtectedDate: undefined,
      practiceSquadOriginalSalary: undefined
    };
  }
  return {
    ...player,
    practiceSquad: true,
    practiceSquadSignedSeason: player.practiceSquadSignedSeason ?? seasonYear,
    practiceSquadSignedWeek: player.practiceSquadSignedWeek ?? 1,
    practiceSquadElevations: player.practiceSquadSignedSeason === seasonYear ? player.practiceSquadElevations ?? 0 : 0,
    status: player.status === "elevated" ? "practice" : player.status
  };
}

export function practiceSquadEligibility(save: GameSave, player: Player): PracticeSquadActionCheck {
  if (isOnIr(player)) return { ok: false, reason: "IR players cannot join the practice squad." };
  if (player.status === "suspended") return { ok: false, reason: "Suspended players cannot be signed to the practice squad." };
  const exp = experienceYearsForPracticeSquad(save, player);
  if (exp <= 2) return { ok: true };
  return { ok: true, reason: "Counts against the veteran practice squad limit." };
}

function bucketCheck(save: GameSave, teamId: string, player: Player, ignorePlayerId?: string): PracticeSquadActionCheck {
  const squad = practiceSquadPlayers(save, teamId).filter((candidate) => candidate.id !== ignorePlayerId);
  const veteranCount = squad.filter((candidate) => isVeteranException(save, candidate)).length;
  const experiencedCount = squad.filter((candidate) => isExperiencedBucket(save, candidate)).length;
  const playerVeteran = isVeteranException(save, player);
  const playerExperienced = isExperiencedBucket(save, player);
  if (playerVeteran && veteranCount >= PRACTICE_SQUAD_VETERAN_LIMIT) return { ok: false, reason: "Veteran practice squad limit reached." };
  if (playerExperienced && experiencedCount >= PRACTICE_SQUAD_EXPERIENCED_LIMIT) return { ok: false, reason: "Experienced practice squad limit reached." };
  return { ok: true };
}

export function canSignFreeAgentToPracticeSquad(save: GameSave, playerId: string, teamId = save.selectedTeamId): PracticeSquadActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== FREE_AGENT_TEAM_ID) return { ok: false, reason: "Player is not a free agent." };
  if (practiceSquadSize(save, teamId) >= PRACTICE_SQUAD_SIZE) return { ok: false, reason: "Practice squad is full." };
  const eligible = practiceSquadEligibility(save, player);
  if (!eligible.ok) return eligible;
  const bucket = bucketCheck(save, teamId, player);
  if (!bucket.ok) return bucket;
  const salary = practiceSquadSalary(save, player);
  if ((save.budget[teamId] ?? 0) < salary) return { ok: false, reason: "Not enough cap room." };
  return { ok: true };
}

export function signFreeAgentToPracticeSquad(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  const check = canSignFreeAgentToPracticeSquad(save, playerId, teamId);
  if (!check.ok) return save;
  const player = save.players.find((candidate) => candidate.id === playerId)!;
  const salary = practiceSquadSalary(save, player);
  const signed = {
    ...toPracticeSquadPlayer({ ...player, teamId, teamStartSeason: save.seasonYear, salary, contractYears: 1 }, save),
    practiceSquadOriginalSalary: player.salary
  };
  return recalculateBudgets({
    ...save,
    players: save.players.map((candidate) => candidate.id === playerId ? {
      ...signed,
      contract: makeContract({ ...signed, salary, contractYears: 1 }, save.seasonYear, {
        origin: "practice-squad",
        years: 1,
        apy: salary,
        signingBonus: 0,
        guaranteedTotal: 0
      })
    } : candidate),
    freeAgencyLog: [practiceSquadMove(save, signed, teamId, "practice-signing"), ...(save.freeAgencyLog ?? [])]
  });
}

export function canPromotePracticeSquadPlayer(save: GameSave, playerId: string, teamId = save.selectedTeamId): PracticeSquadActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== teamId || !isPracticeSquadPlayer(player)) return { ok: false, reason: "Player is not on this practice squad." };
  if (activeRosterSize(save, teamId) >= MAX_ACTIVE_ROSTER_SIZE) return { ok: false, reason: "Open an active roster spot first." };
  const salary = Math.max(activeMinimumSalary(save, player), player.practiceSquadOriginalSalary ?? 0);
  const delta = Math.max(0, salary - player.salary);
  if ((save.budget[teamId] ?? 0) < delta) return { ok: false, reason: "Not enough cap room for an active contract." };
  return { ok: true };
}

export function promotePracticeSquadPlayer(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  if (!canPromotePracticeSquadPlayer(save, playerId, teamId).ok) return save;
  const player = save.players.find((candidate) => candidate.id === playerId)!;
  const salary = Math.max(activeMinimumSalary(save, player), player.practiceSquadOriginalSalary ?? 0);
  const delta = Math.max(0, salary - player.salary);
  const promoted = {
    ...clearPracticeSquadState(player),
    salary,
    contractYears: Math.max(1, player.contractYears),
    contract: makeContract({ ...player, salary, contractYears: Math.max(1, player.contractYears) }, save.seasonYear, {
      origin: "free-agent",
      years: Math.max(1, player.contractYears),
      apy: salary
    }),
    status: player.status === "injured" || player.status === "limited" ? player.status : "active" as const
  };
  return recalculateBudgets({
    ...save,
    players: save.players.map((candidate) => candidate.id === playerId ? promoted : candidate),
    freeAgencyLog: [practiceSquadMove(save, promoted, teamId, "practice-promotion"), ...(save.freeAgencyLog ?? [])]
  });
}

export function canElevatePracticeSquadPlayer(save: GameSave, playerId: string, teamId = save.selectedTeamId): PracticeSquadActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== teamId || !isPracticeSquadPlayer(player)) return { ok: false, reason: "Player is not on this practice squad." };
  if (player.status === "injured" || player.status === "suspended") return { ok: false, reason: "Player is not available to elevate." };
  if ((player.practiceSquadElevations ?? 0) >= PRACTICE_SQUAD_PLAYER_ELEVATION_LIMIT) return { ok: false, reason: "Player has reached the elevation limit." };
  if (elevatedPracticeSquadPlayers(save, teamId).length >= PRACTICE_SQUAD_WEEKLY_ELEVATION_LIMIT) return { ok: false, reason: "Weekly elevation limit reached." };
  return { ok: true };
}

export function elevatePracticeSquadPlayer(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  if (!canElevatePracticeSquadPlayer(save, playerId, teamId).ok) return save;
  let elevated: Player | undefined;
  const players = save.players.map((player) => {
    if (player.id !== playerId) return player;
    elevated = {
      ...player,
      practiceSquad: true,
      practiceSquadElevatedWeek: save.currentWeek,
      practiceSquadElevatedDate: save.currentDate,
      practiceSquadElevations: (player.practiceSquadElevations ?? 0) + 1,
      status: "elevated" as const
    };
    return elevated;
  });
  return {
    ...save,
    players,
    freeAgencyLog: elevated ? [practiceSquadMove(save, elevated, teamId, "practice-elevation"), ...(save.freeAgencyLog ?? [])] : save.freeAgencyLog
  };
}

export function canProtectPracticeSquadPlayer(save: GameSave, playerId: string, teamId = save.selectedTeamId): PracticeSquadActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== teamId || !isPracticeSquadPlayer(player)) return { ok: false, reason: "Player is not on this practice squad." };
  if (player.practiceSquadProtectedWeek === save.currentWeek) return { ok: true };
  if (protectedPracticeSquadPlayers(save, teamId).length >= PRACTICE_SQUAD_PROTECTION_LIMIT) return { ok: false, reason: "Weekly protection limit reached." };
  return { ok: true };
}

export function protectPracticeSquadPlayer(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  if (!canProtectPracticeSquadPlayer(save, playerId, teamId).ok) return save;
  let protectedPlayer: Player | undefined;
  const players = save.players.map((player) => {
    if (player.id !== playerId) return player;
    protectedPlayer = { ...player, practiceSquadProtectedWeek: save.currentWeek, practiceSquadProtectedDate: save.currentDate };
    return protectedPlayer;
  });
  return {
    ...save,
    players,
    freeAgencyLog: protectedPlayer ? [practiceSquadMove(save, protectedPlayer, teamId, "practice-protection"), ...(save.freeAgencyLog ?? [])] : save.freeAgencyLog
  };
}

export function canPoachPracticeSquadPlayer(save: GameSave, playerId: string, signingTeamId: string): PracticeSquadActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (!isPracticeSquadPlayer(player) || player.teamId === FREE_AGENT_TEAM_ID) return { ok: false, reason: "Player is not on a practice squad." };
  if (player.teamId === signingTeamId) return { ok: false, reason: "Use promote for your own practice squad." };
  if (player.practiceSquadProtectedWeek === save.currentWeek) return { ok: false, reason: "Player is protected this week." };
  if (activeRosterSize(save, signingTeamId) >= MAX_ACTIVE_ROSTER_SIZE) return { ok: false, reason: "Signing team needs an active roster spot." };
  const salary = Math.max(activeMinimumSalary(save, player), player.practiceSquadOriginalSalary ?? 0);
  if ((save.budget[signingTeamId] ?? 0) < salary) return { ok: false, reason: "Signing team lacks cap room." };
  return { ok: true };
}

export function poachPracticeSquadPlayer(save: GameSave, playerId: string, signingTeamId: string): GameSave {
  if (!canPoachPracticeSquadPlayer(save, playerId, signingTeamId).ok) return save;
  const player = save.players.find((candidate) => candidate.id === playerId)!;
  const oldTeamId = player.teamId;
  const oldSalary = player.salary;
  const salary = Math.max(activeMinimumSalary(save, player), player.practiceSquadOriginalSalary ?? 0);
  const poached = {
    ...clearPracticeSquadState(player),
    teamId: signingTeamId,
    teamStartSeason: save.seasonYear,
    salary,
    contractYears: Math.max(1, player.contractYears),
    contract: makeContract({ ...player, salary, contractYears: Math.max(1, player.contractYears) }, save.seasonYear, {
      origin: "free-agent",
      years: Math.max(1, player.contractYears),
      apy: salary
    }),
    status: player.status === "injured" || player.status === "limited" ? player.status : "active" as const
  };
  const inboxItem = oldTeamId === save.selectedTeamId
    ? practiceSquadInbox(save, poached, "Practice squad player poached", `${poached.firstName} ${poached.lastName} signed to another team's active roster.`, "high")
    : undefined;
  return recalculateBudgets({
    ...save,
    players: save.players.map((candidate) => candidate.id === playerId ? poached : candidate),
    freeAgencyLog: [practiceSquadMove(save, poached, signingTeamId, "practice-poach"), ...(save.freeAgencyLog ?? [])],
    inbox: inboxItem ? [inboxItem, ...save.inbox] : save.inbox
  });
}

export function releasePracticeSquadPlayer(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player || player.teamId !== teamId || !isPracticeSquadPlayer(player)) return save;
  const released = {
    ...clearPracticeSquadState(player),
    teamId: FREE_AGENT_TEAM_ID,
    teamStartSeason: save.seasonYear,
    salary: player.practiceSquadOriginalSalary ?? activeMinimumSalary(save, player),
    contract: player.contract ? { ...player.contract, rights: "none" as const } : player.contract,
    status: "active" as const
  };
  return recalculateBudgets({
    ...save,
    players: save.players.map((candidate) => candidate.id === playerId ? released : candidate),
    freeAgencyLog: [practiceSquadMove(save, player, teamId, "practice-release"), ...(save.freeAgencyLog ?? [])]
  });
}

export function processPracticeSquadWeek(save: GameSave): GameSave {
  const players = save.players.map((player) => {
    if (!isPracticeSquadPlayer(player)) return player;
    if (player.practiceSquadElevatedWeek && player.practiceSquadElevatedWeek < save.currentWeek) {
      return {
        ...player,
        practiceSquadElevatedWeek: undefined,
        status: player.status === "elevated" ? "practice" as const : player.status
      };
    }
    return player;
  });
  return { ...save, players };
}

function practiceSquadValue(player: Player): number {
  return player.potential * 1.25 + player.overall * 0.72 - player.age * 0.35;
}

function candidatePositionsForNeeds(save: GameSave, teamId: string): Set<Position> {
  const targetCounts: Partial<Record<Position, number>> = {
    QB: 3, RB: 4, WR: 6, TE: 3, LT: 2, LG: 2, C: 2, RG: 2, RT: 2,
    EDGE: 5, DL: 5, LB: 6, CB: 6, S: 4, K: 1, P: 1
  };
  const activeCounts = activeRosterPlayers(save, teamId).reduce((acc, player) => {
    acc[player.position] = (acc[player.position] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<Position, number>>);
  return new Set(
    POSITIONS
      .map((position) => ({ position, gap: (targetCounts[position] ?? 2) - (activeCounts[position] ?? 0) }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 5)
      .map((item) => item.position)
  );
}

export function autoManageCpuPracticeSquads(save: GameSave, options: { includeSelectedTeam?: boolean } = {}): GameSave {
  let next = save;
  for (const team of next.teams) {
    if (team.id === next.selectedTeamId && !options.includeSelectedTeam) continue;
    const squad = practiceSquadPlayers(next, team.id);
    const protectedIds = new Set(
      squad
        .slice()
        .sort((a, b) => practiceSquadValue(b) - practiceSquadValue(a))
        .slice(0, PRACTICE_SQUAD_PROTECTION_LIMIT)
        .map((player) => player.id)
    );
    next = {
      ...next,
      players: next.players.map((player) => player.teamId === team.id && protectedIds.has(player.id) ? { ...player, practiceSquadProtectedWeek: next.currentWeek } : player)
    };

    const needs = candidatePositionsForNeeds(next, team.id);
    const available = next.players
      .filter((player) => player.teamId === FREE_AGENT_TEAM_ID)
      .filter((player) => needs.has(player.position) || player.potential >= 68)
      .filter((player) => canSignFreeAgentToPracticeSquad(next, player.id, team.id).ok)
      .sort((a, b) => practiceSquadValue(b) - practiceSquadValue(a));
    for (const player of available) {
      if (practiceSquadSize(next, team.id) >= PRACTICE_SQUAD_SIZE) break;
      next = signFreeAgentToPracticeSquad(next, player.id, team.id);
    }

    const injuredPressure = activeRosterPlayers(next, team.id).filter((player) => player.status === "injured" || player.status === "suspended").length;
    if (injuredPressure >= 2) {
      const callup = practiceSquadPlayers(next, team.id)
        .filter((player) => canElevatePracticeSquadPlayer(next, player.id, team.id).ok)
        .sort((a, b) => b.overall - a.overall || practiceSquadValue(b) - practiceSquadValue(a))[0];
      if (callup) next = elevatePracticeSquadPlayer(next, callup.id, team.id);
    }
  }

  for (const team of next.teams) {
    if (team.id === next.selectedTeamId && !options.includeSelectedTeam) continue;
    if (activeRosterSize(next, team.id) >= MAX_ACTIVE_ROSTER_SIZE) continue;
    const needs = candidatePositionsForNeeds(next, team.id);
    const target = next.players
      .filter((player) => player.teamId !== team.id && isPracticeSquadPlayer(player))
      .filter((player) => player.practiceSquadProtectedWeek !== next.currentWeek)
      .filter((player) => needs.has(player.position))
      .filter((player) => effectivePlayerOverallAtPosition(player, player.position) >= 52 || player.potential >= 70)
      .filter((player) => canPoachPracticeSquadPlayer(next, player.id, team.id).ok)
      .sort((a, b) => practiceSquadValue(b) - practiceSquadValue(a))[0];
    if (target) next = poachPracticeSquadPlayer(next, target.id, team.id);
  }
  return next;
}

export function fillPracticeSquadsFromFreeAgency(save: GameSave, options: { includeSelectedTeam?: boolean } = {}): GameSave {
  let next = save;
  for (const team of next.teams) {
    if (team.id === next.selectedTeamId && !options.includeSelectedTeam) continue;
    const needs = candidatePositionsForNeeds(next, team.id);
    const available = next.players
      .filter((player) => player.teamId === FREE_AGENT_TEAM_ID)
      .filter((player) => needs.has(player.position) || player.potential >= 66)
      .filter((player) => canSignFreeAgentToPracticeSquad(next, player.id, team.id).ok)
      .sort((a, b) => practiceSquadValue(b) - practiceSquadValue(a));
    for (const player of available) {
      if (practiceSquadSize(next, team.id) >= PRACTICE_SQUAD_SIZE) break;
      next = signFreeAgentToPracticeSquad(next, player.id, team.id);
    }
  }
  return next;
}

export function practiceSquadMove(save: GameSave, player: Player, teamId: string, type: PracticeSquadMoveType) {
  const sequence = (save.freeAgencyLog?.length ?? 0) + 1;
  return {
    id: `ps-${type}-${save.seasonYear}-${save.currentWeek}-${sequence}-${player.id}`,
    type: type === "practice-release" ? "release" as const : "signing" as const,
    seasonYear: save.seasonYear,
    week: save.currentWeek,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    teamId,
    salary: playerCapHit(player, save.seasonYear) || player.salary,
    contractYears: player.contractYears
  };
}

function practiceSquadInbox(save: GameSave, player: Player, title: string, body: string, priority: InboxItem["priority"] = "normal"): InboxItem {
  return {
    id: `ps-${save.seasonYear}-${save.currentWeek}-${player.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    week: save.currentWeek,
    category: "staff",
    title,
    body,
    priority,
    read: false
  };
}

export function practiceSquadPositionPlan(index: number): Position {
  const plan: Position[] = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "LT", "C", "RT", "EDGE", "EDGE", "DL", "LB", "CB", "S"];
  return plan[index % plan.length] ?? POSITIONS[index % POSITIONS.length];
}
