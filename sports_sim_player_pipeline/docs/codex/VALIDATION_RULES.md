# VALIDATION_RULES

## Tests-last note

Build runtime validation logic early because gameplay depends on valid CSVs. Defer formal validator failure-case test files and broad validator test-suite runs until the final test phase.


This file consolidates the strict parser, schema, manifest, and runtime validation rules for the package.

# STRICT SCHEMA AND PARSER REQUIREMENTS V11

## Active manifest first

Runtime must read `active_file_manifest.json` before reading gameplay CSVs.

Runtime must load only `activeRuntimeCsvs` during normal gameplay.

`csv_schema_registry.csv` contains schema rows for active runtime CSVs, implementation-control CSVs, and test-fixture CSVs. Normal runtime should still load active runtime CSVs only. Implementation-control and test-fixture CSVs are loaded only in their proper modes.

Implementation-control CSVs are for Codex guidance only. Test CSVs are for tests only.

## No silent fallback

If an active runtime CSV is missing, malformed, duplicated, has an invalid required field, has a failed foreign key, or violates a declared range, initialization must fail.

Fallbacks are allowed only when `csv_schema_registry.csv` or this document explicitly marks the field optional. Every fallback must be recorded in the validation audit.

## Parser rules

Use `csv_parser_rules.csv` to normalize:

- booleans
- integers
- floats
- JSON
- pipe-delimited lists
- blank optional fields

## Defensive normalization

For weighted tables, always:

1. filter eligible rows
2. reject negative weights
3. sum weights
4. normalize after filtering
5. sample with a named deterministic RNG stream
6. log the chosen row and RNG stream in debug output

## Required validator checks

- required columns
- duplicate primary keys
- type parsing
- numeric min/max
- allowed values
- foreign keys
- school ID consistency
- position validity
- weighted group sums
- JSON parse validity
- pick coverage 1 through 257
- no R/research files loaded

## Position validity

Final positions must never contain ATH, ST, OT, IOL, or IDL.


# CSV SCHEMA INDEX

## Active runtime CSVs

- `data/active_runtime_csvs/academic_eligibility_model.csv`
- `data/active_runtime_csvs/all_star_events.csv`
- `data/active_runtime_csvs/allstar_event_effects.csv`
- `data/active_runtime_csvs/ath_conversion_rules.csv`
- `data/active_runtime_csvs/awards_impact.csv`
- `data/active_runtime_csvs/balance_targets.csv`
- `data/active_runtime_csvs/calendar_events.csv`
- `data/active_runtime_csvs/campus_locations_verified.csv`
- `data/active_runtime_csvs/college_production_weights.csv`
- `data/active_runtime_csvs/combine_event_weights.csv`
- `data/active_runtime_csvs/competition_translation.csv`
- `data/active_runtime_csvs/csv_parser_rules.csv`
- `data/active_runtime_csvs/csv_schema_registry.csv`
- `data/active_runtime_csvs/csv_supersession_map.csv`
- `data/active_runtime_csvs/data_precedence_rules.csv`
- `data/active_runtime_csvs/data_provenance.csv`
- `data/active_runtime_csvs/depth_chart_weights.csv`
- `data/active_runtime_csvs/deterministic_rng_streams.csv`
- `data/active_runtime_csvs/development_yearly_curves.csv`
- `data/active_runtime_csvs/draft_board_weights.csv`
- `data/active_runtime_csvs/draft_hit_rates.csv`
- `data/active_runtime_csvs/draft_position_value.csv`
- `data/active_runtime_csvs/draft_stock_component_weights.csv`
- `data/active_runtime_csvs/formula_input_defaults.csv`
- `data/active_runtime_csvs/injury_base_rates.csv`
- `data/active_runtime_csvs/injury_family_params.csv`
- `data/active_runtime_csvs/injury_recurrence.csv`
- `data/active_runtime_csvs/injury_severity_distribution.csv`
- `data/active_runtime_csvs/morale_model_weights.csv`
- `data/active_runtime_csvs/morale_promise_params.csv`
- `data/active_runtime_csvs/nfl_scouting_team_archetypes.csv`
- `data/active_runtime_csvs/nfl_team_archetypes.csv`
- `data/active_runtime_csvs/nil_market_proxies.csv`
- `data/active_runtime_csvs/nil_player_demand_model.csv`
- `data/active_runtime_csvs/nil_position_budget_shares.csv`
- `data/active_runtime_csvs/performance_constraints.csv`
- `data/active_runtime_csvs/pick_values_257.csv`
- `data/active_runtime_csvs/player_personality_archetypes.csv`
- `data/active_runtime_csvs/position_distribution.csv`
- `data/active_runtime_csvs/position_distribution_rules.csv`
- `data/active_runtime_csvs/position_group_conversion.csv`
- `data/active_runtime_csvs/position_selector_aliases.csv`
- `data/active_runtime_csvs/position_stat_profiles.csv`
- `data/active_runtime_csvs/pro_day_adjustments.csv`
- `data/active_runtime_csvs/production_formula_params.csv`
- `data/active_runtime_csvs/promise_types.csv`
- `data/active_runtime_csvs/rating_aliases.csv`
- `data/active_runtime_csvs/rating_input_mapping.csv`
- `data/active_runtime_csvs/recruit_interest_weights.csv`
- `data/active_runtime_csvs/recruiting_calendar.csv`
- `data/active_runtime_csvs/recruiting_pipeline_state_weights.csv`
- `data/active_runtime_csvs/roster_position_targets.csv`
- `data/active_runtime_csvs/roster_templates.csv`
- `data/active_runtime_csvs/school_academic_rules.csv`
- `data/active_runtime_csvs/school_archetypes.csv`
- `data/active_runtime_csvs/school_class_size_ranges.csv`
- `data/active_runtime_csvs/school_finance_proxies.csv`
- `data/active_runtime_csvs/school_overrides_curated.csv`
- `data/active_runtime_csvs/school_overrides_manual_top_programs.csv`
- `data/active_runtime_csvs/school_recruiting_power.csv`
- `data/active_runtime_csvs/school_success_history.csv`
- `data/active_runtime_csvs/schools_master.csv`
- `data/active_runtime_csvs/snap_share_rules.csv`
- `data/active_runtime_csvs/staff_effects.csv`
- `data/active_runtime_csvs/star_distribution.csv`
- `data/active_runtime_csvs/stat_generation_curves.csv`
- `data/active_runtime_csvs/state_talent_weights.csv`
- `data/active_runtime_csvs/transfer_destination_weights.csv`
- `data/active_runtime_csvs/transfer_entry_reasons.csv`
- `data/active_runtime_csvs/transfer_transition_probabilities.csv`
- `data/active_runtime_csvs/walk_on_generation_rules.csv`
- `data/active_runtime_csvs/yearly_progression_gates.csv`

