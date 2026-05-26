import { clamp, createRng, type Rng } from "../lib/rng";
import type { CareerEndedMedicalRecord, GameSave, InboxItem, InjurySeverity, MedicalEvent, MedicalHistoryEntry, Player, Position, RatingVector } from "../types";
import { FREE_AGENT_TEAM_ID } from "./freeAgents";
import { syncPlayerModelFromRatings } from "./playerModel";
import { calibrateOverall, calibratePotential, calculateOverallFromRatings, legacyAttributesFromRatings, ratingRegistry } from "./ratings";

type InjuryTemplate = {
  id: string;
  name: string;
  severity: InjurySeverity;
  recurrenceTag: string;
  minWeeks: number;
  maxWeeks: number;
  limitedMin: number;
  limitedMax: number;
  penalty: number;
  playThroughChance: number;
  permanentRisk: number;
  careerRisk: number;
  weight: number;
  positionBoost?: Partial<Record<Position, number>>;
};

const injuryCatalog: InjuryTemplate[] = [
  { id: "ankle-sprain", name: "Ankle sprain", severity: "minor", recurrenceTag: "lower-leg", minWeeks: 0, maxWeeks: 1, limitedMin: 1, limitedMax: 2, penalty: 4, playThroughChance: 0.48, permanentRisk: 0, careerRisk: 0, weight: 20 },
  { id: "hamstring-strain", name: "Hamstring strain", severity: "minor", recurrenceTag: "soft-tissue", minWeeks: 0, maxWeeks: 2, limitedMin: 1, limitedMax: 2, penalty: 5, playThroughChance: 0.38, permanentRisk: 0.002, careerRisk: 0, weight: 17, positionBoost: { RB: 4, WR: 4, CB: 4, S: 2 } },
  { id: "shoulder-stinger", name: "Shoulder stinger", severity: "minor", recurrenceTag: "shoulder", minWeeks: 0, maxWeeks: 1, limitedMin: 1, limitedMax: 1, penalty: 3, playThroughChance: 0.44, permanentRisk: 0.001, careerRisk: 0, weight: 12, positionBoost: { LB: 3, S: 3, RB: 2 } },
  { id: "rib-bruise", name: "Rib bruise", severity: "minor", recurrenceTag: "torso", minWeeks: 0, maxWeeks: 2, limitedMin: 1, limitedMax: 2, penalty: 5, playThroughChance: 0.4, permanentRisk: 0, careerRisk: 0, weight: 11, positionBoost: { QB: 2, RB: 2, TE: 2 } },
  { id: "concussion", name: "Concussion", severity: "moderate", recurrenceTag: "head", minWeeks: 1, maxWeeks: 3, limitedMin: 0, limitedMax: 1, penalty: 6, playThroughChance: 0.08, permanentRisk: 0.015, careerRisk: 0.0006, weight: 12, positionBoost: { QB: 2, RB: 2, WR: 2, LB: 3, S: 3 } },
  { id: "knee-sprain", name: "Knee sprain", severity: "moderate", recurrenceTag: "knee", minWeeks: 2, maxWeeks: 5, limitedMin: 1, limitedMax: 2, penalty: 7, playThroughChance: 0.18, permanentRisk: 0.02, careerRisk: 0.0002, weight: 11, positionBoost: { RB: 2, WR: 2, CB: 2, EDGE: 2 } },
  { id: "high-ankle", name: "High ankle sprain", severity: "moderate", recurrenceTag: "lower-leg", minWeeks: 3, maxWeeks: 7, limitedMin: 1, limitedMax: 2, penalty: 8, playThroughChance: 0.1, permanentRisk: 0.015, careerRisk: 0.0001, weight: 10 },
  { id: "shoulder-labrum", name: "Shoulder labrum injury", severity: "moderate", recurrenceTag: "shoulder", minWeeks: 3, maxWeeks: 8, limitedMin: 1, limitedMax: 3, penalty: 8, playThroughChance: 0.12, permanentRisk: 0.025, careerRisk: 0.0002, weight: 8, positionBoost: { QB: 4, EDGE: 2, DL: 2, LB: 2 } },
  { id: "broken-hand", name: "Broken hand", severity: "moderate", recurrenceTag: "hand", minWeeks: 2, maxWeeks: 6, limitedMin: 1, limitedMax: 2, penalty: 7, playThroughChance: 0.18, permanentRisk: 0.008, careerRisk: 0, weight: 8, positionBoost: { QB: 2, WR: 4, CB: 2 } },
  { id: "groin-strain", name: "Groin strain", severity: "moderate", recurrenceTag: "soft-tissue", minWeeks: 1, maxWeeks: 5, limitedMin: 1, limitedMax: 2, penalty: 7, playThroughChance: 0.22, permanentRisk: 0.008, careerRisk: 0, weight: 8, positionBoost: { RB: 3, WR: 3, CB: 3, S: 2 } },
  { id: "acl-tear", name: "ACL tear", severity: "major", recurrenceTag: "knee", minWeeks: 11, maxWeeks: 26, limitedMin: 2, limitedMax: 4, penalty: 11, playThroughChance: 0, permanentRisk: 0.16, careerRisk: 0.0025, weight: 3, positionBoost: { RB: 2, WR: 2, CB: 2, EDGE: 1 } },
  { id: "achilles-tear", name: "Achilles tear", severity: "major", recurrenceTag: "lower-leg", minWeeks: 14, maxWeeks: 32, limitedMin: 2, limitedMax: 5, penalty: 12, playThroughChance: 0, permanentRisk: 0.22, careerRisk: 0.004, weight: 2, positionBoost: { RB: 1, WR: 1, EDGE: 2, DL: 2 } },
  { id: "neck-injury", name: "Neck injury", severity: "catastrophic", recurrenceTag: "neck", minWeeks: 8, maxWeeks: 28, limitedMin: 2, limitedMax: 4, penalty: 12, playThroughChance: 0, permanentRisk: 0.24, careerRisk: 0.012, weight: 1, positionBoost: { LB: 1, S: 1, TE: 1 } },
  { id: "spinal-injury", name: "Spinal injury", severity: "catastrophic", recurrenceTag: "spine", minWeeks: 18, maxWeeks: 44, limitedMin: 0, limitedMax: 0, penalty: 14, playThroughChance: 0, permanentRisk: 0.35, careerRisk: 0.02, weight: 0.35, positionBoost: { LB: 0.5, S: 0.5, RB: 0.5 } }
];

