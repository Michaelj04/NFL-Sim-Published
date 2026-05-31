# Runtime And Loader

## Current tests-last policy

Formal executable tests are the final implementation phase. Codex should implement the player pipeline, runtime validators, and debug/export hooks before spending substantial time on golden tests, seeded snapshot tests, long-run balance tests, performance tests, or broad test-suite runs.

Allowed early checks: type checks, compile checks, runtime CSV validation, and tiny smoke checks that directly unblock implementation.



This module file is an extracted reading aid from `docs/codex/PLAYER_PIPELINE_HANDOFF.md`. The full handoff remains canonical.


READ THIS FIRST

This is the canonical V11.6.3 implementation specification. It is a continuation of the older detailed player-pipeline handoff, but it removes the R and research-extraction layer. Do not use older handoff text, older version notes, or older assumptions unless this file explicitly says to preserve a concept.

This file is intentionally detailed. Do not summarize it internally. Do not compress it. Implement the system as specified. For automatic Codex discovery, use AGENTS.md first, then follow CODEX_START_HERE.md to this file and the module docs.

The project target is a web-based React, Vite, TypeScript football simulation game. The new system must create a full football universe pipeline:

1. High school recruit generation
2. College recruiting
3. FBS and FCS college rosters
4. College development and training
5. College injuries and recovery
6. College production and awards
7. Morale and promise tracking
8. Transfer portal
9. NFL draft eligibility and declaration
10. All-star events, combine, pro day
11. NFL scouting and draft board generation
12. NFL player import
13. Debug visibility and deterministic validation

This implementation is for a fresh universe only. Do not implement migration or compatibility logic. The app may clear existing local data or initialize a brand-new player-pipeline universe. The only supported initialization path is a new universe.


CORE CHANGE

V11.6.3 keeps the gameplay architecture, adds the Year Zero bootstrap, and preserves the rule that removes all R, Rscript, RMarkdown, research extractor, scraper, and broad data-gathering responsibilities. Codex should focus on coding. CSV data is pre-supplied. Existing repo school data may be used through adapters, but Codex must not pause implementation to research better datasets.


NON-NEGOTIABLE RULES

1. Build the data loader and validator first.
2. Load active_file_manifest.json before loading any CSV.
3. The app must not use pipeline CSV data until validation passes.
4. Runtime may load only files listed in activeRuntimeCsvs.
5. Implementation-control CSVs are not gameplay data.
6. Test CSVs are not gameplay data.
7. Reference-only CSVs are never loaded during normal runtime.
8. The engine must be deterministic when given a seed.
9. Every major random area must use a named RNG stream from deterministic_rng_streams.csv.
10. The engine must not use ATH or ST as final roster positions.
11. ATH is generation-only. Convert it before signing or roster import.
12. ST is generation-only. Split it into K or P before roster, depth chart, production, draft, or development logic.
13. OT, IOL, and IDL are broad generation groups. Convert them to LT, LG, C, RG, RT, or DL before final roster use.
14. Final roster positions must never be ATH, ST, OT, IOL, or IDL.
15. Every player must have hidden true values and visible scouted values.
16. Stars are priors only. Stars must not hard-lock a player outcome.
17. No high school games are simulated.
18. Every FBS and FCS college program in the repo must have a valid roster.
19. College games may use existing game logic, but this pipeline must produce depth charts, snap shares, production inputs, player development, and draft outputs.
20. Use CSVs as configuration and calibration, not one-off imports.
21. Do not update 25,000 plus full player objects daily on the main thread.
22. Use batched updates, sparse deltas, caches, and seedable RNG.
23. Engine first. Debug UI second. Polished UI later.
24. If the repo lacks an exact field, add it to new pipeline types. Do not silently drop required concepts.
25. If an input value is missing from a required CSV, fail validation.
26. Use fallback values only where csv_schema_registry.csv or formula_input_defaults.csv explicitly allows them.
27. Every fallback used must appear in the validation audit.
28. Use campus_locations_verified.csv as the authority for geography. If another school file disagrees on state, city, latitude, longitude, timezone, campus region, or recruiting geography, campus_locations_verified.csv wins.
29. NIL values are synthetic gameplay calibration values unless explicitly marked otherwise. Treat them as gameplay proxies, not factual school budgets.
30. Every major decision must produce a debug explanation object.
31. If repo structure conflicts with this package, create adapters rather than silently skipping systems.
32. Do not create, use, import, run, maintain, or call R, Rscript, RMarkdown, or R package files.
33. Do not build broad research pipelines, scrapers, dataset extractors, data-upgrade plans, or statistical research scripts unless the user explicitly requests that later.
34. Do not add new internet research requirements to implementation tickets.
35. Existing CSV rows are source data. Code the systems around them.


NO R OR RESEARCH RULE

The following are forbidden unless the user explicitly asks in a later message:

- *.R
- *.Rmd
- Rscript commands
- R package installation
- research_extractors/
- r_scripts/
- analysis_scripts/
- scraper folders
- scraping workflows
- data collection backlogs
- broad research tasks
- instructions telling Codex to find better real-world data

