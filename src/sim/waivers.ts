import type { GameSave, Player, WaiverClaim, WaiverPlayer } from "../types";
import { activeRosterLimitForDate, addDays } from "./calendar";
import { makeContract, playerCapHit, recalculateBudgets } from "./cap";
import { activeRosterSize, clearIrState } from "./ir";
import { clearPracticeSquadState } from "./practiceSquad";

function rosterLimit(save: Pick<GameSave, "seasonYear" | "currentDate">): number {
  return activeRosterLimitForDate(save.seasonYear, save.currentDate);
}

export function waiverOrder(save: GameSave): string[] {
  const existing = save.waiverState?.order;
  if (existing?.length === save.teams.length) return existing;
  return save.teams
    .slice()
    .sort((a, b) => {
      const aRecord = save.records[a.id];
      const bRecord = save.records[b.id];
      const aGames = (aRecord?.wins ?? 0) + (aRecord?.losses ?? 0) + (aRecord?.ties ?? 0);
      const bGames = (bRecord?.wins ?? 0) + (bRecord?.losses ?? 0) + (bRecord?.ties ?? 0);
      const aPct = aGames ? ((aRecord?.wins ?? 0) + (aRecord?.ties ?? 0) * 0.5) / aGames : 0;
      const bPct = bGames ? ((bRecord?.wins ?? 0) + (bRecord?.ties ?? 0) * 0.5) / bGames : 0;
      return aPct - bPct || a.id.localeCompare(b.id);
    })
    .map((team) => team.id);
}

export function normalizeWaiverState(save: GameSave): NonNullable<GameSave["waiverState"]> {
  return {
    order: waiverOrder(save),
    players: save.waiverState?.players ?? [],
    lastProcessedDate: save.waiverState?.lastProcessedDate
  };
}

export function isPlayerOnWaivers(save: GameSave, playerId: string): boolean {
  return (save.waiverState?.players ?? []).some((entry) => entry.playerId === playerId && entry.status === "waivers");
}

export function playerWaiverEligible(save: Pick<GameSave, "seasonYear">, player: Player): boolean {
  const exp = player.draftYear ? Math.max(0, save.seasonYear - player.draftYear) : Math.max(0, player.age - 22);
  return exp < 4 || player.age <= 26;
}

export function placePlayerOnWaivers(save: GameSave, player: Player, originalTeamId: string): GameSave {
  const state = normalizeWaiverState(save);
  if (state.players.some((entry) => entry.playerId === player.id && entry.status === "waivers")) return { ...save, waiverState: state };
  const entry: WaiverPlayer = {
    id: `waiver-${save.seasonYear}-${save.currentDate}-${player.id}`,
    playerId: player.id,
    originalTeamId,
    waivedDate: save.currentDate,
    claimDeadlineDate: addDays(save.currentDate, 1),
    salary: playerCapHit(player, save.seasonYear) || player.salary,
    contractYears: player.contractYears,
    contract: player.contract,
    claims: [],
    status: "waivers"
  };
  return {
    ...save,
    waiverState: {
      ...state,
      players: [entry, ...state.players]
    }
  };
}

export function submitWaiverClaim(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  const state = normalizeWaiverState(save);
  const entry = state.players.find((candidate) => candidate.playerId === playerId && candidate.status === "waivers");
  if (!entry || activeRosterSize(save, teamId) >= rosterLimit(save)) return save;
  const claim: WaiverClaim = {
    id: `claim-${save.currentDate}-${teamId}-${playerId}`,
    playerId,
    teamId,
    date: save.currentDate,
    status: "submitted"
  };
  return {
    ...save,
    waiverState: {
      ...state,
      players: state.players.map((candidate) =>
        candidate.id === entry.id
          ? { ...candidate, claims: [claim, ...candidate.claims.filter((existing) => existing.teamId !== teamId)] }
          : candidate
      )
    }
  };
}

export function addCpuWaiverClaims(save: GameSave): GameSave {
  let next: GameSave = { ...save, waiverState: normalizeWaiverState(save) };
  for (const entry of normalizeWaiverState(next).players.filter((candidate) => candidate.status === "waivers")) {
    const player = next.players.find((candidate) => candidate.id === entry.playerId);
    if (!player) continue;
    const targets = next.teams
      .filter((team) => team.id !== next.selectedTeamId && team.id !== entry.originalTeamId)
      .filter((team) => activeRosterSize(next, team.id) < rosterLimit(next))
      .map((team) => ({
        teamId: team.id,
        score: player.potential * 0.7 + player.overall - (activeRosterSize(next, team.id) - 48) * 2
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, player.potential >= 68 || player.overall >= 56 ? 3 : 1);
    for (const target of targets) {
      if (target.score < 92) continue;
      next = submitWaiverClaim(next, entry.playerId, target.teamId);
    }
  }
  return next;
}

export function processWaiversForDate(save: GameSave, date = save.currentDate): GameSave {
  let next = addCpuWaiverClaims({ ...save, waiverState: normalizeWaiverState(save) });
  const state = normalizeWaiverState(next);
  let players = next.players.slice();
  const processed = state.players.map((entry) => {
    if (entry.status !== "waivers" || entry.claimDeadlineDate > date) return entry;
    const player = players.find((candidate) => candidate.id === entry.playerId);
    if (!player) return { ...entry, status: "cleared" as const };
    const submitted = entry.claims.filter((claim) => claim.status === "submitted");
    const winner = submitted
      .filter((claim) => activeRosterSize({ ...next, players }, claim.teamId) < rosterLimit(next))
      .sort((a, b) => state.order.indexOf(a.teamId) - state.order.indexOf(b.teamId))[0];
    if (!winner) return { ...entry, status: "cleared" as const, claims: submitted.map((claim) => ({ ...claim, status: "expired" as const, reason: "Waiver period cleared." })) };
    const claimed = clearPracticeSquadState(clearIrState({
      ...player,
      teamId: winner.teamId,
      previousTeamId: entry.originalTeamId,
      teamStartSeason: next.seasonYear,
      salary: entry.contract?.apy ?? entry.salary,
      contractYears: entry.contract?.years ?? entry.contractYears,
      contract: entry.contract ?? makeContract({ ...player, salary: entry.salary, contractYears: entry.contractYears }, next.seasonYear),
      status: "active" as const
    }));
    players = players.map((candidate) => candidate.id === player.id ? claimed : candidate);
    return {
      ...entry,
      status: "claimed" as const,
      claims: submitted.map((claim) => ({
        ...claim,
        status: claim.id === winner.id ? "awarded" as const : "failed" as const,
        reason: claim.id === winner.id ? "Awarded by waiver priority." : `Awarded to ${winner.teamId.toUpperCase()}.`
      }))
    };
  });
  return recalculateBudgets({
    ...next,
    players,
    waiverState: {
      ...state,
      lastProcessedDate: date,
      players: processed
    }
  });
}
