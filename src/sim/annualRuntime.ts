import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import deterministicRngStreamsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/deterministic_rng_streams.csv?raw";
import developmentYearlyCurvesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/development_yearly_curves.csv?raw";
import positionDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/position_distribution.csv?raw";
import recruitInterestWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/recruit_interest_weights.csv?raw";
import recruitingCalendarText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/recruiting_calendar.csv?raw";
import recruitingPipelineStateWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/recruiting_pipeline_state_weights.csv?raw";
import schoolRecruitingPowerText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_recruiting_power.csv?raw";
import starDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/star_distribution.csv?raw";
import transferDestinationWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/transfer_destination_weights.csv?raw";
import transferEntryReasonsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/transfer_entry_reasons.csv?raw";
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
}

const ANNUAL_RUNTIME_FILES = [
  "data/active_runtime_csvs/deterministic_rng_streams.csv",
  "data/active_runtime_csvs/development_yearly_curves.csv",
  "data/active_runtime_csvs/position_distribution.csv",
  "data/active_runtime_csvs/recruit_interest_weights.csv",
  "data/active_runtime_csvs/recruiting_calendar.csv",
  "data/active_runtime_csvs/recruiting_pipeline_state_weights.csv",
  "data/active_runtime_csvs/school_recruiting_power.csv",
  "data/active_runtime_csvs/star_distribution.csv",
  "data/active_runtime_csvs/transfer_destination_weights.csv",
  "data/active_runtime_csvs/transfer_entry_reasons.csv",
  "data/active_runtime_csvs/yearly_progression_gates.csv"
] as const;

let cachedPositionWeights: Array<[Position, number]> | undefined;
let cachedDebug: AnnualRuntimeDebug | undefined;
let cachedDevelopmentCurves: Map<string, AnnualDevelopmentCurve> | undefined;
let cachedProgressionGates: AnnualProgressionGates | undefined;
let cachedTransferReasons: Array<{ reason: string; weight: number; threshold: string }> | undefined;
let cachedTransferDestinationWeights: Array<{ component: string; weight: number }> | undefined;
let cachedRecruitingConfig: AnnualRecruitingConfig | undefined;

export interface AnnualDevelopmentCurve {
  positionGroup: string;
  yearGains: [number, number, number, number];
  playingTimeWeight: number;
  redshirtWeight: number;
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
    recruitClassSizes: starRows.slice(1).map((row) => Number(row[classSizeIndex])).filter(Number.isFinite)
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

function validateAnnualRuntimeFiles(): void {
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const active = new Set(manifest.activeRuntimeCsvs);
  const missing = ANNUAL_RUNTIME_FILES.filter((path) => !active.has(path));
  if (missing.length > 0) throw new Error(`Annual runtime CSV(s) missing from active manifest: ${missing.join(", ")}`);
  const accidentalYearZero = ANNUAL_RUNTIME_FILES.filter((path) => path.includes("/year_zero/"));
  if (accidentalYearZero.length > 0) throw new Error(`Annual runtime loader cannot consume Year Zero bundles: ${accidentalYearZero.join(", ")}`);
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