If older instructions mention replacing inferred values with measured research outputs, ignore that part for V11.6.4. Keep the game-facing calibration concept, but do not build research tooling. The pipeline should run from TypeScript code, active CSVs, deterministic RNG streams, runtime validators, final-phase tests, and existing repo data adapters.


PACKAGE ORGANIZATION

Codex-facing instructions are Markdown-first. Root AGENTS.md is intentionally short. Detailed instructions live in docs/codex/. CSVs live under data/. Markdown files are canonical.


Folder rules:

1. data/active_runtime_csvs/
   Load these files during normal simulation runtime and calibration runtime. Validate all of them before the pipeline can initialize.

2. data/implementation_control_csvs/
   These files guide implementation order, compile checkpoints, debug requirements, benchmarks, and audit behavior. Do not load them as gameplay tuning data.

3. data/test_fixtures/
   These files drive final-phase tests, golden scenarios, seeded expectations, validator failure tests, and long-run calibration checks. Load them only in final test, calibration, or developer validation mode.

4. debug_examples/
   Use for expected debug output shape. Do not treat as gameplay data.

The active_file_manifest.json file is the source of truth for:

- packageVersion
- activeRuntimeCsvs
- implementationControlCsvs
- testCsvs
- referenceOnlyCsvs
- doNotLoadCsvs
- forbiddenPatterns
- requiredRuntimePrinciples


ACTIVE CSV LOADING CONTRACT

Implement loadPipelineData.ts before gameplay engines.

Required behavior:

1. Read active_file_manifest.json.
2. Verify every listed active runtime CSV exists.
3. Verify no forbidden file pattern exists in the package or is imported by pipeline code.
4. Parse csv_parser_rules.csv.
5. Parse csv_schema_registry.csv.
6. Parse every active runtime CSV using the parser rules.
7. Validate every active runtime CSV against the schema registry.
8. Validate foreign keys after parsing all active CSVs.
9. Validate uniqueness constraints from primary key assumptions.
10. Validate numeric ranges.
11. Validate enum allowed values.
12. Validate boolean parsing.
13. Validate no required field is blank.
14. Validate probability tables have no negative weights.
15. Validate weighted tables have at least one eligible row for each required group.
16. Validate final playable positions do not include generation-only positions.
17. Build an audit report.
18. Return a PipelineDataBundle only if validation passes.

Do not allow runtime gameplay to import raw CSV files directly. All modules must depend on a typed PipelineDataBundle.


CSV PARSER REQUIREMENTS

Implement parser functions:

parseCsvBoolean(raw: string): boolean
parseCsvNumber(raw: string, field: SchemaField): number
parseCsvInteger(raw: string, field: SchemaField): number
parseCsvString(raw: string, field: SchemaField): string
parseCsvEnum(raw: string, allowedValues: string[]): string
parseCsvList(raw: string): string[]
parseWeight(raw: string): number
parseOptional(raw: string, field: SchemaField): unknown

Required parser rules:

- Trim whitespace around values.
- Preserve intentional internal spaces in names.
- Treat blank required fields as validation errors.
- Treat blank optional fields as undefined unless a schema default exists.
- Accept boolean values only from explicit parser rules.
- Do not treat random strings as booleans.
- Reject NaN, Infinity, and non-numeric values for number fields.
- Reject negative values where min is zero.
- Reject values outside min and max.
- Reject enum values not listed in allowed_values.
- Reject duplicate primary keys.
- Reject rows with unknown required foreign keys.
- Keep row number and file name in every validation error.
- Return all validation errors in one report instead of failing on the first error when possible.


WEIGHTED TABLE RULE

For every weighted selection table:

1. Filter eligible rows first.
2. Validate remaining weights are numbers.
3. Validate no remaining weight is negative.
4. Validate at least one remaining row has positive weight.
5. Normalize remaining weights to sum to 1.
6. Sample with deterministic RNG stream.
7. Store the selected row id and normalized probability in the debug explanation.

Never normalize before filtering.


DETERMINISTIC RNG CONTRACT

Implement seededRng.ts with named streams.

Required streams include:

- universe_init
- school_profile
- recruit_generation
- recruit_rating_rolls
- recruit_star_distribution
- position_conversion
- recruiting_interest
- recruiting_commitment
- recruiting_decommitment
- signing_day
- roster_initialization
- walk_on_generation
- depth_chart
- training_weekly
- development_yearly
- injury_occurrence
- injury_severity
- production_generation
- awards_selection
- morale_update
- transfer_entry
- transfer_destination
- draft_declaration
- all_star_invite
- combine_result
- pro_day_result
- nfl_scouting
- draft_board
- nfl_import
- calibration
- debug_replay

Rules:

- Same seed plus same inputs must produce same outputs.
- Different modules should not consume from a shared global random sequence.
- Use stable identifiers in seed derivation, such as universeSeed, seasonYear, week, playerId, schoolId, streamName.
- Avoid order-dependent randomness where possible. If processing order changes, deterministic outputs should stay stable for the same entity and context.
- Log streamName, seed path, and selected outcome in debug mode.


IMPLEMENTATION TARGET FILE STRUCTURE

