# CSV DATA DICTIONARY V11.6.4 FULL DETAIL

This file explains what every CSV in the package is for and how Codex should use it. The CSV files are source data for implementation, not research tasks.

## active_runtime_csvs

### `academic_eligibility_model.csv`

- Rows included: 5
- Purpose: Defines academic qualification tiers and probabilities used when recruits, transfers, and college players are checked against school academic standards.
- Columns: `component`, `required_value`, `weight`, `description`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `all_star_events.csv`

- Rows included: 3
- Purpose: Defines draft-path showcase events such as Senior Bowl style games, lower-tier showcases, and position group eligibility.
- Columns: `event_id`, `event_name`, `eligible_classes`, `target_invites`, `level_focus`, `base_scouting_confidence_gain`, `max_draft_delta`, `small_school_validation_bonus`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `allstar_event_effects.csv`

- Rows included: 3
- Purpose: Maps all-star invitation, attendance, and performance signals into scouting, draft stock, confidence, and risk adjustments.
- Columns: `event`, `invite_bonus`, `practice_winner_bonus`, `game_mvp_bonus`, `draft_floor_raise`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `ath_conversion_rules.csv`

- Rows included: 3
- Purpose: Converts ATH recruits into valid playable positions using position weights, physical profile, ratings, and school roster needs.
- Columns: `ath_bucket`, `height_min_in`, `height_max_in`, `weight_min_lb`, `weight_max_lb`, `primary_map`, `secondary_map`, `speed_bias`, `position_vector`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `awards_impact.csv`

- Rows included: 6
- Purpose: Defines how awards influence morale, draft stock, prestige feedback, player confidence, and school reputation.
- Columns: `award`, `award_group`, `draft_board_bonus`, `nil_bonus_pct`, `media_bonus`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `balance_targets.csv`

- Rows included: 8
- Purpose: Sets target ranges for generated class sizes, position mix, star counts, roster health, development output, draft output, portal volume, and long-run sanity checks.
- Columns: `metric`, `target_mean`, `lower_bound`, `upper_bound`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `calendar_events.csv`

- Rows included: 8
- Purpose: Defines the yearly pipeline schedule and which engines run during each phase or date window.
- Columns: `event_id`, `phase`, `month`, `day_start`, `day_end`, `week_hint`, `applies_to`, `hard_gate`, `description`, `engine_effect`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `campus_locations_verified.csv`

- Rows included: 3
- Purpose: Authoritative campus geography file. City, state, latitude, longitude, timezone, and region in this file override conflicting school files.
- Columns: `school_id`, `school_name`, `city`, `state`, `lat`, `lon`, `timezone`, `geo_precision`, `verification_status`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `college_production_weights.csv`

- Rows included: 13
- Purpose: Defines how attributes, snap share, depth role, opponent strength, scheme, and class year combine into college production scores.
- Columns: `position_group`, `overall_weight`, `snap_share_weight`, `scheme_usage_weight`, `opponent_strength_weight`, `team_quality_weight`, `game_script_weight`, `randomness_weight`, `level_comp_mult_key`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `combine_event_weights.csv`

- Rows included: 104
- Purpose: Defines combine and testing event weights by position for athletic grade and draft board movement.
- Columns: `position_group`, `event_name`, `weight`, `include_in_athletic_composite`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `competition_translation.csv`

- Rows included: 5
- Purpose: Translates college production by subdivision, conference tier, opponent strength, and role into NFL scouting value.
- Columns: `competition_tier`, `stat_mult_pass`, `stat_mult_rush`, `stat_mult_defense`, `draft_eval_mult`, `nil_visibility_mult`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `csv_parser_rules.csv`

- Rows included: 6
- Purpose: Defines parser behavior for blanks, booleans, numbers, arrays, enums, comments, duplicate keys, and failure behavior.
- Columns: `rule_type`, `applies_to`, `accepted_values`, `normalization`, `hard_fail`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `csv_schema_registry.csv`

- Rows included: 528
- Purpose: Runtime schema contract. Every active CSV column is validated against this file before the pipeline can initialize.
- Columns: `csv_name`, `column_name`, `type`, `required`, `min`, `max`, `allowed_values`, `foreign_key`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `csv_supersession_map.csv`

- Rows included: 7
- Purpose: Declares active, reference, test, implementation-only, and deprecated files so Codex does not load the wrong table.
- Columns: `old_file`, `new_file`, `status`, `runtime_use`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `data_precedence_rules.csv`

