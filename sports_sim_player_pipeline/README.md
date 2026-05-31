# Sports Sim Player Pipeline V11.6.3 Year Zero Integrated Codex Package

This is the cleaned Markdown-first, coding-first package for the sports sim player pipeline, including the integrated Year Zero player-base bootstrap engine.

## What this package is for

Use this package to guide Codex while implementing player generation, college development, transfer portal logic, draft bridge logic, CSV validation, deterministic RNG, debug exports, and final-phase tests.

## Core rules

- Implement from validated CSVs.
- Do not research new data unless explicitly asked.
- Do not create R scripts, RMarkdown files, scrapers, or research pipelines.
- Build systems first.
- Save formal executable tests for the final implementation phase.
- Use `data/active_file_manifest.json` as the CSV source of truth.

## Start

Read `AGENTS.md`, then `CODEX_START_HERE.md`.


## V11.6.3 Year Zero integration

This version integrates the consolidated Year Zero player-base research bundle.

Added runtime bundles: 20
Preserved Year Zero source rows: 14939

Start with `CODEX_START_HERE.md`, then use `docs/codex/YEAR_ZERO_INTEGRATION_GUIDE.md` for fresh-save player-base implementation.
