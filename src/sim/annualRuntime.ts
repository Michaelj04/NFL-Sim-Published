import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import csvSchemaRegistryText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/csv_schema_registry.csv?raw";
import deterministicRngStreamsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/deterministic_rng_streams.csv?raw";
import developmentYearlyCurvesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/development_yearly_curves.csv?raw";
import depthChartWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/depth_chart_weights.csv?raw";
import allStarEventsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/all_star_events.csv?raw";
import allstarEventEffectsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/allstar_event_effects.csv?raw";
import academicEligibilityModelText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/academic_eligibility_model.csv?raw";
import awardsImpactText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/awards_impact.csv?raw";
import balanceTargetsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/balance_targets.csv?raw";
import calendarEventsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/calendar_events.csv?raw";
import collegeProductionWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/college_production_weights.csv?raw";
import combineEventWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/combine_event_weights.csv?raw";
import competitionTranslationText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/competition_translation.csv?raw";
import draftStockComponentWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/draft_stock_component_weights.csv?raw";
import draftBoardWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/draft_board_weights.csv?raw";
import draftHitRatesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/draft_hit_rates.csv?raw";
import draftPositionValueText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/draft_position_value.csv?raw";
import injuryBaseRatesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/injury_base_rates.csv?raw";
import injuryFamilyParamsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/injury_family_params.csv?raw";
import injuryRecurrenceText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/injury_recurrence.csv?raw";
import injurySeverityDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/injury_severity_distribution.csv?raw";
import moraleModelWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/morale_model_weights.csv?raw";
import nilMarketProxiesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/nil_market_proxies.csv?raw";
import nilPlayerDemandModelText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/nil_player_demand_model.csv?raw";
import nilPositionBudgetSharesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/nil_position_budget_shares.csv?raw";
import nflScoutingTeamArchetypesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/nfl_scouting_team_archetypes.csv?raw";
import nflTeamArchetypesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/nfl_team_archetypes.csv?raw";
import pickValues257Text from "../../sports_sim_player_pipeline/data/active_runtime_csvs/pick_values_257.csv?raw";
import performanceConstraintsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/performance_constraints.csv?raw";
import positionDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/position_distribution.csv?raw";
import positionStatProfilesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/position_stat_profiles.csv?raw";
import productionFormulaParamsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/production_formula_params.csv?raw";
import promiseTypesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/promise_types.csv?raw";
import moralePromiseParamsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/morale_promise_params.csv?raw";
import proDayAdjustmentsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/pro_day_adjustments.csv?raw";
import recruitInterestWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/recruit_interest_weights.csv?raw";
import recruitingCalendarText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/recruiting_calendar.csv?raw";
import recruitingPipelineStateWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/recruiting_pipeline_state_weights.csv?raw";
import rosterPositionTargetsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/roster_position_targets.csv?raw";
import rosterTemplatesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/roster_templates.csv?raw";
import schoolClassSizeRangesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_class_size_ranges.csv?raw";
import schoolRecruitingPowerText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_recruiting_power.csv?raw";
import snapShareRulesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/snap_share_rules.csv?raw";
import starDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/star_distribution.csv?raw";
import statGenerationCurvesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/stat_generation_curves.csv?raw";
import transferDestinationWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/transfer_destination_weights.csv?raw";
import transferEntryReasonsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/transfer_entry_reasons.csv?raw";
import transferTransitionProbabilitiesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/transfer_transition_probabilities.csv?raw";
import walkOnGenerationRulesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/walk_on_generation_rules.csv?raw";
import yearlyProgressionGatesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/yearly_progression_gates.csv?raw";
import type { Position } from "../types";

interface ActiveManifest {
  activeRuntimeCsvs: string[];
}

export interface AnnualRuntimeDebug {
  loadedRuntimeCsvs: string[];
  usesYearZeroBundles: false;
  rngStreams: string[];
  recruitClassSizes: number[];
  schemaValidatedCsvs: number;
  schemaValidatedColumns: number;
}

const ANNUAL_RUNTIME_FILES = [
  "data/active_runtime_csvs/deterministic_rng_streams.csv",
  "data/active_runtime_csvs/development_yearly_curves.csv",
  "data/active_runtime_csvs/depth_chart_weights.csv",
  "data/active_runtime_csvs/all_star_events.csv",
  "data/active_runtime_csvs/allstar_event_effects.csv",
  "data/active_runtime_csvs/academic_eligibility_model.csv",
  "data/active_runtime_csvs/awards_impact.csv",
  "data/active_runtime_csvs/balance_targets.csv",
  "data/active_runtime_csvs/calendar_events.csv",
  "data/active_runtime_csvs/college_production_weights.csv",
  "data/active_runtime_csvs/combine_event_weights.csv",
  "data/active_runtime_csvs/competition_translation.csv",
  "data/active_runtime_csvs/draft_stock_component_weights.csv",
  "data/active_runtime_csvs/draft_board_weights.csv",
  "data/active_runtime_csvs/draft_hit_rates.csv",
  "data/active_runtime_csvs/draft_position_value.csv",
  "data/active_runtime_csvs/injury_base_rates.csv",
  "data/active_runtime_csvs/injury_family_params.csv",
  "data/active_runtime_csvs/injury_recurrence.csv",
  "data/active_runtime_csvs/injury_severity_distribution.csv",
  "data/active_runtime_csvs/morale_model_weights.csv",
  "data/active_runtime_csvs/nil_market_proxies.csv",
  "data/active_runtime_csvs/nil_player_demand_model.csv",
  "data/active_runtime_csvs/nil_position_budget_shares.csv",
  "data/active_runtime_csvs/nfl_scouting_team_archetypes.csv",
  "data/active_runtime_csvs/nfl_team_archetypes.csv",
  "data/active_runtime_csvs/pick_values_257.csv",
  "data/active_runtime_csvs/performance_constraints.csv",
  "data/active_runtime_csvs/position_distribution.csv",
  "data/active_runtime_csvs/position_stat_profiles.csv",
  "data/active_runtime_csvs/production_formula_params.csv",
  "data/active_runtime_csvs/promise_types.csv",
  "data/active_runtime_csvs/morale_promise_params.csv",
  "data/active_runtime_csvs/pro_day_adjustments.csv",
  "data/active_runtime_csvs/recruit_interest_weights.csv",
  "data/active_runtime_csvs/recruiting_calendar.csv",
  "data/active_runtime_csvs/recruiting_pipeline_state_weights.csv",
  "data/active_runtime_csvs/roster_position_targets.csv",
  "data/active_runtime_csvs/roster_templates.csv",
  "data/active_runtime_csvs/school_class_size_ranges.csv",
  "data/active_runtime_csvs/school_recruiting_power.csv",
  "data/active_runtime_csvs/snap_share_rules.csv",
  "data/active_runtime_csvs/star_distribution.csv",
  "data/active_runtime_csvs/stat_generation_curves.csv",
  "data/active_runtime_csvs/transfer_destination_weights.csv",
  "data/active_runtime_csvs/transfer_entry_reasons.csv",
  "data/active_runtime_csvs/transfer_transition_probabilities.csv",
  "data/active_runtime_csvs/walk_on_generation_rules.csv",
  "data/active_runtime_csvs/yearly_progression_gates.csv"
] as const;

const ANNUAL_RUNTIME_TEXT: Record<(typeof ANNUAL_RUNTIME_FILES)[number], string> = {
  "data/active_runtime_csvs/deterministic_rng_streams.csv": deterministicRngStreamsText,
  "data/active_runtime_csvs/development_yearly_curves.csv": developmentYearlyCurvesText,
  "data/active_runtime_csvs/depth_chart_weights.csv": depthChartWeightsText,
  "data/active_runtime_csvs/all_star_events.csv": allStarEventsText,
  "data/active_runtime_csvs/allstar_event_effects.csv": allstarEventEffectsText,
  "data/active_runtime_csvs/academic_eligibility_model.csv": academicEligibilityModelText,
  "data/active_runtime_csvs/awards_impact.csv": awardsImpactText,
  "data/active_runtime_csvs/balance_targets.csv": balanceTargetsText,
  "data/active_runtime_csvs/calendar_events.csv": calendarEventsText,
  "data/active_runtime_csvs/college_production_weights.csv": collegeProductionWeightsText,
  "data/active_runtime_csvs/combine_event_weights.csv": combineEventWeightsText,
  "data/active_runtime_csvs/competition_translation.csv": competitionTranslationText,
  "data/active_runtime_csvs/draft_stock_component_weights.csv": draftStockComponentWeightsText,
  "data/active_runtime_csvs/draft_board_weights.csv": draftBoardWeightsText,
  "data/active_runtime_csvs/draft_hit_rates.csv": draftHitRatesText,
  "data/active_runtime_csvs/draft_position_value.csv": draftPositionValueText,
  "data/active_runtime_csvs/injury_base_rates.csv": injuryBaseRatesText,
  "data/active_runtime_csvs/injury_family_params.csv": injuryFamilyParamsText,
  "data/active_runtime_csvs/injury_recurrence.csv": injuryRecurrenceText,
  "data/active_runtime_csvs/injury_severity_distribution.csv": injurySeverityDistributionText,
  "data/active_runtime_csvs/morale_model_weights.csv": moraleModelWeightsText,
  "data/active_runtime_csvs/nil_market_proxies.csv": nilMarketProxiesText,
  "data/active_runtime_csvs/nil_player_demand_model.csv": nilPlayerDemandModelText,
  "data/active_runtime_csvs/nil_position_budget_shares.csv": nilPositionBudgetSharesText,
  "data/active_runtime_csvs/nfl_scouting_team_archetypes.csv": nflScoutingTeamArchetypesText,
  "data/active_runtime_csvs/nfl_team_archetypes.csv": nflTeamArchetypesText,
  "data/active_runtime_csvs/pick_values_257.csv": pickValues257Text,
  "data/active_runtime_csvs/performance_constraints.csv": performanceConstraintsText,
  "data/active_runtime_csvs/position_distribution.csv": positionDistributionText,
  "data/active_runtime_csvs/position_stat_profiles.csv": positionStatProfilesText,
  "data/active_runtime_csvs/production_formula_params.csv": productionFormulaParamsText,
  "data/active_runtime_csvs/promise_types.csv": promiseTypesText,
  "data/active_runtime_csvs/morale_promise_params.csv": moralePromiseParamsText,
  "data/active_runtime_csvs/pro_day_adjustments.csv": proDayAdjustmentsText,
  "data/active_runtime_csvs/recruit_interest_weights.csv": recruitInterestWeightsText,
  "data/active_runtime_csvs/recruiting_calendar.csv": recruitingCalendarText,
  "data/active_runtime_csvs/recruiting_pipeline_state_weights.csv": recruitingPipelineStateWeightsText,
  "data/active_runtime_csvs/roster_position_targets.csv": rosterPositionTargetsText,
  "data/active_runtime_csvs/roster_templates.csv": rosterTemplatesText,
  "data/active_runtime_csvs/school_class_size_ranges.csv": schoolClassSizeRangesText,
  "data/active_runtime_csvs/school_recruiting_power.csv": schoolRecruitingPowerText,
  "data/active_runtime_csvs/snap_share_rules.csv": snapShareRulesText,
  "data/active_runtime_csvs/star_distribution.csv": starDistributionText,
  "data/active_runtime_csvs/stat_generation_curves.csv": statGenerationCurvesText,
  "data/active_runtime_csvs/transfer_destination_weights.csv": transferDestinationWeightsText,
  "data/active_runtime_csvs/transfer_entry_reasons.csv": transferEntryReasonsText,
  "data/active_runtime_csvs/transfer_transition_probabilities.csv": transferTransitionProbabilitiesText,
  "data/active_runtime_csvs/walk_on_generation_rules.csv": walkOnGenerationRulesText,
  "data/active_runtime_csvs/yearly_progression_gates.csv": yearlyProgressionGatesText
};

