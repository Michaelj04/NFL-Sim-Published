import { POSITIONS, type GameSave, type Player, type Position } from "../types";
import { isOnIr } from "./ir";
import { isPracticeSquadElevated, isPracticeSquadPlayer } from "./practiceSquad";
import { effectivePlayerOverallAtPosition, isPrimaryPosition, positionFitFor } from "./positionEligibility";
import { type SnapPlan } from "./personnel";

export type DepthUnit = "offense" | "defense" | "special";
export type OffenseFormationId = "11" | "12" | "21" | "10";
export type DefenseFormationId = "Nickel" | "Base 4-3" | "Dime" | "Goal Line";
export type SpecialFormationId = "Special Teams";
export type FormationId = OffenseFormationId | DefenseFormationId | SpecialFormationId;
export type PositionFitTone = "primary" | "alternate" | "emergency";

export interface FormationSlot {
  id: string;
  label: string;
  position: Position;
  x: number;
  y: number;
}

export interface FormationPreset {
  id: FormationId;
  label: string;
  unit: DepthUnit;
  canvasWidth: number;
  canvasHeight: number;
  slots: FormationSlot[];
}

export interface FormationAssignment {
  slot: FormationSlot;
  ordinal: number;
  main?: Player;
  stack: Player[];
  snapShare: number;
  effectiveOverall: number;
  fitTone: PositionFitTone;
}

export const offenseFormations: FormationPreset[] = [
  {
    id: "11",
    label: "11 personnel",
    unit: "offense",
    canvasWidth: 1360,
    canvasHeight: 690,
    slots: [
      { id: "wr-1", label: "WR1", position: "WR", x: 6, y: 18 },
      { id: "wr-3", label: "WR3", position: "WR", x: 16, y: 30 },
      { id: "lt", label: "LT", position: "LT", x: 31, y: 18 },
      { id: "lg", label: "LG", position: "LG", x: 40, y: 18 },
      { id: "c", label: "C", position: "C", x: 49, y: 18 },
      { id: "rg", label: "RG", position: "RG", x: 58, y: 18 },
      { id: "rt", label: "RT", position: "RT", x: 67, y: 18 },
      { id: "te-1", label: "TE1", position: "TE", x: 76, y: 30 },
      { id: "wr-2", label: "WR2", position: "WR", x: 93, y: 18 },
      { id: "qb", label: "QB", position: "QB", x: 49, y: 52 },
      { id: "rb-1", label: "RB1", position: "RB", x: 56, y: 75 }
    ]
  },
  {
    id: "12",
    label: "12 personnel",
    unit: "offense",
    canvasWidth: 1360,
    canvasHeight: 710,
    slots: [
      { id: "wr-1", label: "WR1", position: "WR", x: 7, y: 20 },
      { id: "lt", label: "LT", position: "LT", x: 31, y: 18 },
      { id: "lg", label: "LG", position: "LG", x: 40, y: 18 },
      { id: "c", label: "C", position: "C", x: 49, y: 18 },
      { id: "rg", label: "RG", position: "RG", x: 58, y: 18 },
      { id: "rt", label: "RT", position: "RT", x: 67, y: 18 },
      { id: "te-1", label: "TE1", position: "TE", x: 76, y: 26 },
      { id: "te-2", label: "TE2", position: "TE", x: 84, y: 36 },
      { id: "wr-2", label: "WR2", position: "WR", x: 93, y: 20 },
      { id: "qb", label: "QB", position: "QB", x: 49, y: 52 },
      { id: "rb-1", label: "RB1", position: "RB", x: 56, y: 75 }
    ]
  },
  {
    id: "21",
    label: "21 personnel",
    unit: "offense",
    canvasWidth: 1360,
    canvasHeight: 710,
    slots: [
      { id: "wr-1", label: "WR1", position: "WR", x: 7, y: 20 },
      { id: "lt", label: "LT", position: "LT", x: 31, y: 18 },
      { id: "lg", label: "LG", position: "LG", x: 40, y: 18 },
      { id: "c", label: "C", position: "C", x: 49, y: 18 },
      { id: "rg", label: "RG", position: "RG", x: 58, y: 18 },
      { id: "rt", label: "RT", position: "RT", x: 67, y: 18 },
      { id: "te-1", label: "TE1", position: "TE", x: 76, y: 30 },
      { id: "wr-2", label: "WR2", position: "WR", x: 93, y: 20 },
      { id: "qb", label: "QB", position: "QB", x: 49, y: 52 },
      { id: "rb-1", label: "RB1", position: "RB", x: 54, y: 72 },
      { id: "rb-2", label: "RB2", position: "RB", x: 44, y: 70 }
    ]
  },
  {
    id: "10",
    label: "10 personnel",
    unit: "offense",
    canvasWidth: 1360,
    canvasHeight: 690,
    slots: [
      { id: "wr-1", label: "WR1", position: "WR", x: 6, y: 18 },
      { id: "wr-3", label: "WR3", position: "WR", x: 17, y: 31 },
      { id: "lt", label: "LT", position: "LT", x: 31, y: 18 },
      { id: "lg", label: "LG", position: "LG", x: 40, y: 18 },
      { id: "c", label: "C", position: "C", x: 49, y: 18 },
      { id: "rg", label: "RG", position: "RG", x: 58, y: 18 },
      { id: "rt", label: "RT", position: "RT", x: 67, y: 18 },
      { id: "wr-4", label: "WR4", position: "WR", x: 82, y: 31 },
      { id: "wr-2", label: "WR2", position: "WR", x: 94, y: 18 },
      { id: "qb", label: "QB", position: "QB", x: 49, y: 52 },
      { id: "rb-1", label: "RB1", position: "RB", x: 56, y: 75 }
    ]
  }
];