const contactRisk: Record<Position, number> = {
  QB: 0.88,
  RB: 1.32,
  WR: 1.02,
  TE: 1.12,
  LT: 0.94,
  LG: 1,
  C: 1.02,
  RG: 1,
  RT: 0.94,
  EDGE: 1.14,
  DL: 1.2,
  LB: 1.24,
  CB: 0.98,
  S: 1.12,
  K: 0.22,
  P: 0.18
};

const physicalDamageKeys = ["speed", "acceleration", "agility", "changeOfDirection", "explosiveness", "strength", "stamina", "burst", "closingSpeed"] as const;
const ratingIndex = new Map<string, number>(ratingRegistry.map((rating, index) => [rating.key, index]));
const PRACTICE_INJURY_BASE_CHANCE = 0.00135;
const PRACTICE_INJURY_MIN_CHANCE = 0.00008;
const PRACTICE_INJURY_MAX_CHANCE = 0.007;

export function playerMedical(player: Pick<Player, "medical" | "makeup">): number {
  return Math.round(clamp(Number.isFinite(player.medical) ? player.medical : player.makeup?.medical ?? 72, 20, 99));
}

export function medicalRiskTier(value: number): "elite" | "good" | "normal" | "caution" | "red" {
  if (value >= 90) return "elite";
  if (value >= 80) return "good";
  if (value >= 60) return "normal";
  if (value >= 45) return "caution";
  return "red";
}

