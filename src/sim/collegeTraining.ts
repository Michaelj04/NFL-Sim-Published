import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import playerPersonalityArchetypesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/player_personality_archetypes.csv?raw";
import staffEffectsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/staff_effects.csv?raw";
import { clamp, createRng } from "../lib/rng";
import type { CollegeDevelopmentFocus, CollegeFatiguePosture, CollegeManagementState, CollegeRosterState, CollegeSeasonResultsState, CollegeTrainingBankState } from "../types";

const TRAINING_FILES = [
  "data/active_runtime_csvs/staff_effects.csv",
  "data/active_runtime_csvs/player_personality_archetypes.csv"
] as const;

interface ActiveManifest {
  activeRuntimeCsvs: string[];
}

export function generateCollegeTrainingBanks(
  seed: string,
  seasonYear: number,
  roster: CollegeRosterState | undefined,
  results: CollegeSeasonResultsState | undefined,
  management?: CollegeManagementState
): CollegeTrainingBankState | undefined {
  if (!roster) return undefined;
  return {
    seasonYear,
    entries: [],
    runtimeCsvs: [],
    usesYearZeroBundles: false
  };
}

function normalizeCollegeDevelopmentFocus(focus?: CollegeDevelopmentFocus): Exclude<CollegeDevelopmentFocus, "athletic"> {
  if (focus === "athletic") return "physical";
  return focus ?? "balanced";
}

function collegePlanModifiers(plan: Exclude<CollegeDevelopmentFocus, "athletic">): { athletic: number; technical: number; mental: number; recovery: number; fatigue: number } {
  if (plan === "physical") return { athletic: 10, technical: 0, mental: -1, recovery: -2, fatigue: 6 };
  if (plan === "technical") return { athletic: 0, technical: 10, mental: 1, recovery: -1, fatigue: 4 };
  if (plan === "mental") return { athletic: -1, technical: 2, mental: 11, recovery: 1, fatigue: 1 };
  if (plan === "recovery") return { athletic: -2, technical: -1, mental: 2, recovery: 12, fatigue: -8 };
  if (plan === "position-switch") return { athletic: 1, technical: 8, mental: 4, recovery: -2, fatigue: 5 };
  if (plan === "auto") return { athletic: 3, technical: 3, mental: 3, recovery: 3, fatigue: 0 };
  return { athletic: 3, technical: 3, mental: 3, recovery: 3, fatigue: 0 };
}

function fatiguePostureModifiers(posture: CollegeFatiguePosture): { gain: number; fatigue: number } {
  if (posture === "aggressive") return { gain: 5, fatigue: 10 };
  if (posture === "conservative") return { gain: -2, fatigue: -10 };
  return { gain: 0, fatigue: 0 };
}

function validateTrainingFiles(): void {
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const active = new Set(manifest.activeRuntimeCsvs);
  const missing = TRAINING_FILES.filter((path) => !active.has(path));
  if (missing.length > 0) throw new Error(`College training files missing from active manifest: ${missing.join(", ")}`);
}

interface StaffEffect {
  weight: number;
  minEffect: number;
  maxEffect: number;
}

function loadStaffEffects(): Map<string, StaffEffect> {
  const rows = parseCsv(staffEffectsText);
  const header = rows[0];
  return new Map(rows.slice(1).map((row) => [
    row[header.indexOf("staff_component")],
    {
      weight: Number(row[header.indexOf("effect_weight")]) || 0,
      minEffect: Number(row[header.indexOf("min_effect")]) || 0,
      maxEffect: Number(row[header.indexOf("max_effect")]) || 0
    }
  ]));
}

function staffEffectValue(staff: Map<string, StaffEffect>, component: string, fallback: number): number {
  const effect = staff.get(component);
  if (!effect) return fallback;
  return clamp(effect.weight + effect.maxEffect + Math.min(0, effect.minEffect), 0, 1);
}

function loadPersonalityArchetypes(): Array<{
  personality: string;
  workEthicMult: number;
  coachabilityMult: number;
  nilSensitivity: number;
  playingTimeSensitivity: number;
  distanceSensitivity: number;
  loyaltyMult: number;
  decommitRiskMult: number;
  portalRiskMult: number;
  earlyDeclareAggression: number;
}> {
  const rows = parseCsv(playerPersonalityArchetypesText);
  const header = rows[0];
  return rows.slice(1).map((row) => ({
    personality: row[header.indexOf("personality")],
    workEthicMult: Number(row[header.indexOf("work_ethic_mult")]) || 1,
    coachabilityMult: Number(row[header.indexOf("coachability_mult")]) || 1,
    nilSensitivity: Number(row[header.indexOf("nil_sensitivity")]) || 0.5,
    playingTimeSensitivity: Number(row[header.indexOf("playing_time_sensitivity")]) || 0.5,
    distanceSensitivity: Number(row[header.indexOf("distance_sensitivity")]) || 0.5,
    loyaltyMult: Number(row[header.indexOf("loyalty_mult")]) || 1,
    decommitRiskMult: Number(row[header.indexOf("decommit_risk_mult")]) || 1,
    portalRiskMult: Number(row[header.indexOf("portal_risk_mult")]) || 1,
    earlyDeclareAggression: Number(row[header.indexOf("early_declare_aggression")]) || 0.5
  })).filter((row) => row.personality);
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