## Implementation-control CSVs

- `data/implementation_control_csvs/compile_checkpoints.csv`
- `data/implementation_control_csvs/debug_screen_requirements.csv`
- `data/implementation_control_csvs/feature_deferral_registry.csv`
- `data/implementation_control_csvs/implementation_execution_checklist_v11.csv`
- `data/implementation_control_csvs/module_boundaries.csv`
- `data/implementation_control_csvs/no_research_policy.csv`
- `data/implementation_control_csvs/performance_benchmarks.csv`
- `data/implementation_control_csvs/self_audit_requirements.csv`

## Test CSVs

- `data/test_fixtures/golden_test_fixture_players.csv`
- `data/test_fixtures/golden_test_fixture_teams.csv`
- `data/test_fixtures/golden_test_numeric_assertions.csv`
- `data/test_fixtures/golden_test_scenarios.csv`
- `data/test_fixtures/long_run_balance_targets.csv`
- `data/test_fixtures/new_universe_initialization_tests.csv`
- `data/test_fixtures/nfl_validation_tests.csv`
- `data/test_fixtures/seeded_snapshot_expectations.csv`
- `data/test_fixtures/validator_failure_cases.csv`


## Path rule

All CSV paths are package-root relative. Active runtime CSVs live in `data/active_runtime_csvs/`. Implementation-control CSVs live in `data/implementation_control_csvs/`. Test fixtures live in `data/test_fixtures/`.


# Year Zero bundle validation

Before Year Zero generation runs:

1. Load `data/year_zero_manifest.json`.
2. Load every active Year Zero bundle listed in `data/active_file_manifest.json`.
3. Validate each bundle row against `data/implementation_control_csvs/year_zero/consolidated_bundle_schema.csv`.
4. Parse `payload_json` as strict JSON.
5. Confirm `domain`, `source_file`, `source_table`, `record_category`, `source_row`, and `row_key` are present for every row.
6. Confirm the fictional NFL team-strength bundle is the only active team-strength source for Year Zero. Do not introduce real-world team-quality priors.

Failure to parse a Year Zero bundle is a startup-blocking validation error.


## Year Zero bundle validation

Year Zero bundle CSVs under `data/active_runtime_csvs/year_zero/` use a generic bundle schema. They must validate against:

```text
data/active_runtime_csvs/csv_schema_registry.csv
data/implementation_control_csvs/year_zero/consolidated_bundle_schema.csv
```

Validation must happen before `payload_json` parsing. After parsing, typed records must be filtered by `record_category` according to:

```text
data/implementation_control_csvs/year_zero/year_zero_record_category_policy.csv
```

Rows categorized as `algorithm`, `example`, `research_basis`, `debug_schema`, or `validation_target` are not gameplay generation inputs.
