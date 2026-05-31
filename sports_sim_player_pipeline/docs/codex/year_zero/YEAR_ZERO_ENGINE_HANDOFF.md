# Year Zero Player Base Engine V11.6.4 Integrated Year Zero Handoff

## Purpose

This package defines a dedicated `yearZeroPlayerBaseEngine` for creating the entire fictional starting universe before the first playable season. It is standalone and intended to be merged into the full sports simulation package later.

## Non-negotiable rules

- Run once only during new save creation.
- Show loading/progress UI while generating the universe.
- Generate every player immediately. Do not lazily generate player bases.
- Use deterministic seed-based RNG streams.
- Do not allow partial regeneration from the UI.
- Generate full college rosters for all college teams.
- Every college team must start with exactly 105 players after transfer extraction and repair.
- Generate the initial transfer portal from existing college rosters, then repair source rosters back to 105.
- Generate the draft class from existing college players, not a disconnected pool.
- Use separate college and NFL 1-100 rating scales.
- Translate college prospects downward into the NFL scale at draft/projection time.
- Generate NFL active rosters, practice squads, rare reserve/stash players, and initial free agents.
- Do not automatically replenish NFL free agents after Year Zero.
- Generate detailed visible player histories for college and NFL players.
- Use evaluator-specific scouting views, especially for prospects.
- Do not use real-world NFL team strength anchors. All NFL teams are eligible for any fictional strength tier.
- Formal tests are last; allow only tiny compile, load, and smoke checks before final phase.

## Implementation order

1. CSV loader, parser rules, manifest handling, and strict schema validation.
2. Deterministic RNG stream manager for Year Zero.
3. Loading/progress UI state and progress-step events.
4. Fictional NFL team strength tier assignment and validation.
5. College program strength ranges and full 105-player roster targets.
6. College position distribution, class distribution, role/source mix, and redshirt/eligibility assignment.
7. High school recruit class, star outcomes, sleeper/bust outcomes, position distribution, and scouting views.
8. College player development backfill, production histories, injuries, awards, and histories.
9. Transfer portal extraction from college rosters, source/destination metadata, roster repair to 105.
10. Draft class selection from generated college players.
11. College-to-NFL rating translation and NFL projection views.
12. NFL veteran career reconstruction from high school, college, draft/UDFA origin, NFL development, awards, injuries, and aging/decline.
13. NFL active rosters, practice squads, reserve/stash statuses, free agents, contracts, and contract histories.
14. Evaluator-specific scouting views for colleges, NFL teams, public/media, and user team.
15. Debug exports and validation reports.
16. Formal tests only after the core end-to-end pipeline works.

## Primary docs to read

- `docs/codex/year_zero/YEAR_ZERO_ENGINE_HANDOFF.md`
- `docs/codex/year_zero/CSV_INDEX_YEAR_ZERO.md`
- `docs/codex/year_zero/YEAR_ZERO_ENGINE_HANDOFF.md`
- `docs/codex/year_zero/YEAR_ZERO_ENGINE_HANDOFF.md`
- `docs/codex/year_zero/CURRENT_GAME_REPLACEMENT_NOTES.md`
- `docs/codex/year_zero/LOADING_PROGRESS_UI.md`

## Replacement note

This engine should replace the current hardcoded NFL startup generation. Current free agency, cap, practice squad, waivers, roster AI, and scouting systems may be adapted, but Year Zero data should come from this CSV-driven bootstrap model.
