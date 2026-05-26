import type { GameSave, InboxItem, Player } from "../types";
import { addDays } from "./calendar";

const FREE_AGENT_TEAM_ID = "FA";
const MAX_ROSTER_SIZE = 53;

export const IR_MINIMUM_WEEKS = 4;
export const IR_PRACTICE_WINDOW_WEEKS = 3;
export const IR_TEAM_RETURN_LIMIT = 8;
export const IR_PLAYER_RETURN_LIMIT = 2;

export interface IrActionCheck {
  ok: boolean;
  reason?: string;
}

export function isOnIr(player: Pick<Player, "reserveStatus">): boolean {
  return player.reserveStatus === "ir";
}

export function clearIrState<T extends Player>(player: T): T {
  const {
    reserveStatus: _reserveStatus,
    irPlacedWeek: _irPlacedWeek,
    irPlacedDate: _irPlacedDate,
    irPlacedSeason: _irPlacedSeason,
    irEligibleWeek: _irEligibleWeek,
    irEligibleDate: _irEligibleDate,
    irReturnDesignatedWeek: _irReturnDesignatedWeek,
    irReturnDesignatedDate: _irReturnDesignatedDate,
    irPracticeWindowDeadlineWeek: _irPracticeWindowDeadlineWeek,
    irPracticeWindowDeadlineDate: _irPracticeWindowDeadlineDate,
    irGamesMissed: _irGamesMissed,
    ...rest
  } = player;
  return rest as T;
}

export function activeRosterSize(save: GameSave, teamId: string): number {
  return save.players.filter((player) => player.teamId === teamId && !isOnIr(player) && player.practiceSquad !== true && player.status !== "practice" && player.status !== "elevated").length;
}

export function irPlayersForTeam(save: GameSave, teamId: string): Player[] {
  return save.players.filter((player) => player.teamId === teamId && isOnIr(player));
}

export function irReturnUsage(save: GameSave, teamId: string): number {
  return save.irReturnUsage?.[teamId] ?? 0;
}

export function canPlacePlayerOnIr(save: GameSave, playerId: string, teamId = save.selectedTeamId): IrActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== teamId) return { ok: false, reason: "Player is not on this roster." };
  if (player.teamId === FREE_AGENT_TEAM_ID) return { ok: false, reason: "Free agents cannot be placed on IR." };
  if (player.practiceSquad || player.status === "practice" || player.status === "elevated") return { ok: false, reason: "Practice squad players cannot be placed on IR in this version." };
  if (isOnIr(player)) return { ok: false, reason: "Player is already on IR." };
  if (player.status !== "injured" || (!player.injury && player.injuryWeeks <= 0)) {
    return { ok: false, reason: "Only injured players can be placed on IR." };
  }
  return { ok: true };
}

export function canDesignatePlayerToReturn(save: GameSave, playerId: string, teamId = save.selectedTeamId): IrActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== teamId) return { ok: false, reason: "Player is not on this roster." };
  if (!isOnIr(player)) return { ok: false, reason: "Player is not on IR." };
  if ((player.irReturnDesignatedWeek ?? 0) > 0) return { ok: false, reason: "Return window is already open." };
  if (save.currentWeek < (player.irEligibleWeek ?? 99)) return { ok: false, reason: `Eligible after Week ${player.irEligibleWeek}.` };
  if (player.status === "injured") return { ok: false, reason: "Player is not medically cleared to practice yet." };
  if (irReturnUsage(save, teamId) >= IR_TEAM_RETURN_LIMIT) return { ok: false, reason: "IR return limit reached." };
  if ((player.irReturnCount ?? 0) >= IR_PLAYER_RETURN_LIMIT) return { ok: false, reason: "Player return limit reached." };
  return { ok: true };
}

export function canActivatePlayerFromIr(save: GameSave, playerId: string, teamId = save.selectedTeamId): IrActionCheck {
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ok: false, reason: "Player not found." };
  if (player.teamId !== teamId) return { ok: false, reason: "Player is not on this roster." };
  if (!isOnIr(player)) return { ok: false, reason: "Player is not on IR." };
  if (!(player.irReturnDesignatedWeek && player.irPracticeWindowDeadlineWeek)) return { ok: false, reason: "Designate the player to return first." };
  if (player.status === "injured") return { ok: false, reason: "Player is not medically cleared." };
  if (activeRosterSize(save, teamId) >= MAX_ROSTER_SIZE) return { ok: false, reason: "Open an active roster spot first." };
  return { ok: true };
}

