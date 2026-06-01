import manifestText from "../../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import schemaRegistryText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/csv_schema_registry.csv?raw";
import categoryPolicyText from "../../../sports_sim_player_pipeline/data/implementation_control_csvs/year_zero/year_zero_record_category_policy.csv?raw";
import consolidatedSchemaText from "../../../sports_sim_player_pipeline/data/implementation_control_csvs/year_zero/consolidated_bundle_schema.csv?raw";
import collegeAwardsText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/college_awards.csv?raw";
import collegeProductionText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/college_production.csv?raw";
import collegeRostersText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/college_rosters.csv?raw";
import draftTranslationText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/draft_translation.csv?raw";
import highSchoolRecruitsText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/high_school_recruits.csv?raw";
import injuriesText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/injuries.csv?raw";
import nflAgingDeclineText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/nfl_aging_decline.csv?raw";
import nflAwardsText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/nfl_awards.csv?raw";
import nflContractsText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/nfl_contracts.csv?raw";
import nflFreeAgentsText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/nfl_free_agents.csv?raw";
import nflPracticeSquadText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/nfl_practice_squad.csv?raw";
import nflReserveStatusText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/nfl_reserve_status.csv?raw";
import nflRostersText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/nfl_rosters.csv?raw";
import nflTeamStrengthText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/nfl_team_strength.csv?raw";
import scoutingText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/scouting.csv?raw";
import transferPortalText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/transfer_portal.csv?raw";
import transferRepairText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/transfer_repair.csv?raw";
import udfaText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/udfa.csv?raw";
import yearZeroCoreText from "../../../sports_sim_player_pipeline/data/active_runtime_csvs/year_zero/year_zero_core.csv?raw";

export const YEAR_ZERO_GAMEPLAY_CATEGORIES = ["runtime_tuning", "weight_distribution", "modifier", "rule", "definition"] as const;
export const YEAR_ZERO_NON_GAMEPLAY_CATEGORIES = ["target", "validation_target", "algorithm", "example", "research_basis", "debug_schema"] as const;

export type YearZeroGameplayCategory = (typeof YEAR_ZERO_GAMEPLAY_CATEGORIES)[number];
export type YearZeroRecordCategory = YearZeroGameplayCategory | (typeof YEAR_ZERO_NON_GAMEPLAY_CATEGORIES)[number];

export interface YearZeroRecord<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  bundleFile: string;
  domain: string;
  sourceFile: string;
  sourceTable: string;
  recordCategory: YearZeroRecordCategory;
  sourceRow: number;
  rowKey: string;
  payload: TPayload;
}

export interface YearZeroBundleStore {
  manifestVersion: string;
  bundleFiles: string[];
  records: YearZeroRecord[];
  bundledRows: number;
  getYearZeroRecords: (domain: string, sourceTable?: string, categories?: YearZeroRecordCategory[]) => YearZeroRecord[];
  getYearZeroRuntimeRecords: (domain: string, sourceTable?: string) => YearZeroRecord[];
  getYearZeroWeightRows: (domain: string, sourceTable?: string) => YearZeroRecord[];
  getYearZeroRuleRows: (domain: string, sourceTable?: string) => YearZeroRecord[];
  getYearZeroModifierRows: (domain: string, sourceTable?: string) => YearZeroRecord[];
  getYearZeroDefinitionRows: (domain: string, sourceTable?: string) => YearZeroRecord[];
  getYearZeroValidationTargets: (domain: string, sourceTable?: string) => YearZeroRecord[];
  getYearZeroExamples: (domain: string, sourceTable?: string) => YearZeroRecord[];
  getYearZeroResearchBasis: (domain: string, sourceTable?: string) => YearZeroRecord[];
}

interface ActiveManifest {
  packageVersion: string;
  activeRuntimeCsvs: string[];
  yearZeroBundleCsvs: string[];
  yearZeroBundleCount: number;
  yearZeroBundledRows: number;
}