- Rows included: 5
- Purpose: Defines which source wins when multiple files contain related information, especially school geography, manual overrides, and gameplay tuning.
- Columns: `domain`, `primary_source`, `secondary_source`, `rule`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `data_provenance.csv`

- Rows included: 5
- Purpose: Marks whether data is empirical, inferred, or synthetic tuning so gameplay code knows what is calibration versus factual input.
- Columns: `csv_name`, `source_name`, `source_type`, `confidence_level`, `extract_method`, `last_verified`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `depth_chart_weights.csv`

- Rows included: 13
- Purpose: Defines how overall, position fit, class, coach trust, injury status, fatigue, promises, and role needs determine depth chart order.
- Columns: `position_group`, `overall`, `position_fit`, `experience`, `coach_trust`, `scheme_fit`, `recent_form`, `promise_pressure`, `injury_readiness`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `deterministic_rng_streams.csv`

- Rows included: 8
- Purpose: Declares named RNG streams and seed derivation rules for reproducible generation, recruiting, development, injury, transfer, and draft behavior.
- Columns: `stream_id`, `seed_namespace`, `allowed_engines`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `development_yearly_curves.csv`

- Rows included: 13
- Purpose: Main college development curve table. Controls expected gains, ceilings, volatility, and regression pressure by class year, position, potential, and archetype.
- Columns: `position_group`, `year1_gain`, `year2_gain`, `year3_gain`, `year4_gain`, `playing_time_weight`, `redshirt_weight`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `draft_board_weights.csv`

- Rows included: 7
- Purpose: Defines how teams combine film, athleticism, age, medical, production, competition, character, scheme fit, and need into board grades.
- Columns: `position_group`, `film_prod_w`, `athletic_w`, `age_w`, `medical_w`, `competition_w`, `allstar_w`, `character_w`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `draft_hit_rates.csv`

- Rows included: 35
- Purpose: Calibration targets for draft value, starter chance, bust chance, and NFL survival by projected round or board tier.
- Columns: `star_bucket`, `position_group`, `draft_prob`, `early_round_prob`, `starter_hit_prob`, `impact_hit_prob`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `draft_position_value.csv`

- Rows included: 9
- Purpose: Position value and scarcity table used by draft board, recruiting value, roster construction, and trade-related downstream systems.
- Columns: `position_group`, `draft_position_value`, `round1_bonus`, `day3_discount`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `draft_stock_component_weights.csv`

- Rows included: 91
- Purpose: Defines how all draft stock factors combine into consensus and team-specific grades.
- Columns: `position_group`, `component`, `weight`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `formula_input_defaults.csv`

- Rows included: 3
- Purpose: Explicit defaults for optional formula inputs. Defaults are allowed only when listed here and must be reported in validation audit.
- Columns: `formula`, `input_name`, `default_value`, `allowed_fallback`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `injury_base_rates.csv`

- Rows included: 26
- Purpose: Base injury probability by position group, event type, workload, and calendar context.
- Columns: `event_type`, `position_group`, `base_daily_risk`, `contact_level`, `load_sensitivity`, `repeat_injury_mult`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `injury_family_params.csv`

- Rows included: 8
- Purpose: Duration, severity, recurrence, and attribute impact parameters by injury family.
- Columns: `injury_family`, `base_recurrence_pct`, `games_missed_mean`, `perm_speed_penalty`, `perm_strength_penalty`, `perm_awareness_penalty`, `durability_penalty`, `draft_medical_penalty`, `position_sensitivity`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `injury_recurrence.csv`

- Rows included: 5
- Purpose: Recurring injury and wear rules that increase future risk and possible permanent decline.
- Columns: `injury_family`, `recurrence_mult`, `permanent_athletic_loss_chance`, `potential_loss_min`, `potential_loss_max`, `position_sensitivity`, `recovery_bank_mult`, `draft_medical_penalty_min`, `draft_medical_penalty_max`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `injury_severity_distribution.csv`

- Rows included: 32
- Purpose: Weighted severity table used after an injury family is selected.
- Columns: `injury_family`, `severity`, `probability`, `min_days`, `max_days`, `season_ending_prob`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `morale_model_weights.csv`

- Rows included: 7
- Purpose: Weights for morale changes from playing time, promises, NIL, winning, role, development, transfer pressure, and depth chart movement.
- Columns: `component`, `weight`, `min_effect`, `max_effect`, `description`, `affects`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `morale_promise_params.csv`

