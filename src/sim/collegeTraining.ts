import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import playerPersonalityArchetypesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/player_personality_archetypes.csv?raw";
import staffEffectsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/staff_effects.csv?raw";
import { clamp, createRng } from "../lib/rng";
import type { CollegeRosterState, CollegeSeasonResultsState, CollegeTrainingBankState } from "../types";

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
  results: CollegeSeasonResultsState | undefined
): CollegeTrainingBankState | undefined {
  if (!roster) return undefined;
  validateTrainingFiles();
  const staff = loadStaffEffects();
  const personalities = loadPersonalityArchetypes();
  const productionByPlayerId = new Map((results?.production ?? []).map((row) => [row.playerId, row]));
  const entries = roster.players
    .filter((player) => !player.graduatedSeason && !player.draftDeclaredSeason && !player.cutSeason)
    .map((player) => {
      const rng = createRng(`${seed}:college-training-bank:${seasonYear}:${player.id}`);
      const production = productionByPlayerId.get(player.id);
      const personality = rng.pick(personalities);
      const snapShare = production?.snapShare ?? 0;
      const developmentEffect = staffEffectValue(staff, "positionDevelopment", 0.25);
      const strengthEffect = staffEffectValue(staff, "strengthCoach", 0.22);
      const recoveryEffect = staffEffectValue(staff, "medicalStaff", 0.2);
      const workEthic = personality.workEthicMult;
      const coachability = personality.coachabilityMult;
      const athleticBank = Math.round(clamp(38 + strengthEffect * 80 + workEthic * 8 + rng.normal(0, 6), 1, 100));
      const technicalBank = Math.round(clamp(36 + developmentEffect * 90 + coachability * 9 + snapShare * 18 + rng.normal(0, 6), 1, 100));
      const mentalBank = Math.round(clamp(34 + coachability * 18 + personality.loyaltyMult * 4 + (production?.productionScore ?? player.collegeOverall) * 0.18 + rng.normal(0, 6), 1, 100));
      const fatigue = Math.round(clamp(snapShare * (48 + personality.playingTimeSensitivity * 14) + (player.rosterStatus === "redshirt" ? -12 : 0) + rng.normal(0, 5), 0, 100));
      const recoveryBank = Math.round(clamp(42 + recoveryEffect * 90 - fatigue * 0.25 + rng.normal(0, 5), 1, 100));
      const regressionPressure = Math.round(clamp((player.collegeOverall - player.collegePotential) * 1.8 + fatigue * 0.18 - recoveryBank * 0.08 + (personality.portalRiskMult - 1) * 5, 0, 100));
      return {
        playerId: player.id,
        schoolId: player.schoolId,
        seasonYear,
        personality: personality.personality,
        nilSensitivity: personality.nilSensitivity,
        playingTimeSensitivity: personality.playingTimeSensitivity,
        distanceSensitivity: personality.distanceSensitivity,
        loyaltyMult: personality.loyaltyMult,
        decommitRiskMult: personality.decommitRiskMult,
        portalRiskMult: personality.portalRiskMult,
        earlyDeclareAggression: personality.earlyDeclareAggression,
        athleticBank,
        technicalBank,
        mentalBank,
        recoveryBank,
        fatigue,
        regressionPressure,
        debug: `${personality.personality}: snap ${Math.round(snapShare * 100)}%, staff dev ${developmentEffect}, strength ${strengthEffect}, portal ${personality.portalRiskMult}.`
      };
    });
  return {
    seasonYear,
    entries,
    runtimeCsvs: [...TRAINING_FILES],
    usesYearZeroBundles: false
  };
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
