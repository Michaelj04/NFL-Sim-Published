# YEAR ZERO BUNDLE LOADER CONTRACT

This file is the mandatory implementation contract for consuming consolidated Year Zero CSV bundles in V11.6.3.

## Why this exists

The Year Zero research data is preserved in 19 bundled CSVs under:

```text
data/active_runtime_csvs/year_zero/
```

Each bundle row has this shape:

```csv
domain,source_file,source_table,record_category,source_row,row_key,payload_json
```

The bundle format keeps all original detail, but gameplay systems must not iterate every row blindly. Some rows are runtime rules, while others are examples, research notes, algorithms, debug schemas, or validation targets.

## Validation contract

The loader must validate in this order:

1. Read `data/active_file_manifest.json`.
2. Load only active Year Zero bundle files listed in the manifest.
3. Validate each bundle file against `data/implementation_control_csvs/year_zero/consolidated_bundle_schema.csv`.
4. Validate each bundle file against its generic rows in `data/active_runtime_csvs/csv_schema_registry.csv`.
5. Parse `payload_json` only after bundle-level validation passes.
6. Reject malformed JSON, missing required fields, and invalid `record_category` values.
7. Reject duplicate composite keys within a bundle. Use this canonical uniqueness key:

```text
bundle_file + source_table + source_row
```

`row_key` is not globally unique inside a consolidated bundle. It is only a stable key inside the original `source_table`, so values like `QB`, `RB`, `elite_contender`, or `ap_mvp` may appear in multiple source tables. Do not reject a bundle because bare `row_key` values repeat.

## Record category policy

Use this policy file as the machine-readable source of truth:

```text
data/implementation_control_csvs/year_zero/year_zero_record_category_policy.csv
```

Runtime gameplay may use only these categories by default:

```text
runtime_tuning
weight_distribution
modifier
rule
definition
```

Validation and reporting may use:

```text
target
validation_target
debug_schema
```

Implementation references only, never gameplay generation:

```text
algorithm
example
research_basis
```

## Required selector API

Implement an adapter equivalent to:

```text
loadYearZeroBundles(manifest)
getYearZeroRecords(domain, sourceTable, categories?)
getYearZeroRuntimeRecords(domain, sourceTable)
getYearZeroWeightRows(domain, sourceTable)
getYearZeroRuleRows(domain, sourceTable)
getYearZeroValidationTargets(domain, sourceTable?)
getYearZeroExamples(domain, sourceTable?)
getYearZeroResearchBasis(domain, sourceTable?)
```

Do not let gameplay systems parse raw bundle CSVs independently.

## Separation from annual systems

Year Zero bundles are used only for fresh-save bootstrap. After the bootstrap finishes, normal annual systems use the regular files under:

```text
data/active_runtime_csvs/
```

Examples:

- Year Zero high school recruit setup uses `data/active_runtime_csvs/year_zero/high_school_recruits.csv`.
- Annual recruit generation after the save has started uses `star_distribution.csv`, `position_distribution.csv`, and related normal runtime CSVs.
- Year Zero college roster backfill uses `data/active_runtime_csvs/year_zero/college_rosters.csv`.
- Annual development uses normal development CSVs after Year Zero has completed.

## Composite key rule

The bundle loader may optionally expose a richer identity key for records:

```text
bundle_file + source_table + row_key + source_row
```

But the required duplicate check is `bundle_file + source_table + source_row`. This matches the preserved source table structure and avoids false failures caused by repeated row keys across unrelated source tables.

## Hard failures

Fail loudly if:

- a Year Zero bundle file is missing from the manifest
- a bundle row has malformed `payload_json`
- gameplay logic requests a source table that does not exist
- gameplay logic requests non-runtime categories as generation rules
- duplicate `bundle_file + source_table + source_row` composite keys exist inside a bundle
- a broad position remains on a final roster after Year Zero
- the same seed does not reproduce the same Year Zero universe
