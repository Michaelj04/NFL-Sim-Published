# PLANS

Use this file when implementing any non-trivial player-pipeline feature.

## When to make a plan

Make a short implementation plan before changing code for:

- CSV loading and validation
- deterministic RNG
- recruit generation
- position conversion
- college roster import
- training and development
- injuries and recovery
- production and awards
- morale and promise tracking
- transfer portal
- draft eligibility
- all-star, combine, and pro day
- draft board and NFL import
- debug UI or exports
- final-phase test suite work

## Tests-last planning rule

For normal implementation tasks, do not put executable test creation or broad test-suite runs in the middle of the plan.

Instead, use this split:

- During implementation: type checks, compile checks, runtime validation, and tiny smoke checks only.
- Final phase: golden tests, seeded snapshots, validator failure tests, balance tests, performance tests, and broad test-suite runs.

## Plan format

```md
# Plan: <feature name>

## Scope
- What this change implements.
- What it does not implement.

## Files to read first
- `AGENTS.md`
- `CODEX_START_HERE.md`
- Relevant `docs/codex/*.md` files
- Relevant CSVs in `data/`

## Implementation steps
1. Loader or type changes.
2. Validation changes.
3. System logic changes.
4. Debug output or small smoke check if needed.
5. Defer formal executable tests until the final test phase unless the user explicitly asks otherwise.

## Acceptance checks before final test phase
- Code compiles or type-checks where practical.
- Runtime CSV validation logic exists.
- System output is inspectable through debug/export paths.
- No forbidden research or R files are added.

## Final test phase acceptance checks
- CSV validation tests pass.
- Golden tests pass.
- Seeded output is deterministic.
- Long-run balance checks are reported.
```

## Planning constraints

- Do not plan research tasks unless the user explicitly requested research.
- Do not plan R scripts, RMarkdown notebooks, scraping, or extraction pipelines.
- Prioritize implementation first and formal executable tests last.
- If a feature depends on missing data, add a clear adapter or TODO, but do not invent a research pipeline.
