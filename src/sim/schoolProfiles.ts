import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import campusLocationsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/campus_locations_verified.csv?raw";
import csvSchemaRegistryText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/csv_schema_registry.csv?raw";
import schoolsMasterText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/schools_master.csv?raw";
import schoolAcademicRulesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_academic_rules.csv?raw";
import schoolArchetypesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_archetypes.csv?raw";
import schoolFinanceProxiesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_finance_proxies.csv?raw";
import schoolOverridesCuratedText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_overrides_curated.csv?raw";
import schoolOverridesManualTopProgramsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_overrides_manual_top_programs.csv?raw";
import schoolRecruitingPowerText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_recruiting_power.csv?raw";
import schoolSuccessHistoryText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_success_history.csv?raw";
import { clamp, createRng } from "../lib/rng";
import type { CollegeProgram, SchoolProfile, SchoolProfileState } from "../types";
import { geographicRegionForSchool } from "./regions";

const SCHOOL_PROFILE_FILES = [
  "data/active_runtime_csvs/schools_master.csv",
  "data/active_runtime_csvs/campus_locations_verified.csv",
  "data/active_runtime_csvs/school_academic_rules.csv",
  "data/active_runtime_csvs/school_archetypes.csv",
  "data/active_runtime_csvs/school_finance_proxies.csv",
  "data/active_runtime_csvs/school_overrides_curated.csv",
  "data/active_runtime_csvs/school_overrides_manual_top_programs.csv",
  "data/active_runtime_csvs/school_recruiting_power.csv",
  "data/active_runtime_csvs/school_success_history.csv"
];

const SCHOOL_PROFILE_TEXT: Record<string, string> = {
  "data/active_runtime_csvs/schools_master.csv": schoolsMasterText,
  "data/active_runtime_csvs/campus_locations_verified.csv": campusLocationsText,
  "data/active_runtime_csvs/school_academic_rules.csv": schoolAcademicRulesText,
  "data/active_runtime_csvs/school_archetypes.csv": schoolArchetypesText,
  "data/active_runtime_csvs/school_finance_proxies.csv": schoolFinanceProxiesText,
  "data/active_runtime_csvs/school_overrides_curated.csv": schoolOverridesCuratedText,
  "data/active_runtime_csvs/school_overrides_manual_top_programs.csv": schoolOverridesManualTopProgramsText,
  "data/active_runtime_csvs/school_recruiting_power.csv": schoolRecruitingPowerText,
  "data/active_runtime_csvs/school_success_history.csv": schoolSuccessHistoryText
};

let cachedValidationSummary: { csvs: number; columns: number } | undefined;

interface ActiveManifest {
  activeRuntimeCsvs: string[];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function validateProfileFiles(): { csvs: number; columns: number } {
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const active = new Set(manifest.activeRuntimeCsvs);
  const missing = SCHOOL_PROFILE_FILES.filter((path) => !active.has(path));
  if (missing.length > 0) throw new Error(`School profile files missing from active manifest: ${missing.join(", ")}`);
  return validateProfileSchemas();
}

function validateProfileSchemas(): { csvs: number; columns: number } {
  if (cachedValidationSummary) return cachedValidationSummary;
  const registryRows = parseCsv(csvSchemaRegistryText);
  const header = registryRows[0] ?? [];
  const csvIndex = header.indexOf("csv_name");
  const columnIndex = header.indexOf("column_name");
  const typeIndex = header.indexOf("type");
  const requiredIndex = header.indexOf("required");
  const minIndex = header.indexOf("min");
  const maxIndex = header.indexOf("max");
  const allowedIndex = header.indexOf("allowed_values");
  if ([csvIndex, columnIndex, typeIndex, requiredIndex].some((index) => index < 0)) {
    throw new Error("csv_schema_registry.csv missing required school profile schema columns.");
  }
  let columns = 0;
  for (const path of SCHOOL_PROFILE_FILES) {
    const basename = path.split("/").pop() ?? path;
    const rules = registryRows.slice(1).filter((row) => row[csvIndex] === basename);
    if (rules.length === 0) throw new Error(`No schema registry rows for ${basename}.`);
    const rows = parseCsv(SCHOOL_PROFILE_TEXT[path]);
    const csvHeader = rows[0] ?? [];
    for (const rule of rules) {
      const columnName = rule[columnIndex];
      const cellIndex = csvHeader.indexOf(columnName);
      if (rule[requiredIndex] === "1" && cellIndex < 0) throw new Error(`${basename} missing required column ${columnName}.`);
      if (cellIndex < 0) continue;
      columns += 1;
      for (const row of rows.slice(1)) {
        const value = row[cellIndex] ?? "";
        if (rule[requiredIndex] === "1" && value.trim() === "") throw new Error(`${basename}.${columnName} has blank required value.`);
        if (value.trim() === "") continue;
        if (basename === "school_overrides_curated.csv" && columnName === "value" && row[csvHeader.indexOf("field")] === "archetype_id") continue;
        validateSchemaValue(basename, columnName, value, rule[typeIndex], rule[minIndex], rule[maxIndex], rule[allowedIndex]);
      }
    }
  }
  cachedValidationSummary = { csvs: SCHOOL_PROFILE_FILES.length, columns };
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

function keyedRows(text: string, key: string): Map<string, Record<string, string>> {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  const keyIndex = header.indexOf(key);
  const map = new Map<string, Record<string, string>>();
  for (const row of rows.slice(1)) {
    const record = Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""]));
    if (row[keyIndex]) map.set(row[keyIndex], record);
  }
  return map;
}

