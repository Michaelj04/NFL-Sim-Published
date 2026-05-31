# Year Zero Player Base Engine V11.6.3 Integrated

This is the integrated Year Zero player-base bootstrap package. It keeps the same researched content, but reduces active runtime CSV bloat by bundling related small CSVs by subsystem.

## Why this version exists

The full Year Zero research set had 360 active source CSVs. Many were tiny examples, algorithm notes, research-basis rows, or validation targets. That was too much for Codex to scan efficiently.

V11.6.3 keeps the detail but exposes the active runtime layer as 19 domain bundles.

## Start here

1. `CODEX_START_HERE_YEAR_ZERO.md`
2. `docs/codex/year_zero/CSV_CONSOLIDATION_GUIDE.md`
3. `docs/codex/year_zero/YEAR_ZERO_ENGINE_HANDOFF.md`
4. `data/year_zero_manifest.json`

## Active runtime CSV count

- Original Year Zero source CSVs represented: 360
- Active Year Zero runtime bundles: 19

## Important rule

Do not treat every record in a bundle as normal runtime tuning. Use `record_category`:

- Runtime gameplay categories: `runtime_tuning`, `weight_distribution`, `modifier`, `rule`, and `definition`.
- Validation/reporting-only categories: `target`, `validation_target`, and `debug_schema`.
- Implementation/reference-only categories: `algorithm`, `example`, and `research_basis`.