- Rows included: 5
- Purpose: Promise types, fulfillment checks, morale penalties, recruiting effects, and transfer risk effects.
- Columns: `driver`, `weight`, `good_threshold`, `bad_threshold`, `transfer_trigger_bonus`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `nfl_scouting_team_archetypes.csv`

- Rows included: 4
- Purpose: Team scouting behavior profiles that modify how NFL teams value position, production, risk, age, character, and combine results.
- Columns: `archetype`, `production_weight`, `traits_weight`, `medical_conservatism`, `small_school_confidence`, `combine_weight`, `interview_weight`, `regional_bias`, `risk_tolerance`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `nfl_team_archetypes.csv`

- Rows included: 32
- Purpose: NFL team archetype file for scheme, roster preference, draft board bias, and personnel philosophy.
- Columns: `team_id`, `archetype`, `weight_traits`, `weight_production`, `weight_age`, `weight_medical`, `weight_competition`, `weight_allstar`, `small_school_confidence`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `nil_market_proxies.csv`

- Rows included: 3
- Purpose: Synthetic school NIL strength proxy used for recruiting, retention, transfer portal, and morale. It is gameplay calibration, not factual budget data.
- Columns: `school_id`, `tier`, `nil_proxy_score`, `football_nil_pool_mean_usd`, `retention_pool_pct`, `hs_pool_pct`, `portal_pool_pct`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `nil_player_demand_model.csv`

- Rows included: 7
- Purpose: Player-side NIL demand model by star, position, production, awards, transfer status, and market fit.
- Columns: `component`, `weight`, `description`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `nil_position_budget_shares.csv`

- Rows included: 13
- Purpose: Defines expected NIL allocation by position group and roster priority.
- Columns: `position_group`, `football_budget_share`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `performance_constraints.csv`

- Rows included: 4
- Purpose: Runtime performance targets and hard limits for class size, update batch sizes, cached calculations, and long-run simulation costs.
- Columns: `constraint_id`, `hard_rule`, `threshold_or_target`, `implementation_requirement`, `failure_mode_to_prevent`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `pick_values_257.csv`

- Rows included: 257
- Purpose: Draft slot value table for picks 1 through 257 used by draft calibration and downstream trade or roster value systems.
- Columns: `pick`, `round`, `pick_value`, `internal_value_default`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `player_personality_archetypes.csv`

- Rows included: 5
- Purpose: Hidden player personality archetypes affecting loyalty, morale, development consistency, transfer risk, promises, and early declaration behavior.
- Columns: `personality`, `work_ethic_mult`, `coachability_mult`, `nil_sensitivity`, `playing_time_sensitivity`, `distance_sensitivity`, `loyalty_mult`, `decommit_risk_mult`, `portal_risk_mult`, `early_declare_aggression`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `position_distribution.csv`

- Rows included: 13
- Purpose: Simple position distribution table retained as active support data for roster generation and sanity checks.
- Columns: `position_group`, `spawn_pct`, `athlete_reclass_pct`, `height_mu`, `height_sigma`, `weight_mu`, `weight_sigma`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `position_distribution_rules.csv`

- Rows included: 3
- Purpose: Primary weighted position generation table by star band, roster need, state, school level, and class context.
- Columns: `tier`, `qb_min`, `rb_min`, `wr_min`, `te_min`, `ol_min`, `dl_min`, `lb_min`, `db_min`, `spec_min`, `ath_target`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `position_group_conversion.csv`

- Rows included: 7
- Purpose: Converts broad generation groups such as OT, IOL, IDL, and ST into final playable roster positions.
- Columns: `source_group`, `stage`, `allowed_final_repo_positions`, `default_weights_json`, `hard_rule`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `position_selector_aliases.csv`

- Rows included: 9
- Purpose: Canonicalizes position-like strings so code can safely parse OL, DB, EDGE, ST, OT, IOL, IDL, K/P, and similar aliases.
- Columns: `alias`, `canonical_selector`, `selector_type`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `position_stat_profiles.csv`

- Rows included: 13
- Purpose: Defines which stat fields matter for each position and how production converts into box score output.
- Columns: `position_group`, `primary_stats`, `volume_driver`, `efficiency_driver`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `pro_day_adjustments.csv`

- Rows included: 3
- Purpose: School and context modifiers for pro day testing and scouting interpretation.
- Columns: `measurement`, `pro_day_bias`, `max_positive_delta`, `max_negative_delta`, `confidence_penalty`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `production_formula_params.csv`

