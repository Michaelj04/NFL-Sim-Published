# PLAYER PIPELINE CODEX HANDOFF V11.6.4 FULL DETAIL CODING-FIRST

## V11.6.4 tests-last policy

Formal executable tests are the final implementation phase. Codex should implement the player pipeline, runtime validators, and debug/export hooks before spending substantial time on golden tests, seeded snapshot tests, long-run balance tests, performance tests, or broad test-suite runs.

Allowed early checks: type checks, compile checks, runtime CSV validation, and tiny smoke checks that directly unblock implementation.

Fresh-universe implementation spec for NFL-Sim-Published

READ THIS FIRST

This is the canonical V11.6.4 implementation specification. It is a continuation of the older detailed player-pipeline handoff, but it removes the R and research-extraction layer. Do not use older handoff text, older version notes, or older assumptions unless this file explicitly says to preserve a concept.

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

V11.6.4 keeps the gameplay architecture and implementation strictness, but removes all R, Rscript, RMarkdown, research extractor, scraper, and broad data-gathering responsibilities. Codex should focus on coding. CSV data is pre-supplied. Existing repo school data may be used through adapters, but Codex must not pause implementation to research better datasets.

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

SCHOOL PROFILE BUILDER

buildSchoolProfiles.ts must combine:

- schools_master.csv
- campus_locations_verified.csv
- school_archetypes.csv
- school_finance_proxies.csv
- school_recruiting_power.csv
- school_success_history.csv
- school_academic_rules.csv
- nil_market_proxies.csv
- staff_effects.csv
- school_class_size_ranges.csv
- roster_templates.csv
- school_overrides_curated.csv
- school_overrides_manual_top_programs.csv
- existing repo school/team data through adapters

Precedence:

1. schools_master.csv is the identity and school_id authority.
2. campus_locations_verified.csv is the geography authority.
3. school_overrides_manual_top_programs.csv overrides curated and computed values where present.
4. school_overrides_curated.csv overrides computed profile values where present.
5. Synthetic proxies fill gameplay scores where no manual override exists.
6. Existing repo school objects can provide display and integration fields, but must not override campus geography unless the adapter explicitly maps that field with validation.

Every school profile must include:

- schoolId
- schoolName
- mascot
- subdivision
- subdivisionLevel
- conference
- city
- state
- latitude
- longitude
- timezone
- campusRegion
- programTier
- rosterTemplate
- prestige
- competition
- facilities
- development
- recruitingPower
- nilPower
- academicStrictness
- transferAggression
- portalAggression
- primaryPipelineStates
- secondaryPipelineStates
- scheme
- staff profile

Validation requirements:

- Every active FBS and FCS school in the repo must map to exactly one school_id.
- Every school_id in schools_master.csv must have geography.
- Every school profile must have a subdivisionLevel.
- Every school profile must have roster targets.
- Every school profile must have class size ranges.
- Overrides must not create values outside accepted ranges.

RECRUIT GENERATION ENGINE

recruitGenerator.ts must generate a national annual recruit class without high school games.

Inputs:

- star_distribution.csv
- state_talent_weights.csv
- position_distribution_rules.csv
- position_distribution.csv
- player_personality_archetypes.csv
- rating_input_mapping.csv
- rating_aliases.csv
- formula_input_defaults.csv
- balance_targets.csv
- deterministic_rng_streams.csv

Required flow:

1. Determine total class size from balance targets or configuration.
2. Allocate star counts from star_distribution.csv.
3. Allocate recruit home states from state_talent_weights.csv.
4. Allocate generation position groups from position_distribution_rules.csv.
5. Roll physical profile by position group.
6. Roll hidden true overall and true potential from star prior plus randomness.
7. Roll hidden development traits.
8. Roll core attributes from position templates and true ability.
9. Roll personality archetype.
10. Create scouting uncertainty ranges.
11. Assign national, state, and position ranks from visible/scouted values.
12. Store debug explanation for each generated player.

Stars rule:

