# Transfer And Draft Bridge


This module file is an extracted reading aid from `docs/codex/PLAYER_PIPELINE_HANDOFF.md`. The full handoff remains canonical.


TRANSFER PORTAL ENGINE

transferPortalEngine.ts must decide entries, destination scoring, commitment, and withdrawal.

Inputs:

- transfer_entry_reasons.csv
- transfer_destination_weights.csv
- transfer_transition_probabilities.csv
- morale
- promises
- depth chart
- production
- NIL
- school profiles
- recruiting relationships

Entry reasons:

- playing time blocked
- broken promise
- low morale
- coaching change or low staff fit
- NIL dissatisfaction
- homesickness
- wants higher level
- academic mismatch
- position change issue
- development stagnation

Destination scoring should include:

- projected playing time
- NIL fit
- distance
- prestige
- conference level
- scheme fit
- prior recruiting relationship
- academic fit
- roster need
- school transfer aggression

Transfer rules:

- Not all unhappy players transfer.
- Not all portal players land.
- Some players withdraw.
- FCS to FBS movement is possible but should be constrained by quality and demand.
- FBS to FCS movement is possible for playing time and role reasons.
- Portal volume must be checked against balance targets.


DRAFT ELIGIBILITY ENGINE

draftEligibilityEngine.ts must decide who can declare and who does declare.

Inputs:

- player class year
- years out of high school
- production
- awards
- true/scouted ability
- earlyDeclareAggression
- NIL status
- injury status
- projected draft grade
- morale and school situation

Rules:

- Underclassmen need enough years out of high school to declare.
- Seniors or exhausted eligibility players become auto eligible.
- Early declaration should depend on projected draft value, NIL, risk, personality, and school context.
- Draft decisions must be deterministic under seed.


ALL-STAR, COMBINE, PRO DAY

allStarEngine.ts, combineProDayEngine.ts, and draftScoutingEngine.ts must create the draft evaluation bridge.

Inputs:

- all_star_events.csv
- allstar_event_effects.csv
- combine_event_weights.csv
- pro_day_adjustments.csv
- draft_stock_component_weights.csv
- competition_translation.csv

All-star invitation should consider:

- production
- school level
- position
- seniority
- scouting grade
- awards
- need for evaluation

Combine and pro day should consider:

- physical profile
- attributes
- training
- injury status
- position-specific events
- pro day context
- randomness through named stream

Scouting output must include:

- consensus grade
- team-specific grades
- film production grade
- athletic grade
- medical grade
- age value
- competition translation grade
- all-star signal
- character grade
- projected round or UDFA
- explanation of major grade drivers


DRAFT BOARD ENGINE

draftBoardEngine.ts must create team-specific and consensus draft boards.

Inputs:

- draft_board_weights.csv
- draft_position_value.csv
- draft_stock_component_weights.csv
- draft_hit_rates.csv
- pick_values_257.csv
- nfl_team_archetypes.csv
- nfl_scouting_team_archetypes.csv
- NFL team needs from existing repo or adapter

Board grade components:

- film production
- traits and athleticism
- age
- medical
- competition translation
- all-star and combine signals
- character/personality
- positional value
- team need
- scheme fit
- scarcity
- risk tolerance

Output:

- consensus board
- team board
- projected round
- UDFA grade where relevant
- explanation for each meaningful board movement


NFL IMPORT ENGINE

nflImportEngine.ts must convert drafted and UDFA college players into the repo NFL player format.

Rules:

- Preserve player identity, school, position, physical profile, and history.
- Convert scouted/college ratings into NFL rookie ratings using draft and competition translation.
- Do not import ATH, ST, OT, IOL, or IDL as final positions.
- Attach draft metadata.
- Attach rookie contract or UDFA metadata if the repo supports it.
- Preserve hidden traits where the NFL development system uses them.
- Create adapter functions rather than rewriting unrelated NFL systems.
