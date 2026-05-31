# Implementation Order V11.6.4 Integrated Year Zero

Use this order for Codex. Do not start by writing broad test suites.

## Phase 0: wire package

- Load `data/year_zero_manifest.json`.
- Load and validate all active runtime CSV headers.
- Reject missing required CSVs.
- Expose a debug list of loaded CSVs.

## Phase 1: deterministic infrastructure

- Implement year-zero RNG stream names.
- Create stable IDs for generated players and histories.
- Make same seed produce same universe.

## Phase 2: loading UI

- Add progress screen.
- Emit phase progress events from `year_zero_loading_progress_steps.csv`.
- Do not allow partial regeneration.

## Phase 3: college base

- Generate college roster targets.
- Apply position profiles and class distributions.
- Assign class, eligibility, redshirt, source, role, and scholarship/walk-on status.
- Validate every team at 105.

## Phase 4: player histories

- Backfill college development.
- Generate production, awards, injury history, recruiting profile, and visible history rows.

## Phase 5: transfer portal

- Extract portal entrants from generated rosters.
- Assign transfer reasons and destination preferences.
- Repair source rosters back to 105 without replacing lost star quality.

## Phase 6: high school recruits

- Generate initial high school class.
- Apply star outcomes, sleeper/bust paths, position/body archetypes, and team-specific scouting views.

## Phase 7: draft class

- Select draft class from existing college players.
- Apply college-to-NFL translation, combine/testing, scouting uncertainty, and draft projections.

## Phase 8: NFL base

- Assign fictional team strength tiers.
- Generate NFL veterans through reconstructed career paths.
- Generate active rosters, practice squads, reserve statuses, and free agents.
- Generate detailed contracts and contract histories.

## Phase 9: scouting views

- Create evaluator-specific scouting views for recruits, transfers, and draft prospects.
- Keep one hidden truth per player.

## Phase 10: debug and final tests

- Add debug exports.
- Run tiny smoke checks first.
- Run formal golden and balance tests only after pipeline works end to end.