- Rows included: 5
- Purpose: Shared production formula coefficients for college player usage, rating translation, opponent adjustment, and efficiency output.
- Columns: `param`, `value`, `unit`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `promise_types.csv`

- Rows included: 4
- Purpose: Promise catalog for recruiting and retention, including role promises, playing time, redshirt, NIL, position, and development promises.
- Columns: `promise_type`, `fulfillment_rule`, `target_value`, `evaluation_window`, `broken_severity`, `morale_impact`, `portal_impact`, `school_reputation_impact`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `rating_aliases.csv`

- Rows included: 12
- Purpose: Maps alternate rating names to canonical internal attributes.
- Columns: `alias`, `canonical_rating`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `rating_input_mapping.csv`

- Rows included: 85
- Purpose: Defines which player ratings feed each formula component by position and module.
- Columns: `position_group`, `formula`, `rating_key`, `weight`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `recruit_interest_weights.csv`

- Rows included: 9
- Purpose: Weights for school interest and recruit preference, including distance, prestige, NIL, depth chart, scheme fit, academics, visits, and relationships.
- Columns: `component`, `weight`, `min_effect`, `max_effect`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `recruiting_calendar.csv`

- Rows included: 5
- Purpose: Recruiting phase schedule, visit windows, commitment windows, signing dates, and transfer overlap rules.
- Columns: `week`, `phase`, `allowed_actions`, `commitment_pressure`, `visit_bonus`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `recruiting_pipeline_state_weights.csv`

- Rows included: 3
- Purpose: State and regional pipeline weights that determine school access to recruiting territory.
- Columns: `pipeline_type`, `same_state_bonus`, `border_state_bonus`, `regional_bonus`, `national_penalty`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `roster_position_targets.csv`

- Rows included: 32
- Purpose: Target roster counts by final position and school level. Used for roster creation, recruiting needs, walk-ons, cuts, and depth chart validation.
- Columns: `template_id`, `final_position`, `target_count`, `min_count`, `max_count`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `roster_templates.csv`

- Rows included: 2
- Purpose: School-level roster templates by subdivision and program type.
- Columns: `template_id`, `subdivision_level`, `roster_size`, `scholarship_limit`, `walkon_soft_cap`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `school_academic_rules.csv`

- Rows included: 3
- Purpose: School academic selectivity and eligibility modifiers by institution or academic model.
- Columns: `school_id`, `academic_model`, `academic_strictness`, `transfer_acceptance_modifier`, `juco_acceptance_modifier`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `school_archetypes.csv`

- Rows included: 3
- Purpose: Program identity table used to shape recruiting, roster construction, scheme, development, and transfer behavior.
- Columns: `archetype_id`, `scheme`, `recruiting_style`, `development_style`, `transfer_aggression`, `portal_aggression`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `school_class_size_ranges.csv`

- Rows included: 4
- Purpose: Expected signing class size and transfer intake ranges by program tier and roster state.
- Columns: `subdivision_level`, `min_signings`, `target_signings`, `max_signings`, `walkon_target`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `school_finance_proxies.csv`

- Rows included: 3
- Purpose: Synthetic school resource proxy used for facilities, staff, recruiting reach, development, and NIL calibration.
- Columns: `school_id`, `athletic_revenue_proxy`, `football_expense_proxy`, `donor_booster_proxy`, `facilities_score`, `staff_budget_score`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `school_overrides_curated.csv`

- Rows included: 3
- Purpose: Manual corrections and tuning overrides for school profile outputs.
- Columns: `school_id`, `field`, `value`, `reason`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `school_overrides_manual_top_programs.csv`

- Rows included: 1
- Purpose: High-priority curated overrides for major programs, FCS powers, service academies, Ivy schools, HBCUs, and notable G5 programs.
- Columns: `school_id`, `prestige_override`, `recruiting_power_override`, `nil_power_override`, `development_override`, `reason`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `school_recruiting_power.csv`

- Rows included: 3
- Purpose: School recruiting strength, brand, pipeline access, blue-chip reach, and offer behavior calibration.
- Columns: `school_id`, `recruiting_power`, `blue_chip_access`, `regional_pull`, `national_pull`, `relationship_floor`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `school_success_history.csv`

- Rows included: 3
- Purpose: Historical and recent success proxy used for prestige, draft reputation, recruit interest, and morale.
- Columns: `school_id`, `historical_brand_score`, `recent_success_score`, `conference_strength_score`, `nfl_draft_output_proxy`, `prestige_score`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `schools_master.csv`

