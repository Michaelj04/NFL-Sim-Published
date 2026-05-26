import { clamp, type Rng } from "../lib/rng";
import { POSITIONS, type GameSave, type Player, type Position } from "../types";
import { isOnIr } from "./ir";
import { isPracticeSquadElevated, isPracticeSquadPlayer } from "./practiceSquad";
import { effectivePlayerOverallAtPosition, isPrimaryPosition, positionFitFor } from "./positionEligibility";

export type SnapPhase = "offense" | "defense" | "special";
export type DepthUsage = "Starter" | "Rotation";

export interface SnapPlanEntry {
  id: string;
  label: DepthUsage;
  position: Position;
  phase: SnapPhase;
  order: number;
  starter: boolean;
  primaryPosition: Position;
  effectiveOverall: number;
  emergency?: boolean;
  player?: Player;
  playerId?: string;
  snapShare: number;
}

export interface SnapPlan {
  teamId: string;
  entries: SnapPlanEntry[];
  byPlayer: Record<string, SnapPlanEntry[]>;
}

export const starterCountsByPosition: Record<Position, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 1,
  LT: 1,
  LG: 1,
  C: 1,
  RG: 1,
  RT: 1,
  EDGE: 2,
  DL: 2,
  LB: 2,
  CB: 3,
  S: 2,
  K: 1,
  P: 1
};

const fixedPositions = new Set<Position>(["QB", "LT", "LG", "C", "RG", "RT", "K", "P"]);
const priorityPositions: Position[] = ["QB", "K", "P", "C", "LT", "RT", "LG", "RG", "CB", "WR", "EDGE", "DL", "LB", "RB", "S", "TE"];

export function isPlayablePlayer(player: Player): boolean {
  return !isOnIr(player) && !isPracticeSquadPlayer(player) && (player.status === "active" || player.status === "limited");
}

export function isPlayablePlayerForWeek(player: Player, week: number): boolean {
  if (isOnIr(player)) return false;
  if (isPracticeSquadPlayer(player)) {
    return isPracticeSquadElevated(player, week) && (player.status === "elevated" || player.status === "limited");
  }
  return player.status === "active" || player.status === "limited";
}

function phaseForPosition(position: Position): SnapPhase {
  if (position === "K" || position === "P") return "special";
  if (["EDGE", "DL", "LB", "CB", "S"].includes(position)) return "defense";
  return "offense";
}

export function buildDepthChart(save: GameSave, teamId: string): Record<Position, Player[]> {
  const chart = POSITIONS.reduce(
    (acc, position) => {
      acc[position] = [];
      return acc;
    },
    {} as Record<Position, Player[]>
  );

  const activePlayers = save.players.filter((player) => player.teamId === teamId && isPlayablePlayerForWeek(player, save.currentWeek));

  for (const player of activePlayers) {
    for (const position of POSITIONS.filter((candidate) => positionFitFor(player, candidate) >= 64)) {
      chart[position].push(player);
    }
  }

  for (const position of POSITIONS) {
    if (chart[position].length === 0) {
      chart[position] = activePlayers
        .filter((player) => player.position !== "QB" || position === "QB")
        .slice()
        .sort(
          (a, b) =>
            effectivePlayerOverallAtPosition(b, position, { emergency: true }) -
              effectivePlayerOverallAtPosition(a, position, { emergency: true }) ||
            b.potential - a.potential ||
            a.lastName.localeCompare(b.lastName)
        )
        .slice(0, 4);
    }

    chart[position].sort((a, b) => sortDepthPlayers(position, a, b));
  }

  const overrides = save.depthOverrides?.[teamId] ?? {};
  Object.entries(overrides).forEach(([position, orderedIds]) => {
    if (!orderedIds?.length) return;
    const rank = new Map(orderedIds.map((id, index) => [id, index]));
    chart[position as Position].sort((a, b) => {
      const aRank = rank.get(a.id) ?? 999;
      const bRank = rank.get(b.id) ?? 999;
      return aRank - bRank || sortDepthPlayers(position as Position, a, b);
    });
  });

  return chart;
}

function isEmergencyAtPosition(player: Player, position: Position): boolean {
  return positionFitFor(player, position) < 64;
}

function positionGrade(player: Player | undefined, position: Position): number {
  if (!player) return 40;
  return effectivePlayerOverallAtPosition(player, position, { emergency: isEmergencyAtPosition(player, position) });
}

function sortDepthPlayers(position: Position, a: Player, b: Player): number {
  const primaryDiff = Number(isPrimaryPosition(b, position)) - Number(isPrimaryPosition(a, position));
  return (
    positionGrade(b, position) - positionGrade(a, position) ||
    primaryDiff ||
    b.potential - a.potential ||
    a.lastName.localeCompare(b.lastName)
  );
}

function ratingGap(position: Position, players: Player[], index: number, direction: "next" | "previous"): number {
  const player = players[index];
  const other = direction === "next" ? players[index + 1] : players[index - 1];
  if (!player || !other) return 12;
  return direction === "next" ? positionGrade(player, position) - positionGrade(other, position) : positionGrade(other, position) - positionGrade(player, position);
}

function closeRotationShare(position: Position, players: Player[], index: number): number {
  const fromPrevious = ratingGap(position, players, index, "previous");
  const fromNext = ratingGap(position, players, index, "next");
  const closeToStarter = Math.abs(fromPrevious) <= 3 || Math.abs(fromNext) <= 3;
  const inRange = Math.abs(fromPrevious) <= 8 || Math.abs(fromNext) <= 8;

  if (position === "RB") return closeToStarter ? 0.3 : inRange ? 0.18 : 0.08;
  if (position === "WR" || position === "CB") return closeToStarter ? 0.34 : inRange ? 0.24 : 0.14;
  if (position === "EDGE" || position === "DL" || position === "LB") return closeToStarter ? 0.44 : inRange ? 0.32 : 0.2;
  if (position === "S") return closeToStarter ? 0.25 : inRange ? 0.18 : 0.1;
  if (position === "TE") return closeToStarter ? 0.32 : inRange ? 0.22 : 0.14;
  return 0;
}

