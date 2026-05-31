# CODEX_START_HERE

This is the V11.6.4 Metadata Cleanup Codex package for the sports sim player pipeline.

## Main rule

This is a coding handoff, not a research task. Implement the systems from the supplied CSVs and Markdown instructions, including the Year Zero fresh-save bootstrap engine. Do not build R tools, scrapers, or research pipelines.

## Efficient read order

For normal implementation work, read:

1. `AGENTS.md`
2. `docs/codex/IMPLEMENTATION_ORDER.md`
3. `docs/codex/VALIDATION_RULES.md`
4. `docs/codex/TESTS_LAST_POLICY.md`
5. `docs/codex/YEAR_ZERO_INTEGRATION_GUIDE.md` for new-save/player-base initialization
6. The relevant file under `docs/codex/modules/` or `docs/codex/year_zero/`

For CSV lookup, start with:

```text
 docs/codex/CSV_QUICK_REFERENCE.md
```

Use the full dictionary only when needed:

```text
 docs/codex/CSV_DATA_DICTIONARY.md
```

For Year Zero implementation, start with:

```text
 docs/codex/year_zero/CODEX_START_HERE_YEAR_ZERO.md
 docs/codex/year_zero/YEAR_ZERO_ENGINE_HANDOFF.md
 docs/codex/year_zero/CSV_CONSOLIDATION_GUIDE.md
 docs/codex/YEAR_ZERO_BUNDLE_LOADER_CONTRACT.md
```

Use the full canonical handoff only for deeper cross-module detail:

```text
 docs/codex/PLAYER_PIPELINE_HANDOFF.md
```

## Package layout

```text
AGENTS.md
CODEX_START_HERE.md
docs/codex/
  PLAYER_PIPELINE_HANDOFF.md
  CSV_QUICK_REFERENCE.md
  CSV_DATA_DICTIONARY.md
  VALIDATION_RULES.md
  IMPLEMENTATION_ORDER.md
  NO_RESEARCH_NO_R_RULES.md
  TESTS_LAST_POLICY.md
  PLANS.md
  modules/
  year_zero/
data/
  active_runtime_csvs/
    year_zero/
  implementation_control_csvs/
  test_fixtures/
  active_file_manifest.json
debug_examples/
tests/
```

## Tests-last rule

Formal executable tests are the final implementation phase.

Allowed early:

- runtime CSV validation logic
- type checks
- compile checks
- tiny smoke checks needed to keep implementation moving

Deferred until final phase:

- golden tests
- seeded snapshot tests
- validator failure-case test files
- long-run balance tests
- performance tests
- broad test-suite execution loops

## Runtime rule

Runtime code may only consume files listed as active in `data/active_file_manifest.json` and validated against `data/active_runtime_csvs/csv_schema_registry.csv`.

Year Zero bundle CSVs under `data/active_runtime_csvs/year_zero/` must also validate against `data/implementation_control_csvs/year_zero/consolidated_bundle_schema.csv` before `payload_json` is parsed into typed domain records.