- Rows included: 3
- Purpose: Core school identity table and primary school id authority.
- Columns: `school_id`, `school_name`, `mascot`, `subdivision`, `subdivision_level`, `conference`, `city`, `state`, `active`, `ipeds_id`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `snap_share_rules.csv`

- Rows included: 13
- Purpose: Rules for assigning offensive, defensive, and special teams snaps from depth chart rank, package, role, fatigue, injury, and redshirt status.
- Columns: `position_group`, `starter_share`, `rotation_depth`, `fatigue_sensitivity`, `blowout_backup_share`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `staff_effects.csv`

- Rows included: 6
- Purpose: Staff and coach impact table for recruiting, development, injuries, morale, scheme fit, and scouting.
- Columns: `staff_component`, `affected_system`, `effect_weight`, `min_effect`, `max_effect`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `star_distribution.csv`

- Rows included: 3
- Purpose: National recruit star distribution and target counts by class size and league configuration.
- Columns: `class_size`, `stars_5`, `stars_4`, `stars_3`, `stars_2_or_unranked`, `source_basis`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `stat_generation_curves.csv`

- Rows included: 7
- Purpose: Position-specific stat output curves from production scores and usage.
- Columns: `stat_curve_id`, `position_group`, `base_per_100_snaps`, `production_mult`, `scheme_mult_key`, `random_sigma`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `state_talent_weights.csv`

- Rows included: 11
- Purpose: State-level talent generation weights and optional participant proxy values.
- Columns: `state`, `state_name`, `talent_weight`, `nfhs_participants`, `region`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `transfer_destination_weights.csv`

- Rows included: 8
- Purpose: Weights used to score transfer destinations by playing time, NIL, prestige, distance, academics, scheme, relationships, and level movement.
- Columns: `component`, `weight`, `description`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `transfer_entry_reasons.csv`

- Rows included: 7
- Purpose: Reasons and weights for transfer entry such as playing time, broken promise, low morale, coaching, NIL, homesickness, and upward mobility.
- Columns: `reason`, `weight`, `threshold`, `description`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `transfer_transition_probabilities.csv`

- Rows included: 16
- Purpose: Probability matrix for transfers moving up, down, lateral, FBS to FCS, FCS to FBS, or withdrawing.
- Columns: `from_level`, `to_level`, `probability`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `walk_on_generation_rules.csv`

- Rows included: 4
- Purpose: Rules for filling roster holes with walk-ons by school level, position, and quality band.
- Columns: `subdivision_level`, `walkon_quality_mean`, `walkon_quality_sigma`, `preferred_local_pct`, `max_stars`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

### `yearly_progression_gates.csv`

- Rows included: 3
- Purpose: Phase gates that decide when training, development, regression, injury recovery, morale, transfer checks, and draft checks can run.
- Columns: `gate_id`, `applies_to_class`, `max_single_year_gain`, `breakout_exception_allowed`, `notes`
- Runtime rule: Load only through the manifest and only after schema validation passes.
- Failure rule: invalid required values block pipeline initialization. Optional fallbacks must be explicitly allowed by schema or formula defaults.

## implementation_control_csvs

### `compile_checkpoints.csv`

- Rows included: 7
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `checkpoint_id`, `name`, `must_compile_files`, `required_tests`
- Runtime rule: Never load this as gameplay tuning data. It guides implementation, tests, benchmarks, or audit behavior only.

### `debug_screen_requirements.csv`

- Rows included: 12
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `screen`, `required_data`, `dev_only`
- Runtime rule: Never load this as gameplay tuning data. It guides implementation, tests, benchmarks, or audit behavior only.

### `feature_deferral_registry.csv`

- Rows included: 5
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `feature`, `status`, `reason`
- Runtime rule: Never load this as gameplay tuning data. It guides implementation, tests, benchmarks, or audit behavior only.

### `implementation_execution_checklist_v11.csv`

- Rows included: 14
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `step`, `checkpoint`, `task`, `required_output`, `blocks_runtime`
- Runtime rule: Never load this as gameplay tuning data. It guides implementation, tests, benchmarks, or audit behavior only.

### `module_boundaries.csv`

- Rows included: 7
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `module`, `single_job`, `may_not_do`
- Runtime rule: Never load this as gameplay tuning data. It guides implementation, tests, benchmarks, or audit behavior only.

