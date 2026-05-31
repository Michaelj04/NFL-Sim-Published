# AGENTS.md

## Project
Coding-first sports simulation player pipeline: Year Zero universe bootstrap, player generation, college development, transfer portal, draft bridge, and NFL import.

## Read order
For most tasks, read only:

1. `CODEX_START_HERE.md`
2. `docs/codex/IMPLEMENTATION_ORDER.md`
3. `docs/codex/VALIDATION_RULES.md`
4. `docs/codex/TESTS_LAST_POLICY.md`
5. `docs/codex/YEAR_ZERO_INTEGRATION_GUIDE.md` when working on new-save/player-base initialization
6. The matching targeted module in `docs/codex/modules/` or `docs/codex/year_zero/`

Use `docs/codex/PLAYER_PIPELINE_HANDOFF.md` as the full canonical fallback when a task needs deeper cross-module detail.
Use `docs/codex/CSV_QUICK_REFERENCE.md` first for CSV lookup. Open `docs/codex/CSV_DATA_DICTIONARY.md` only when a specific CSV needs detailed explanation.

## Hard constraints
- Do not create, use, import, or maintain R, Rscript, RMarkdown, or R packages.
- Do not create research extraction pipelines.
- Do not scrape or research new data unless the user explicitly requests it.
- Runtime code must use validated active CSVs only.
- Deprecated, reference-only, or unlisted CSVs must never silently affect runtime.
- Load `data/active_file_manifest.json` before loading any CSV.
- Build CSV loading and validation before gameplay systems.
- Use deterministic RNG streams for Year Zero bootstrap, generation, development, injuries, recruiting, transfer, draft, and final testing.
- Year Zero must run once at new save creation and must not be rerun inside existing saves.

- Year Zero bundle CSVs must be validated against both the main registry entry and `data/implementation_control_csvs/year_zero/consolidated_bundle_schema.csv`.
- Year Zero gameplay systems must access bundled data through a dedicated Year Zero bundle loader that filters by `record_category`.
- Rows categorized as `algorithm`, `example`, `research_basis`, `debug_schema`, or `validation_target` must not drive gameplay generation.
- Year Zero bootstrap data under `data/active_runtime_csvs/year_zero/` is for fresh-save initialization only. Annual systems must use the normal active runtime CSVs after Year Zero finishes.
- Year Zero NFL team strength must be fictional and seed-driven. Do not bias specific real teams to be good or bad.
- College and NFL ratings must remain separate 1-100 scales with explicit translation when a player enters the NFL.
- No final roster may contain broad selector positions such as ATH, ST, OT, IOL, or IDL.
- Formal executable tests are final-phase work. Runtime validators, type checks, compile checks, and tiny smoke checks are allowed early.

## Coding priorities
1. Load CSVs.
2. Validate schemas.
3. Implement deterministic RNG.
4. Implement Year Zero player-base bootstrap for fresh saves.
5. Generate annual players.
6. Convert positions.
7. Recruit and sign players.
8. Develop players.
9. Run injuries, production, morale, transfer, and draft systems.
10. Add debug exports and UI hooks.
11. Add and run formal tests as the final implementation phase.
12. Print the self-audit.

## Done means
- Core systems are implemented before test-suite expansion.
- CSV validation passes.
- Final-phase golden tests pass or exact failures are reported.
- Same seed produces same output.
- Active runtime files stay separated from control, test, deprecated, and unlisted files.
- No invalid final roster positions remain.
- Debug outputs explain Year Zero bootstrap, generation, development, transfer, and draft decisions.
