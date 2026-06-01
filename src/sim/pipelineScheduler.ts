import type { GameSave, Position } from "../types";
import { annualBalanceTargets, annualCalendarEvents, annualPerformanceConstraints, annualRuntimeDebug } from "./annualRuntime";

export interface PipelinePhaseGate {
  eventId: string;
  phase: string;
  weekHint: number;
  engineEffect: string;
  hardGate: boolean;
  status: "ready" | "complete" | "pending";
}

export interface PipelineBalanceMetric {
  metric: string;
  actual: number;
  targetMean: number;
  lowerBound: number;
  upperBound: number;
  status: "within_range" | "below_range" | "above_range" | "missing";
}

export interface PipelineSchedulerDebug {
  seasonYear: number;
  phaseGates: PipelinePhaseGate[];
  balanceMetrics: PipelineBalanceMetric[];
  performanceConstraints: Array<{
    constraintId: string;
    satisfied: boolean;
    implementationRequirement: string;
    failureModeToPrevent: string;
  }>;
  runtimeCsvs: string[];
  usesYearZeroBundles: false;
}

const forbiddenFinalPositions = new Set<string>(["ATH", "ST", "OT", "IOL", "IDL"]);

export function buildPipelineSchedulerDebug(save: GameSave): PipelineSchedulerDebug {
  const events = annualCalendarEvents();
  const balanceTargets = annualBalanceTargets();
  const phaseGates = events
    .slice()
    .sort((a, b) => a.weekHint - b.weekHint || a.eventId.localeCompare(b.eventId))
    .map((event): PipelinePhaseGate => ({
      eventId: event.eventId,
      phase: event.phase,
      weekHint: event.weekHint,
      engineEffect: event.engineEffect,
      hardGate: event.hardGate,
      status: phaseGateStatus(event.eventId, save)
    }));
  return {
    seasonYear: save.seasonYear,
    phaseGates,
    balanceMetrics: buildBalanceMetrics(save, balanceTargets),
    performanceConstraints: annualPerformanceConstraints().map((constraint) => ({
      constraintId: constraint.constraintId,
      satisfied: performanceConstraintSatisfied(constraint.constraintId, save),
      implementationRequirement: constraint.implementationRequirement,
      failureModeToPrevent: constraint.failureModeToPrevent
    })),
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("calendar_events") || path.includes("performance_constraints") || path.includes("balance_targets")),
    usesYearZeroBundles: false
  };
}

function phaseGateStatus(eventId: string, save: GameSave): PipelinePhaseGate["status"] {
  if (eventId === "season_rollover") return save.collegeRoster?.lastProgression ? "complete" : "ready";
  if (eventId === "recruit_class_generation") return save.annualRecruitClass?.recruits.length ? "complete" : "ready";
  if (eventId === "spring_portal") return save.annualTransferPortal?.entries.length ? "complete" : "pending";
  if (eventId === "summer_camps") return save.annualRecruiting?.board.some((entry) => entry.visitImpact !== 0) ? "complete" : "pending";
  if (eventId === "preseason_depth_chart") return save.collegeSeasonResults?.production.some((row) => row.depthRank === 1) ? "complete" : "pending";
  if (eventId === "regular_season") return save.collegeSeasonResults?.production.length ? "complete" : "pending";
  if (eventId === "early_signing") return save.annualRecruiting?.board.some((entry) => entry.status === "signed" || entry.status === "committed") ? "complete" : "pending";
  if (eventId === "draft_declaration") return (save.collegeRoster?.lastProgression?.draftDeclarations ?? 0) > 0 ? "complete" : "pending";
  return "pending";
}

function buildBalanceMetrics(save: GameSave, targets: ReturnType<typeof annualBalanceTargets>): PipelineBalanceMetric[] {
  const metrics = new Map<string, number>();
  metrics.set("national_recruit_count", save.annualRecruitClass?.recruits.length ?? 0);
  metrics.set("five_star_count", save.annualRecruitClass?.starCounts["5"] ?? save.annualRecruitClass?.recruits.filter((recruit) => recruit.stars === 5).length ?? 0);
  metrics.set("four_star_count", save.annualRecruitClass?.starCounts["4"] ?? save.annualRecruitClass?.recruits.filter((recruit) => recruit.stars === 4).length ?? 0);
  metrics.set("fbs_roster_count_per_school", averageFbsRosterCount(save));
  metrics.set("signed_player_invalid_position_count", invalidFinalPositionCount(save));
  metrics.set("transfer_portal_entry_rate", transferEntryRate(save));
  metrics.set("draft_declared_count", save.collegeRoster?.lastProgression?.draftDeclarations ?? save.prospects.length);
  metrics.set("drafted_count", save.draftState?.history?.length ?? 0);
  return [...targets.values()].map((target) => {
    const actual = metrics.get(target.metric);
    return {
      metric: target.metric,
      actual: actual ?? 0,
      targetMean: target.targetMean,
      lowerBound: target.lowerBound,
      upperBound: target.upperBound,
      status: actual === undefined ? "missing" : actual < target.lowerBound ? "below_range" : actual > target.upperBound ? "above_range" : "within_range"
    };
  });
}

function averageFbsRosterCount(save: GameSave): number {
  const fbsSchools = save.schools.filter((school) => school.subdivision === "FBS");
  if (!fbsSchools.length) return 0;
  const players = save.collegeRoster?.players ?? [];
  const counts = fbsSchools.map((school) => players.filter((player) => player.schoolId === school.id && player.rosterStatus !== "cut" && player.rosterStatus !== "graduated" && player.rosterStatus !== "declared").length);
  return Math.round(counts.reduce((sum, count) => sum + count, 0) / counts.length);
}

function invalidFinalPositionCount(save: GameSave): number {
  const recruitInvalid = save.annualRecruitClass?.recruits.filter((recruit) => forbiddenFinalPositions.has(recruit.position)).length ?? 0;
  const collegeInvalid = save.collegeRoster?.players.filter((player) => forbiddenFinalPositions.has(player.position)).length ?? 0;
  const prospectInvalid = save.prospects.filter((prospect) => forbiddenFinalPositions.has(prospect.position as Position)).length;
  return recruitInvalid + collegeInvalid + prospectInvalid;
}

function transferEntryRate(save: GameSave): number {
  const rosterCount = Math.max(1, save.collegeRoster?.players.length ?? 0);
  return Number(((save.annualTransferPortal?.entries.length ?? 0) / rosterCount).toFixed(3));
}

function performanceConstraintSatisfied(constraintId: string, save: GameSave): boolean {
  if (constraintId === "no_main_thread_mass_daily_updates") return (save.collegeTraining?.entries.length ?? 0) <= Math.max(1, save.collegeRoster?.players.length ?? 0);
  if (constraintId === "validation_before_runtime") return annualRuntimeDebug().schemaValidatedCsvs > 0 && annualRuntimeDebug().schemaValidatedColumns > 0;
  if (constraintId === "deterministic_rng") return Boolean(save.seed && save.yearZero?.seed === save.seed);
  if (constraintId === "debug_explanations") return Boolean(save.yearZero && save.annualPipeline && save.annualRecruiting && save.draftEvaluation);
  return true;
}