const BUNDLE_TEXT_BY_PATH: Record<string, string> = {
  "data/active_runtime_csvs/year_zero/college_awards.csv": collegeAwardsText,
  "data/active_runtime_csvs/year_zero/college_production.csv": collegeProductionText,
  "data/active_runtime_csvs/year_zero/college_rosters.csv": collegeRostersText,
  "data/active_runtime_csvs/year_zero/draft_translation.csv": draftTranslationText,
  "data/active_runtime_csvs/year_zero/high_school_recruits.csv": highSchoolRecruitsText,
  "data/active_runtime_csvs/year_zero/injuries.csv": injuriesText,
  "data/active_runtime_csvs/year_zero/nfl_aging_decline.csv": nflAgingDeclineText,
  "data/active_runtime_csvs/year_zero/nfl_awards.csv": nflAwardsText,
  "data/active_runtime_csvs/year_zero/nfl_contracts.csv": nflContractsText,
  "data/active_runtime_csvs/year_zero/nfl_free_agents.csv": nflFreeAgentsText,
  "data/active_runtime_csvs/year_zero/nfl_practice_squad.csv": nflPracticeSquadText,
  "data/active_runtime_csvs/year_zero/nfl_reserve_status.csv": nflReserveStatusText,
  "data/active_runtime_csvs/year_zero/nfl_rosters.csv": nflRostersText,
  "data/active_runtime_csvs/year_zero/nfl_team_strength.csv": nflTeamStrengthText,
  "data/active_runtime_csvs/year_zero/scouting.csv": scoutingText,
  "data/active_runtime_csvs/year_zero/transfer_portal.csv": transferPortalText,
  "data/active_runtime_csvs/year_zero/transfer_repair.csv": transferRepairText,
  "data/active_runtime_csvs/year_zero/udfa.csv": udfaText,
  "data/active_runtime_csvs/year_zero/year_zero_core.csv": yearZeroCoreText
};

let cachedStore: YearZeroBundleStore | undefined;

export function loadYearZeroBundles(): YearZeroBundleStore {
  if (cachedStore) return cachedStore;
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const bundleFiles = discoverYearZeroBundleFiles(manifest);
  const expectedHeaders = requiredBundleHeaders();
  const categoryPolicy = loadCategoryPolicy();
  validateRegistryCoverage(bundleFiles);

  const records = bundleFiles.flatMap((bundleFile) => parseBundle(bundleFile, BUNDLE_TEXT_BY_PATH[bundleFile], expectedHeaders, categoryPolicy));
  if (records.length !== manifest.yearZeroBundledRows) {
    throw new Error(`Year Zero bundle row count mismatch: expected ${manifest.yearZeroBundledRows}, loaded ${records.length}.`);
  }

  cachedStore = createStore({
    manifestVersion: manifest.packageVersion,
    bundleFiles,
    records,
    bundledRows: records.length
  });
  return cachedStore;
}

export function discoverYearZeroBundleFiles(manifest = JSON.parse(manifestText) as ActiveManifest): string[] {
  const bundleFiles = manifest.yearZeroBundleCsvs.filter((path) => path.startsWith("data/active_runtime_csvs/year_zero/"));
  const activeSet = new Set(manifest.activeRuntimeCsvs);
  const missing = bundleFiles.filter((path) => !activeSet.has(path));
  if (missing.length > 0) throw new Error(`Year Zero bundle(s) missing from active runtime manifest: ${missing.join(", ")}`);
  if (bundleFiles.length !== manifest.yearZeroBundleCount) {
    throw new Error(`Year Zero bundle count mismatch: expected ${manifest.yearZeroBundleCount}, found ${bundleFiles.length}.`);
  }
  for (const bundleFile of bundleFiles) {
    if (!BUNDLE_TEXT_BY_PATH[bundleFile]) throw new Error(`No bundled import registered for active Year Zero CSV: ${bundleFile}`);
  }
  return bundleFiles;
}

