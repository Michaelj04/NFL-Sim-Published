# TESTS-LAST POLICY V11.6.4

## Purpose

Tests are important, but they are intentionally the final implementation phase for this package. The user wants Codex to spend early time on coding the player pipeline, not on long test loops.

## Rule

Do not write, expand, or run broad executable test suites until after the core systems and debug hooks are implemented.

## Implement before formal tests

1. CSV loader
2. Runtime CSV validator
3. Deterministic RNG
4. School profile builder
5. Recruit generation
6. Position conversion
7. Recruiting and signing
8. Rosters and depth charts
9. Development and training
10. Injuries, production, awards, morale, and promises
11. Transfer portal
12. Draft bridge and NFL import
13. Debug exports and minimal developer UI hooks

## Allowed before final test phase

These are allowed because they keep coding safe without turning the task into a test-heavy session:

- type checks
- compile checks
- runtime CSV validation while developing the loader
- tiny smoke checks for a module that was just implemented
- one-off deterministic seed checks when debugging RNG

## Deferred until final test phase

Do not prioritize these until implementation is complete:

- golden tests
- seeded snapshot tests
- long-run balance tests
- validator failure-case test files
- performance benchmark tests
- broad test-suite execution loops
- test fixture expansion beyond what is needed to unblock implementation

## Final test phase expectations

When the player pipeline is implemented, then add and run:

1. CSV parser and validator tests
2. validator failure-case tests
3. deterministic RNG and seeded snapshot tests
4. recruit generation tests
5. position conversion tests
6. recruiting and roster tests
7. development tests
8. injury, production, morale, and promise tests
9. transfer portal tests
10. draft bridge and NFL import tests
11. long-run balance tests
12. performance benchmarks

## Self-audit wording

If final tests are deferred by the user or by token limits, the self-audit must say so clearly instead of pretending tests passed.