Stars are a prior, not a ceiling or guarantee. A 3-star can develop into a star. A 5-star can stagnate or bust. Star level influences initial probability distributions, but development depends on hidden traits, coaching, playing time, morale, injuries, and volatility.

Scouting rule:

Visible range width should depend on confidence. Lower confidence creates wider ranges. Higher confidence creates narrower ranges. School scouting quality may increase confidence, but it must not reveal true values on normal screens.

Recruit output must include:

- identity
- home state and optional coordinates
- generationPosition
- possible finalPosition only after conversion
- secondary positions
- physical profile
- core attributes
- hidden traits
- scouted values
- star level
- ranking fields
- open commitment state
- empty or generated offer list
- debug explanation

POSITION CONVERSION HARD RULES

Generation positions allowed:

- QB
- RB
- WR
- TE
- OT
- IOL
- EDGE
- IDL
- LB
- CB
- S
- K
- P
- ATH
- ST

Final roster positions allowed:

- QB
- RB
- WR
- TE
- LT
- LG
- C
- RG
- RT
- EDGE
- DL
- LB
- CB
- S
- K
- P

Conversion requirements:

- ATH converts before signing or roster import.
- ST converts to K or P before signing or roster import.
- OT converts to LT or RT.
- IOL converts to LG, C, or RG.
- IDL converts to DL.
- EDGE remains EDGE unless the repo uses another equivalent. If the repo lacks EDGE, adapter must map it deliberately.

ATH conversion should consider:

- attribute fit
- physical size
- secondary positions
- school roster needs
- recruiting promise
- position scarcity
- deterministic RNG stream

ST conversion should consider:

- kicking attribute
- punting/proxy attribute if present
- roster target need
- player profile
- deterministic RNG stream

Reject any signed or roster-imported player whose final position is ATH, ST, OT, IOL, or IDL.

RECRUITING ENGINE

recruitingEngine.ts must implement school target boards, offers, visits, commitments, decommitments, and signing.

Inputs:

- school profiles
- recruit_interest_weights.csv
- recruiting_calendar.csv
- recruiting_pipeline_state_weights.csv
- nil_player_demand_model.csv
- nil_position_budget_shares.csv
- promise_types.csv
- morale_promise_params.csv
- school_class_size_ranges.csv
- roster_position_targets.csv
- current roster needs

School board generation:

1. Build initial school needs from roster targets and graduating players.
2. Score prospects for school fit.
3. Narrow board by school level, recruiting power, geographic reach, star reach, academic fit, and position need.
4. Assign target priority.
5. Keep board size bounded for performance.

Recruit interest formula should include:

- distance from home to campus
- home state pipeline status
- school prestige
- recent success
- conference or subdivision level
- NIL offer strength
- projected playing time
- position need
- scheme fit
- academic fit
- staff recruiting score
- relationship score
- campus visit impact
- promises
- recruit personality sensitivities

Commitment behavior:

- Soft commitments can decommit.
- Hard commitments should be much more stable.
- Signing day finalizes signedSchoolId.
- A player should not sign with multiple schools.
- Unsigned players can become late signees, walk-ons, JUCO-like future pool, or be discarded based on package rules.

Debug explanation for recruiting decisions must show:

- top factors
- normalized score
- RNG stream
- offer status
- visit impact
- NIL effect
- promise effect
- distance effect
- playing-time effect
- reason for commit, decommit, or rejection

COLLEGE ROSTER ENGINE

collegeRosterEngine.ts must initialize every FBS and FCS program with a valid roster.

Inputs:

- roster_templates.csv
- roster_position_targets.csv
- school_class_size_ranges.csv
- walk_on_generation_rules.csv
- position_group_conversion.csv
- school profiles
- signed recruits
- signed transfers

Required flow:

1. For each school, determine roster template.
2. Generate or import returning players for each class year.
3. Fill freshmen from signed recruits.
4. Fill transfer additions.
5. Fill remaining holes with walk-ons.
6. Convert every broad position to final position.
7. Assign scholarship or walk-on status.
8. Assign class year, eligibility, redshirt status, and years out of high school.
9. Validate roster caps and position minimums.
10. Emit debug report for underflow, overflow, cuts, and walk-ons.