function createStore(base: Omit<YearZeroBundleStore, "getYearZeroRecords" | "getYearZeroRuntimeRecords" | "getYearZeroWeightRows" | "getYearZeroRuleRows" | "getYearZeroModifierRows" | "getYearZeroDefinitionRows" | "getYearZeroValidationTargets" | "getYearZeroExamples" | "getYearZeroResearchBasis">): YearZeroBundleStore {
  const select = (domain: string, sourceTable?: string, categories?: YearZeroRecordCategory[]) => {
    const categorySet = categories ? new Set(categories) : undefined;
    const rows = base.records.filter((record) =>
      record.domain === domain &&
      (!sourceTable || record.sourceTable === sourceTable) &&
      (!categorySet || categorySet.has(record.recordCategory))
    );
    if (sourceTable && rows.length === 0) throw new Error(`Year Zero source table not found for domain=${domain}, source_table=${sourceTable}.`);
    return rows;
  };
  return {
    ...base,
    getYearZeroRecords: select,
    getYearZeroRuntimeRecords: (domain, sourceTable) => select(domain, sourceTable, ["runtime_tuning"]),
    getYearZeroWeightRows: (domain, sourceTable) => select(domain, sourceTable, ["weight_distribution"]),
    getYearZeroRuleRows: (domain, sourceTable) => select(domain, sourceTable, ["rule"]),
    getYearZeroModifierRows: (domain, sourceTable) => select(domain, sourceTable, ["modifier"]),
    getYearZeroDefinitionRows: (domain, sourceTable) => select(domain, sourceTable, ["definition"]),
    getYearZeroValidationTargets: (domain, sourceTable) => select(domain, sourceTable, ["validation_target", "target"]),
    getYearZeroExamples: (domain, sourceTable) => select(domain, sourceTable, ["example"]),
    getYearZeroResearchBasis: (domain, sourceTable) => select(domain, sourceTable, ["research_basis"])
  };
}

function parseBundle(bundleFile: string, text: string, expectedHeaders: string[], validCategories: Set<string>): YearZeroRecord[] {
  const rows = parseCsv(text);
  const [header, ...dataRows] = rows;
  if (!header || expectedHeaders.some((field) => !header.includes(field))) {
    throw new Error(`Year Zero bundle ${bundleFile} does not match consolidated bundle schema.`);
  }
  const seen = new Set<string>();
  return dataRows.filter((row) => row.some(Boolean)).map((row, index) => {
    const raw = Object.fromEntries(header.map((field, fieldIndex) => [field, row[fieldIndex] ?? ""]));
    for (const field of expectedHeaders) {
      if (!raw[field]) throw new Error(`Year Zero bundle ${bundleFile} row ${index + 2} missing required field ${field}.`);
    }
    if (!validCategories.has(raw.record_category)) throw new Error(`Invalid Year Zero record_category ${raw.record_category} in ${bundleFile}.`);
    const sourceRow = Number(raw.source_row);
    if (!Number.isInteger(sourceRow) || sourceRow < 1) throw new Error(`Invalid source_row in ${bundleFile}: ${raw.source_row}`);
    const duplicateKey = `${bundleFile}|${raw.source_table}|${sourceRow}`;
    if (seen.has(duplicateKey)) throw new Error(`Duplicate Year Zero composite key: ${duplicateKey}`);
    seen.add(duplicateKey);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw.payload_json) as Record<string, unknown>;
    } catch {
      throw new Error(`Malformed payload_json in ${bundleFile} row ${index + 2}.`);
    }
    return {
      bundleFile,
      domain: raw.domain,
      sourceFile: raw.source_file,
      sourceTable: raw.source_table,
      recordCategory: raw.record_category as YearZeroRecordCategory,
      sourceRow,
      rowKey: raw.row_key,
      payload
    };
  });
}

function requiredBundleHeaders(): string[] {
  const rows = parseCsv(consolidatedSchemaText);
  return rows.slice(1).filter((row) => row[2] === "yes").map((row) => row[0]);
}

function loadCategoryPolicy(): Set<string> {
  const rows = parseCsv(categoryPolicyText);
  const header = rows[0];
  const categoryIndex = header.indexOf("record_category");
  return new Set(rows.slice(1).map((row) => row[categoryIndex]));
}

function validateRegistryCoverage(bundleFiles: string[]): void {
  const rows = parseCsv(schemaRegistryText);
  const header = rows[0];
  const csvNameIndex = header.indexOf("csv_name");
  const covered = new Set(rows.slice(1).map((row) => row[csvNameIndex]));
  const missing = bundleFiles.filter((path) => {
    const basename = path.split("/").pop() ?? path;
    return !covered.has(basename) && !covered.has(`year_zero/${basename}`) && !covered.has(path);
  });
  if (missing.length > 0) throw new Error(`Year Zero bundle(s) missing csv_schema_registry coverage: ${missing.join(", ")}`);
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
  return rows;
}
