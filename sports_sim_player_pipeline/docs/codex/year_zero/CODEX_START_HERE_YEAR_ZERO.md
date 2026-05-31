# Codex Start Here: Year Zero Integrated

Read this first.

## Goal

Implement the Year Zero player-base engine using the consolidated subsystem CSVs in `data/active_runtime_csvs/year_zero/`.

## Reading order

1. `README.md`
2. `docs/codex/year_zero/CSV_CONSOLIDATION_GUIDE.md`
3. `docs/codex/year_zero/YEAR_ZERO_ENGINE_HANDOFF.md`
4. `docs/codex/year_zero/IMPLEMENTATION_ORDER_YEAR_ZERO.md`
5. `data/year_zero_manifest.json`

## Hard constraints

- Year Zero generation runs once at new save creation.
- Generate every player immediately with a loading/progress screen.
- Use deterministic RNG streams.
- Do not create R scripts or research pipelines.
- Keep NFL team strength fictional and seed-driven. Do not bias teams based on real-world current quality.
- College and NFL rating scales are separate.
- Draft class comes from existing generated college players.
- Every college team starts full at 105 players.
- NFL active roster target is 53; practice squad target is 16; reserve statuses are rare outside active roster.
- Tests remain final-phase work. Early checks should be compile/type/smoke only.


## V11.6.3 loader clarification

Before implementing Year Zero gameplay logic, read:

```text
docs/codex/YEAR_ZERO_BUNDLE_LOADER_CONTRACT.md
data/implementation_control_csvs/year_zero/year_zero_record_category_policy.csv
data/implementation_control_csvs/year_zero/year_zero_bundle_loader_contract.csv
```

The bundle loader must validate bundle shape, parse `payload_json`, and filter records by `record_category` before any runtime subsystem consumes Year Zero data.
