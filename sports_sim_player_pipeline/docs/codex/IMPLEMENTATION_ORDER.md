# IMPLEMENTATION ORDER V11.6 YEAR-ZERO-INTEGRATED CODING-FIRST TESTS-LAST

Follow `data/implementation_control_csvs/implementation_execution_checklist_v11.csv` as the machine-readable source. This document explains the same order in plain language.

## Tests-last rule

Build the game systems first. Add and run formal executable tests only after the core pipeline and debug hooks are implemented.

Runtime validators, type checks, compile checks, and small smoke checks are allowed during implementation. Golden tests, seeded snapshot tests, long-run balance tests, performance tests, and broad test-suite execution are final-phase work.

## 1. Package loading and cleanup

Load `active_file_manifest.json`. Confirm the package has no runtime R or research-extractor dependency. Remove or ignore old `research_extractors`, `r_scripts`, `analysis_scripts`, `*.R`, and `*.Rmd` content.

## 2. CSV loader and runtime validator

Build the parser and runtime validator first. No gameplay engine should run before data validation exists.

Do not spend this phase building the full test suite. Build only the runtime validation code and any tiny smoke checks needed to keep implementation moving.

## 3. Year Zero player-base bootstrap

Implement the one-time fresh-save `yearZeroPlayerBaseEngine` before normal annual generation systems.

Required outputs:

- loading/progress screen hooks for new save creation
- full college rosters at 105 players per school
- initial transfer portal extracted from real generated rosters
- transfer roster repair back to 105
- high school recruit class
- draft class selected from existing college players
- separate college and NFL rating scales
- college-to-NFL translation
- NFL veterans reconstructed from career paths
- NFL active rosters, practice squads, reserve statuses, and free agents
- detailed player histories, contracts, injuries, awards, and team-specific scouting views
- fictional seed-driven NFL team-strength ranges only

Use `docs/codex/YEAR_ZERO_INTEGRATION_GUIDE.md` and `docs/codex/year_zero/`.

Do not run formal test suites yet. Allowed early checks are manifest validation, bundle parsing smoke checks, and one tiny deterministic new-save smoke check.

## 4. School profiles

Create school profiles from active school CSVs and existing repo teams. Use campus geography as the authority.

## 5. Annual recruit generation

Generate deterministic national recruit classes with hidden true values and visible scouting ranges.

## 6. Position conversion

Convert ATH/ST/OT/IOL/IDL before signing or roster import.

## 7. Recruiting and signing

Create school boards, offers, visits, commitments, decommitments, signing day, and final-position conversion.

## 8. Rosters and depth charts

Create college rosters, redshirts, cuts, walk-ons, depth charts, and snap shares.

## 9. Development and season systems

Implement training, development banks, injuries, recovery, production, stats, awards, morale, and promises.

## 10. Transfer portal

Implement entry reasons, destination scoring, withdrawal, commitments, and player history.

## 11. Draft bridge and NFL import

Implement declaration, all-star events, combine, pro day, scouting, consensus board, team-specific boards, and rookie import.

## 12. Minimal debug UI and exports

Build only functional debug screens behind a developer toggle. Debugging tools should exist before final tests so failures are easier to diagnose.

## 13. Final tests and calibration

After the implementation above exists, add validator failure tests, golden tests, seeded snapshot tests, long-run balance tests, and performance benchmarks.

## 14. Self-audit

Print the table required by `data/implementation_control_csvs/self_audit_requirements.csv`. If tests were not fully completed, say so honestly.
