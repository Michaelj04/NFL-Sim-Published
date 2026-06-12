import { POSITIONS, type FreeAgencyMove, type GameSave, type Player, type PlayerContract, type Position, type ReleaseDesignation } from "../types";
import { addReleaseDeadMoneyCharges, contractOfferForPlayer, currentCapSeason, playerCapHit, recalculateBudgets, recordCompPickSigning, syncPlayerContractFields } from "./cap";
import { activeRosterLimitForDate } from "./calendar";
import { activeRosterSize, clearIrState, isOnIr } from "./ir";
import { clearPracticeSquadState, isPracticeSquadPlayer } from "./practiceSquad";
import { isPlayerOnWaivers, placePlayerOnWaivers, playerWaiverEligible } from "./waivers";

export const FREE_AGENT_TEAM_ID = "FA";
export const MAX_ROSTER_SIZE = 53;
export const MIN_ROSTER_SIZE = 45;

export type FreeAgentSort = "ask" | "overall" | "potential" | "age" | "salary" | "position";

export interface FreeAgentActionCheck {
  ok: boolean;
  reason?: string;
}

export function freeAgentPlayers(save: GameSave): Player[] {
  return save.players.filter((player) => player.teamId === FREE_AGENT_TEAM_ID && !isPlayerOnWaivers(save, player.id));
}

export function rosterSize(save: GameSave, teamId: string): number {
  return activeRosterSize(save, teamId);
}

export function rosterLimit(save: Pick<GameSave, "seasonYear" | "currentDate">): number {
  return activeRosterLimitForDate(save.seasonYear, save.currentDate);
}

export function sortFreeAgents(players: Player[], sort: FreeAgentSort): Player[] {
  return players.slice().sort((a, b) => {
    if (sort === "ask") return b.salary - a.salary || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    if (sort === "potential") return b.potential - a.potential || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    if (sort === "age") return a.age - b.age || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    if (sort === "salary") return a.salary - b.salary || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    if (sort === "position") return POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    return b.overall - a.overall || b.potential - a.potential || a.lastName.localeCompare(b.lastName);
  });
}

export function canSignFreeAgent(save: GameSave, playerId: string, teamId = save.selectedTeamId): FreeAgentActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== FREE_AGENT_TEAM_ID) return { ok: false, reason: "Player is not a free agent." };
  if (!save.teams.some((team) => team.id === teamId)) return { ok: false, reason: "Team not found." };
  if (rosterSize(save, teamId) >= Math.min(MAX_ROSTER_SIZE, rosterLimit(save))) return { ok: false, reason: "Release a player to open a roster spot." };
  const offer = contractOfferForPlayer(save, player, teamId);
  const firstYear = offer.seasons.find((season) => season.seasonYear === save.seasonYear && !season.voidYear) ?? offer.seasons.find((season) => !season.voidYear);
  const capHit = (firstYear?.baseSalary ?? player.salary) + (firstYear?.signingBonusProration ?? 0);
  if ((save.budget[teamId] ?? 0) < capHit) return { ok: false, reason: "Not enough cap room." };
  return { ok: true };
}

export function canSignFreeAgentWithContract(save: GameSave, playerId: string, teamId: string, contract: PlayerContract): FreeAgentActionCheck {
  const base = canSignFreeAgent(save, playerId, teamId);
  if (!base.ok && base.reason !== "Not enough cap room.") return base;
  const firstYear = contract.seasons.find((season) => season.seasonYear === save.seasonYear && !season.voidYear) ?? contract.seasons.find((season) => !season.voidYear);
  const capHit = (firstYear?.baseSalary ?? contract.apy) + (firstYear?.signingBonusProration ?? 0);
  if ((save.budget[teamId] ?? 0) < capHit) return { ok: false, reason: "Not enough cap room." };
  return { ok: true };
}

export function canReleasePlayer(save: GameSave, playerId: string, teamId = save.selectedTeamId): FreeAgentActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== teamId) return { ok: false, reason: "Player is not on this roster." };
  if (!isOnIr(player) && !isPracticeSquadPlayer(player) && rosterSize(save, teamId) <= MIN_ROSTER_SIZE) return { ok: false, reason: "Roster is already at the minimum size." };
  return { ok: true };
}

export function signFreeAgent(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return save;
  return signFreeAgentWithContract(save, playerId, teamId, contractOfferForPlayer(save, player, teamId));
}