let cachedPositionWeights: Array<[Position, number]> | undefined;
let cachedDebug: AnnualRuntimeDebug | undefined;
let cachedCalendarEvents: AnnualCalendarEvent[] | undefined;
let cachedPerformanceConstraints: AnnualPerformanceConstraint[] | undefined;
let cachedBalanceTargets: Map<string, AnnualBalanceTarget> | undefined;
let cachedAwardImpacts: Map<string, AnnualAwardImpact> | undefined;
let cachedDevelopmentCurves: Map<string, AnnualDevelopmentCurve> | undefined;
let cachedProgressionGates: AnnualProgressionGates | undefined;
let cachedTransferReasons: Array<{ reason: string; weight: number; threshold: string }> | undefined;
let cachedTransferDestinationWeights: Array<{ component: string; weight: number }> | undefined;
let cachedTransferTransitionProbabilities: Map<string, number> | undefined;
let cachedRecruitingConfig: AnnualRecruitingConfig | undefined;
let cachedNilDemandWeights: Map<string, number> | undefined;
let cachedNilBudgetShares: Map<string, number> | undefined;
let cachedNilMarketProxies: Map<string, AnnualNilMarketProxy> | undefined;
let cachedAcademicEligibilityWeights: Map<string, { requiredValue: number; weight: number }> | undefined;
let cachedSchoolClassSizeRanges: Map<string, AnnualSchoolClassSizeRange> | undefined;
let cachedRosterTemplates: Map<string, AnnualRosterTemplate> | undefined;
let cachedRosterTargets: Map<Position, AnnualRosterPositionTarget> | undefined;
let cachedSnapShareRules: Map<string, AnnualSnapShareRule> | undefined;
let cachedDepthChartWeights: Map<string, AnnualDepthChartWeights> | undefined;
let cachedWalkOnRules: Map<string, AnnualWalkOnRule> | undefined;
let cachedProductionWeights: Map<string, AnnualProductionWeights> | undefined;
let cachedProductionParams: Map<string, number> | undefined;
let cachedAllStarEvents: AnnualAllStarEvent[] | undefined;
let cachedAllStarEffects: Map<string, AnnualAllStarEffect> | undefined;
let cachedCompetitionTranslations: Map<string, AnnualCompetitionTranslation> | undefined;
let cachedStatGenerationCurves: Map<string, AnnualStatGenerationCurve[]> | undefined;
let cachedPositionStatProfiles: Map<string, AnnualPositionStatProfile> | undefined;
let cachedInjuryRates: Map<string, AnnualInjuryRate> | undefined;
let cachedInjurySeverityRows: AnnualInjurySeverityRow[] | undefined;
let cachedInjuryFamilyParams: Map<string, AnnualInjuryFamilyParam> | undefined;
let cachedInjuryRecurrence: Map<string, AnnualInjuryRecurrence> | undefined;
let cachedMoraleWeights: Map<string, { weight: number; minEffect: number; maxEffect: number }> | undefined;
let cachedPromiseTypes: Map<string, AnnualPromiseType> | undefined;
let cachedPromiseParams: Map<string, AnnualPromiseParam> | undefined;
let cachedDraftStockWeights: Map<string, Map<string, number>> | undefined;
let cachedDraftBoardWeights: Map<string, AnnualDraftBoardWeights> | undefined;
let cachedDraftPositionValues: Map<string, AnnualDraftPositionValue> | undefined;
let cachedDraftHitRates: Map<string, AnnualDraftHitRate> | undefined;
let cachedNflTeamArchetypes: Map<string, AnnualNflTeamArchetype> | undefined;
let cachedNflScoutingArchetypes: Map<string, AnnualNflScoutingArchetype> | undefined;
let cachedPickValues: Map<number, AnnualPickValue> | undefined;
let cachedCombineWeights: Map<string, number> | undefined;
let cachedProDayAdjustment: AnnualProDayAdjustment | undefined;
let cachedValidationSummary: { csvs: number; columns: number } | undefined;

export interface AnnualDevelopmentCurve {
  positionGroup: string;
  yearGains: [number, number, number, number];
  playingTimeWeight: number;
  redshirtWeight: number;
}

export interface AnnualCalendarEvent {
  eventId: string;
  phase: string;
  month: number;
  dayStart: number;
  dayEnd: number;
  weekHint: number;
  appliesTo: string;
  hardGate: boolean;
  description: string;
  engineEffect: string;
}

export interface AnnualPerformanceConstraint {
  constraintId: string;
  hardRule: string;
  thresholdOrTarget: string;
  implementationRequirement: string;
  failureModeToPrevent: string;
}

export interface AnnualBalanceTarget {
  metric: string;
  targetMean: number;
  lowerBound: number;
  upperBound: number;
  notes: string;
}

export interface AnnualAwardImpact {
  award: string;
  awardGroup: string;
  draftBoardBonus: number;
  nilBonusPct: number;
  mediaBonus: number;
}

export interface AnnualProgressionGates {
  defaultMaxGain: number;
  upperclassMaxGain: number;
  injuryRegressionMaxGain: number;
  breakoutExceptionAllowed: boolean;
}

export interface AnnualRecruitingConfig {
  interestWeights: Array<{ component: string; weight: number; minEffect: number; maxEffect: number }>;
  pipelineWeights: Array<{ pipelineType: "primary" | "secondary" | "national"; sameStateBonus: number; regionalBonus: number; nationalPenalty: number }>;
  calendar: Array<{ week: string; phase: string; commitmentPressure: number; visitBonus: number }>;
  schoolPower: Map<string, { recruitingPower: number; blueChipAccess: number; regionalPull: number; nationalPull: number; relationshipFloor: number }>;
}

export interface AnnualNilMarketProxy {
  schoolId: string;
  tier: string;
  nilProxyScore: number;
  footballNilPoolMeanUsd: number;
  retentionPoolPct: number;
  hsPoolPct: number;
  portalPoolPct: number;
}

export interface AnnualSchoolClassSizeRange {
  subdivisionLevel: string;
  minSignings: number;
  targetSignings: number;
  maxSignings: number;
  walkonTarget: number;
}

export interface AnnualRosterTemplate {
  templateId: string;
  subdivisionLevels: string[];
  rosterSize: number;
  scholarshipLimit: number;
  walkonSoftCap: number;
}

export interface AnnualRosterPositionTarget {
  position: Position;
  targetCount: number;
  minCount: number;
  maxCount: number;
}

export interface AnnualSnapShareRule {
  positionGroup: string;
  starterShare: number;
  rotationDepth: number;
  fatigueSensitivity: number;
  blowoutBackupShare: number;
}

export interface AnnualDepthChartWeights {
  positionGroup: string;
  overall: number;
  experience: number;
  recentForm: number;
  promisePressure: number;
  injuryReadiness: number;
}

export interface AnnualWalkOnRule {
  subdivisionLevel: string;
  qualityMean: number;
  qualitySigma: number;
  preferredLocalPct: number;
  maxStars: number;
}

export interface AnnualProductionWeights {
  positionGroup: string;
  overallWeight: number;
  snapShareWeight: number;
  schemeUsageWeight: number;
  teamQualityWeight: number;
  randomnessWeight: number;
}

export interface AnnualAllStarEvent {
  eventId: string;
  eventName: string;
  eligibleClasses: string[];
  targetInvites: number;
  levelFocus: string;
  baseScoutingConfidenceGain: number;
  maxDraftDelta: number;
  smallSchoolValidationBonus: number;
}

export interface AnnualAllStarEffect {
  event: string;
  inviteBonus: number;
  practiceWinnerBonus: number;
  gameMvpBonus: number;
  draftFloorRaise: number;
}

export interface AnnualCompetitionTranslation {
  competitionTier: string;
  statMultPass: number;
  statMultRush: number;
  statMultDefense: number;
  draftEvalMult: number;
  nilVisibilityMult: number;
}