function fieldOverrides(text: string): Map<string, Record<string, string>> {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  const schoolIndex = header.indexOf("school_id");
  const fieldIndex = header.indexOf("field");
  const valueIndex = header.indexOf("value");
  const map = new Map<string, Record<string, string>>();
  for (const row of rows.slice(1)) {
    const schoolId = row[schoolIndex];
    const field = row[fieldIndex];
    if (!schoolId || !field) continue;
    const record = map.get(schoolId) ?? {};
    map.set(schoolId, record);
    record[field] = row[valueIndex] ?? "";
  }
  return map;
}

function archetypeFor(prestige: number, subdivision: CollegeProgram["subdivision"]): string {
  if (subdivision === "FCS") return "fcs_builder";
  if (prestige >= 80) return "national_power";
  return "regional_developer";
}

function schemeFromArchetype(value: string | undefined, fallback: CollegeProgram["scheme"]): CollegeProgram["scheme"] {
  if (value === "spread" || value === "pro" || value === "power" || value === "multiple" || value === "air-raid") return value;
  if (value === "balanced_pro") return "pro";
  return fallback;
}

function overrideNumber(value: string | undefined, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function subdivisionLevelFor(school: CollegeProgram): string {
  if (school.subdivision === "FCS") return school.prestige >= 62 ? "FCS_TOP" : "FCS";
  if (school.prestige >= 80) return "FBS_POWER";
  if (school.prestige >= 68) return "FBS_G5";
  return "FBS";
}

function pipelineStatesFor(region: ReturnType<typeof geographicRegionForSchool>): { primary: string[]; secondary: string[] } {
  if (region === "East") return { primary: ["PA", "NJ", "VA"], secondary: ["MD", "NY", "OH"] };
  if (region === "South") return { primary: ["TX", "FL", "GA"], secondary: ["AL", "LA", "NC"] };
  if (region === "Midwest") return { primary: ["OH", "MI", "IL"], secondary: ["IN", "WI", "MO"] };
  if (region === "West") return { primary: ["CA", "AZ", "WA"], secondary: ["OR", "NV", "CO"] };
  return { primary: ["TX", "FL", "CA"], secondary: ["GA", "OH", "PA"] };
}

export function buildSchoolProfileState(schools: CollegeProgram[], seed: string, seasonYear: number): SchoolProfileState {
  const validation = validateProfileFiles();
  const master = keyedRows(schoolsMasterText, "school_id");
  const campus = keyedRows(campusLocationsText, "school_id");
  const academics = keyedRows(schoolAcademicRulesText, "school_id");
  const finance = keyedRows(schoolFinanceProxiesText, "school_id");
  const recruiting = keyedRows(schoolRecruitingPowerText, "school_id");
  const success = keyedRows(schoolSuccessHistoryText, "school_id");
  const archetypes = keyedRows(schoolArchetypesText, "archetype_id");
  const curatedOverrides = fieldOverrides(schoolOverridesCuratedText);
  const manualOverrides = keyedRows(schoolOverridesManualTopProgramsText, "school_id");
  let csvMatchedProfiles = 0;
  const profiles = schools.map((school, index): SchoolProfile => {
    const masterRow = master.get(school.id);
    const campusRow = campus.get(school.id);
    const academicRow = academics.get(school.id);
    const financeRow = finance.get(school.id);
    const recruitingRow = recruiting.get(school.id);
    const successRow = success.get(school.id);
    const curated = curatedOverrides.get(school.id);
    const manual = manualOverrides.get(school.id);
    const rng = createRng(`${seed}:school-profile:${school.id}`);
    const latitude = Number(campusRow?.lat);
    const longitude = Number(campusRow?.lon);
    const campusRegion = geographicRegionForSchool(school);
    const pipelines = pipelineStatesFor(campusRegion);
    const computedPrestige = Math.round(clamp(
      Number(successRow?.prestige_score)
      || school.prestige * 0.58 + school.competition * 0.22 + (Number(successRow?.recent_success_score) || school.competition) * 0.2,
      1,
      100
    ));
    const prestige = Math.round(clamp(overrideNumber(manual?.prestige_override, overrideNumber(curated?.prestige, computedPrestige)), 1, 100));
    const archetypeId = String(curated?.archetype_id || archetypeFor(prestige, school.subdivision));
    const archetype = archetypes.get(archetypeId) ?? archetypes.get(archetypeFor(prestige, school.subdivision));
    const matched = !!(masterRow || campusRow || academicRow || financeRow || recruitingRow || successRow || curated || manual);
    if (matched) csvMatchedProfiles += 1;
    const facilities = Math.round(clamp(Number(financeRow?.facilities_proxy) || prestige * 0.58 + school.competition * 0.2 + rng.normal(0, 3), 1, 100));
    const development = Math.round(clamp(overrideNumber(manual?.development_override, facilities * 0.38 + prestige * 0.28 + (Number(successRow?.nfl_draft_output_proxy) || school.competition) * 0.34), 1, 100));
    const recruitingPower = Math.round(clamp(overrideNumber(manual?.recruiting_power_override, overrideNumber(curated?.recruiting_power, Number(recruitingRow?.recruiting_power) || prestige * 0.72 + school.competition * 0.2)), 1, 100));
    const nilPower = Math.round(clamp(overrideNumber(manual?.nil_power_override, overrideNumber(curated?.nil_power, Number(financeRow?.donor_booster_proxy) || prestige * 0.55 + school.competition * 0.25)), 1, 100));
    const transferAggression = Math.round(clamp(overrideNumber(curated?.transfer_aggression, (Number(archetype?.transfer_aggression) || 0.4) * 100), 1, 100));
    const portalAggression = Math.round(clamp(overrideNumber(curated?.portal_aggression, (Number(archetype?.portal_aggression) || 0.45) * 100), 1, 100));
    const subdivisionLevel = masterRow?.subdivision_level || subdivisionLevelFor(school);
    return {
      schoolId: school.id,
      schoolName: masterRow?.school_name || school.name,
      mascot: masterRow?.mascot || school.mascot,
      subdivision: school.subdivision,
      subdivisionLevel,
      conference: masterRow?.conference || school.conference,
      city: campusRow?.city || masterRow?.city || school.name,
      state: campusRow?.state || masterRow?.state || "NA",
      latitude: Number.isFinite(latitude) ? latitude : Math.round((25 + (index % 28) + rng.float(-0.2, 0.2)) * 10000) / 10000,
      longitude: Number.isFinite(longitude) ? longitude : Math.round((-124 + (index % 55) + rng.float(-0.2, 0.2)) * 10000) / 10000,
      timezone: campusRow?.timezone || "America/New_York",
      campusRegion,
      programTier: school.prestige >= 80 ? "national" : school.prestige >= 68 ? "regional" : "developmental",
      rosterTemplate: school.subdivision === "FCS" ? "fcs_63" : "fbs_85",
      prestige,
      competition: Math.round(clamp(Number(successRow?.conference_strength_score) || school.competition, 1, 100)),
      facilities,
      development,
      recruitingPower,
      nilPower,
      academicStrictness: Math.round(clamp(Number(academicRow?.academic_strictness) || 45 + school.prestige * 0.22, 1, 100)),
      transferAggression,
      portalAggression,
      primaryPipelineStates: pipelines.primary,
      secondaryPipelineStates: pipelines.secondary,
      scheme: schemeFromArchetype(archetype?.scheme, school.scheme),
      source: matched ? "active_csv" : "repo_adapter"
    };
  });
  return {
    seasonYear,
    profiles,
    csvMatchedProfiles,
    repoAdaptedProfiles: profiles.length - csvMatchedProfiles,
    schemaValidatedCsvs: validation.csvs,
    schemaValidatedColumns: validation.columns,
    runtimeCsvs: SCHOOL_PROFILE_FILES,
    usesYearZeroBundles: false
  };
}