export const defenseFormations: FormationPreset[] = [
  {
    id: "Nickel",
    label: "Nickel",
    unit: "defense",
    canvasWidth: 1360,
    canvasHeight: 760,
    slots: [
      { id: "edge-1", label: "EDGE1", position: "EDGE", x: 27, y: 24 },
      { id: "dl-1", label: "DL1", position: "DL", x: 42, y: 22 },
      { id: "dl-2", label: "DL2", position: "DL", x: 56, y: 22 },
      { id: "edge-2", label: "EDGE2", position: "EDGE", x: 71, y: 24 },
      { id: "lb-1", label: "LB1", position: "LB", x: 42, y: 42 },
      { id: "lb-2", label: "LB2", position: "LB", x: 58, y: 42 },
      { id: "cb-1", label: "CB1", position: "CB", x: 8, y: 58 },
      { id: "cb-3", label: "CB3", position: "CB", x: 50, y: 62 },
      { id: "cb-2", label: "CB2", position: "CB", x: 92, y: 58 },
      { id: "s-1", label: "S1", position: "S", x: 37, y: 80 },
      { id: "s-2", label: "S2", position: "S", x: 63, y: 80 }
    ]
  },
  {
    id: "Base 4-3",
    label: "Base 4-3",
    unit: "defense",
    canvasWidth: 1360,
    canvasHeight: 760,
    slots: [
      { id: "edge-1", label: "EDGE1", position: "EDGE", x: 28, y: 24 },
      { id: "dl-1", label: "DL1", position: "DL", x: 42, y: 22 },
      { id: "dl-2", label: "DL2", position: "DL", x: 56, y: 22 },
      { id: "edge-2", label: "EDGE2", position: "EDGE", x: 70, y: 24 },
      { id: "lb-1", label: "LB1", position: "LB", x: 37, y: 45 },
      { id: "lb-2", label: "LB2", position: "LB", x: 50, y: 47 },
      { id: "lb-3", label: "LB3", position: "LB", x: 63, y: 45 },
      { id: "cb-1", label: "CB1", position: "CB", x: 8, y: 62 },
      { id: "cb-2", label: "CB2", position: "CB", x: 92, y: 62 },
      { id: "s-1", label: "S1", position: "S", x: 38, y: 82 },
      { id: "s-2", label: "S2", position: "S", x: 62, y: 82 }
    ]
  },
  {
    id: "Dime",
    label: "Dime",
    unit: "defense",
    canvasWidth: 1360,
    canvasHeight: 760,
    slots: [
      { id: "edge-1", label: "EDGE1", position: "EDGE", x: 28, y: 24 },
      { id: "dl-1", label: "DL1", position: "DL", x: 43, y: 22 },
      { id: "dl-2", label: "DL2", position: "DL", x: 55, y: 22 },
      { id: "edge-2", label: "EDGE2", position: "EDGE", x: 70, y: 24 },
      { id: "lb-1", label: "LB1", position: "LB", x: 50, y: 44 },
      { id: "cb-1", label: "CB1", position: "CB", x: 7, y: 58 },
      { id: "cb-3", label: "CB3", position: "CB", x: 39, y: 63 },
      { id: "cb-4", label: "CB4", position: "CB", x: 61, y: 63 },
      { id: "cb-2", label: "CB2", position: "CB", x: 93, y: 58 },
      { id: "s-1", label: "S1", position: "S", x: 37, y: 82 },
      { id: "s-2", label: "S2", position: "S", x: 63, y: 82 }
    ]
  },
  {
    id: "Goal Line",
    label: "Goal Line",
    unit: "defense",
    canvasWidth: 1360,
    canvasHeight: 750,
    slots: [
      { id: "edge-1", label: "EDGE1", position: "EDGE", x: 23, y: 24 },
      { id: "dl-1", label: "DL1", position: "DL", x: 38, y: 22 },
      { id: "dl-2", label: "DL2", position: "DL", x: 50, y: 22 },
      { id: "dl-3", label: "DL3", position: "DL", x: 62, y: 22 },
      { id: "edge-2", label: "EDGE2", position: "EDGE", x: 77, y: 24 },
      { id: "lb-1", label: "LB1", position: "LB", x: 35, y: 44 },
      { id: "lb-2", label: "LB2", position: "LB", x: 50, y: 47 },
      { id: "lb-3", label: "LB3", position: "LB", x: 65, y: 44 },
      { id: "cb-1", label: "CB1", position: "CB", x: 10, y: 60 },
      { id: "cb-2", label: "CB2", position: "CB", x: 90, y: 60 },
      { id: "s-1", label: "S1", position: "S", x: 50, y: 78 }
    ]
  }
];