export interface AnnualStatGenerationCurve {
  statCurveId: string;
  positionGroup: string;
  basePer100Snaps: number;
  productionMult: number;
  randomSigma: number;
}

export interface AnnualPositionStatProfile {
  positionGroup: string;
  primaryStats: string[];
  volumeDriver: string;
  efficiencyDriver: string;
}

export interface AnnualInjuryRate {
  eventType: string;
  positionGroup: string;
  baseDailyRisk: number;
  loadSensitivity: number;
  repeatInjuryMult: number;
}

export interface AnnualInjurySeverityRow {
  injuryFamily: string;
  severity: string;
  probability: number;
  minDays: number;
  maxDays: number;
  seasonEndingProb: number;
}

export interface AnnualInjuryFamilyParam {
  injuryFamily: string;
  baseRecurrencePct: number;
  gamesMissedMean: number;
  permSpeedPenalty: number;
  permStrengthPenalty: number;
  permAwarenessPenalty: number;
  durabilityPenalty: number;
  draftMedicalPenalty: number;
  positionSensitivity: string[];
}

export interface AnnualInjuryRecurrence {
  injuryFamily: string;
  recurrenceMult: number;
  permanentAthleticLossChance: number;
  potentialLossMin: number;
  potentialLossMax: number;
  positionSensitivity: string[];
  recoveryBankMult: number;
  draftMedicalPenaltyMin: number;
  draftMedicalPenaltyMax: number;
}

export interface AnnualProDayAdjustment {
  bias: number;
  maxPositiveDelta: number;
  maxNegativeDelta: number;
  confidencePenalty: number;
}

export interface AnnualPromiseType {
  promiseType: string;
  fulfillmentRule: string;
  targetValue: number;
  evaluationWindow: string;
  brokenSeverity: number;
  moraleImpact: number;
  portalImpact: number;
}

export interface AnnualPromiseParam {
  driver: string;
  weight: number;
  goodThreshold: number;
  badThreshold: number;
  transferTriggerBonus: number;
}

export interface AnnualDraftBoardWeights {
  positionGroup: string;
  filmProdW: number;
  athleticW: number;
  ageW: number;
  medicalW: number;
  competitionW: number;
  allstarW: number;
  characterW: number;
}

export interface AnnualDraftPositionValue {
  positionGroup: string;
  draftPositionValue: number;
  round1Bonus: number;
  day3Discount: number;
}

export interface AnnualDraftHitRate {
  starBucket: string;
  positionGroup: string;
  draftProb: number;
  earlyRoundProb: number;
  starterHitProb: number;
  impactHitProb: number;
}

export interface AnnualNflTeamArchetype {
  teamId: string;
  archetype: string;
  weightTraits: number;
  weightProduction: number;
  weightAge: number;
  weightMedical: number;
  weightCompetition: number;
  weightAllstar: number;
  smallSchoolConfidence: number;
}

export interface AnnualNflScoutingArchetype {
  archetype: string;
  productionWeight: number;
  traitsWeight: number;
  medicalConservatism: number;
  smallSchoolConfidence: number;
  combineWeight: number;
  interviewWeight: number;
  regionalBias: number;
  riskTolerance: number;
}

export interface AnnualPickValue {
  pick: number;
  round: number;
  pickValue: number;
  internalValueDefault: number;
}

