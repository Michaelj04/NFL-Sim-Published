import type { DraftPick, GameSave, Player, Position } from "../types";
import { versatilityBonus } from "./positionEligibility";
import { rosterNeeds, teamOverall } from "./selectors";

const premium: Record<Position, number> = {
  QB: 1.75,
  RB: 0.72,
  WR: 1.08,
  TE: 0.82,
  LT: 1.14,
  LG: 0.72,
  C: 0.78,
  RG: 0.72,
  RT: 0.96,
  EDGE: 1.22,
  DL: 0.98,
  LB: 0.84,
  CB: 1.16,
  S: 0.82,
  K: 0.28,
  P: 0.22
};

const pickBase: Record<number, number> = {
  1: 880,
  2: 420,
  3: 210,
  4: 115,
  5: 70,
  6: 42,
  7: 24
};

const needCache = new WeakMap<GameSave, Map<string, ReturnType<typeof rosterNeeds>>>();

function cachedRosterNeeds(save: GameSave, teamId: string): ReturnType<typeof rosterNeeds> {
  let teamMap = needCache.get(save);
  if (!teamMap) {
    teamMap = new Map();
    needCache.set(save, teamMap);
  }
  const existing = teamMap.get(teamId);
  if (existing) return existing;
  const needs = rosterNeeds(save, teamId);
  teamMap.set(teamId, needs);
  return needs;
}

function needMultiplier(save: GameSave, teamId: string, position: Position): number {
  const need = cachedRosterNeeds(save, teamId).find((item) => item.position === position);
  if (!need) return 1;
  if (need.grade < 52) return 1.22;
  if (need.grade < 60) return 1.1;
  if (need.grade > 74) return 0.82;
  return 1;
}

export function playerTradeValue(save: GameSave, player: Player, receivingTeamId = player.teamId): number {
  const ageCurve = player.age <= 24 ? 1.22 : player.age <= 28 ? 1.08 : player.age <= 31 ? 0.92 : 0.68;
  const contract = player.contractYears >= 3 ? 1.08 : player.contractYears === 1 ? 0.88 : 1;
  const salaryDrag = Math.max(0.62, 1 - player.salary / 80);
  const grade = player.overall;
  const performance = Math.pow(Math.max(0, grade - 35), 1.55);
  const versatility = 1 + versatilityBonus(player) * 0.018;
  return Math.round(performance * premium[player.position] * ageCurve * contract * salaryDrag * needMultiplier(save, receivingTeamId, player.position) * versatility);
}

function projectedFutureSlot(save: GameSave, teamId: string): number {
  const ranked = [...save.teams]
    .map((team) => {
      const record = save.records[team.id];
      const wins = record?.wins ?? 0;
      const losses = record?.losses ?? 0;
      const grade = teamOverall(save, team.id);
      const ageDrag = save.players
        .filter((player) => player.teamId === team.id)
        .slice()
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 20)
        .reduce((sum, player) => sum + Math.max(0, player.age - 29) * 0.12, 0);
      return {
        teamId: team.id,
        strength: grade + wins * 1.7 - losses * 0.7 - ageDrag
      };
    })
    .sort((a, b) => a.strength - b.strength || a.teamId.localeCompare(b.teamId));
  return Math.max(1, ranked.findIndex((item) => item.teamId === teamId) + 1);
}

export function pickTradeValue(pick: DraftPick, save?: GameSave): number {
  const roundValue = pickBase[pick.round] ?? 10;
  const slot = save && pick.draftYear > (save.draftState?.draftYear ?? 2027)
    ? projectedFutureSlot(save, pick.originalTeamId)
    : pick.pickInRound ?? 16;
  const premium = pick.round === 1 ? Math.max(0.62, 1.38 - slot * 0.018) : Math.max(0.72, 1.16 - slot * 0.01);
  const futureDiscount = save && pick.draftYear > (save.draftState?.draftYear ?? 2027) ? 0.82 : 1;
  return Math.round(roundValue * premium * futureDiscount);
}

export function packageValue(save: GameSave, receivingTeamId: string, players: Player[], picks: DraftPick[]): number {
  const playerValue = players.reduce((sum, player) => sum + playerTradeValue(save, player, receivingTeamId), 0);
  const pickValue = picks.reduce((sum, pick) => sum + pickTradeValue(pick, save), 0);
  return Math.round(playerValue + pickValue);
}

export function tradeVerdict(incomingValue: number, outgoingValue: number): "accept" | "counter" | "decline" {
  const ratio = incomingValue / Math.max(1, outgoingValue);
  if (ratio >= 1.08) return "accept";
  if (ratio >= 0.88) return "counter";
  return "decline";
}