Roster rules:

- Every playable team must have enough players to run offense, defense, and special teams.
- Walk-ons exist to prevent roster holes, not to create elite prospects.
- Roster cuts should respect minimums by position.
- Redshirts should be assigned conservatively and explained.

DEPTH CHART AND SNAP SHARE

depthChartEngine.ts and snapShareEngine.ts must convert rosters into playable usage.

Inputs:

- depth_chart_weights.csv
- snap_share_rules.csv
- roster_position_targets.csv
- position_stat_profiles.csv
- injuries
- redshirt status
- morale
- coach trust
- promises

Depth chart scoring should include:

- current ability
- position fit
- class and experience
- coach trust
- injury availability
- fatigue
- morale
- practice/development performance
- promise obligations
- special teams value

Snap share rules:

- Starters receive baseline snap share by position and scheme.
- Rotational positions such as DL, EDGE, WR, RB, and DB can have wider distributions.
- Injured, redshirted, or academically ineligible players cannot receive normal snaps.
- Special teams snaps must be assigned separately.
- Snap shares should sum to valid team unit totals.

TRAINING AND DEVELOPMENT ENGINE

trainingEngine.ts creates development banks. developmentEngine.ts applies gains, plateaus, breakouts, and regression pressure.

Inputs:

- development_yearly_curves.csv
- yearly_progression_gates.csv
- staff_effects.csv
- player_personality_archetypes.csv
- morale_model_weights.csv
- injury files
- production output
- snap share
- coach trust

Development concept:

Potential is a range of possible outcomes, not a guarantee. Development is probability-weighted movement through that range.

Required player development factors:

- truePotential
- developmentRate
- workEthic
- coachability
- footballIQ
- volatility
- class year
- age and years out of high school
- staff development quality
- strength coach
- position coach effect
- playing time
- production
- morale
- confidence
- injuries
- fatigue
- redshirt status
- competition level

Training banks:

- athleticBank
- technicalBank
- mentalBank
- recoveryBank
- fatigue
- regressionPressure

Weekly training:

1. Determine eligible players.
2. Add training bank values from staff, workload, player traits, morale, and role.
3. Apply fatigue and recovery.
4. Do not instantly mutate all ratings every day.
5. Store sparse deltas.
6. Apply major development at defined calendar gates.

Yearly development:

1. Identify progression gate.
2. Compute expected gain from curve row.
3. Modify by hidden traits, staff, role, morale, injury, and playing time.
4. Apply volatility.
5. Check breakout or stagnation chance.
6. Respect soft and hard potential ceilings.
7. Apply rating-specific gains based on position and training bank.
8. Apply regression pressure where appropriate.
9. Update scouted values and confidence.
10. Emit debug explanation.

Development must not:

- guarantee elite outcomes for high stars
- ignore hidden potential
- ignore injury history
- mutate every player on the main thread daily
- reveal true potential in normal UI

INJURY ENGINE

injuryEngine.ts must handle occurrence, severity, duration, recovery, recurrence, and long-term wear.

Inputs:

- injury_base_rates.csv
- injury_family_params.csv
- injury_severity_distribution.csv
- injury_recurrence.csv
- workload and snap share
- durability
- injuryRisk
- fatigue
- position

Required flow:

1. Determine injury exposure from snaps, workload, and event context.
2. Roll injury occurrence through named RNG stream.
3. Select injury family from eligible weighted rows.
4. Select severity.
5. Determine days missed.
6. Apply immediate availability effects.
7. Apply long-term penalties only when severity and family justify it.
8. Update recurrence risk.
9. Feed medical red flags into draft scouting.
10. Emit debug explanation.

Injuries should affect:

- availability
- depth chart
- snap share
- training banks
- development gains
- draft medical grade
- morale
- transfer risk when role changes

PRODUCTION AND AWARDS ENGINE

productionEngine.ts must create college production inputs and position-specific stats. awardsEngine.ts must assign awards using production, role, team success, and competition context.

Inputs:

- production_formula_params.csv
- college_production_weights.csv
- stat_generation_curves.csv
- position_stat_profiles.csv
- competition_translation.csv
- snap_share_rules.csv
- awards_impact.csv
- existing or lightweight college game output

Production flow:

1. Get team context from existing college game simulation or lightweight generator.
2. Read depth chart and snap share.
3. Compute player production score from attributes, usage, opponent strength, scheme fit, morale, and health.
4. Convert production score into position-specific stat categories.
5. Aggregate season and career stats.
6. Feed production into awards, draft stock, morale, and development feedback.

If the repo does not simulate detailed college games yet, implement a lightweight stat generator rather than blocking the pipeline.

Awards should consider:

- production
- team success
- conference or subdivision strength
- class year
- position group
- prior reputation
- award eligibility
- reasonable randomness

MORALE AND PROMISE ENGINE

moralePromiseEngine.ts must track morale and promises across recruiting, roster, playing time, NIL, development, injuries, and transfers.

Inputs:

- morale_model_weights.csv
- morale_promise_params.csv
- promise_types.csv
- NIL files
- depth chart
- snap share
- production
- recruiting promises

Promise lifecycle:

1. Promise made during recruitment or retention.
2. Promise stored on player and school.
3. Fulfillment condition evaluated at calendar gates.
4. Promise marked fulfilled, broken, expired, or active.
5. Morale and transfer risk adjusted.
6. Debug explanation created.

Morale should be affected by:

- playing time vs expectation
- depth chart movement
- wins and losses
- development satisfaction
- NIL satisfaction
- role fit
- broken promises
- injuries
- transfer interest
- coach trust
- awards and recognition

TRANSFER PORTAL ENGINE

transferPortalEngine.ts must decide entries, destination scoring, commitment, and withdrawal.

Inputs:

- transfer_entry_reasons.csv
- transfer_destination_weights.csv
- transfer_transition_probabilities.csv
- morale
- promises
- depth chart
- production
- NIL
- school profiles
- recruiting relationships

Entry reasons:

- playing time blocked
- broken promise
- low morale
- coaching change or low staff fit
- NIL dissatisfaction
- homesickness
- wants higher level
- academic mismatch
- position change issue
- development stagnation

Destination scoring should include:

- projected playing time
- NIL fit
- distance
- prestige
- conference level
- scheme fit
- prior recruiting relationship
- academic fit
- roster need
- school transfer aggression

Transfer rules:

- Not all unhappy players transfer.
- Not all portal players land.
- Some players withdraw.
- FCS to FBS movement is possible but should be constrained by quality and demand.
- FBS to FCS movement is possible for playing time and role reasons.
- Portal volume must be checked against balance targets.

DRAFT ELIGIBILITY ENGINE

draftEligibilityEngine.ts must decide who can declare and who does declare.

Inputs:

- player class year
- years out of high school
- production
- awards
- true/scouted ability
- earlyDeclareAggression
- NIL status
- injury status
- projected draft grade
- morale and school situation

Rules:

- Underclassmen need enough years out of high school to declare.
- Seniors or exhausted eligibility players become auto eligible.
- Early declaration should depend on projected draft value, NIL, risk, personality, and school context.
- Draft decisions must be deterministic under seed.

ALL-STAR, COMBINE, PRO DAY

allStarEngine.ts, combineProDayEngine.ts, and draftScoutingEngine.ts must create the draft evaluation bridge.

Inputs:

- all_star_events.csv
- allstar_event_effects.csv
- combine_event_weights.csv
- pro_day_adjustments.csv
- draft_stock_component_weights.csv
- competition_translation.csv

All-star invitation should consider:

- production
- school level
- position
- seniority
- scouting grade
- awards
- need for evaluation

Combine and pro day should consider:

- physical profile
- attributes
- training
- injury status
- position-specific events
- pro day context
- randomness through named stream

Scouting output must include:

- consensus grade
- team-specific grades
- film production grade
- athletic grade
- medical grade
- age value
- competition translation grade
- all-star signal
- character grade
- projected round or UDFA
- explanation of major grade drivers

DRAFT BOARD ENGINE