export function medicalStatusLabel(player: Player): string {
  if (player.reserveStatus === "ir") {
    if (player.irReturnDesignatedWeek) return `IR return window, through Week ${player.irPracticeWindowDeadlineWeek}`;
    if ((player.irEligibleWeek ?? 99) <= 18) return `IR, eligible Week ${player.irEligibleWeek}`;
    return "Injured reserve";
  }
  if (player.status === "injured" && player.injury) return `${player.injury.name}, ${player.injury.weeksRemaining} wk`;
  if (player.status === "limited" && player.injury) return `Limited: ${player.injury.name} (-${player.injury.ovrPenalty})`;
  if (player.status === "injured") return `${player.injuryWeeks} wk`;
  if (player.status === "limited") return "Limited";
  if (player.status === "suspended") return `${player.suspensionWeeks} wk suspension`;
  return player.status;
}

export function medicalAvailabilityPenalty(player: { status?: Player["status"]; injury?: Player["injury"] }): number {
  return player.status === "limited" ? Math.max(4, player.injury?.ovrPenalty ?? 6) : 0;
}

export function injuryRiskWeight(player: Player, trainerQuality = 60, snapLoad = 0): number {
  const medical = playerMedical(player);
  const medicalRisk = clamp(1 + (72 - medical) * 0.024, 0.48, 2.35);
  const staffEdge = clamp(1 - (trainerQuality - 60) * 0.003, 0.86, 1.12);
  const loadRisk = clamp(1 + Math.max(0, snapLoad - 0.58) * 0.68, 1, 1.36);
  const recurrence = player.injury?.recurrenceTag ? 1.04 : 1;
  const conditioning = player.body?.conditioning ?? 60;
  const flexibility = player.body?.flexibility ?? 60;
  const recovery = player.body?.recovery ?? 60;
  const bodyFatPct = player.body?.bodyFatPct ?? 16;
  const compositionRisk = clamp(1 + (bodyFatPct - 14) * 0.022 - (conditioning - 60) * 0.004 - (flexibility - 60) * 0.003, 0.82, 1.28);
  const recoveryEdge = clamp(1 - (recovery - 60) * 0.0025, 0.88, 1.08);
  return medicalRisk * staffEdge * loadRisk * compositionRisk * recoveryEdge * (contactRisk[player.position] ?? 1) * recurrence;
}