export function annualProspectPositionWeights(): Array<[Position, number]> {
  if (cachedPositionWeights) return cachedPositionWeights;
  validateAnnualRuntimeFiles();
  const rows = parseCsv(positionDistributionText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  const weightIndex = header.indexOf("spawn_pct");
  const weights = new Map<Position, number>();
  for (const row of rows.slice(1)) {
    const group = row[groupIndex];
    const weight = Number(row[weightIndex]);
    if (!Number.isFinite(weight) || weight < 0) throw new Error(`Invalid annual position spawn_pct for ${group}.`);
    for (const position of expandAnnualPositionGroup(group)) {
      weights.set(position, (weights.get(position) ?? 0) + weight / expandAnnualPositionGroup(group).length);
    }
  }
  cachedPositionWeights = [...weights.entries()].filter(([, weight]) => weight > 0);
  return cachedPositionWeights;
}

export function annualRuntimeDebug(): AnnualRuntimeDebug {
  if (cachedDebug) return cachedDebug;
  validateAnnualRuntimeFiles();
  const rngRows = parseCsv(deterministicRngStreamsText);
  const rngHeader = rngRows[0];
  const streamIndex = rngHeader.indexOf("stream_id");
  const starRows = parseCsv(starDistributionText);
  const starHeader = starRows[0];
  const classSizeIndex = starHeader.indexOf("class_size");
  cachedDebug = {
    loadedRuntimeCsvs: [...ANNUAL_RUNTIME_FILES],
    usesYearZeroBundles: false,
    rngStreams: rngRows.slice(1).map((row) => row[streamIndex]).filter(Boolean),
    recruitClassSizes: starRows.slice(1).map((row) => Number(row[classSizeIndex])).filter(Number.isFinite),
    schemaValidatedCsvs: annualRuntimeValidationSummary().csvs,
    schemaValidatedColumns: annualRuntimeValidationSummary().columns
  };
  return cachedDebug;
}

export function annualDevelopmentCurveForPosition(position: Position): AnnualDevelopmentCurve {
  if (!cachedDevelopmentCurves) cachedDevelopmentCurves = loadDevelopmentCurves();
  const group = annualPositionGroup(position);
  return cachedDevelopmentCurves.get(group) ?? cachedDevelopmentCurves.get("WR") ?? {
    positionGroup: group,
    yearGains: [4.6, 3.6, 2.6, 1.6],
    playingTimeWeight: 0.22,
    redshirtWeight: 0.12
  };
}

export function annualCalendarEvents(): AnnualCalendarEvent[] {
  if (cachedCalendarEvents) return cachedCalendarEvents;
  cachedCalendarEvents = loadCalendarEvents();
  return cachedCalendarEvents;
}

export function annualPerformanceConstraints(): AnnualPerformanceConstraint[] {
  if (cachedPerformanceConstraints) return cachedPerformanceConstraints;
  cachedPerformanceConstraints = loadPerformanceConstraints();
  return cachedPerformanceConstraints;
}

export function annualBalanceTargets(): Map<string, AnnualBalanceTarget> {
  if (cachedBalanceTargets) return cachedBalanceTargets;
  cachedBalanceTargets = loadBalanceTargets();
  return cachedBalanceTargets;
}

export function annualAwardImpact(award: string): AnnualAwardImpact {
  if (!cachedAwardImpacts) cachedAwardImpacts = loadAwardImpacts();
  return cachedAwardImpacts.get(award) ?? cachedAwardImpacts.get("all_conference_first") ?? {
    award,
    awardGroup: "conference",
    draftBoardBonus: 1,
    nilBonusPct: 0.02,
    mediaBonus: 1
  };
}

export function annualAwardImpactRows(): AnnualAwardImpact[] {
  if (!cachedAwardImpacts) cachedAwardImpacts = loadAwardImpacts();
  return [...cachedAwardImpacts.values()];
}

export function annualProgressionGates(): AnnualProgressionGates {
  if (cachedProgressionGates) return cachedProgressionGates;
  validateAnnualRuntimeFiles();
  const rows = parseCsv(yearlyProgressionGatesText);
  const header = rows[0];
  const gateIndex = header.indexOf("gate_id");
  const maxIndex = header.indexOf("max_single_year_gain");
  const breakoutIndex = header.indexOf("breakout_exception_allowed");
  let defaultMaxGain = 10;
  let upperclassMaxGain = 8;
  let injuryRegressionMaxGain = 5;
  let breakoutExceptionAllowed = true;
  for (const row of rows.slice(1)) {
    const gate = row[gateIndex];
    const maxGain = Number(row[maxIndex]);
    if (!Number.isFinite(maxGain)) continue;
    if (gate === "freshman_cap") defaultMaxGain = maxGain;
    if (gate === "upperclass_growth_cap") upperclassMaxGain = maxGain;
    if (gate === "injury_regression_gate") injuryRegressionMaxGain = maxGain;
    if (row[breakoutIndex] === "0") breakoutExceptionAllowed = false;
  }
  cachedProgressionGates = { defaultMaxGain, upperclassMaxGain, injuryRegressionMaxGain, breakoutExceptionAllowed };
  return cachedProgressionGates;
}

export function annualTransferReasons(): Array<{ reason: string; weight: number; threshold: string }> {
  if (cachedTransferReasons) return cachedTransferReasons;
  validateAnnualRuntimeFiles();
  const rows = parseCsv(transferEntryReasonsText);
  const header = rows[0];
  const reasonIndex = header.indexOf("reason");
  const weightIndex = header.indexOf("weight");
  const thresholdIndex = header.indexOf("threshold");
  cachedTransferReasons = rows.slice(1).map((row) => ({
    reason: row[reasonIndex],
    weight: Number(row[weightIndex]) || 0,
    threshold: row[thresholdIndex]
  })).filter((row) => row.reason && row.weight > 0);
  return cachedTransferReasons;
}

export function annualTransferDestinationWeights(): Array<{ component: string; weight: number }> {
  if (cachedTransferDestinationWeights) return cachedTransferDestinationWeights;
  validateAnnualRuntimeFiles();
  const rows = parseCsv(transferDestinationWeightsText);
  const header = rows[0];
  const componentIndex = header.indexOf("component");
  const weightIndex = header.indexOf("weight");
  cachedTransferDestinationWeights = rows.slice(1).map((row) => ({
    component: row[componentIndex],
    weight: Number(row[weightIndex]) || 0
  })).filter((row) => row.component && row.weight > 0);
  return cachedTransferDestinationWeights;
}

export function annualTransferTransitionProbability(fromLevel: string, toLevel: string): number {
  if (!cachedTransferTransitionProbabilities) cachedTransferTransitionProbabilities = loadTransferTransitionProbabilities();
  return cachedTransferTransitionProbabilities.get(`${fromLevel}:${toLevel}`) ?? 0.18;
}

export function annualRecruitingConfig(): AnnualRecruitingConfig {
  if (cachedRecruitingConfig) return cachedRecruitingConfig;
  validateAnnualRuntimeFiles();
  const interestRows = parseCsv(recruitInterestWeightsText);
  const interestHeader = interestRows[0];
  const componentIndex = interestHeader.indexOf("component");
  const weightIndex = interestHeader.indexOf("weight");
  const minIndex = interestHeader.indexOf("min_effect");
  const maxIndex = interestHeader.indexOf("max_effect");
  const pipelineRows = parseCsv(recruitingPipelineStateWeightsText);
  const pipelineHeader = pipelineRows[0];
  const pipelineTypeIndex = pipelineHeader.indexOf("pipeline_type");
  const sameStateIndex = pipelineHeader.indexOf("same_state_bonus");
  const regionalIndex = pipelineHeader.indexOf("regional_bonus");
  const nationalPenaltyIndex = pipelineHeader.indexOf("national_penalty");
  const calendarRows = parseCsv(recruitingCalendarText);
  const calendarHeader = calendarRows[0];
  const weekIndex = calendarHeader.indexOf("week");
  const phaseIndex = calendarHeader.indexOf("phase");
  const pressureIndex = calendarHeader.indexOf("commitment_pressure");
  const visitIndex = calendarHeader.indexOf("visit_bonus");
  const powerRows = parseCsv(schoolRecruitingPowerText);
  const powerHeader = powerRows[0];
  const schoolIndex = powerHeader.indexOf("school_id");
  const recruitingPowerIndex = powerHeader.indexOf("recruiting_power");
  const blueChipIndex = powerHeader.indexOf("blue_chip_access");
  const regionalPullIndex = powerHeader.indexOf("regional_pull");
  const nationalPullIndex = powerHeader.indexOf("national_pull");
  const relationshipIndex = powerHeader.indexOf("relationship_floor");
  cachedRecruitingConfig = {
    interestWeights: interestRows.slice(1).map((row) => ({
      component: row[componentIndex],
      weight: Number(row[weightIndex]) || 0,
      minEffect: Number(row[minIndex]) || 0,
      maxEffect: Number(row[maxIndex]) || 0
    })).filter((row) => row.component && row.weight > 0),
    pipelineWeights: pipelineRows.slice(1).map((row) => ({
      pipelineType: row[pipelineTypeIndex] as "primary" | "secondary" | "national",
      sameStateBonus: Number(row[sameStateIndex]) || 0,
      regionalBonus: Number(row[regionalIndex]) || 0,
      nationalPenalty: Number(row[nationalPenaltyIndex]) || 0
    })).filter((row) => row.pipelineType === "primary" || row.pipelineType === "secondary" || row.pipelineType === "national"),
    calendar: calendarRows.slice(1).map((row) => ({
      week: row[weekIndex],
      phase: row[phaseIndex],
      commitmentPressure: Number(row[pressureIndex]) || 0,
      visitBonus: Number(row[visitIndex]) || 0
    })).filter((row) => row.phase),
    schoolPower: new Map(powerRows.slice(1).map((row) => [row[schoolIndex], {
      recruitingPower: Number(row[recruitingPowerIndex]) || 50,
      blueChipAccess: Number(row[blueChipIndex]) || 40,
      regionalPull: Number(row[regionalPullIndex]) || 50,
      nationalPull: Number(row[nationalPullIndex]) || 35,
      relationshipFloor: Number(row[relationshipIndex]) || 45
    }]))
  };
  return cachedRecruitingConfig;
}

export function annualRosterPositionTargets(): Map<Position, AnnualRosterPositionTarget> {
  if (cachedRosterTargets) return cachedRosterTargets;
  validateAnnualRuntimeFiles();
  const rows = parseCsv(rosterPositionTargetsText);
  const header = rows[0];
  const positionIndex = header.indexOf("final_position");
  const targetIndex = header.indexOf("target_count");
  const minIndex = header.indexOf("min_count");
  const maxIndex = header.indexOf("max_count");
  const targets: Array<[Position, AnnualRosterPositionTarget]> = rows.slice(1).map((row) => {
    const position = row[positionIndex] as Position;
    return [position, {
      position,
      targetCount: Number(row[targetIndex]) || 0,
      minCount: Number(row[minIndex]) || 0,
      maxCount: Number(row[maxIndex]) || 0
    }] as [Position, AnnualRosterPositionTarget];
  }).filter(([, row]) => row.targetCount > 0);
  cachedRosterTargets = new Map(targets);
  return cachedRosterTargets;
}

export function annualNilMarketProxy(schoolId: string): AnnualNilMarketProxy | undefined {
  if (!cachedNilMarketProxies) cachedNilMarketProxies = loadNilMarketProxies();
  return cachedNilMarketProxies.get(schoolId);
}

export function annualNilDemandWeight(component: string): number {
  if (!cachedNilDemandWeights) cachedNilDemandWeights = loadNilDemandWeights();
  return cachedNilDemandWeights.get(component) ?? 0;
}

export function annualNilBudgetShare(position: Position): number {
  if (!cachedNilBudgetShares) cachedNilBudgetShares = loadNilBudgetShares();
  const group = annualPositionGroup(position);
  return cachedNilBudgetShares.get(group) ?? cachedNilBudgetShares.get(position) ?? cachedNilBudgetShares.get("DEFAULT") ?? 0.06;
}

export function annualAcademicEligibilityWeight(component: string): { requiredValue: number; weight: number } {
  if (!cachedAcademicEligibilityWeights) cachedAcademicEligibilityWeights = loadAcademicEligibilityWeights();
  return cachedAcademicEligibilityWeights.get(component) ?? { requiredValue: 0, weight: 0 };
}

export function annualSchoolClassSizeRange(subdivisionLevel: string): AnnualSchoolClassSizeRange {
  if (!cachedSchoolClassSizeRanges) cachedSchoolClassSizeRanges = loadSchoolClassSizeRanges();
  return cachedSchoolClassSizeRanges.get(subdivisionLevel) ?? cachedSchoolClassSizeRanges.get("FBS_G5") ?? {
    subdivisionLevel,
    minSignings: 16,
    targetSignings: 22,
    maxSignings: 28,
    walkonTarget: 10
  };
}

export function annualRosterTemplate(subdivisionLevel: string): AnnualRosterTemplate {
  if (!cachedRosterTemplates) cachedRosterTemplates = loadRosterTemplates();
  return cachedRosterTemplates.get(subdivisionLevel) ?? cachedRosterTemplates.get("FBS_G5") ?? {
    templateId: "fallback",
    subdivisionLevels: [subdivisionLevel],
    rosterSize: 85,
    scholarshipLimit: 85,
    walkonSoftCap: 25
  };
}

export function annualSnapShareRuleForPosition(position: Position): AnnualSnapShareRule {
  if (!cachedSnapShareRules) cachedSnapShareRules = loadSnapShareRules();
  const group = annualPositionGroup(position);
  return cachedSnapShareRules.get(group) ?? cachedSnapShareRules.get(position) ?? {
    positionGroup: group,
    starterShare: 0.7,
    rotationDepth: 3,
    fatigueSensitivity: 0.12,
    blowoutBackupShare: 0.18
  };
}

export function annualDepthChartWeightsForPosition(position: Position): AnnualDepthChartWeights {
  if (!cachedDepthChartWeights) cachedDepthChartWeights = loadDepthChartWeights();
  const group = annualPositionGroup(position);
  return cachedDepthChartWeights.get(group) ?? cachedDepthChartWeights.get(position) ?? {
    positionGroup: group,
    overall: 0.42,
    experience: 0.1,
    recentForm: 0.08,
    promisePressure: 0.05,
    injuryReadiness: 0.05
  };
}

export function annualWalkOnRuleForSubdivision(subdivisionLevel: string): AnnualWalkOnRule {
  if (!cachedWalkOnRules) cachedWalkOnRules = loadWalkOnRules();
  return cachedWalkOnRules.get(subdivisionLevel) ?? cachedWalkOnRules.get("FCS_LOW") ?? {
    subdivisionLevel,
    qualityMean: 36,
    qualitySigma: 8,
    preferredLocalPct: 0.85,
    maxStars: 2
  };
}

export function annualProductionWeightsForPosition(position: Position): AnnualProductionWeights {
  if (!cachedProductionWeights) cachedProductionWeights = loadProductionWeights();
  const group = annualPositionGroup(position);
  return cachedProductionWeights.get(group) ?? cachedProductionWeights.get(position) ?? {
    positionGroup: group,
    overallWeight: 0.32,
    snapShareWeight: 0.2,
    schemeUsageWeight: 0.14,
    teamQualityWeight: 0.08,
    randomnessWeight: 0.08
  };
}

export function annualProductionParam(name: string, fallback: number): number {
  if (!cachedProductionParams) cachedProductionParams = loadProductionParams();
  return cachedProductionParams.get(name) ?? fallback;
}

export function annualAllStarEvents(): AnnualAllStarEvent[] {
  if (cachedAllStarEvents) return cachedAllStarEvents;
  cachedAllStarEvents = loadAllStarEvents();
  return cachedAllStarEvents;
}

export function annualAllStarEffect(eventId: string): AnnualAllStarEffect {
  if (!cachedAllStarEffects) cachedAllStarEffects = loadAllStarEffects();
  return cachedAllStarEffects.get(eventId) ?? {
    event: eventId,
    inviteBonus: 1.5,
    practiceWinnerBonus: 2,
    gameMvpBonus: 3,
    draftFloorRaise: 0.25
  };
}

export function annualCompetitionTranslation(competitionTier: string): AnnualCompetitionTranslation {
  if (!cachedCompetitionTranslations) cachedCompetitionTranslations = loadCompetitionTranslations();
  return cachedCompetitionTranslations.get(competitionTier) ?? cachedCompetitionTranslations.get("OTHER") ?? {
    competitionTier,
    statMultPass: 0.55,
    statMultRush: 0.56,
    statMultDefense: 0.56,
    draftEvalMult: 0.5,
    nilVisibilityMult: 0.2
  };
}

export function annualStatGenerationCurvesForPosition(position: Position): AnnualStatGenerationCurve[] {
  if (!cachedStatGenerationCurves) cachedStatGenerationCurves = loadStatGenerationCurves();
  const group = annualPositionGroup(position);
  return cachedStatGenerationCurves.get(group) ?? cachedStatGenerationCurves.get(position) ?? [];
}

export function annualPositionStatProfileForPosition(position: Position): AnnualPositionStatProfile | undefined {
  if (!cachedPositionStatProfiles) cachedPositionStatProfiles = loadPositionStatProfiles();
  const group = annualPositionGroup(position);
  return cachedPositionStatProfiles.get(group) ?? cachedPositionStatProfiles.get(position);
}

export function annualInjuryRateForPosition(position: Position, eventType = "game"): AnnualInjuryRate {
  if (!cachedInjuryRates) cachedInjuryRates = loadInjuryRates();
  const group = annualPositionGroup(position);
  return cachedInjuryRates.get(`${eventType}:${group}`) ?? cachedInjuryRates.get(`training:${group}`) ?? {
    eventType,
    positionGroup: group,
    baseDailyRisk: 0.0008,
    loadSensitivity: 0.18,
    repeatInjuryMult: 1.15
  };
}

export function annualInjurySeverityRows(): AnnualInjurySeverityRow[] {
  if (cachedInjurySeverityRows) return cachedInjurySeverityRows;
  validateAnnualRuntimeFiles();
  const rows = parseCsv(injurySeverityDistributionText);
  const header = rows[0];
  cachedInjurySeverityRows = rows.slice(1).map((row) => ({
    injuryFamily: row[header.indexOf("injury_family")],
    severity: row[header.indexOf("severity")],
    probability: Number(row[header.indexOf("probability")]) || 0,
    minDays: Number(row[header.indexOf("min_days")]) || 1,
    maxDays: Number(row[header.indexOf("max_days")]) || 14,
    seasonEndingProb: Number(row[header.indexOf("season_ending_prob")]) || 0
  })).filter((row) => row.injuryFamily && row.probability > 0);
  return cachedInjurySeverityRows;
}

export function annualInjuryFamilyParam(injuryFamily: string): AnnualInjuryFamilyParam {
  if (!cachedInjuryFamilyParams) cachedInjuryFamilyParams = loadInjuryFamilyParams();
  return cachedInjuryFamilyParams.get(injuryFamily) ?? cachedInjuryFamilyParams.get("generic_major") ?? {
    injuryFamily,
    baseRecurrencePct: 0.1,
    gamesMissedMean: 6,
    permSpeedPenalty: 1,
    permStrengthPenalty: 1,
    permAwarenessPenalty: 0,
    durabilityPenalty: 5,
    draftMedicalPenalty: 7,
    positionSensitivity: ["ALL"]
  };
}

export function annualInjuryRecurrence(injuryFamily: string): AnnualInjuryRecurrence {
  if (!cachedInjuryRecurrence) cachedInjuryRecurrence = loadInjuryRecurrence();
  return cachedInjuryRecurrence.get(injuryFamily) ?? cachedInjuryRecurrence.get("generic_major") ?? {
    injuryFamily,
    recurrenceMult: 1.2,
    permanentAthleticLossChance: 0.2,
    potentialLossMin: 1,
    potentialLossMax: 4,
    positionSensitivity: ["ALL"],
    recoveryBankMult: 0.7,
    draftMedicalPenaltyMin: 4,
    draftMedicalPenaltyMax: 12
  };
}

export function annualMoraleWeight(component: string): { weight: number; minEffect: number; maxEffect: number } {
  if (!cachedMoraleWeights) cachedMoraleWeights = loadMoraleWeights();
  return cachedMoraleWeights.get(component) ?? { weight: 0.1, minEffect: -8, maxEffect: 8 };
}

export function annualPromiseType(promiseType: string | undefined): AnnualPromiseType | undefined {
  if (!promiseType) return undefined;
  if (!cachedPromiseTypes) cachedPromiseTypes = loadPromiseTypes();
  return cachedPromiseTypes.get(promiseType);
}

export function annualPromiseParams(driver: string): AnnualPromiseParam {
  if (!cachedPromiseParams) cachedPromiseParams = loadPromiseParams();
  return cachedPromiseParams.get(driver) ?? {
    driver,
    weight: 0.12,
    goodThreshold: 1,
    badThreshold: 0,
    transferTriggerBonus: 0.1
  };
}

export function annualDraftStockWeight(position: Position, component: string, fallback: number): number {
  if (!cachedDraftStockWeights) cachedDraftStockWeights = loadDraftStockWeights();
  const group = annualPositionGroup(position);
  return cachedDraftStockWeights.get(group)?.get(component) ?? fallback;
}

export function annualDraftBoardWeightsForPosition(position: Position): AnnualDraftBoardWeights {
  if (!cachedDraftBoardWeights) cachedDraftBoardWeights = loadDraftBoardWeights();
  const group = annualPositionGroup(position);
  return cachedDraftBoardWeights.get(group) ?? cachedDraftBoardWeights.get("DEFAULT") ?? {
    positionGroup: group,
    filmProdW: 0.3,
    athleticW: 0.16,
    ageW: 0.09,
    medicalW: 0.11,
    competitionW: 0.12,
    allstarW: 0.08,
    characterW: 0.14
  };
}

export function annualDraftPositionValue(position: Position): AnnualDraftPositionValue {
  if (!cachedDraftPositionValues) cachedDraftPositionValues = loadDraftPositionValues();
  const group = annualPositionGroup(position);
  return cachedDraftPositionValues.get(group) ?? cachedDraftPositionValues.get(position) ?? cachedDraftPositionValues.get("DEFAULT") ?? {
    positionGroup: group,
    draftPositionValue: 1,
    round1Bonus: 0,
    day3Discount: 0.06
  };
}

export function annualDraftHitRate(starBucket: string | number, position: Position): AnnualDraftHitRate {
  if (!cachedDraftHitRates) cachedDraftHitRates = loadDraftHitRates();
  const group = annualPositionGroup(position);
  return cachedDraftHitRates.get(`${starBucket}:${group}`) ?? cachedDraftHitRates.get(`${starBucket}:DEFAULT`) ?? cachedDraftHitRates.get(`3:DEFAULT`) ?? {
    starBucket: String(starBucket),
    positionGroup: group,
    draftProb: 0.18,
    earlyRoundProb: 0.06,
    starterHitProb: 0.08,
    impactHitProb: 0.03
  };
}

export function annualNflTeamArchetype(teamId: string): AnnualNflTeamArchetype | undefined {
  if (!cachedNflTeamArchetypes) cachedNflTeamArchetypes = loadNflTeamArchetypes();
  return cachedNflTeamArchetypes.get(teamId.toUpperCase());
}

export function annualNflScoutingArchetype(archetype: string): AnnualNflScoutingArchetype {
  if (!cachedNflScoutingArchetypes) cachedNflScoutingArchetypes = loadNflScoutingArchetypes();
  return cachedNflScoutingArchetypes.get(archetype) ?? cachedNflScoutingArchetypes.get("balanced") ?? {
    archetype,
    productionWeight: 0.3,
    traitsWeight: 0.28,
    medicalConservatism: 0.55,
    smallSchoolConfidence: 0.5,
    combineWeight: 0.14,
    interviewWeight: 0.12,
    regionalBias: 0,
    riskTolerance: 0.5
  };
}

export function annualPickValue(pick: number): AnnualPickValue {
  if (!cachedPickValues) cachedPickValues = loadPickValues();
  return cachedPickValues.get(pick) ?? {
    pick,
    round: pick <= 32 ? 1 : pick <= 64 ? 2 : pick <= 100 ? 3 : pick <= 135 ? 4 : pick <= 170 ? 5 : pick <= 220 ? 6 : 7,
    pickValue: Math.max(1, 3000 / Math.max(1, pick)),
    internalValueDefault: Math.max(1, 3000 / Math.max(1, pick))
  };
}

export function annualCombineAthleticWeight(position: Position): number {
  if (!cachedCombineWeights) cachedCombineWeights = loadCombineWeights();
  return cachedCombineWeights.get(annualPositionGroup(position)) ?? 0.82;
}

export function annualProDayAdjustment(): AnnualProDayAdjustment {
  if (cachedProDayAdjustment) return cachedProDayAdjustment;
  validateAnnualRuntimeFiles();
  const rows = parseCsv(proDayAdjustmentsText);
  const header = rows[0];
  const biasIndex = header.indexOf("pro_day_bias");
  const posIndex = header.indexOf("max_positive_delta");
  const negIndex = header.indexOf("max_negative_delta");
  const confidenceIndex = header.indexOf("confidence_penalty");
  const parsed = rows.slice(1).map((row) => ({
    bias: Number(row[biasIndex]) || 0,
    maxPositiveDelta: Number(row[posIndex]) || 0,
    maxNegativeDelta: Number(row[negIndex]) || 0,
    confidencePenalty: Number(row[confidenceIndex]) || 0
  }));
  cachedProDayAdjustment = parsed.reduce((sum, row) => ({
    bias: sum.bias + row.bias / Math.max(1, parsed.length),
    maxPositiveDelta: sum.maxPositiveDelta + row.maxPositiveDelta / Math.max(1, parsed.length),
    maxNegativeDelta: sum.maxNegativeDelta + row.maxNegativeDelta / Math.max(1, parsed.length),
    confidencePenalty: sum.confidencePenalty + row.confidencePenalty / Math.max(1, parsed.length)
  }), { bias: 0, maxPositiveDelta: 0, maxNegativeDelta: 0, confidencePenalty: 0 });
  return cachedProDayAdjustment;
}

function validateAnnualRuntimeFiles(): void {
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const active = new Set(manifest.activeRuntimeCsvs);
  const missing = ANNUAL_RUNTIME_FILES.filter((path) => !active.has(path));
  if (missing.length > 0) throw new Error(`Annual runtime CSV(s) missing from active manifest: ${missing.join(", ")}`);
  const accidentalYearZero = ANNUAL_RUNTIME_FILES.filter((path) => path.includes("/year_zero/"));
  if (accidentalYearZero.length > 0) throw new Error(`Annual runtime loader cannot consume Year Zero bundles: ${accidentalYearZero.join(", ")}`);
  annualRuntimeValidationSummary();
}

function annualRuntimeValidationSummary(): { csvs: number; columns: number } {
  if (cachedValidationSummary) return cachedValidationSummary;
  const registryRows = parseCsv(csvSchemaRegistryText);
  const registryHeader = registryRows[0] ?? [];
  const csvIndex = registryHeader.indexOf("csv_name");
  const columnIndex = registryHeader.indexOf("column_name");
  const typeIndex = registryHeader.indexOf("type");
  const requiredIndex = registryHeader.indexOf("required");
  const minIndex = registryHeader.indexOf("min");
  const maxIndex = registryHeader.indexOf("max");
  const allowedIndex = registryHeader.indexOf("allowed_values");
  if ([csvIndex, columnIndex, typeIndex, requiredIndex].some((index) => index < 0)) {
    throw new Error("csv_schema_registry.csv missing required schema columns.");
  }
  let validatedColumns = 0;
  for (const path of ANNUAL_RUNTIME_FILES) {
    const basename = path.split("/").pop() ?? path;
    const rules = registryRows.slice(1).filter((row) => row[csvIndex] === basename);
    if (rules.length === 0) throw new Error(`No schema registry rows for ${basename}.`);
    const rows = parseCsv(ANNUAL_RUNTIME_TEXT[path]);
    const header = rows[0] ?? [];
    for (const rule of rules) {
      const columnName = rule[columnIndex];
      const index = header.indexOf(columnName);
      if (rule[requiredIndex] === "1" && index < 0) throw new Error(`${basename} missing required column ${columnName}.`);
      if (index < 0) continue;
      validatedColumns += 1;
      for (const row of rows.slice(1)) {
        const value = row[index] ?? "";
        if (rule[requiredIndex] === "1" && value.trim() === "") throw new Error(`${basename}.${columnName} has blank required value.`);
        if (value.trim() === "") continue;
        validateSchemaValue(basename, columnName, value, rule[typeIndex], rule[minIndex], rule[maxIndex], rule[allowedIndex]);
      }
    }
  }
  cachedValidationSummary = { csvs: ANNUAL_RUNTIME_FILES.length, columns: validatedColumns };
  return cachedValidationSummary;
}

function validateSchemaValue(csvName: string, columnName: string, value: string, type: string, min: string, max: string, allowedValues: string): void {
  if (type === "number" || type === "integer") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error(`${csvName}.${columnName} expected ${type}, got ${value}.`);
    if (type === "integer" && !Number.isInteger(numeric)) throw new Error(`${csvName}.${columnName} expected integer, got ${value}.`);
    if (min && numeric < Number(min)) throw new Error(`${csvName}.${columnName} below min ${min}: ${value}.`);
    if (max && numeric > Number(max)) throw new Error(`${csvName}.${columnName} above max ${max}: ${value}.`);
  }
  if (type === "boolean" && !["0", "1", "true", "false", "yes", "no"].includes(value.toLowerCase())) {
    throw new Error(`${csvName}.${columnName} expected boolean, got ${value}.`);
  }
  if (allowedValues) {
    const allowed = allowedValues.split("|").filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(value)) throw new Error(`${csvName}.${columnName} invalid enum value ${value}.`);
  }
}