export function signFreeAgentWithContract(
  save: GameSave,
  playerId: string,
  teamId: string,
  contract: PlayerContract,
  options: { source?: FreeAgencyMove["source"]; details?: string; type?: FreeAgencyMove["type"]; deferPostSignRefresh?: boolean } = {}
): GameSave {
  const check = canSignFreeAgentWithContract(save, playerId, teamId, contract);
  if (!check.ok) return save;
  const player = save.players.find((candidate) => candidate.id === playerId)!;
  const signedPlayer = syncPlayerContractFields(clearPracticeSquadState(clearIrState({
    ...player,
    teamId,
    teamStartSeason: save.seasonYear,
    previousTeamId: undefined,
    contract: { ...contract, rights: "none" as const },
    status: isPracticeSquadPlayer(player) ? "active" as const : player.status
  })), save.seasonYear);
  const signedSave = {
    ...save,
    players: save.players.map((candidate) => (candidate.id === playerId ? signedPlayer : candidate)),
    freeAgencyLog: [
      makeFreeAgencyMove(save, signedPlayer, teamId, options.type ?? "signing", { source: options.source, details: options.details }),
      ...(save.freeAgencyLog ?? [])
    ]
  };
  const compSave = recordCompPickSigning(signedSave, player, teamId, { project: !options.deferPostSignRefresh });
  if (!options.deferPostSignRefresh) return recalculateBudgets(compSave);
  const capHit = playerCapHit(signedPlayer, save.seasonYear) || currentCapSeason(signedPlayer, save.seasonYear)?.baseSalary || signedPlayer.salary;
  return {
    ...compSave,
    budget: {
      ...compSave.budget,
      [teamId]: Number(((compSave.budget[teamId] ?? 0) - capHit).toFixed(2))
    }
  };
}

export function releasePlayerToFreeAgency(save: GameSave, playerId: string, teamId = save.selectedTeamId, designation: ReleaseDesignation = "standard"): GameSave {
  const check = canReleasePlayer(save, playerId, teamId);
  if (!check.ok) return save;
  const player = save.players.find((candidate) => candidate.id === playerId)!;
  const withDeadMoney = addReleaseDeadMoneyCharges(save, player, teamId, designation);
  const releasedPlayer = clearPracticeSquadState(clearIrState({
    ...player,
    teamId: FREE_AGENT_TEAM_ID,
    previousTeamId: undefined,
    teamStartSeason: save.seasonYear,
    contract: player.contract ? { ...player.contract, rights: "none" as const } : player.contract,
    status: isPracticeSquadPlayer(player) ? "active" as const : player.status
  }));
  const releasedSave = recalculateBudgets({
    ...withDeadMoney,
    players: withDeadMoney.players.map((candidate) => (candidate.id === playerId ? releasedPlayer : candidate)),
    depthOverrides: removePlayerFromDepthOverrides(save, teamId, playerId),
    freeAgencyLog: [makeFreeAgencyMove(save, player, teamId, "release", { details: designation === "post-june" ? "Post-June release designation" : undefined }), ...(save.freeAgencyLog ?? [])]
  });
  return playerWaiverEligible(save, player) ? placePlayerOnWaivers(releasedSave, releasedPlayer, teamId) : releasedSave;
}

export function makeFreeAgencyMove(
  save: GameSave,
  player: Player,
  teamId: string,
  type: FreeAgencyMove["type"],
  options: { source?: FreeAgencyMove["source"]; details?: string } = {}
): FreeAgencyMove {
  const sequence = (save.freeAgencyLog?.length ?? 0) + 1;
  return {
    id: `fa-${type}-${save.seasonYear}-${save.currentWeek}-${sequence}-${player.id}`,
    type,
    seasonYear: save.seasonYear,
    week: save.currentWeek,
    date: save.currentDate,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    teamId,
    salary: playerCapHit(player, save.seasonYear) || currentCapSeason(player, save.seasonYear)?.baseSalary || player.salary,
    contractYears: player.contractYears,
    source: options.source,
    details: options.details
  };
}

function removePlayerFromDepthOverrides(save: GameSave, teamId: string, playerId: string): GameSave["depthOverrides"] {
  const teamOverrides = save.depthOverrides?.[teamId] ?? {};
  const nextTeamOverrides = Object.fromEntries(
    Object.entries(teamOverrides).map(([position, orderedIds]) => [
      position,
      orderedIds?.filter((id) => id !== playerId)
    ])
  ) as Partial<Record<Position, string[]>>;
  return {
    ...(save.depthOverrides ?? {}),
    [teamId]: nextTeamOverrides
  };
}
