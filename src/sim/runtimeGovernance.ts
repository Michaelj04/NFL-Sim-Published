import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import csvSupersessionMapText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/csv_supersession_map.csv?raw";
import dataPrecedenceRulesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/data_precedence_rules.csv?raw";
import dataProvenanceText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/data_provenance.csv?raw";

interface ActiveManifest {
  activeRuntimeCsvs: string[];
  doNotLoadCsvs: string[];
  forbiddenPatterns: string[];
}

export interface RuntimeGovernanceReport {
  activeRuntimeCsvs: number;
  supersededFilesBlocked: number;
  removedPatternsBlocked: number;
  precedenceRules: number;
  provenanceRows: number;
  provenanceCoveredActiveCsvs: number;
  violations: string[];
  runtimeCsvs: string[];
  usesYearZeroBundles: false;
}

export function buildRuntimeGovernanceReport(): RuntimeGovernanceReport {
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const active = new Set(manifest.activeRuntimeCsvs.map(basename));
  const supersessionRows = parseRecords(csvSupersessionMapText);
  const precedenceRows = parseRecords(dataPrecedenceRulesText);
  const provenanceRows = parseRecords(dataProvenanceText);
  const violations: string[] = [];
  let supersededFilesBlocked = 0;
  let removedPatternsBlocked = 0;
  for (const row of supersessionRows) {
    const oldFile = row.old_file ?? "";
    const status = row.status ?? "";
    const runtimeUse = row.runtime_use ?? "";
    if (runtimeUse === "do_not_load_old" || runtimeUse === "never_load" || status === "removed" || status === "superseded") {
      if (active.has(basename(oldFile))) violations.push(`Forbidden superseded/removed file is active: ${oldFile}`);
      if (status === "removed") removedPatternsBlocked += 1;
      else supersededFilesBlocked += 1;
    }
    const newFile = row.new_file ?? "";
    if (newFile && newFile !== "NONE" && !active.has(basename(newFile))) {
      violations.push(`Supersession target is not active: ${newFile}`);
    }
  }
  for (const pattern of [...(manifest.doNotLoadCsvs ?? []), ...(manifest.forbiddenPatterns ?? [])]) {
    if ([...active].some((path) => matchesForbiddenPattern(path, pattern))) violations.push(`Forbidden manifest pattern matched active runtime CSV: ${pattern}`);
  }
  const provenanceNames = new Set(provenanceRows.map((row) => row.csv_name).filter(Boolean));
  const covered = [...active].filter((name) => provenanceNames.has(name)).length;
  return {
    activeRuntimeCsvs: manifest.activeRuntimeCsvs.length,
    supersededFilesBlocked,
    removedPatternsBlocked,
    precedenceRules: precedenceRows.length,
    provenanceRows: provenanceRows.length,
    provenanceCoveredActiveCsvs: covered,
    violations,
    runtimeCsvs: [
      "data/active_runtime_csvs/csv_supersession_map.csv",
      "data/active_runtime_csvs/data_precedence_rules.csv",
      "data/active_runtime_csvs/data_provenance.csv"
    ],
    usesYearZeroBundles: false
  };
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function matchesForbiddenPattern(path: string, pattern: string): boolean {
  if (!pattern) return false;
  if (pattern.includes("**/*.R")) return path.endsWith(".R");
  if (pattern.includes("*.Rmd")) return path.endsWith(".Rmd");
  if (pattern.endsWith("/")) return path.startsWith(pattern.replace(/\/$/, ""));
  if (pattern.includes("*")) {
    const regex = new RegExp(`^${pattern.split("*").map(escapeRegex).join(".*")}$`);
    return regex.test(path);
  }
  return path === pattern || path.includes(pattern);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseRecords(text: string): Array<Record<string, string>> {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  return rows.slice(1).map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""])));
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