function expandAnnualPositionGroup(group: string): Position[] {
  if (group === "OT") return ["LT", "RT"];
  if (group === "IOL") return ["LG", "C", "RG"];
  if (group === "IDL") return ["DL"];
  if (group === "ST") return ["K", "P"];
  if (group === "ATH") return ["WR", "CB", "S", "RB"];
  const allowed: Position[] = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "EDGE", "DL", "LB", "CB", "S", "K", "P"];
  if (allowed.includes(group as Position)) return [group as Position];
  throw new Error(`Unknown annual position group: ${group}`);
}

function annualPositionGroup(position: Position): string {
  if (position === "LT" || position === "RT") return "OT";
  if (position === "LG" || position === "C" || position === "RG") return "IOL";
  if (position === "DL") return "IDL";
  return position;
}

function loadSnapShareRules(): Map<string, AnnualSnapShareRule> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(snapShareRulesText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  const starterIndex = header.indexOf("starter_share");
  const rotationIndex = header.indexOf("rotation_depth");
  const fatigueIndex = header.indexOf("fatigue_sensitivity");
  const blowoutIndex = header.indexOf("blowout_backup_share");
  return new Map(rows.slice(1).map((row) => [row[groupIndex], {
    positionGroup: row[groupIndex],
    starterShare: Number(row[starterIndex]) || 0.7,
    rotationDepth: Number(row[rotationIndex]) || 3,
    fatigueSensitivity: Number(row[fatigueIndex]) || 0.12,
    blowoutBackupShare: Number(row[blowoutIndex]) || 0.18
  }]));
}