export const specialTeamsFormation: FormationPreset = {
  id: "Special Teams",
  label: "Special Teams",
  unit: "special",
  canvasWidth: 760,
  canvasHeight: 260,
  slots: [
    { id: "k", label: "K", position: "K", x: 42, y: 50 },
    { id: "p", label: "P", position: "P", x: 58, y: 50 }
  ]
};

export const unitPositions: Record<DepthUnit, Position[]> = {
  offense: ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"],
  defense: ["EDGE", "DL", "LB", "CB", "S"],
  special: ["K", "P"]
};

export function isPlayableDepthStatus(player: Player): boolean {
  return player.status === "active" || player.status === "limited" || player.status === "elevated";
}

function statusSort(player: Player): number {
  if (player.status === "active" || player.status === "limited" || player.status === "elevated") return 0;
  if (player.status === "injured") return 1;
  if (player.status === "suspended") return 2;
  return 3;
}

export function isEmergencyAtDisplayPosition(player: Player, position: Position): boolean {
  return positionFitFor(player, position) < 64;
}

export function fitToneForPlayer(player: Player, position: Position): PositionFitTone {
  if (isPrimaryPosition(player, position)) return "primary";
  return isEmergencyAtDisplayPosition(player, position) ? "emergency" : "alternate";
}

export function displayEffectiveOverall(player: Player, position: Position): number {
  return effectivePlayerOverallAtPosition(player, position, { emergency: isEmergencyAtDisplayPosition(player, position) });
}

function displaySort(position: Position, rank: Map<string, number>, a: Player, b: Player): number {
  return (
    statusSort(a) - statusSort(b) ||
    (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999) ||
    displayEffectiveOverall(b, position) - displayEffectiveOverall(a, position) ||
    b.potential - a.potential ||
    a.lastName.localeCompare(b.lastName)
  );
}