draftBoardEngine.ts must create team-specific and consensus draft boards.

Inputs:

- draft_board_weights.csv
- draft_position_value.csv
- draft_stock_component_weights.csv
- draft_hit_rates.csv
- pick_values_257.csv
- nfl_team_archetypes.csv
- nfl_scouting_team_archetypes.csv
- NFL team needs from existing repo or adapter

Board grade components:

- film production
- traits and athleticism
- age
- medical
- competition translation
- all-star and combine signals
- character/personality
- positional value
- team need
- scheme fit
- scarcity
- risk tolerance

Output:

- consensus board
- team board
- projected round
- UDFA grade where relevant
- explanation for each meaningful board movement

NFL IMPORT ENGINE

nflImportEngine.ts must convert drafted and UDFA college players into the repo NFL player format.

Rules:

- Preserve player identity, school, position, physical profile, and history.
- Convert scouted/college ratings into NFL rookie ratings using draft and competition translation.
- Do not import ATH, ST, OT, IOL, or IDL as final positions.
- Attach draft metadata.
- Attach rookie contract or UDFA metadata if the repo supports it.
- Preserve hidden traits where the NFL development system uses them.
- Create adapter functions rather than rewriting unrelated NFL systems.

PIPELINE SCHEDULER

pipelineScheduler.ts must run engines according to calendar_events.csv and yearly_progression_gates.csv.

Required phases:

- universe initialization
- preseason roster setup
- recruiting board setup
- weekly recruiting
- signing windows
- regular season weekly development
- injury recovery
- production aggregation
- awards
- transfer portal windows
- offseason training
- draft eligibility
- all-star events
- combine
- pro day
- draft board generation
- NFL import
- next season rollover

The scheduler must be able to run:

- one phase
- one week
- one season
- multiple seasons in calibration mode
- seeded replay for final tests

PERFORMANCE REQUIREMENTS

Use performance_constraints.csv and performance_benchmarks.csv.

Do not run dense all-school by all-recruit scoring every tick. Use:

- cached school profiles
- narrowed recruiting boards
- sparse player deltas
- batch commits
- stable sorted processing order
- named RNG streams
- indexes by school, state, position, star, and class year

Final-phase performance tests must measure:

- CSV validation time
- annual recruit generation time
- one recruiting week for all schools
- one development day or week for all college players
- full offseason pipeline
- NFL draft board creation for all teams

FINAL-PHASE VALIDATION TESTS

Use test_csvs and add executable tests only after the core systems and debug hooks are implemented.

Required test categories:

1. CSV schema validation
2. validator failure cases
3. active manifest loading
4. no forbidden R or research files
5. school profile construction
6. campus geography precedence
7. recruit generation determinism
8. star distribution within target ranges
9. state talent distribution within target ranges
10. position conversion validity
11. recruiting and signing determinism
12. no signed ATH or ST
13. no roster OT, IOL, or IDL where final positions are required
14. roster minimums and caps
15. depth chart validity
16. snap share totals
17. development yearly gates
18. injury recurrence
19. production stat generation
20. morale and promise lifecycle
21. transfer portal entry and destination behavior
22. draft eligibility and declaration
23. combine and pro day output
24. draft board output
25. NFL import adapter
26. seeded snapshot expectations
27. long-run balance targets
28. performance benchmarks
29. debug explanation structure
30. final self-audit generation

GOLDEN TESTS

Golden tests should use fixed players and teams from test_csvs. They should assert exact or range-bounded behavior depending on the system.

Exact assertions:

- parser errors
- schema failures
- position conversion for explicit rows
- deterministic RNG stream output for simple cases
- no forbidden final positions
- manifest categories

Range assertions:

- class star counts
- state counts
- position counts
- development gains
- injury counts
- transfer volume
- draft class composition
- NFL import distribution

CALIBRATION RUNNER

Create runPipelineCalibration.ts or equivalent. It must be runnable from tests or a dev command. It should simulate with fixed seeds and output aggregate metrics without requiring UI.

Required seeds:

- 1
- 7
- 42
- 12345

Required horizons:

- 1 season
- 5 seasons
- 10 seasons
- 25 seasons

Required outputs:

- total generated recruits
- star counts
- state counts
- position counts after conversion
- FBS signees
- FCS signees
- unsigned recruits
- walk-ons generated
- roster underflow teams
- roster overflow teams
- position shortage team-seasons
- portal entries
- portal landing rate
- same-level transfers
- up-level transfers
- down-level transfers
- early declarations
- drafted players by star
- drafted players by subdivision
- FCS drafted players
- 90 plus overall college players
- NIL spend by tier
- average class size by school tier
- average development gain by class year and position group
- injury counts by family

Calibration runner should compare outputs against:

- balance_targets.csv
- long_run_balance_targets.csv
- seeded_snapshot_expectations.csv
- golden_test_numeric_assertions.csv

Calibration warnings do not automatically block build unless the test explicitly marks the metric as blocking. Code errors and validation failures block build.

DEBUG EXPLANATIONS

Every major decision must produce a debug explanation object. This object should be inspectable in developer mode.

Required fields:

- id
- module
- entityType
- entityId
- seasonYear
- week or phase
- inputSummary
- scoreBreakdown
- selectedRowIds
- rngStream
- rngSeedPath
- normalizedProbabilities where relevant
- result
- warnings

Required debug screens:

- PipelineDebugDashboard
- RecruitRankingsView
- SchoolRecruitingBoardView
- CollegeRosterDebugView
- TransferPortalDebugView
- DraftWatchlistDebugView

Normal user-facing screens must show scouted ranges, stars, confidence, and notes. They must not show trueOverall, truePotential, hidden development rate, exact injury risk, exact transfer probability, or exact draft probability unless developer debug mode is enabled.

INTEGRATION CONTRACTS

Use dataAdapters.ts to connect to existing repo systems.

Adapters should cover:

- repo school/team ids to school_id
- repo positions to RepoFinalPosition
- existing player format to CollegePlayer or NFL player
- game outputs to production input
- roster/depth chart output to existing UI
- draft outputs to existing NFL rookie creation

Do not rewrite unrelated systems unless the existing system cannot support the required concept. Prefer small adapters.

Do not preserve old annual development as gameplay fallback. If an old system conflicts with this pipeline, replace or bypass it after the V11.6.4 modules compile.

CODEX IMPLEMENTATION ORDER

Follow data/implementation_control_csvs/implementation_execution_checklist_v11.csv, with these expanded details:

1. Read CODEX_START_HERE.md and this full handoff.
2. Load active_file_manifest.json.
3. Verify package contains no forbidden R or research files.
4. Build CSV loader.
5. Build parser rules.
6. Build schema registry parser.
7. Build validator and audit report.
8. Run validator tests.
9. Build school profile adapter.
10. Build distance utilities.
11. Build school overrides and precedence.
12. Build recruit generator.
13. Build scouting ranges.
14. Build rank assignment.
15. Build position conversion.
16. Build recruiting boards.
17. Build offers, visits, commitments, decommitments, and signing.
18. Build college roster initialization.
19. Build walk-ons, redshirts, cuts, roster validation.
20. Build depth charts.
21. Build snap shares.
22. Build training banks.
23. Build yearly development.
24. Build injury engine.
25. Build production and stats.
26. Build awards.
27. Build morale and promise ledger.
28. Build transfer portal.
29. Build draft eligibility.
30. Build all-star, combine, and pro day.
31. Build NFL scouting and draft board.
32. Build NFL import adapter.
33. Build balance metrics.
34. Build tests.
35. Build performance benchmarks.
36. Build minimal debug UI.
37. Run typecheck.
38. Build debug exports and inspect a short seeded sim manually if needed.
39. Final phase only: add and run tests.
40. Print self-audit.

SELF-AUDIT OUTPUT

After implementation, print a table with:

- Requirement
- Implemented, Partially Implemented, or Not Implemented
- Files changed
- Final-phase tests covering it, or deferred status
- Notes

Required audit rows:

1. Manifest loader
2. No R or research files
3. CSV loader
4. CSV validator
5. Schema registry parser
6. Parser rules
7. School profile builder
8. Campus geography precedence
9. No migration support
10. Initial college rosters
11. Recruit generation
12. Star priors and scouting uncertainty
13. ATH conversion
14. ST split to K/P
15. OT/IOL/IDL final conversion
16. Recruiting AI
17. Commitments and decommitments
18. Signing day
19. Roster caps
20. Walk-ons and cuts
21. Redshirts
22. Depth chart
23. Snap share
24. Training policies
25. Development banks
26. Yearly development curves
27. Injury engine
28. Injury recurrence and degradation
29. College production
30. Stat generation curves
31. Morale and promises
32. Transfer portal
33. Awards
34. Draft eligibility
35. Early declaration
36. All-star events
37. Combine
38. Pro day
39. NFL scouting
40. Draft board
41. NFL import
42. Balance metrics
43. Golden tests
44. Validator failure tests
45. Seeded snapshot tests
46. Long-run tests
47. Performance benchmarks
48. Debug UI
49. Hidden vs visible values
50. Final playable universe

FAILURE BEHAVIOR

If a requirement cannot be implemented because the existing repo structure conflicts, do not silently skip it. Add a clear adapter or create the missing playerPipeline module. If something remains partial, mark it partial in the self-audit. During the final test phase, include a failing or skipped test with explanation.

Do not delete existing game systems unless necessary. Prefer adapters and modular additions.

Do not leave unexplained stubs. Before the final test phase, mark stubs clearly in the self-audit. During the final test phase, add tests identifying the missing behavior.

FINAL SUCCESS DEFINITION

The implementation is successful only if:

1. active_file_manifest.json loads.
2. Forbidden R and research patterns are absent or ignored.
3. CSV validation passes.
4. A new universe can initialize from scratch.
5. Every repo FBS and FCS school gets a valid school profile.
6. Every repo FBS and FCS school gets a valid college roster.
7. Annual recruit class generates with correct star count ranges.
8. State, position, and star distributions are deterministic and within target ranges.
9. Recruiting classes can be produced for schools.
10. No signed player has ATH or ST as final position.
11. No final roster player has ATH, ST, OT, IOL, or IDL.
12. Depth charts are valid.
13. Snap shares are valid.
14. Development ticks run without main-thread heavy object churn.
15. Injury occurrence, severity, recurrence, and recovery run.
16. College production and awards run.
17. Morale and promises run.
18. Transfer portal decisions run.
19. Draft eligibility and early declaration run.
20. All-star, combine, and pro day outputs are produced.
21. NFL scouting reports and draft board grades are produced.
22. NFL import creates playable rookies.
23. Debug UI can inspect the system.
24. Final phase only: golden tests pass or report exact failures.
25. Final phase only: seeded snapshot tests pass within ranges.
26. Final phase only: long-run balance checks run.
27. Final phase only: performance benchmark reports run.
28. Self-audit is printed and clearly marks any deferred tests.

CSV PACKAGE NOTE

The school/team rows in this package are starter synthetic rows unless the repo adapter maps existing repo data. Do not perform broad research to replace them. If the user later supplies better CSVs, validate them and plug them into the same system.

END OF V11.6.4 FULL DETAIL HANDOFF


# Year Zero bootstrap integration

V11.6 adds a dedicated Year Zero player-base bootstrap engine. This engine must run once at fresh save creation before annual recruiting and normal season systems.

Year Zero creates already-existing players and histories. It is not the annual high school recruit generator.

It must build complete college and NFL starting populations, including full college rosters, transfer portal, draft class from college players, high school recruit class, NFL veterans, NFL rosters, practice squads, free agents, reserve statuses, contracts, injuries, awards, histories, and team-specific scouting views.

The Year Zero package uses consolidated CSV bundles under `data/active_runtime_csvs/year_zero/`. These bundles preserve detailed tuning rows inside `payload_json` and must be parsed through a typed adapter.

NFL team strength must be fictional and seed-driven. Do not bias any specific NFL franchise toward elite or bottom-tier outcomes based on real-world identity.