function loadDepthChartWeights(): Map<string, AnnualDepthChartWeights> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(depthChartWeightsText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  return new Map(rows.slice(1).map((row) => [row[groupIndex], {
    positionGroup: row[groupIndex],
    overall: Number(row[header.indexOf("overall")]) || 0.42,
    experience: Number(row[header.indexOf("experience")]) || 0.1,
    recentForm: Number(row[header.indexOf("recent_form")]) || 0.08,
    promisePressure: Number(row[header.indexOf("promise_pressure")]) || 0.05,
    injuryReadiness: Number(row[header.indexOf("injury_readiness")]) || 0.05
  }]));
}

function loadWalkOnRules(): Map<string, AnnualWalkOnRule> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(walkOnGenerationRulesText);
  const header = rows[0];
  const levelIndex = header.indexOf("subdivision_level");
  return new Map(rows.slice(1).map((row) => [row[levelIndex], {
    subdivisionLevel: row[levelIndex],
    qualityMean: Number(row[header.indexOf("walkon_quality_mean")]) || 36,
    qualitySigma: Number(row[header.indexOf("walkon_quality_sigma")]) || 8,
    preferredLocalPct: Number(row[header.indexOf("preferred_local_pct")]) || 0.85,
    maxStars: Number(row[header.indexOf("max_stars")]) || 2
  }]));
}

function loadProductionWeights(): Map<string, AnnualProductionWeights> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(collegeProductionWeightsText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  return new Map(rows.slice(1).map((row) => [row[groupIndex], {
    positionGroup: row[groupIndex],
    overallWeight: Number(row[header.indexOf("overall_weight")]) || 0.32,
    snapShareWeight: Number(row[header.indexOf("snap_share_weight")]) || 0.2,
    schemeUsageWeight: Number(row[header.indexOf("scheme_usage_weight")]) || 0.14,
    teamQualityWeight: Number(row[header.indexOf("team_quality_weight")]) || 0.08,
    randomnessWeight: Number(row[header.indexOf("randomness_weight")]) || 0.08
  }]));
}

function loadProductionParams(): Map<string, number> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(productionFormulaParamsText);
  const header = rows[0];
  const params: Array<[string, number]> = rows.slice(1).map((row) => [
    row[header.indexOf("param")],
    Number(row[header.indexOf("value")])
  ] as [string, number]).filter(([, value]) => Number.isFinite(value));
  return new Map(params);
}

function loadAllStarEvents(): AnnualAllStarEvent[] {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(allStarEventsText);
  const header = rows[0];
  return rows.slice(1).map((row) => ({
    eventId: row[header.indexOf("event_id")],
    eventName: row[header.indexOf("event_name")],
    eligibleClasses: (row[header.indexOf("eligible_classes")] ?? "").split("|").filter(Boolean),
    targetInvites: Number(row[header.indexOf("target_invites")]) || 0,
    levelFocus: row[header.indexOf("level_focus")],
    baseScoutingConfidenceGain: Number(row[header.indexOf("base_scouting_confidence_gain")]) || 0,
    maxDraftDelta: Number(row[header.indexOf("max_draft_delta")]) || 0,
    smallSchoolValidationBonus: Number(row[header.indexOf("small_school_validation_bonus")]) || 0
  })).filter((row) => row.eventId && row.targetInvites > 0);
}

function loadAllStarEffects(): Map<string, AnnualAllStarEffect> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(allstarEventEffectsText);
  const header = rows[0];
  const eventIndex = header.indexOf("event");
  return new Map(rows.slice(1).map((row) => [row[eventIndex], {
    event: row[eventIndex],
    inviteBonus: Number(row[header.indexOf("invite_bonus")]) || 0,
    practiceWinnerBonus: Number(row[header.indexOf("practice_winner_bonus")]) || 0,
    gameMvpBonus: Number(row[header.indexOf("game_mvp_bonus")]) || 0,
    draftFloorRaise: Number(row[header.indexOf("draft_floor_raise")]) || 0
  }]));
}