function irInbox(save: GameSave, player: Player, title: string, body: string, priority: InboxItem["priority"] = "normal"): InboxItem | undefined {
  if (player.teamId !== save.selectedTeamId) return undefined;
  return {
    id: `ir-${save.seasonYear}-${save.currentWeek}-${player.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    week: save.currentWeek,
    category: "injury",
    title,
    body,
    priority,
    read: false
  };
}

export function placePlayerOnIr(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  if (!canPlacePlayerOnIr(save, playerId, teamId).ok) return save;
  let placedPlayer: Player | undefined;
  const players = save.players.map((player) => {
    if (player.id !== playerId) return player;
    placedPlayer = {
      ...player,
      reserveStatus: "ir" as const,
      irPlacedWeek: save.currentWeek,
      irPlacedDate: save.currentDate,
      irPlacedSeason: save.seasonYear,
      irEligibleWeek: save.currentWeek + IR_MINIMUM_WEEKS,
      irEligibleDate: undefined,
      irReturnDesignatedWeek: undefined,
      irPracticeWindowDeadlineWeek: undefined,
      irReturnCount: player.irReturnCount ?? 0
    };
    return placedPlayer;
  });
  const inboxItem = placedPlayer
    ? irInbox(save, placedPlayer, `${placedPlayer.position} placed on IR: ${placedPlayer.firstName} ${placedPlayer.lastName}`, `${placedPlayer.firstName} ${placedPlayer.lastName} no longer counts against the active roster and is eligible to return after Week ${placedPlayer.irEligibleWeek}.`)
    : undefined;
  return {
    ...save,
    players,
    depthOverrides: removePlayerFromDepthOverrides(save, teamId, playerId),
    inbox: inboxItem ? [inboxItem, ...save.inbox] : save.inbox
  };
}

export function designatePlayerToReturn(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  if (!canDesignatePlayerToReturn(save, playerId, teamId).ok) return save;
  let designated: Player | undefined;
  const players = save.players.map((player) => {
    if (player.id !== playerId) return player;
    designated = {
      ...player,
      irReturnDesignatedWeek: save.currentWeek,
      irReturnDesignatedDate: save.currentDate,
      irPracticeWindowDeadlineWeek: save.currentWeek + IR_PRACTICE_WINDOW_WEEKS,
      irPracticeWindowDeadlineDate: save.currentDate ? addDays(save.currentDate, IR_PRACTICE_WINDOW_WEEKS * 7) : undefined,
      irReturnCount: (player.irReturnCount ?? 0) + 1
    };
    return designated;
  });
  const inboxItem = designated
    ? irInbox(save, designated, `${designated.position} return window opened: ${designated.firstName} ${designated.lastName}`, `The 3-week IR return window is open through Week ${designated.irPracticeWindowDeadlineWeek}.`, "high")
    : undefined;
  return {
    ...save,
    players,
    irReturnUsage: {
      ...(save.irReturnUsage ?? {}),
      [teamId]: irReturnUsage(save, teamId) + 1
    },
    inbox: inboxItem ? [inboxItem, ...save.inbox] : save.inbox
  };
}

export function activatePlayerFromIr(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  if (!canActivatePlayerFromIr(save, playerId, teamId).ok) return save;
  let activated: Player | undefined;
  const players = save.players.map((player) => {
    if (player.id !== playerId) return player;
    activated = clearIrState(player);
    return activated;
  });
  const inboxItem = activated
    ? irInbox(save, activated, `${activated.position} activated from IR: ${activated.firstName} ${activated.lastName}`, `${activated.firstName} ${activated.lastName} has returned to the active roster.`, "high")
    : undefined;
  return {
    ...save,
    players,
    inbox: inboxItem ? [inboxItem, ...save.inbox] : save.inbox
  };
}

export function processIrWindows(save: GameSave): GameSave {
  const inbox: InboxItem[] = [];
  const players = save.players.map((player) => {
    if (!isOnIr(player)) return player;
    if (player.teamId === save.selectedTeamId && player.irEligibleWeek === save.currentWeek && !player.irReturnDesignatedWeek) {
      const item = irInbox(save, player, `${player.position} eligible from IR: ${player.firstName} ${player.lastName}`, `${player.firstName} ${player.lastName} has met the four-week IR minimum and can be designated to return once medically cleared.`);
      if (item) inbox.push(item);
    }
    if (player.irPracticeWindowDeadlineWeek && save.currentWeek > player.irPracticeWindowDeadlineWeek) {
      const item = irInbox(save, player, `${player.position} return window expired: ${player.firstName} ${player.lastName}`, `${player.firstName} ${player.lastName} remains on IR after the 3-week return window expired.`, "high");
      if (item) inbox.push(item);
      return {
        ...player,
        irReturnDesignatedWeek: undefined,
        irPracticeWindowDeadlineWeek: undefined
      };
    }
    return player;
  });
  return {
    ...save,
    players,
    inbox: inbox.length ? [...inbox, ...save.inbox] : save.inbox
  };
}

export function autoManageCpuIr(save: GameSave): GameSave {
  let next = save;
  for (const team of save.teams) {
    if (team.id === save.selectedTeamId) continue;
    const injured = next.players
      .filter((player) => player.teamId === team.id && player.status === "injured" && !isOnIr(player))
      .filter((player) => player.injuryWeeks >= 4 || (player.injury?.initialWeeks ?? 0) >= 5)
      .sort((a, b) => b.injuryWeeks - a.injuryWeeks || b.overall - a.overall);
    for (const player of injured) {
      next = placePlayerOnIr(next, player.id, team.id);
    }

    const ready = irPlayersForTeam(next, team.id)
      .filter((player) => player.status !== "injured")
      .sort((a, b) => b.overall - a.overall);
    for (const player of ready) {
      if (!player.irReturnDesignatedWeek && canDesignatePlayerToReturn(next, player.id, team.id).ok) {
        next = designatePlayerToReturn(next, player.id, team.id);
      }
      if (canActivatePlayerFromIr(next, player.id, team.id).ok) {
        next = activatePlayerFromIr(next, player.id, team.id);
      }
    }
  }
  return next;
}

export function normalizeIrState(player: Player, seasonYear: number): Player {
  if (player.reserveStatus !== "ir") {
    return {
      ...player,
      irPlacedWeek: undefined,
      irPlacedDate: undefined,
      irPlacedSeason: undefined,
      irEligibleWeek: undefined,
      irEligibleDate: undefined,
      irReturnDesignatedWeek: undefined,
      irReturnDesignatedDate: undefined,
      irPracticeWindowDeadlineWeek: undefined,
      irPracticeWindowDeadlineDate: undefined,
      irGamesMissed: undefined,
      irReturnCount: player.irPlacedSeason === seasonYear ? player.irReturnCount ?? 0 : 0
    };
  }
  return {
    ...player,
    irPlacedSeason: player.irPlacedSeason ?? seasonYear,
    irPlacedWeek: player.irPlacedWeek ?? 1,
    irPlacedDate: player.irPlacedDate,
    irEligibleWeek: player.irEligibleWeek ?? (player.irPlacedWeek ?? 1) + IR_MINIMUM_WEEKS,
    irEligibleDate: player.irEligibleDate,
    irReturnCount: player.irPlacedSeason === seasonYear ? player.irReturnCount ?? 0 : 0
  };
}
function removePlayerFromDepthOverrides(save: GameSave, teamId: string, playerId: string): GameSave["depthOverrides"] {
  const teamOverrides = save.depthOverrides?.[teamId] ?? {};
  const nextTeamOverrides = Object.fromEntries(
    Object.entries(teamOverrides).map(([position, orderedIds]) => [
      position,
      orderedIds?.filter((id) => id !== playerId)
    ])
  ) as GameSave["depthOverrides"][string];
  return {
    ...(save.depthOverrides ?? {}),
    [teamId]: nextTeamOverrides
  };
}