function starterShare(position: Position, players: Player[], index: number): number {
  if (fixedPositions.has(position)) return index === 0 ? 1 : 0;

  if (position === "RB") {
    const topGap = Math.abs(ratingGap(position, players, 0, "next"));
    if (index === 0) return topGap <= 3 ? 0.58 : topGap <= 8 ? 0.66 : 0.76;
    if (index === 1) return topGap <= 3 ? 0.46 : topGap <= 8 ? 0.36 : 0.24;
  }

  const starterBases: Partial<Record<Position, number[]>> = {
    WR: [0.88, 0.8, 0.68],
    CB: [0.92, 0.86, 0.72],
    EDGE: [0.78, 0.68],
    DL: [0.7, 0.62],
    LB: [0.9, 0.78],
    S: [0.95, 0.9]
  };
  const base = starterBases[position]?.[index];
  if (base !== undefined) {
    const nextGap = ratingGap(position, players, index, "next");
    const previousGap = ratingGap(position, players, index, "previous");
    const topBonus = index === 0 && nextGap >= 9 ? 0.04 : 0;
    const closeShare = nextGap <= 3 ? -0.03 : previousGap <= 3 ? 0.03 : previousGap >= 9 ? -0.03 : 0;
    return clamp(base + topBonus + closeShare, 0.12, 1);
  }

  if (position === "TE") return index === 0 ? 0.82 : closeRotationShare(position, players, index);

  return index < starterCountsByPosition[position] ? 0.75 : closeRotationShare(position, players, index);
}

function shareForPosition(position: Position, players: Player[], index: number): number {
  const starterCount = starterCountsByPosition[position];
  if (index < starterCount) return starterShare(position, players, index);
  return closeRotationShare(position, players, index);
}

export function calculateSnapPlan(save: GameSave, teamId: string): SnapPlan {
  const chart = buildDepthChart(save, teamId);
  const entries: SnapPlanEntry[] = [];
  const activePlayers = save.players.filter((player) => player.teamId === teamId && isPlayablePlayerForWeek(player, save.currentWeek));
  const selectedByPosition = POSITIONS.reduce(
    (acc, position) => {
      acc[position] = [];
      return acc;
    },
    {} as Record<Position, Player[]>
  );
  const assigned = new Set<string>();

  const addForPosition = (position: Position, maxCount: number) => {
    for (const player of chart[position]) {
      if (selectedByPosition[position].length >= maxCount) return;
      if (assigned.has(player.id)) continue;
      selectedByPosition[position].push(player);
      assigned.add(player.id);
    }
  };

  for (const position of priorityPositions) {
    addForPosition(position, starterCountsByPosition[position]);
  }

  for (const position of priorityPositions) {
    while (selectedByPosition[position].length < starterCountsByPosition[position]) {
      const emergency = activePlayers
        .filter((player) => !assigned.has(player.id))
        .filter((player) => player.position !== "QB" || position === "QB")
        .sort(
          (a, b) =>
            effectivePlayerOverallAtPosition(b, position, { emergency: true }) -
              effectivePlayerOverallAtPosition(a, position, { emergency: true }) ||
            b.potential - a.potential ||
            a.lastName.localeCompare(b.lastName)
        )[0];
      if (!emergency) break;
      selectedByPosition[position].push(emergency);
      assigned.add(emergency.id);
    }
  }

  for (const position of priorityPositions) {
    const rotationLimit = fixedPositions.has(position) ? starterCountsByPosition[position] : starterCountsByPosition[position] + 4;
    addForPosition(position, rotationLimit);
  }

  for (const position of POSITIONS) {
    const players = selectedByPosition[position];
    players.forEach((player, index) => {
      const starter = index < starterCountsByPosition[position];
      const snapShare = clamp(shareForPosition(position, players, index), 0, 1);
      const emergency = isEmergencyAtPosition(player, position);
      entries.push({
        id: `${position}-${index + 1}`,
        label: starter ? "Starter" : "Rotation",
        position,
        phase: phaseForPosition(position),
        order: index + 1,
        starter,
        primaryPosition: player.position,
        effectiveOverall: positionGrade(player, position),
        emergency,
        player,
        playerId: player.id,
        snapShare
      });
    });
  }

  const byPlayer = entries.reduce(
    (acc, entry) => {
      if (!entry.playerId) return acc;
      acc[entry.playerId] = [...(acc[entry.playerId] ?? []), entry];
      return acc;
    },
    {} as Record<string, SnapPlanEntry[]>
  );

  return { teamId, entries, byPlayer };
}

export function projectedShareForPlayer(plan: SnapPlan, playerId: string): number {
  return Math.max(0, ...((plan.byPlayer[playerId] ?? []).map((entry) => entry.snapShare)));
}

export function weightedEntryPick(entries: SnapPlanEntry[], rng: Rng, positionWeights: Partial<Record<Position, number>>): SnapPlanEntry | undefined {
  const weighted = entries
    .filter((entry) => entry.player && entry.snapShare > 0)
    .map((entry) => ({
      entry,
      weight: entry.snapShare * (positionWeights[entry.position] ?? 1)
    }))
    .filter((item) => item.weight > 0);

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return undefined;

  let roll = rng.float(0, total);
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.entry;
  }
  return weighted.at(-1)?.entry;
}
