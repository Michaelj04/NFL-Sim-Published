import selfAuditRequirementsText from "../../../sports_sim_player_pipeline/data/implementation_control_csvs/self_audit_requirements.csv?raw";

export type SelfAuditStatus = "Implemented" | "Partially Implemented" | "Not Implemented";

export interface SelfAuditRow {
  requirement: string;
  status: SelfAuditStatus;
  filesChanged: string;
  finalPhaseTests: string;
  notes: string;
}

interface SelfAuditRequirement {
  requirement: string;
}

const FILES_BY_REQUIREMENT: Record<string, string> = {
  "CSV loader": "src/sim/yearZero/yearZeroBundleLoader.ts; src/sim/annualRuntime.ts",
  "CSV validator": "src/sim/yearZero/yearZeroBundleLoader.ts; src/sim/annualRuntime.ts",
  "Active manifest enforcement": "src/sim/yearZero/yearZeroBundleLoader.ts; src/sim/annualRuntime.ts; src/sim/schoolProfiles.ts",
  "No R or research extractors": "runtime code only; no R files added",
  "School profile builder": "src/sim/schoolProfiles.ts; src/types.ts",
  "Campus geography precedence": "src/sim/schoolProfiles.ts",
  "Fresh universe only": "src/sim/generate.ts; src/sim/yearZero/yearZeroBootstrap.ts",
  "Initial college rosters": "src/sim/yearZero/yearZeroPlayerBase.ts; src/sim/collegeRoster.ts",
  "Recruit generation": "src/sim/yearZero/yearZeroPlayerBase.ts; src/sim/annualRecruitClass.ts",
  "Star priors and scouting uncertainty": "src/sim/annualRecruitClass.ts; src/sim/yearZero/yearZeroPlayerBase.ts",
  "ATH conversion": "src/sim/annualRecruitClass.ts; src/sim/yearZero/yearZeroPlayerBase.ts",
  "ST split to K/P": "src/sim/annualRecruitClass.ts; src/sim/yearZero/yearZeroPlayerBase.ts",
  "OT/IOL/IDL final conversion": "src/sim/annualRecruitClass.ts; src/sim/yearZero/yearZeroPlayerBase.ts",
  "Recruiting AI": "src/sim/annualRecruiting.ts",
  "Commitments and decommitments": "src/sim/annualRecruiting.ts",
  "Signing day": "src/sim/annualRecruiting.ts; src/sim/annualRosterImport.ts",
  "Roster caps": "src/sim/collegeRoster.ts; src/sim/annualRuntime.ts",
  "Walk-ons and cuts": "src/sim/collegeRoster.ts",
  "Redshirts": "src/sim/collegeRoster.ts",
  "Depth chart": "src/sim/collegeSeasonResults.ts",
  "Snap share": "src/sim/collegeSeasonResults.ts",
  "Training policies": "src/sim/development.ts",
  "Development banks": "src/sim/development.ts",
  "Injury engine": "src/sim/collegeSeasonResults.ts; src/sim/annualRuntime.ts",
  "Injury recurrence and degradation": "src/sim/collegeSeasonResults.ts; src/sim/draftEvaluation.ts",
  "College production": "src/sim/collegeSeasonResults.ts",
  "Stat generation curves": "src/sim/collegeSeasonResults.ts; src/sim/annualRuntime.ts",
  "Awards": "src/sim/collegeSeasonResults.ts",
  "Morale and promises": "src/sim/collegeMorale.ts; src/sim/annualRecruiting.ts",
  "Transfer portal": "src/sim/annualTransfer.ts",
  "Draft eligibility": "src/sim/collegeRoster.ts; src/sim/generate.ts",
  "Early declaration": "src/sim/collegeRoster.ts",
  "All-star events": "src/sim/draftEvaluation.ts",
  "Combine": "src/sim/draftEvaluation.ts",
  "Pro day": "src/sim/draftEvaluation.ts",
  "NFL scouting": "src/sim/scouting.ts; src/sim/draftEvaluation.ts",
  "Draft board": "src/sim/scouting.ts; src/sim/draft.ts; src/sim/annualRuntime.ts",
  "NFL import": "src/sim/draft.ts; src/sim/yearZero/yearZeroPlayerBase.ts",
  "Balance metrics": "src/sim/yearZero/yearZeroDebug.ts",
  "Golden tests": "deferred by TESTS_LAST_POLICY",
  "Seeded snapshot tests": "deferred by TESTS_LAST_POLICY",
  "Long-run tests": "deferred by TESTS_LAST_POLICY",
  "Performance benchmarks": "deferred by TESTS_LAST_POLICY",
  "Debug UI": "src/App.tsx; src/styles.css; src/sim/yearZero/yearZeroDebug.ts"
};

const TESTS_BY_REQUIREMENT: Record<string, string> = {
  "Golden tests": "Final phase golden tests not run yet.",
  "Seeded snapshot tests": "Final phase seeded snapshot tests not run yet.",
  "Long-run tests": "Final phase long-run balance tests not run yet.",
  "Performance benchmarks": "Final phase performance benchmarks not run yet."
};

export function buildSelfAuditRows(evidence: Record<string, { status: SelfAuditStatus; notes: string }>): SelfAuditRow[] {
  return loadSelfAuditRequirements().map((requirement) => {
    const rowEvidence = evidence[requirement.requirement] ?? {
      status: "Not Implemented" as const,
      notes: "No runtime evidence has been mapped for this requirement yet."
    };
    return {
      requirement: requirement.requirement,
      status: rowEvidence.status,
      filesChanged: FILES_BY_REQUIREMENT[requirement.requirement] ?? "TBD",
      finalPhaseTests: TESTS_BY_REQUIREMENT[requirement.requirement] ?? "Deferred until final formal test phase.",
      notes: rowEvidence.notes
    };
  });
}

function loadSelfAuditRequirements(): SelfAuditRequirement[] {
  const rows = parseCsv(selfAuditRequirementsText);
  const header = rows[0] ?? [];
  const requirementIndex = header.indexOf("requirement");
  if (requirementIndex < 0) throw new Error("self_audit_requirements.csv missing requirement column.");
  return rows.slice(1).map((row) => ({ requirement: row[requirementIndex] })).filter((row) => row.requirement);
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