Create these files unless equivalent repo modules already exist. If equivalent modules exist, adapt them instead of duplicating names.

src/sim/playerPipeline/
  index.ts
  types.ts
  constants.ts
  loadPipelineData.ts
  validatePipelineData.ts
  buildSchoolProfiles.ts
  seededRng.ts
  distance.ts
  scoringUtils.ts
  recruitGenerator.ts
  recruitingEngine.ts
  signingEngine.ts
  collegeRosterEngine.ts
  depthChartEngine.ts
  snapShareEngine.ts
  trainingEngine.ts
  developmentEngine.ts
  injuryEngine.ts
  productionEngine.ts
  awardsEngine.ts
  moralePromiseEngine.ts
  transferPortalEngine.ts
  draftEligibilityEngine.ts
  allStarEngine.ts
  combineProDayEngine.ts
  draftScoutingEngine.ts
  draftBoardEngine.ts
  nflImportEngine.ts
  pipelineScheduler.ts
  balanceMetrics.ts
  debugExplanations.ts
  dataAdapters.ts

src/sim/playerPipeline/__tests__/  # final-phase only
  validatePipelineData.test.ts
  newUniverseInitialization.test.ts
  recruitGeneration.test.ts
  recruitingEngine.test.ts
  collegeRosterEngine.test.ts
  depthChartAndSnaps.test.ts
  trainingDevelopment.test.ts
  injuryEngine.test.ts
  productionEngine.test.ts
  moralePromiseEngine.test.ts
  transferPortal.test.ts
  draftPipeline.test.ts
  goldenScenarios.test.ts
  longRunBalance.test.ts
  seededSnapshotExpectations.test.ts
  validatorFailureCases.test.ts

src/components/playerPipeline/
  PipelineDebugDashboard.tsx
  RecruitRankingsView.tsx
  SchoolRecruitingBoardView.tsx
  CollegeRosterDebugView.tsx
  TransferPortalDebugView.tsx
  DraftWatchlistDebugView.tsx


CORE TYPE DEFINITIONS

Create or extend types in src/sim/playerPipeline/types.ts. Reuse existing repo Position, CollegeProgram, Prospect, Player, Team, and related types where possible. If existing types differ, write adapters in dataAdapters.ts.

Core position types:

export type PipelinePositionGroup = "QB" | "RB" | "WR" | "TE" | "OT" | "IOL" | "EDGE" | "IDL" | "LB" | "CB" | "S" | "K" | "P";
export type GenerationPositionGroup = PipelinePositionGroup | "ATH" | "ST";
export type RepoFinalPosition = "QB" | "RB" | "WR" | "TE" | "LT" | "LG" | "C" | "RG" | "RT" | "EDGE" | "DL" | "LB" | "CB" | "S" | "K" | "P";
export type SubdivisionLevel = "FBS_POWER" | "FBS_G5" | "FCS_TOP" | "FCS_LOW";
export type PlayerClassYear = "HS_FR" | "HS_SO" | "HS_JR" | "HS_SR" | "FR" | "RS_FR" | "SO" | "RS_SO" | "JR" | "RS_JR" | "SR" | "RS_SR";
export type CommitmentStatus = "open" | "soft_commit" | "hard_commit" | "signed";
export type TransferStatus = "none" | "considering" | "in_portal" | "committed" | "withdrawn";
export type DraftStatus = "not_eligible" | "eligible_returning" | "declared" | "auto_exhausted" | "drafted" | "udfa";
export type InjuryFamily = "ACL" | "Achilles" | "hamstring" | "concussion" | "shoulder" | "back_neck" | "ankle" | "generic_minor" | "generic_major";

Required universe state:

interface PipelineUniverseState {
  version: "v11_1";
  seed: string;
  currentDate: PipelineDate;
  schools: Record<string, SchoolProfile>;
  highSchoolProspects: Record<string, HighSchoolRecruit>;
  collegePlayers: Record<string, CollegePlayer>;
  recruitingClasses: Record<string, SchoolRecruitingClass>;
  transferPortal: TransferPortalState;
  draftPool: Record<string, DraftProspect>;
  nflScouting: Record<string, NFLScoutingReport[]>;
  debugLog: PipelineDebugEvent[];
  balanceMetrics: PipelineBalanceSnapshot[];
}

Required player split:

- HiddenTraits are the truth used by the engine.
- ScoutedValues are what the user and school AI are allowed to see unless developer debug mode is enabled.
- Never expose trueOverall or truePotential on normal user-facing screens.
- Recruiting and scouting should use visible ranges and confidence, not perfect hidden truth.
- Development should use hidden traits and actual conditions.

Required hidden traits:

- trueOverall
- truePotential
- developmentRate
- volatility
- workEthic
- coachability
- footballIQ
- injuryRisk
- loyalty
- nilSensitivity
- playingTimeSensitivity
- distanceSensitivity
- earlyDeclareAggression
- personality

Required visible values:

- visibleOverallMin
- visibleOverallMax
- visiblePotentialMin
- visiblePotentialMax
- confidence
- stars
- nationalRank
- stateRank
- positionRank
- scoutingNotes
