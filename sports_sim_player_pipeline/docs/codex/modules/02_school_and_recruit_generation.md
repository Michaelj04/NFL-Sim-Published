# School And Recruit Generation


This module file is an extracted reading aid from `docs/codex/PLAYER_PIPELINE_HANDOFF.md`. The full handoff remains canonical.


SCHOOL PROFILE BUILDER

buildSchoolProfiles.ts must combine:

- schools_master.csv
- campus_locations_verified.csv
- school_archetypes.csv
- school_finance_proxies.csv
- school_recruiting_power.csv
- school_success_history.csv
- school_academic_rules.csv
- nil_market_proxies.csv
- staff_effects.csv
- school_class_size_ranges.csv
- roster_templates.csv
- school_overrides_curated.csv
- school_overrides_manual_top_programs.csv
- existing repo school/team data through adapters

Precedence:

1. schools_master.csv is the identity and school_id authority.
2. campus_locations_verified.csv is the geography authority.
3. school_overrides_manual_top_programs.csv overrides curated and computed values where present.
4. school_overrides_curated.csv overrides computed profile values where present.
5. Synthetic proxies fill gameplay scores where no manual override exists.
6. Existing repo school objects can provide display and integration fields, but must not override campus geography unless the adapter explicitly maps that field with validation.

Every school profile must include:

- schoolId
- schoolName
- mascot
- subdivision
- subdivisionLevel
- conference
- city
- state
- latitude
- longitude
- timezone
- campusRegion
- programTier
- rosterTemplate
- prestige
- competition
- facilities
- development
- recruitingPower
- nilPower
- academicStrictness
- transferAggression
- portalAggression
- primaryPipelineStates
- secondaryPipelineStates
- scheme
- staff profile

Validation requirements:

- Every active FBS and FCS school in the repo must map to exactly one school_id.
- Every school_id in schools_master.csv must have geography.
- Every school profile must have a subdivisionLevel.
- Every school profile must have roster targets.
- Every school profile must have class size ranges.
- Overrides must not create values outside accepted ranges.


RECRUIT GENERATION ENGINE

recruitGenerator.ts must generate a national annual recruit class without high school games.

Inputs:

- star_distribution.csv
- state_talent_weights.csv
- position_distribution_rules.csv
- position_distribution.csv
- player_personality_archetypes.csv
- rating_input_mapping.csv
- rating_aliases.csv
- formula_input_defaults.csv
- balance_targets.csv
- deterministic_rng_streams.csv

Required flow:

1. Determine total class size from balance targets or configuration.
2. Allocate star counts from star_distribution.csv.
3. Allocate recruit home states from state_talent_weights.csv.
4. Allocate generation position groups from position_distribution_rules.csv.
5. Roll physical profile by position group.
6. Roll hidden true overall and true potential from star prior plus randomness.
7. Roll hidden development traits.
8. Roll core attributes from position templates and true ability.
9. Roll personality archetype.
10. Create scouting uncertainty ranges.
11. Assign national, state, and position ranks from visible/scouted values.
12. Store debug explanation for each generated player.

Stars rule:

Stars are a prior, not a ceiling or guarantee. A 3-star can develop into a star. A 5-star can stagnate or bust. Star level influences initial probability distributions, but development depends on hidden traits, coaching, playing time, morale, injuries, and volatility.

Scouting rule:

Visible range width should depend on confidence. Lower confidence creates wider ranges. Higher confidence creates narrower ranges. School scouting quality may increase confidence, but it must not reveal true values on normal screens.

Recruit output must include:

- identity
- home state and optional coordinates
- generationPosition
- possible finalPosition only after conversion
- secondary positions
- physical profile
- core attributes
- hidden traits
- scouted values
- star level
- ranking fields
- open commitment state
- empty or generated offer list
- debug explanation


POSITION CONVERSION HARD RULES

Generation positions allowed:

- QB
- RB
- WR
- TE
- OT
- IOL
- EDGE
- IDL
- LB
- CB
- S
- K
- P
- ATH
- ST

Final roster positions allowed:

- QB
- RB
- WR
- TE
- LT
- LG
- C
- RG
- RT
- EDGE
- DL
- LB
- CB
- S
- K
- P

Conversion requirements:

- ATH converts before signing or roster import.
- ST converts to K or P before signing or roster import.
- OT converts to LT or RT.
- IOL converts to LG, C, or RG.
- IDL converts to DL.
- EDGE remains EDGE unless the repo uses another equivalent. If the repo lacks EDGE, adapter must map it deliberately.

ATH conversion should consider:

- attribute fit
- physical size
- secondary positions
- school roster needs
- recruiting promise
- position scarcity
- deterministic RNG stream

ST conversion should consider:

- kicking attribute
- punting/proxy attribute if present
- roster target need
- player profile
- deterministic RNG stream

Reject any signed or roster-imported player whose final position is ATH, ST, OT, IOL, or IDL.


RECRUITING ENGINE

recruitingEngine.ts must implement school target boards, offers, visits, commitments, decommitments, and signing.

Inputs:

- school profiles
- recruit_interest_weights.csv
- recruiting_calendar.csv
- recruiting_pipeline_state_weights.csv
- nil_player_demand_model.csv
- nil_position_budget_shares.csv
- promise_types.csv
- morale_promise_params.csv
- school_class_size_ranges.csv
- roster_position_targets.csv
- current roster needs

School board generation:

1. Build initial school needs from roster targets and graduating players.
2. Score prospects for school fit.
3. Narrow board by school level, recruiting power, geographic reach, star reach, academic fit, and position need.
4. Assign target priority.
5. Keep board size bounded for performance.

Recruit interest formula should include:

- distance from home to campus
- home state pipeline status
- school prestige
- recent success
- conference or subdivision level
- NIL offer strength
- projected playing time
- position need
- scheme fit
- academic fit
- staff recruiting score
- relationship score
- campus visit impact
- promises
- recruit personality sensitivities

Commitment behavior:

- Soft commitments can decommit.
- Hard commitments should be much more stable.
- Signing day finalizes signedSchoolId.
- A player should not sign with multiple schools.
- Unsigned players can become late signees, walk-ons, JUCO-like future pool, or be discarded based on package rules.

Debug explanation for recruiting decisions must show:

- top factors
- normalized score
- RNG stream
- offer status
- visit impact
- NIL effect
- promise effect
- distance effect
- playing-time effect
- reason for commit, decommit, or rejection
