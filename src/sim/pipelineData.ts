import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import type { PipelineDataBundle, PipelineValidationReport } from "../types";
import { ANNUAL_RUNTIME_FILES, annualRuntimeValidationReport, validatePipelineCsvTextForTest } from "./annualRuntime";
import { discoverYearZeroBundleFiles, loadYearZeroBundles } from "./yearZero/yearZeroBundleLoader";

interface ActiveManifest {
  packageVersion: string;
  activeRuntimeCsvs: string[];
}

let cachedBundle: PipelineDataBundle | undefined;

export function loadPipelineDataBundle(): PipelineDataBundle {
  if (cachedBundle) return cachedBundle;
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const annualReport = annualRuntimeValidationReport();
  const yearZero = loadYearZeroBundles();
  const yearZeroRuntimeCsvs = discoverYearZeroBundleFiles();
  const errors = [...annualReport.errors];
  const active = new Set(manifest.activeRuntimeCsvs);
  for (const path of [...ANNUAL_RUNTIME_FILES, ...yearZeroRuntimeCsvs]) {
    if (!active.has(path)) errors.push(`Active manifest does not include registered runtime CSV: ${path}`);
  }
  if (yearZero.bundledRows <= 0) errors.push("Year Zero bundle loaded no rows.");
  const validation: PipelineValidationReport = {
    valid: annualReport.valid && errors.length === 0,
    validatedCsvs: annualReport.validatedCsvs + yearZero.bundleFiles.length,
    validatedColumns: annualReport.validatedColumns,
    parserRulesApplied: annualReport.parserRulesApplied,
    fallbackAudit: annualReport.fallbackAudit,
    errors
  };
  if (!validation.valid) throw new Error(`Pipeline data validation failed:\n${validation.errors.join("\n")}`);
  cachedBundle = {
    packageVersion: manifest.packageVersion,
    activeRuntimeCsvs: manifest.activeRuntimeCsvs,
    annualRuntimeCsvs: [...ANNUAL_RUNTIME_FILES],
    yearZeroRuntimeCsvs,
    validation
  };
  return cachedBundle;
}

export function pipelineValidationReport(): PipelineValidationReport {
  return loadPipelineDataBundle().validation;
}

export { validatePipelineCsvTextForTest };