function loadCompetitionTranslations(): Map<string, AnnualCompetitionTranslation> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(competitionTranslationText);
  const header = rows[0];
  const tierIndex = header.indexOf("competition_tier");
  return new Map(rows.slice(1).map((row) => [row[tierIndex], {
    competitionTier: row[tierIndex],
    statMultPass: Number(row[header.indexOf("stat_mult_pass")]) || 1,
    statMultRush: Number(row[header.indexOf("stat_mult_rush")]) || 1,
    statMultDefense: Number(row[header.indexOf("stat_mult_defense")]) || 1,
    draftEvalMult: Number(row[header.indexOf("draft_eval_mult")]) || 1,
    nilVisibilityMult: Number(row[header.indexOf("nil_visibility_mult")]) || 1
  }]));
}

function loadStatGenerationCurves(): Map<string, AnnualStatGenerationCurve[]> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(statGenerationCurvesText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  const curves = new Map<string, AnnualStatGenerationCurve[]>();
  for (const row of rows.slice(1)) {
    const group = row[groupIndex];
    const current = curves.get(group) ?? [];
    curves.set(group, current);
    current.push({
      statCurveId: row[header.indexOf("stat_curve_id")],
      positionGroup: group,
      basePer100Snaps: Number(row[header.indexOf("base_per_100_snaps")]) || 0,
      productionMult: Number(row[header.indexOf("production_mult")]) || 1,
      randomSigma: Number(row[header.indexOf("random_sigma")]) || 0
    });
  }
  return curves;
}

function loadPositionStatProfiles(): Map<string, AnnualPositionStatProfile> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(positionStatProfilesText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  return new Map(rows.slice(1).map((row) => [row[groupIndex], {
    positionGroup: row[groupIndex],
    primaryStats: (row[header.indexOf("primary_stats")] ?? "").split("|").filter(Boolean),
    volumeDriver: row[header.indexOf("volume_driver")],
    efficiencyDriver: row[header.indexOf("efficiency_driver")]
  }]));
}

function loadInjuryRates(): Map<string, AnnualInjuryRate> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(injuryBaseRatesText);
  const header = rows[0];
  return new Map(rows.slice(1).map((row) => {
    const rate = {
      eventType: row[header.indexOf("event_type")],
      positionGroup: row[header.indexOf("position_group")],
      baseDailyRisk: Number(row[header.indexOf("base_daily_risk")]) || 0.0008,
      loadSensitivity: Number(row[header.indexOf("load_sensitivity")]) || 0.18,
      repeatInjuryMult: Number(row[header.indexOf("repeat_injury_mult")]) || 1.15
    };
    return [`${rate.eventType}:${rate.positionGroup}`, rate];
  }));
}

function loadInjuryFamilyParams(): Map<string, AnnualInjuryFamilyParam> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(injuryFamilyParamsText);
  const header = rows[0];
  const familyIndex = header.indexOf("injury_family");
  return new Map(rows.slice(1).map((row) => [row[familyIndex], {
    injuryFamily: row[familyIndex],
    baseRecurrencePct: Number(row[header.indexOf("base_recurrence_pct")]) || 0,
    gamesMissedMean: Number(row[header.indexOf("games_missed_mean")]) || 0,
    permSpeedPenalty: Number(row[header.indexOf("perm_speed_penalty")]) || 0,
    permStrengthPenalty: Number(row[header.indexOf("perm_strength_penalty")]) || 0,
    permAwarenessPenalty: Number(row[header.indexOf("perm_awareness_penalty")]) || 0,
    durabilityPenalty: Number(row[header.indexOf("durability_penalty")]) || 0,
    draftMedicalPenalty: Number(row[header.indexOf("draft_medical_penalty")]) || 0,
    positionSensitivity: (row[header.indexOf("position_sensitivity")] ?? "ALL").split("|").filter(Boolean)
  }]));
}

function loadInjuryRecurrence(): Map<string, AnnualInjuryRecurrence> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(injuryRecurrenceText);
  const header = rows[0];
  const familyIndex = header.indexOf("injury_family");
  return new Map(rows.slice(1).map((row) => [row[familyIndex], {
    injuryFamily: row[familyIndex],
    recurrenceMult: Number(row[header.indexOf("recurrence_mult")]) || 1,
    permanentAthleticLossChance: Number(row[header.indexOf("permanent_athletic_loss_chance")]) || 0,
    potentialLossMin: Number(row[header.indexOf("potential_loss_min")]) || 0,
    potentialLossMax: Number(row[header.indexOf("potential_loss_max")]) || 0,
    positionSensitivity: (row[header.indexOf("position_sensitivity")] ?? "ALL").split("|").filter(Boolean),
    recoveryBankMult: Number(row[header.indexOf("recovery_bank_mult")]) || 1,
    draftMedicalPenaltyMin: Number(row[header.indexOf("draft_medical_penalty_min")]) || 0,
    draftMedicalPenaltyMax: Number(row[header.indexOf("draft_medical_penalty_max")]) || 0
  }]));
}

function loadMoraleWeights(): Map<string, { weight: number; minEffect: number; maxEffect: number }> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(moraleModelWeightsText);
  const header = rows[0];
  return new Map(rows.slice(1).map((row) => [row[header.indexOf("component")], {
    weight: Number(row[header.indexOf("weight")]) || 0.1,
    minEffect: Number(row[header.indexOf("min_effect")]) || -8,
    maxEffect: Number(row[header.indexOf("max_effect")]) || 8
  }]));
}

function loadPromiseTypes(): Map<string, AnnualPromiseType> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(promiseTypesText);
  const header = rows[0];
  const typeIndex = header.indexOf("promise_type");
  return new Map(rows.slice(1).map((row) => [row[typeIndex], {
    promiseType: row[typeIndex],
    fulfillmentRule: row[header.indexOf("fulfillment_rule")],
    targetValue: Number(row[header.indexOf("target_value")]) || 0,
    evaluationWindow: row[header.indexOf("evaluation_window")],
    brokenSeverity: Number(row[header.indexOf("broken_severity")]) || 0,
    moraleImpact: Number(row[header.indexOf("morale_impact")]) || 0,
    portalImpact: Number(row[header.indexOf("portal_impact")]) || 0
  }]));
}

function loadPromiseParams(): Map<string, AnnualPromiseParam> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(moralePromiseParamsText);
  const header = rows[0];
  const driverIndex = header.indexOf("driver");
  return new Map(rows.slice(1).map((row) => [row[driverIndex], {
    driver: row[driverIndex],
    weight: Number(row[header.indexOf("weight")]) || 0,
    goodThreshold: Number(row[header.indexOf("good_threshold")]) || 0,
    badThreshold: Number(row[header.indexOf("bad_threshold")]) || 0,
    transferTriggerBonus: Number(row[header.indexOf("transfer_trigger_bonus")]) || 0
  }]));
}

function loadDraftStockWeights(): Map<string, Map<string, number>> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(draftStockComponentWeightsText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  const componentIndex = header.indexOf("component");
  const weightIndex = header.indexOf("weight");
  const groups = new Map<string, Map<string, number>>();
  for (const row of rows.slice(1)) {
    const group = row[groupIndex];
    const weights = groups.get(group) ?? new Map<string, number>();
    groups.set(group, weights);
    weights.set(row[componentIndex], Number(row[weightIndex]) || 0);
  }
  return groups;
}

function loadDraftBoardWeights(): Map<string, AnnualDraftBoardWeights> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(draftBoardWeightsText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  return new Map(rows.slice(1).map((row) => [row[groupIndex], {
    positionGroup: row[groupIndex],
    filmProdW: Number(row[header.indexOf("film_prod_w")]) || 0.3,
    athleticW: Number(row[header.indexOf("athletic_w")]) || 0.16,
    ageW: Number(row[header.indexOf("age_w")]) || 0.09,
    medicalW: Number(row[header.indexOf("medical_w")]) || 0.11,
    competitionW: Number(row[header.indexOf("competition_w")]) || 0.12,
    allstarW: Number(row[header.indexOf("allstar_w")]) || 0.08,
    characterW: Number(row[header.indexOf("character_w")]) || 0.14
  }]));
}

function loadDraftPositionValues(): Map<string, AnnualDraftPositionValue> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(draftPositionValueText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  return new Map(rows.slice(1).map((row) => [row[groupIndex], {
    positionGroup: row[groupIndex],
    draftPositionValue: Number(row[header.indexOf("draft_position_value")]) || 1,
    round1Bonus: Number(row[header.indexOf("round1_bonus")]) || 0,
    day3Discount: Number(row[header.indexOf("day3_discount")]) || 0
  }]));
}

function loadDraftHitRates(): Map<string, AnnualDraftHitRate> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(draftHitRatesText);
  const header = rows[0];
  const starIndex = header.indexOf("star_bucket");
  const groupIndex = header.indexOf("position_group");
  return new Map(rows.slice(1).map((row) => {
    const hitRate = {
      starBucket: row[starIndex],
      positionGroup: row[groupIndex],
      draftProb: Number(row[header.indexOf("draft_prob")]) || 0,
      earlyRoundProb: Number(row[header.indexOf("early_round_prob")]) || 0,
      starterHitProb: Number(row[header.indexOf("starter_hit_prob")]) || 0,
      impactHitProb: Number(row[header.indexOf("impact_hit_prob")]) || 0
    };
    return [`${hitRate.starBucket}:${hitRate.positionGroup}`, hitRate] as [string, AnnualDraftHitRate];
  }));
}

function loadNflTeamArchetypes(): Map<string, AnnualNflTeamArchetype> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(nflTeamArchetypesText);
  const header = rows[0];
  const teamIndex = header.indexOf("team_id");
  return new Map(rows.slice(1).map((row) => [row[teamIndex], {
    teamId: row[teamIndex],
    archetype: row[header.indexOf("archetype")],
    weightTraits: Number(row[header.indexOf("weight_traits")]) || 0.28,
    weightProduction: Number(row[header.indexOf("weight_production")]) || 0.3,
    weightAge: Number(row[header.indexOf("weight_age")]) || 0.08,
    weightMedical: Number(row[header.indexOf("weight_medical")]) || 0.12,
    weightCompetition: Number(row[header.indexOf("weight_competition")]) || 0.1,
    weightAllstar: Number(row[header.indexOf("weight_allstar")]) || 0.06,
    smallSchoolConfidence: Number(row[header.indexOf("small_school_confidence")]) || 0.5
  }]));
}