function weightedTemplate(position: Position, rng: Rng): InjuryTemplate {
  const weighted = injuryCatalog.map((template) => ({
    template,
    weight: Math.max(0.05, template.weight + (template.positionBoost?.[position] ?? 0))
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng.float(0, total);
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.template;
  }
  return injuryCatalog[0];
}

function injuryWeeks(template: InjuryTemplate, medical: number, trainerQuality: number, rng: Rng): number {
  const base = rng.int(template.minWeeks, template.maxWeeks);
  const medicalDrag = clamp((72 - medical) * 0.035, -0.45, 1.2);
  const staffHelp = clamp((trainerQuality - 60) * 0.018, -0.5, 0.8);
  return Math.max(0, Math.round(base + medicalDrag - staffHelp));
}

function permanentDeltas(template: InjuryTemplate, medical: number, rng: Rng): { overall: number; potential: number; careerEnding: boolean } {
  const poorMedical = clamp((55 - medical) / 25, 0, 1.7);
  const severeMedical = medical < 45 ? 1 + (45 - medical) / 18 : 0;
  const careerEnding = template.careerRisk > 0 && medical < 52 && rng.bool(clamp(template.careerRisk * (1 + severeMedical), 0, 0.09));
  if (careerEnding) {
    const overall = -rng.int(8, medical < 38 ? 18 : 12);
    return { overall, potential: overall - rng.int(1, 5), careerEnding };
  }
  const risk = clamp(template.permanentRisk * (1 + poorMedical), 0, 0.42);
  if (!rng.bool(risk)) return { overall: 0, potential: 0, careerEnding: false };
  const maxDrop = template.severity === "catastrophic" ? 7 : template.severity === "major" ? 5 : 2;
  const drop = rng.int(1, maxDrop);
  const largeSpike = template.severity !== "moderate" && medical < 45 && rng.bool(0.08) ? rng.int(2, 5) : 0;
  const overall = -(drop + largeSpike);
  return { overall, potential: overall - rng.int(0, 3), careerEnding: false };
}

export function buildMedicalEvent(
  save: GameSave,
  player: Player,
  rng: Rng,
  options: { week: number; source: MedicalEvent["source"]; gameId?: string; trainerQuality?: number; date?: string }
): MedicalEvent {
  const trainerQuality = options.trainerQuality ?? 60;
  const medical = playerMedical(player);
  const template = weightedTemplate(player.position, rng);
  const playThrough = rng.bool(template.playThroughChance + clamp((medical - 70) * 0.004, -0.08, 0.08));
  const limitedWeeks = rng.int(template.limitedMin, template.limitedMax);
  const weeks = playThrough ? 0 : injuryWeeks(template, medical, trainerQuality, rng);
  const deltas = permanentDeltas(template, medical, rng);
  const status: MedicalEvent["status"] = deltas.careerEnding ? "careerEnded" : weeks <= 0 ? "limited" : "injured";
  const penalty = Math.round(clamp(template.penalty + (70 - medical) * 0.035 - (trainerQuality - 60) * 0.015, 2, 16));
  const absence = status === "careerEnded" ? "career-ending" : status === "limited" ? `${Math.max(1, limitedWeeks)} limited week${limitedWeeks === 1 ? "" : "s"}` : `${weeks} week${weeks === 1 ? "" : "s"}`;
  const permanent = deltas.overall < 0 ? ` Permanent evaluation change: ${deltas.overall} OVR, ${deltas.potential} POT.` : "";
  return {
    id: `medical-${options.week}-${player.id}-${template.id}-${Math.round(rng.float(1000, 9999))}`,
    typeId: template.id,
    name: template.name,
    severity: template.severity,
    status,
    weeksRemaining: status === "injured" ? Math.max(1, weeks) : 0,
    initialWeeks: status === "injured" ? Math.max(1, weeks) : 0,
    limitedWeeksRemaining: status === "limited" ? Math.max(1, limitedWeeks) : limitedWeeks,
    ovrPenalty: penalty,
    recurrenceTag: template.recurrenceTag,
    occurredWeek: options.week,
    occurredDate: options.date,
    description: `${player.firstName} ${player.lastName} suffered a ${template.name}. Current estimate: ${absence}.${permanent}`,
    permanentOverallDelta: deltas.overall,
    permanentPotentialDelta: deltas.potential,
    careerEnding: deltas.careerEnding,
    playerId: player.id,
    teamId: player.teamId,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    medical,
    source: options.source,
    gameId: options.gameId
  };
}

export function pickInjuryCandidate(players: Player[], rng: Rng, trainerQualityByTeam: (teamId: string) => number, snapLoadByPlayer: (playerId: string) => number): Player | undefined {
  const weighted = players
    .filter((player) => player.status === "active" || player.status === "limited")
    .map((player) => ({
      player,
      weight: injuryRiskWeight(player, trainerQualityByTeam(player.teamId), snapLoadByPlayer(player.id))
    }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return undefined;
  let roll = rng.float(0, total);
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.player;
  }
  return weighted.at(-1)?.player;
}

function applyPermanentDamage(player: Player, event: MedicalEvent, rng: Rng): Player {
  if (event.permanentOverallDelta >= 0 && event.permanentPotentialDelta >= 0) return player;
  const ratings: RatingVector = [...player.ratings];
  const damage = Math.abs(event.permanentOverallDelta);
  for (const key of physicalDamageKeys) {
    const index = ratingIndex.get(key);
    if (index === undefined) continue;
    ratings[index] = calibrateOverall((ratings[index] ?? 55) - damage * rng.float(0.45, 1.25));
  }
  const calculated = calculateOverallFromRatings(player.position, ratings);
  const newOverall = Math.min(calculated, calibrateOverall(player.overall + event.permanentOverallDelta));
  const newPotential = calibratePotential(newOverall, player.potential + event.permanentPotentialDelta);
  return syncPlayerModelFromRatings({
    ...player,
    ratings,
    overall: newOverall,
    potential: newPotential,
    attributes: legacyAttributesFromRatings(player.position, ratings)
  }, `medical-damage:${player.id}`);
}

export function applyMedicalEventToPlayer(player: Player, event: MedicalEvent, seed: string): { player?: Player; careerEndedRecord?: CareerEndedMedicalRecord } {
  const rng = createRng(`${seed}:medical-damage:${event.id}`);
  const damaged = applyPermanentDamage(player, event, rng);
  if (event.careerEnding) {
    return {
      careerEndedRecord: {
        id: `career-ended-${event.id}`,
        playerId: player.id,
        playerName: event.playerName,
        position: player.position,
        teamId: player.teamId,
        collegeId: player.collegeId,
        age: player.age,
        week: event.occurredWeek,
        injuryName: event.name,
        medical: event.medical,
        overallBefore: player.overall,
        potentialBefore: player.potential,
        permanentOverallDelta: event.permanentOverallDelta,
        permanentPotentialDelta: event.permanentPotentialDelta,
        summary: `${event.playerName}'s career ended after a ${event.name}.`
      }
    };
  }
  const status = event.status === "limited" ? "limited" : "injured";
  return {
    player: {
      ...damaged,
      status,
      medical: event.medical,
      makeup: { ...damaged.makeup, medical: event.medical },
      injuryWeeks: event.weeksRemaining,
      injury: { ...event }
    }
  };
}

export function tickMedicalRecovery(player: Player): Player {
  if (!player.injury) {
    if (player.status === "injured") {
      const weeks = Math.max(0, player.injuryWeeks - 1);
      return { ...player, injuryWeeks: weeks, status: weeks === 0 ? "active" : "injured" };
    }
    return player;
  }
  if (player.status === "injured") {
    const weeks = Math.max(0, player.injury.weeksRemaining - 1);
    if (weeks > 0) {
      return { ...player, injuryWeeks: weeks, injury: { ...player.injury, weeksRemaining: weeks } };
    }
    if (player.injury.limitedWeeksRemaining > 0) {
      return {
        ...player,
        status: "limited",
        injuryWeeks: 0,
        injury: { ...player.injury, status: "limited", weeksRemaining: 0 }
      };
    }
    return { ...player, status: "active", injuryWeeks: 0, injury: undefined };
  }
  if (player.status === "limited") {
    const limitedWeeks = Math.max(0, player.injury.limitedWeeksRemaining - 1);
    if (limitedWeeks > 0) {
      return { ...player, injury: { ...player.injury, limitedWeeksRemaining: limitedWeeks } };
    }
    return { ...player, status: "active", injuryWeeks: 0, injury: undefined };
  }
  return player;
}

export function medicalInboxItem(save: GameSave, event: MedicalEvent): InboxItem {
  const selected = event.teamId === save.selectedTeamId;
  const important = event.careerEnding;
  return {
    id: `inbox-${event.id}`,
    week: event.occurredWeek,
    category: "injury",
    title: event.careerEnding ? `Career-ending injury: ${event.playerName}` : `${event.position} medical update: ${event.playerName}`,
    body: `${event.description} Depth chart will use the next eligible player automatically.`,
    priority: event.careerEnding || event.severity === "catastrophic" || event.severity === "major" ? "high" : selected ? "normal" : "low",
    read: false,
    important,
    blocking: important
  };
}

export function historyEntryForMedicalEvent(event: MedicalEvent): MedicalHistoryEntry {
  return { ...event, resolved: event.status === "limited" && event.limitedWeeksRemaining <= 1 };
}

export function applyMedicalEvents(save: GameSave, events: MedicalEvent[]): GameSave {
  if (!events.length) return save;
  const careerEnded: CareerEndedMedicalRecord[] = [];
  const byPlayer = new Map(events.map((event) => [event.playerId, event]));
  const players: Player[] = [];
  for (const player of save.players) {
    const event = byPlayer.get(player.id);
    if (!event) {
      players.push(player);
      continue;
    }
    const result = applyMedicalEventToPlayer(player, event, save.seed);
    if (result.player) players.push(result.player);
    if (result.careerEndedRecord) careerEnded.push(result.careerEndedRecord);
  }
  const selectedEvents = events.filter((event) => event.teamId === save.selectedTeamId || event.careerEnding);
  const inbox = selectedEvents.map((event) => medicalInboxItem(save, event));
  return {
    ...save,
    players,
    medicalHistory: [...events.map(historyEntryForMedicalEvent), ...(save.medicalHistory ?? [])].slice(0, 500),
    careerEndedRecords: [...careerEnded, ...(save.careerEndedRecords ?? [])],
    inbox: [...inbox, ...save.inbox]
  };
}

export function weeklyPracticeMedicalEvents(save: GameSave, trainerQualityByTeam: (teamId: string) => number = () => 60): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  for (const player of save.players) {
    if (player.teamId === FREE_AGENT_TEAM_ID) continue;
    if (player.status !== "active" && player.status !== "limited") continue;
    const rng = createRng(`${save.seed}:practice-medical:${save.currentWeek}:${player.id}`);
    const trainerQuality = trainerQualityByTeam(player.teamId);
    const risk = injuryRiskWeight(player, trainerQuality, 0.35);
    if (!rng.bool(clamp(PRACTICE_INJURY_BASE_CHANCE * risk, PRACTICE_INJURY_MIN_CHANCE, PRACTICE_INJURY_MAX_CHANCE))) continue;
    events.push(buildMedicalEvent(save, player, rng, { week: save.currentWeek, source: "practice", trainerQuality }));
  }
  return events;
}

export function dailyPracticeMedicalEvents(save: GameSave, trainerQualityByTeam: (teamId: string) => number = () => 60): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  for (const player of save.players) {
    if (player.teamId === FREE_AGENT_TEAM_ID) continue;
    if (player.status !== "active" && player.status !== "limited") continue;
    const rng = createRng(`${save.seed}:practice-medical:${save.currentDate}:${player.id}`);
    const trainerQuality = trainerQualityByTeam(player.teamId);
    const risk = injuryRiskWeight(player, trainerQuality, 0.28);
    if (!rng.bool(clamp((PRACTICE_INJURY_BASE_CHANCE / 4.2) * risk, PRACTICE_INJURY_MIN_CHANCE / 5, PRACTICE_INJURY_MAX_CHANCE / 3.5))) continue;
    events.push(buildMedicalEvent(save, player, rng, { week: save.currentWeek, date: save.currentDate, source: "practice", trainerQuality }));
  }
  return events;
}

export function normalizePlayerMedical(player: Player): Player {
  const medical = playerMedical(player);
  return {
    ...player,
    medical,
    makeup: { ...player.makeup, medical },
    injuryWeeks: player.injury?.weeksRemaining ?? player.injuryWeeks ?? 0,
    injury: player.injury
      ? {
        ...player.injury,
        weeksRemaining: Math.max(0, player.injury.weeksRemaining),
        limitedWeeksRemaining: Math.max(0, player.injury.limitedWeeksRemaining)
      }
      : undefined
  };
}

export function injuryCatalogForTests(): readonly InjuryTemplate[] {
  return injuryCatalog;
}

export function medicalTuningForTests() {
  return {
    practiceBaseChance: PRACTICE_INJURY_BASE_CHANCE,
    practiceMinChance: PRACTICE_INJURY_MIN_CHANCE,
    practiceMaxChance: PRACTICE_INJURY_MAX_CHANCE
  };
}
