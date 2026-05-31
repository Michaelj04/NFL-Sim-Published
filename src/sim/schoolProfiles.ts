import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import campusLocationsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/campus_locations_verified.csv?raw";
import schoolsMasterText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/schools_master.csv?raw";
import schoolAcademicRulesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_academic_rules.csv?raw";
import schoolFinanceProxiesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_finance_proxies.csv?raw";
import schoolRecruitingPowerText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/school_recruiting_power.csv?raw";
import { clamp, createRng } from "../lib/rng";
import type { CollegeProgram, SchoolProfile, SchoolProfileState } from "../types";
import { geographicRegionForSchool } from "./regions";

const SCHOOL_PROFILE_FILES = [
  "data/active_runtime_csvs/schools_master.csv",
  "data/active_runtime_csvs/campus_locations_verified.csv",
  "data/active_runtime_csvs/school_academic_rules.csv",
  "data/active_runtime_csvs/school_finance_proxies.csv",
  "data/active_runtime_csvs/school_recruiting_power.csv"
];

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

function validateProfileFiles(): void {
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const active = new Set(manifest.activeRuntimeCsvs);
  const missing = SCHOOL_PROFILE_FILES.filter((path) => !active.has(path));
  if (missing.length > 0) throw new Error(`School profile files missing from active manifest: ${missing.join(", ")}`);
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
  validateProfileFiles();
  const master = keyedRows(schoolsMasterText, "school_id");
  const campus = keyedRows(campusLocationsText, "school_id");
  const academics = keyedRows(schoolAcademicRulesText, "school_id");
  const finance = keyedRows(schoolFinanceProxiesText, "school_id");
  const recruiting = keyedRows(schoolRecruitingPowerText, "school_id");
  let csvMatchedProfiles = 0;
  const profiles = schools.map((school, index): SchoolProfile => {
    const masterRow = master.get(school.id);
    const campusRow = campus.get(school.id);
    const academicRow = academics.get(school.id);
    const financeRow = finance.get(school.id);
    const recruitingRow = recruiting.get(school.id);
    const rng = createRng(`${seed}:school-profile:${school.id}`);
    const latitude = Number(campusRow?.lat);
    const longitude = Number(campusRow?.lon);
    const campusRegion = geographicRegionForSchool(school);
    const pipelines = pipelineStatesFor(campusRegion);
    const matched = !!(masterRow || campusRow || academicRow || financeRow || recruitingRow);
    if (matched) csvMatchedProfiles += 1;
    return {
      schoolId: school.id,
      schoolName: masterRow?.school_name || school.name,
      mascot: masterRow?.mascot || school.mascot,
      subdivision: school.subdivision,
      subdivisionLevel: masterRow?.subdivision_level || subdivisionLevelFor(school),
      conference: masterRow?.conference || school.conference,
      city: campusRow?.city || masterRow?.city || school.name,
      state: campusRow?.state || masterRow?.state || "NA",
      latitude: Number.isFinite(latitude) ? latitude : Math.round((25 + (index % 28) + rng.float(-0.2, 0.2)) * 10000) / 10000,
      longitude: Number.isFinite(longitude) ? longitude : Math.round((-124 + (index % 55) + rng.float(-0.2, 0.2)) * 10000) / 10000,
      timezone: campusRow?.timezone || "America/New_York",
      campusRegion,
      programTier: school.prestige >= 80 ? "national" : school.prestige >= 68 ? "regional" : "developmental",
      prestige: school.prestige,
      competition: school.competition,
      recruitingPower: Math.round(clamp(Number(recruitingRow?.recruiting_power) || school.prestige * 0.72 + school.competition * 0.2, 1, 100)),
      nilPower: Math.round(clamp(Number(financeRow?.donor_booster_proxy) || school.prestige * 0.55 + school.competition * 0.25, 1, 100)),
      academicStrictness: Math.round(clamp(Number(academicRow?.academic_strictness) || 45 + school.prestige * 0.22, 1, 100)),
      transferAggression: Math.round(clamp(Number(recruitingRow?.transfer_aggression) || 35 + (100 - school.prestige) * 0.18, 1, 100)),
      primaryPipelineStates: pipelines.primary,
      secondaryPipelineStates: pipelines.secondary,
      scheme: school.scheme,
      source: matched ? "active_csv" : "repo_adapter"
    };
  });
  return {
    seasonYear,
    profiles,
    csvMatchedProfiles,
    repoAdaptedProfiles: profiles.length - csvMatchedProfiles,
    runtimeCsvs: SCHOOL_PROFILE_FILES,
    usesYearZeroBundles: false
  };
}
