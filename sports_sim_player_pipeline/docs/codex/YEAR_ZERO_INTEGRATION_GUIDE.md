# YEAR ZERO INTEGRATION GUIDE V11.6

This package integrates the consolidated Year Zero player-base research bundle into the V11.6.3 coding-first player pipeline.

## Purpose

Year Zero creates the complete starting universe once, before normal annual recruiting, development, transfers, draft, and NFL import begin.

It replaces the older assumption that the game can start from only annual recruit generation or the current hardcoded NFL roster/free-agent generator.

## Critical rule

Year Zero generation is a one-time fresh-save bootstrap.

```text
new save
→ loading/progress screen
→ manifest and CSV validation
→ deterministic Year Zero seed streams
→ full college rosters
→ transfer portal extraction and repair
→ high school recruit class
→ draft class from existing college players
→ college-to-NFL translation
→ NFL veterans and current rosters
→ practice squads, reserve statuses, free agents, contracts, histories, scouting views
→ normal season systems begin
```

Do not run Year Zero again inside an existing save. Do not partially regenerate a single subsystem after save creation.

## Detail preservation

The prior V11.6.3 integrated Year Zero package had hundreds of small CSVs. the consolidated Year Zero research set them into 19 domain bundles without dropping rows.

Merged bundle count: **19**.

Merged bundled data rows: **14939**.

Original source CSV entries represented in the consolidation index: **360**.

Each row has the shape:

```csv
domain,source_file,source_table,record_category,source_row,row_key,payload_json
```

`payload_json` preserves the original row data from the detailed source CSV.

## Runtime bundle files

| `data/active_runtime_csvs/year_zero/college_awards.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/college_production.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/college_rosters.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/draft_translation.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/high_school_recruits.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/injuries.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/nfl_aging_decline.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/nfl_awards.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/nfl_contracts.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/nfl_free_agents.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/nfl_practice_squad.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/nfl_reserve_status.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/nfl_rosters.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/nfl_team_strength.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/scouting.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/transfer_portal.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/transfer_repair.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/udfa.csv` | Year Zero consolidated runtime bundle |
| `data/active_runtime_csvs/year_zero/year_zero_core.csv` | Year Zero consolidated runtime bundle |

## How Codex should consume these CSVs

Codex should implement a `yearZeroBundleLoader` or equivalent adapter that:

1. Loads every `data/active_runtime_csvs/year_zero/*.csv` listed in `data/active_file_manifest.json`.
2. Validates each bundle against `data/implementation_control_csvs/year_zero/consolidated_bundle_schema.csv`.
3. Parses `payload_json` into typed domain records.
4. Groups records by `domain`, `source_table`, and `record_category`.
5. Exposes typed selectors such as `getYearZeroRecords(domain, sourceTable)` rather than hardcoding CSV filenames throughout the game logic.

## Fictional team-strength rule

Use the V2.18.1 fictional team-strength model only.

No NFL team should be predisposed to be good or bad because of real-world identity. The Browns, Chiefs, Jets, Bills, Raiders, Eagles, and every other team must be eligible for elite, average, and rebuild outcomes based on Year Zero seed draw and leaguewide tier quotas.

## Relationship to normal V11 pipeline

Year Zero does not replace annual systems. It creates the starting universe. After Year Zero:

- high school recruiting uses the normal recruit generation/recruiting pipeline
- college development uses the normal development pipeline
- transfer portal cycles use the normal transfer pipeline
- the draft uses the normal draft bridge
- NFL rosters evolve through normal contracts, waivers, practice squad, free agency, and aging systems

## Tests-last compatibility

Formal executable tests remain final-phase work. Early work may include manifest validation, bundle parsing smoke checks, deterministic RNG sanity checks, and tiny save-creation smoke checks.


## V11.6.3 validation clarification

Normal runtime CSVs validate against:

```text
data/active_runtime_csvs/csv_schema_registry.csv
```

Year Zero bundled CSVs validate against both:

```text
data/active_runtime_csvs/csv_schema_registry.csv
data/implementation_control_csvs/year_zero/consolidated_bundle_schema.csv
```

After bundle validation, `payload_json` must be parsed into typed records and filtered using:

```text
data/implementation_control_csvs/year_zero/year_zero_record_category_policy.csv
```

Gameplay generation may not use rows with these categories as runtime tuning:

```text
algorithm
example
research_basis
debug_schema
validation_target
```

Use `target` and `validation_target` rows for validation, guardrails, and balance reporting only.

## Fresh-save versus annual-data separation

Year Zero bundles under `data/active_runtime_csvs/year_zero/` are only for new-save bootstrap. They should create the starting universe once.

Annual systems after save creation must use the normal active runtime CSVs outside the `year_zero/` subfolder unless an explicit bridge rule says otherwise.

This prevents double-applying Year Zero backfill logic to later annual recruit classes, development cycles, transfers, or NFL imports.