### `no_research_policy.csv`

- Rows included: 4
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `rule_id`, `hard_rule`, `blocked_patterns`, `required_behavior`
- Runtime rule: Never load this as gameplay tuning data. It guides implementation, tests, benchmarks, or audit behavior only.

### `performance_benchmarks.csv`

- Rows included: 6
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `benchmark_id`, `target_ms`, `max_ms`, `dataset_size`, `notes`
- Runtime rule: Never load this as gameplay tuning data. It guides implementation, tests, benchmarks, or audit behavior only.

### `self_audit_requirements.csv`

- Rows included: 44
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `row_id`, `requirement`, `required_status_values`, `required_columns`
- Runtime rule: Never load this as gameplay tuning data. It guides implementation, tests, benchmarks, or audit behavior only.

## test_csvs

### `golden_test_fixture_players.csv`

- Rows included: 5
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `player_id`, `position`, `class_year`, `true_overall`, `true_potential`, `star_level`, `school_id`, `expected_final_position`
- Runtime rule: Load only in test, calibration, or developer validation modes.

### `golden_test_fixture_teams.csv`

- Rows included: 2
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `team_id`, `school_id`, `expected_subdivision_level`, `expected_roster_template`
- Runtime rule: Load only in test, calibration, or developer validation modes.

### `golden_test_numeric_assertions.csv`

- Rows included: 5
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `scenario_id`, `assertion_key`, `expected_value_json`
- Runtime rule: Load only in test, calibration, or developer validation modes.

### `golden_test_scenarios.csv`

- Rows included: 4
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `scenario_id`, `description`, `seed`, `inputs_json`, `expected_range_json`, `notes`
- Runtime rule: Load only in test, calibration, or developer validation modes.

### `long_run_balance_targets.csv`

- Rows included: 4
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `metric_id`, `metric_name`, `sim_horizon_years`, `target_min`, `target_max`, `severity`, `calculation_notes`, `source_basis`
- Runtime rule: Load only in test, calibration, or developer validation modes.

### `new_universe_initialization_tests.csv`

- Rows included: 4
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `scenario`, `starting_state`, `required_behavior`, `expected_assertion`
- Runtime rule: Load only in test, calibration, or developer validation modes.

### `nfl_validation_tests.csv`

- Rows included: 3
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `test_id`, `metric`, `min_value`, `max_value`, `severity`, `notes`
- Runtime rule: Load only in test, calibration, or developer validation modes.

### `seeded_snapshot_expectations.csv`

- Rows included: 4
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `seed`, `metric`, `min_value`, `max_value`, `notes`
- Runtime rule: Load only in test, calibration, or developer validation modes.

### `validator_failure_cases.csv`

- Rows included: 5
- Purpose: Implementation control or test fixture file used by Codex to build, verify, or audit the pipeline.
- Columns: `case_id`, `csv_name`, `mutation`, `expected_error_code`
- Runtime rule: Load only in test, calibration, or developer validation modes.


# Year Zero consolidated bundle dictionary

The Year Zero V3.1 integration adds 20 consolidated runtime CSV bundles under `data/active_runtime_csvs/year_zero/`.

These bundles preserve 14939 detailed source rows. They intentionally reduce file count while keeping original row-level detail in `payload_json`.

## Standard bundle columns

| Column | Meaning |
|---|---|
| `domain` | Subsystem identifier such as `nfl_contracts`, `scouting`, or `college_rosters`. |
| `source_file` | Original detailed source CSV filename from the full research package. |
| `source_table` | Original source table name without extension. |
| `record_category` | Broad type such as rule, weight distribution, modifier, target, algorithm, example, or research basis. |
| `source_row` | Original row number from the source CSV. |
| `row_key` | Stable generated key for the bundled row. |
| `payload_json` | Full original row data as JSON. |

## Bundles

### `data/active_runtime_csvs/year_zero/college_awards.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/college_production.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/college_rosters.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/draft_translation.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/high_school_recruits.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/injuries.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_contracts.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_aging_decline.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_awards.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_contracts.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_free_agents.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_practice_squad.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_reserve_status.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_rosters.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/nfl_team_strength.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/scouting.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/transfer_portal.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/transfer_repair.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/udfa.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

### `data/active_runtime_csvs/year_zero/year_zero_core.csv`

Consolidated Year Zero domain bundle. Parse with the bundle schema and group by `source_table` and `record_category` before using in gameplay systems.

