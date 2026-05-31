# Scheduler, Debug, and Final Tests

This module file is an extracted reading aid from `docs/codex/PLAYER_PIPELINE_HANDOFF.md`. The full handoff remains canonical.

## Tests-last rule

Executable tests are intentionally last. Implement the scheduler, calibration hooks, debug exports, and developer UI hooks first. Then write and run tests as the final implementation phase.

Allowed before final tests:

- type checks
- compile checks
- runtime CSV validation
- tiny smoke checks for recently implemented modules
- one-off deterministic seed checks while debugging RNG

Deferred until final tests:

- golden tests
- seeded snapshot tests
- validator failure-case test files
- long-run balance tests
- performance benchmark tests
- broad test-suite execution loops

## Pipeline scheduler

`pipelineScheduler.ts` must run engines according to `calendar_events.csv` and `yearly_progression_gates.csv`.

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

## Debug exports before tests

Build debug/export tools before formal tests so failures are easier to inspect.

Required debug outputs:

- loaded active CSV list
- schema validation report
- RNG stream usage report
- recruit generation trace
- position conversion trace
- recruiting decision explanation
- development delta explanation
- injury and recovery explanation
- morale and promise ledger view
- transfer portal decision trace
- draft board component breakdown
- NFL import summary

## Performance requirements

Use `performance_constraints.csv` and `performance_benchmarks.csv`.

Do not run dense all-school by all-recruit scoring every tick. Use:

- cached school profiles
- narrowed recruiting boards
- sparse player deltas
- batch commits
- stable sorted processing order
- named RNG streams
- indexes by school, state, position, star, and class year

Performance benchmark tests are final-phase work. The performance-aware implementation should still be written from the start.

## Final validation tests

Use `data/test_fixtures/` only after the core pipeline exists.

Required final test categories:

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

## Golden tests

Golden tests should use fixed players and teams from `data/test_fixtures/`. They should assert exact or range-bounded behavior depending on the system.

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

## Calibration runner

Create `runPipelineCalibration.ts` or equivalent after the scheduler and systems exist. It must be runnable from final tests or a dev command. It should simulate with fixed seeds and output aggregate metrics without requiring UI.

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

Calibration runner should compare outputs against:

- `balance_targets.csv`
- `long_run_balance_targets.csv`
- `seeded_snapshot_expectations.csv`
- `golden_test_numeric_assertions.csv`

## Final self-audit

If tests are not completed, mark them honestly as incomplete or deferred. Do not claim golden tests passed unless they were actually implemented and run.
