# College Roster Development


This module file is an extracted reading aid from `docs/codex/PLAYER_PIPELINE_HANDOFF.md`. The full handoff remains canonical.


COLLEGE ROSTER ENGINE

collegeRosterEngine.ts must initialize every FBS and FCS program with a valid roster.

Inputs:

- roster_templates.csv
- roster_position_targets.csv
- school_class_size_ranges.csv
- walk_on_generation_rules.csv
- position_group_conversion.csv
- school profiles
- signed recruits
- signed transfers

Required flow:

1. For each school, determine roster template.
2. Generate or import returning players for each class year.
3. Fill freshmen from signed recruits.
4. Fill transfer additions.
5. Fill remaining holes with walk-ons.
6. Convert every broad position to final position.
7. Assign scholarship or walk-on status.
8. Assign class year, eligibility, redshirt status, and years out of high school.
9. Validate roster caps and position minimums.
10. Emit debug report for underflow, overflow, cuts, and walk-ons.

Roster rules:

- Every playable team must have enough players to run offense, defense, and special teams.
- Walk-ons exist to prevent roster holes, not to create elite prospects.
- Roster cuts should respect minimums by position.
- Redshirts should be assigned conservatively and explained.


DEPTH CHART AND SNAP SHARE

depthChartEngine.ts and snapShareEngine.ts must convert rosters into playable usage.

Inputs:

- depth_chart_weights.csv
- snap_share_rules.csv
- roster_position_targets.csv
- position_stat_profiles.csv
- injuries
- redshirt status
- morale
- coach trust
- promises

Depth chart scoring should include:

- current ability
- position fit
- class and experience
- coach trust
- injury availability
- fatigue
- morale
- practice/development performance
- promise obligations
- special teams value

Snap share rules:

- Starters receive baseline snap share by position and scheme.
- Rotational positions such as DL, EDGE, WR, RB, and DB can have wider distributions.
- Injured, redshirted, or academically ineligible players cannot receive normal snaps.
- Special teams snaps must be assigned separately.
- Snap shares should sum to valid team unit totals.


TRAINING AND DEVELOPMENT ENGINE

trainingEngine.ts creates development banks. developmentEngine.ts applies gains, plateaus, breakouts, and regression pressure.

Inputs:

- development_yearly_curves.csv
- yearly_progression_gates.csv
- staff_effects.csv
- player_personality_archetypes.csv
- morale_model_weights.csv
- injury files
- production output
- snap share
- coach trust

Development concept:

Potential is a range of possible outcomes, not a guarantee. Development is probability-weighted movement through that range.

Required player development factors:

- truePotential
- developmentRate
- workEthic
- coachability
- footballIQ
- volatility
- class year
- age and years out of high school
- staff development quality
- strength coach
- position coach effect
- playing time
- production
- morale
- confidence
- injuries
- fatigue
- redshirt status
- competition level

Training banks:

- athleticBank
- technicalBank
- mentalBank
- recoveryBank
- fatigue
- regressionPressure

Weekly training:

1. Determine eligible players.
2. Add training bank values from staff, workload, player traits, morale, and role.
3. Apply fatigue and recovery.
4. Do not instantly mutate all ratings every day.
5. Store sparse deltas.
6. Apply major development at defined calendar gates.

Yearly development:

1. Identify progression gate.
2. Compute expected gain from curve row.
3. Modify by hidden traits, staff, role, morale, injury, and playing time.
4. Apply volatility.
5. Check breakout or stagnation chance.
6. Respect soft and hard potential ceilings.
7. Apply rating-specific gains based on position and training bank.
8. Apply regression pressure where appropriate.
9. Update scouted values and confidence.
10. Emit debug explanation.

Development must not:

- guarantee elite outcomes for high stars
- ignore hidden potential
- ignore injury history
- mutate every player on the main thread daily
- reveal true potential in normal UI


INJURY ENGINE

injuryEngine.ts must handle occurrence, severity, duration, recovery, recurrence, and long-term wear.

Inputs:

- injury_base_rates.csv
- injury_family_params.csv
- injury_severity_distribution.csv
- injury_recurrence.csv
- workload and snap share
- durability
- injuryRisk
- fatigue
- position

Required flow:

1. Determine injury exposure from snaps, workload, and event context.
2. Roll injury occurrence through named RNG stream.
3. Select injury family from eligible weighted rows.
4. Select severity.
5. Determine days missed.
6. Apply immediate availability effects.
7. Apply long-term penalties only when severity and family justify it.
8. Update recurrence risk.
9. Feed medical red flags into draft scouting.
10. Emit debug explanation.

Injuries should affect:

- availability
- depth chart
- snap share
- training banks
- development gains
- draft medical grade
- morale
- transfer risk when role changes


PRODUCTION AND AWARDS ENGINE

productionEngine.ts must create college production inputs and position-specific stats. awardsEngine.ts must assign awards using production, role, team success, and competition context.

Inputs:

- production_formula_params.csv
- college_production_weights.csv
- stat_generation_curves.csv
- position_stat_profiles.csv
- competition_translation.csv
- snap_share_rules.csv
- awards_impact.csv
- existing or lightweight college game output

Production flow:

1. Get team context from existing college game simulation or lightweight generator.
2. Read depth chart and snap share.
3. Compute player production score from attributes, usage, opponent strength, scheme fit, morale, and health.
4. Convert production score into position-specific stat categories.
5. Aggregate season and career stats.
6. Feed production into awards, draft stock, morale, and development feedback.

If the repo does not simulate detailed college games yet, implement a lightweight stat generator rather than blocking the pipeline.

Awards should consider:

- production
- team success
- conference or subdivision strength
- class year
- position group
- prior reputation
- award eligibility
- reasonable randomness


MORALE AND PROMISE ENGINE

moralePromiseEngine.ts must track morale and promises across recruiting, roster, playing time, NIL, development, injuries, and transfers.

Inputs:

- morale_model_weights.csv
- morale_promise_params.csv
- promise_types.csv
- NIL files
- depth chart
- snap share
- production
- recruiting promises

Promise lifecycle:

1. Promise made during recruitment or retention.
2. Promise stored on player and school.
3. Fulfillment condition evaluated at calendar gates.
4. Promise marked fulfilled, broken, expired, or active.
5. Morale and transfer risk adjusted.
6. Debug explanation created.

Morale should be affected by:

- playing time vs expectation
- depth chart movement
- wins and losses
- development satisfaction
- NIL satisfaction
- role fit
- broken promises
- injuries
- transfer interest
- coach trust
- awards and recognition