function loadNflScoutingArchetypes(): Map<string, AnnualNflScoutingArchetype> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(nflScoutingTeamArchetypesText);
  const header = rows[0];
  const archetypeIndex = header.indexOf("archetype");
  return new Map(rows.slice(1).map((row) => [row[archetypeIndex], {
    archetype: row[archetypeIndex],
    productionWeight: Number(row[header.indexOf("production_weight")]) || 0.3,
    traitsWeight: Number(row[header.indexOf("traits_weight")]) || 0.28,
    medicalConservatism: Number(row[header.indexOf("medical_conservatism")]) || 0.55,
    smallSchoolConfidence: Number(row[header.indexOf("small_school_confidence")]) || 0.5,
    combineWeight: Number(row[header.indexOf("combine_weight")]) || 0.14,
    interviewWeight: Number(row[header.indexOf("interview_weight")]) || 0.12,
    regionalBias: Number(row[header.indexOf("regional_bias")]) || 0,
    riskTolerance: Number(row[header.indexOf("risk_tolerance")]) || 0.5
  }]));
}

function loadPickValues(): Map<number, AnnualPickValue> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(pickValues257Text);
  const header = rows[0];
  const pickIndex = header.indexOf("pick");
  const pickValues = new Map<number, AnnualPickValue>();
  for (const row of rows.slice(1)) {
    const pick = Number(row[pickIndex]);
    if (!Number.isInteger(pick)) continue;
    pickValues.set(pick, {
      pick,
      round: Number(row[header.indexOf("round")]) || 7,
      pickValue: Number(row[header.indexOf("pick_value")]) || 1,
      internalValueDefault: Number(row[header.indexOf("internal_value_default")]) || 1
    });
  }
  return pickValues;
}

function loadCombineWeights(): Map<string, number> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(combineEventWeightsText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  const weightIndex = header.indexOf("weight");
  const includeIndex = header.indexOf("include_in_athletic_composite");
  const sums = new Map<string, number>();
  for (const row of rows.slice(1)) {
    if (row[includeIndex] !== "1") continue;
    sums.set(row[groupIndex], (sums.get(row[groupIndex]) ?? 0) + (Number(row[weightIndex]) || 0));
  }
  return sums;
}

function loadDevelopmentCurves(): Map<string, AnnualDevelopmentCurve> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(developmentYearlyCurvesText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  const yearIndexes = [header.indexOf("year1_gain"), header.indexOf("year2_gain"), header.indexOf("year3_gain"), header.indexOf("year4_gain")];
  const playingTimeIndex = header.indexOf("playing_time_weight");
  const redshirtIndex = header.indexOf("redshirt_weight");
  const curves = new Map<string, AnnualDevelopmentCurve>();
  for (const row of rows.slice(1)) {
    const positionGroup = row[groupIndex];
    const yearGains = yearIndexes.map((index) => Number(row[index])) as [number, number, number, number];
    if (yearGains.some((value) => !Number.isFinite(value))) throw new Error(`Invalid annual development curve for ${positionGroup}.`);
    curves.set(positionGroup, {
      positionGroup,
      yearGains,
      playingTimeWeight: Number(row[playingTimeIndex]) || 0.22,
      redshirtWeight: Number(row[redshirtIndex]) || 0.12
    });
  }
  return curves;
}

function loadCalendarEvents(): AnnualCalendarEvent[] {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(calendarEventsText);
  const header = rows[0];
  return rows.slice(1).map((row) => ({
    eventId: row[header.indexOf("event_id")],
    phase: row[header.indexOf("phase")],
    month: Number(row[header.indexOf("month")]) || 1,
    dayStart: Number(row[header.indexOf("day_start")]) || 1,
    dayEnd: Number(row[header.indexOf("day_end")]) || 1,
    weekHint: Number(row[header.indexOf("week_hint")]) || 1,
    appliesTo: row[header.indexOf("applies_to")],
    hardGate: row[header.indexOf("hard_gate")] === "1",
    description: row[header.indexOf("description")],
    engineEffect: row[header.indexOf("engine_effect")]
  })).filter((row) => row.eventId);
}

function loadPerformanceConstraints(): AnnualPerformanceConstraint[] {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(performanceConstraintsText);
  const header = rows[0];
  return rows.slice(1).map((row) => ({
    constraintId: row[header.indexOf("constraint_id")],
    hardRule: row[header.indexOf("hard_rule")],
    thresholdOrTarget: row[header.indexOf("threshold_or_target")],
    implementationRequirement: row[header.indexOf("implementation_requirement")],
    failureModeToPrevent: row[header.indexOf("failure_mode_to_prevent")]
  })).filter((row) => row.constraintId);
}

function loadBalanceTargets(): Map<string, AnnualBalanceTarget> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(balanceTargetsText);
  const header = rows[0];
  const metricIndex = header.indexOf("metric");
  return new Map(rows.slice(1).map((row) => [row[metricIndex], {
    metric: row[metricIndex],
    targetMean: Number(row[header.indexOf("target_mean")]) || 0,
    lowerBound: Number(row[header.indexOf("lower_bound")]) || 0,
    upperBound: Number(row[header.indexOf("upper_bound")]) || 0,
    notes: row[header.indexOf("notes")]
  }]));
}

function loadAwardImpacts(): Map<string, AnnualAwardImpact> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(awardsImpactText);
  const header = rows[0];
  const awardIndex = header.indexOf("award");
  return new Map(rows.slice(1).map((row) => [row[awardIndex], {
    award: row[awardIndex],
    awardGroup: row[header.indexOf("award_group")],
    draftBoardBonus: Number(row[header.indexOf("draft_board_bonus")]) || 0,
    nilBonusPct: Number(row[header.indexOf("nil_bonus_pct")]) || 0,
    mediaBonus: Number(row[header.indexOf("media_bonus")]) || 0
  }]));
}

function loadTransferTransitionProbabilities(): Map<string, number> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(transferTransitionProbabilitiesText);
  const header = rows[0];
  const fromIndex = header.indexOf("from_level");
  const toIndex = header.indexOf("to_level");
  const probabilityIndex = header.indexOf("probability");
  return new Map(rows.slice(1).map((row) => [
    `${row[fromIndex]}:${row[toIndex]}`,
    Number(row[probabilityIndex]) || 0
  ] as [string, number]));
}

function loadNilMarketProxies(): Map<string, AnnualNilMarketProxy> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(nilMarketProxiesText);
  const header = rows[0];
  const schoolIndex = header.indexOf("school_id");
  return new Map(rows.slice(1).map((row) => [row[schoolIndex], {
    schoolId: row[schoolIndex],
    tier: row[header.indexOf("tier")],
    nilProxyScore: Number(row[header.indexOf("nil_proxy_score")]) || 50,
    footballNilPoolMeanUsd: Number(row[header.indexOf("football_nil_pool_mean_usd")]) || 0,
    retentionPoolPct: Number(row[header.indexOf("retention_pool_pct")]) || 0.45,
    hsPoolPct: Number(row[header.indexOf("hs_pool_pct")]) || 0.35,
    portalPoolPct: Number(row[header.indexOf("portal_pool_pct")]) || 0.2
  }]));
}

function loadNilDemandWeights(): Map<string, number> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(nilPlayerDemandModelText);
  const header = rows[0];
  const componentIndex = header.indexOf("component");
  const weightIndex = header.indexOf("weight");
  return new Map(rows.slice(1).map((row) => [row[componentIndex], Number(row[weightIndex]) || 0]));
}

function loadNilBudgetShares(): Map<string, number> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(nilPositionBudgetSharesText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  const shareIndex = header.indexOf("football_budget_share");
  return new Map(rows.slice(1).map((row) => [row[groupIndex], Number(row[shareIndex]) || 0]));
}

function loadAcademicEligibilityWeights(): Map<string, { requiredValue: number; weight: number }> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(academicEligibilityModelText);
  const header = rows[0];
  const componentIndex = header.indexOf("component");
  return new Map(rows.slice(1).map((row) => [row[componentIndex], {
    requiredValue: Number(row[header.indexOf("required_value")]) || 0,
    weight: Number(row[header.indexOf("weight")]) || 0
  }]));
}

function loadSchoolClassSizeRanges(): Map<string, AnnualSchoolClassSizeRange> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(schoolClassSizeRangesText);
  const header = rows[0];
  const levelIndex = header.indexOf("subdivision_level");
  return new Map(rows.slice(1).map((row) => [row[levelIndex], {
    subdivisionLevel: row[levelIndex],
    minSignings: Number(row[header.indexOf("min_signings")]) || 12,
    targetSignings: Number(row[header.indexOf("target_signings")]) || 18,
    maxSignings: Number(row[header.indexOf("max_signings")]) || 24,
    walkonTarget: Number(row[header.indexOf("walkon_target")]) || 12
  }]));
}

function loadRosterTemplates(): Map<string, AnnualRosterTemplate> {
  validateAnnualRuntimeFiles();
  const rows = parseCsv(rosterTemplatesText);
  const header = rows[0];
  const templates = new Map<string, AnnualRosterTemplate>();
  for (const row of rows.slice(1)) {
    const template = {
      templateId: row[header.indexOf("template_id")],
      subdivisionLevels: (row[header.indexOf("subdivision_level")] ?? "").split("|").filter(Boolean),
      rosterSize: Number(row[header.indexOf("roster_size")]) || 85,
      scholarshipLimit: Number(row[header.indexOf("scholarship_limit")]) || 85,
      walkonSoftCap: Number(row[header.indexOf("walkon_soft_cap")]) || 25
    };
    for (const level of template.subdivisionLevels) templates.set(level, template);
  }
  return templates;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((cell) => cell.length > 0));
}