export function buildDisplayDepthChart(save: GameSave, teamId: string): Record<Position, Player[]> {
  const teamPlayers = save.players.filter((player) => player.teamId === teamId && !isOnIr(player) && (!isPracticeSquadPlayer(player) || isPracticeSquadElevated(player, save.currentWeek)));
  const overrides = save.depthOverrides?.[teamId] ?? {};
  return POSITIONS.reduce(
    (acc, position) => {
      const overrideIds = overrides[position] ?? [];
      const overridePlayers = overrideIds
        .map((id) => teamPlayers.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player));
      const candidates = new Map<string, Player>();

      for (const player of teamPlayers) {
        if (player.position === position || positionFitFor(player, position) >= 64) {
          candidates.set(player.id, player);
        }
      }
      for (const player of overridePlayers) {
        candidates.set(player.id, player);
      }
      if (!candidates.size) {
        teamPlayers
          .filter((player) => player.position !== "QB" || position === "QB")
          .sort((a, b) => displayEffectiveOverall(b, position) - displayEffectiveOverall(a, position))
          .slice(0, 4)
          .forEach((player) => candidates.set(player.id, player));
      }

      const rank = new Map(overrideIds.map((id, index) => [id, index]));
      acc[position] = [...candidates.values()].sort((a, b) => displaySort(position, rank, a, b));
      return acc;
    },
    {} as Record<Position, Player[]>
  );
}

function snapShareFor(plan: SnapPlan, player: Player | undefined, position: Position): number {
  if (!player) return 0;
  return plan.byPlayer[player.id]?.find((entry) => entry.position === position)?.snapShare ?? 0;
}

function plannedPlayerFor(plan: SnapPlan, position: Position, ordinal: number, used: Set<string>): Player | undefined {
  const entry = plan.entries.find((candidate) => candidate.position === position && candidate.order === ordinal && candidate.player && !used.has(candidate.player.id));
  return entry?.player;
}

export function buildFormationAssignments(
  chart: Record<Position, Player[]>,
  plan: SnapPlan,
  slots: FormationSlot[],
  options: { showRotation: boolean; showFullDepth: boolean }
): FormationAssignment[] {
  const usedMain = new Set<string>();
  const occurrences = new Map<Position, number>();
  const slotCountByPosition = slots.reduce((map, slot) => map.set(slot.position, (map.get(slot.position) ?? 0) + 1), new Map<Position, number>());

  const assignments = slots.map((slot) => {
    const ordinal = (occurrences.get(slot.position) ?? 0) + 1;
    occurrences.set(slot.position, ordinal);
    const planned = plannedPlayerFor(plan, slot.position, ordinal, usedMain);
    const fallback = chart[slot.position].find((player) => !usedMain.has(player.id));
    const main = planned ?? fallback;
    if (main) usedMain.add(main.id);
    return {
      slot,
      ordinal,
      main,
      stack: [] as Player[],
      snapShare: snapShareFor(plan, main, slot.position),
      effectiveOverall: main ? displayEffectiveOverall(main, slot.position) : 0,
      fitTone: main ? fitToneForPlayer(main, slot.position) : "emergency"
    };
  });

  const mainIds = new Set(assignments.map((assignment) => assignment.main?.id).filter((id): id is string => Boolean(id)));
  return assignments.map((assignment) => {
    const slotCount = slotCountByPosition.get(assignment.slot.position) ?? 1;
    const extras = chart[assignment.slot.position]
      .filter((player) => !mainIds.has(player.id))
      .filter((player, index) => index % slotCount === assignment.ordinal - 1)
      .filter((player) => {
        if (options.showFullDepth) return true;
        if (!options.showRotation) return false;
        return isPlayableDepthStatus(player) && snapShareFor(plan, player, assignment.slot.position) > 0;
      });
    return {
      ...assignment,
      stack: options.showFullDepth ? extras : extras.slice(0, 3)
    };
  });
}

export function positionsForFormation(preset: FormationPreset): Position[] {
  return [...new Set(preset.slots.map((slot) => slot.position))];
}
