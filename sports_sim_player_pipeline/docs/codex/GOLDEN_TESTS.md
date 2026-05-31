# GOLDEN TESTS V11.6.4 FINAL PHASE ONLY

Use `data/test_fixtures/` as executable test inputs.

## Tests-last rule

Do not write, expand, or run these tests until the core player pipeline and debug hooks are implemented. During early coding, rely on runtime validators, type checks, compile checks, and tiny smoke checks only.

## Required final-phase tests

1. CSV parser accepts valid package CSVs.
2. Validator rejects each row in `validator_failure_cases.csv` when the mutation is applied.
3. Same seed creates identical recruit class IDs, ranks, and conversion decisions.
4. Signed players never have ATH, ST, OT, IOL, or IDL as final positions.
5. NIL budget shares sum to 1.0.
6. Transfer transition probabilities sum to 1.0 by `from_level`.
7. Draft board weights sum to 1.0 by position group or default row.
8. Pick values cover 1 through 257 and are non-increasing.
9. Golden fixture ATH and ST players convert correctly.
10. Fresh universe initialization works without old-save migration.
11. Draft pipeline creates 257 drafted players and valid UDFAs.
12. Team-specific draft boards differ for at least several teams.
13. Performance benchmark reports are produced.
14. Self-audit table is printed.

## If final tests are skipped

If the user asks Codex to stop before the final test phase, the self-audit must mark tests as `Not Completed` or `Deferred by user`, not as passing.
