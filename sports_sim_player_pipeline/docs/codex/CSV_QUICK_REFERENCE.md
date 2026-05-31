# CSV Quick Reference

Generated index of CSV files included in the package. Use `CSV_DATA_DICTIONARY.md` for normal CSV explanations. Use `YEAR_ZERO_CSV_BUNDLE_INDEX.md` and `YEAR_ZERO_BUNDLE_LOADER_CONTRACT.md` for bundled Year Zero CSVs.

## Year Zero bundled CSV note

The 20 files under `data/active_runtime_csvs/year_zero/` are consolidated bundles. Their rows use `payload_json` and must be accessed through a Year Zero bundle loader, not as ordinary flat tuning CSVs.


Generated index of CSV files included in the lean final package. Use `CSV_DATA_DICTIONARY.md` for explanations and `data/active_runtime_csvs/csv_schema_registry.csv` for machine validation.

| Category | Path | Rows | Columns |
|---|---|---:|---|
| active_runtime | `data/active_runtime_csvs/academic_eligibility_model.csv` | 5 | `component, required_value, weight, description` |
| active_runtime | `data/active_runtime_csvs/all_star_events.csv` | 3 | `event_id, event_name, eligible_classes, target_invites, level_focus, base_scouting_confidence_gain, max_draft_delta, small_school_validation_bonus, notes` |
| active_runtime | `data/active_runtime_csvs/allstar_event_effects.csv` | 3 | `event, invite_bonus, practice_winner_bonus, game_mvp_bonus, draft_floor_raise, source_basis` |
| active_runtime | `data/active_runtime_csvs/ath_conversion_rules.csv` | 3 | `ath_bucket, height_min_in, height_max_in, weight_min_lb, weight_max_lb, primary_map, secondary_map, speed_bias, position_vector` |
| active_runtime | `data/active_runtime_csvs/awards_impact.csv` | 6 | `award, award_group, draft_board_bonus, nil_bonus_pct, media_bonus` |
| active_runtime | `data/active_runtime_csvs/balance_targets.csv` | 8 | `metric, target_mean, lower_bound, upper_bound, notes` |
| active_runtime | `data/active_runtime_csvs/calendar_events.csv` | 8 | `event_id, phase, month, day_start, day_end, week_hint, applies_to, hard_gate, description, engine_effect` |
| active_runtime | `data/active_runtime_csvs/campus_locations_verified.csv` | 3 | `school_id, school_name, city, state, lat, lon, timezone, geo_precision, verification_status, notes` |
| active_runtime | `data/active_runtime_csvs/college_production_weights.csv` | 13 | `position_group, overall_weight, snap_share_weight, scheme_usage_weight, opponent_strength_weight, team_quality_weight, game_script_weight, randomness_weight, level_comp_mult_key, notes` |
| active_runtime | `data/active_runtime_csvs/combine_event_weights.csv` | 104 | `position_group, event_name, weight, include_in_athletic_composite, notes` |
| active_runtime | `data/active_runtime_csvs/competition_translation.csv` | 5 | `competition_tier, stat_mult_pass, stat_mult_rush, stat_mult_defense, draft_eval_mult, nil_visibility_mult` |
| active_runtime | `data/active_runtime_csvs/csv_parser_rules.csv` | 6 | `rule_type, applies_to, accepted_values, normalization, hard_fail` |
| active_runtime | `data/active_runtime_csvs/csv_schema_registry.csv` | 528 | `csv_name, column_name, type, required, min, max, allowed_values, foreign_key, notes` |
| active_runtime | `data/active_runtime_csvs/csv_supersession_map.csv` | 7 | `old_file, new_file, status, runtime_use, notes` |
| active_runtime | `data/active_runtime_csvs/data_precedence_rules.csv` | 5 | `domain, primary_source, secondary_source, rule, notes` |
| active_runtime | `data/active_runtime_csvs/data_provenance.csv` | 5 | `csv_name, source_name, source_type, confidence_level, extract_method, last_verified, notes` |
| active_runtime | `data/active_runtime_csvs/depth_chart_weights.csv` | 13 | `position_group, overall, position_fit, experience, coach_trust, scheme_fit, recent_form, promise_pressure, injury_readiness, notes` |
| active_runtime | `data/active_runtime_csvs/deterministic_rng_streams.csv` | 8 | `stream_id, seed_namespace, allowed_engines, notes` |
| active_runtime | `data/active_runtime_csvs/development_yearly_curves.csv` | 13 | `position_group, year1_gain, year2_gain, year3_gain, year4_gain, playing_time_weight, redshirt_weight, source_basis` |
| active_runtime | `data/active_runtime_csvs/draft_board_weights.csv` | 7 | `position_group, film_prod_w, athletic_w, age_w, medical_w, competition_w, allstar_w, character_w` |
| active_runtime | `data/active_runtime_csvs/draft_hit_rates.csv` | 35 | `star_bucket, position_group, draft_prob, early_round_prob, starter_hit_prob, impact_hit_prob, source_basis` |
| active_runtime | `data/active_runtime_csvs/draft_position_value.csv` | 9 | `position_group, draft_position_value, round1_bonus, day3_discount, notes` |
| active_runtime | `data/active_runtime_csvs/draft_stock_component_weights.csv` | 91 | `position_group, component, weight` |
| active_runtime | `data/active_runtime_csvs/formula_input_defaults.csv` | 3 | `formula, input_name, default_value, allowed_fallback, notes` |
| active_runtime | `data/active_runtime_csvs/injury_base_rates.csv` | 26 | `event_type, position_group, base_daily_risk, contact_level, load_sensitivity, repeat_injury_mult` |
| active_runtime | `data/active_runtime_csvs/injury_family_params.csv` | 8 | `injury_family, base_recurrence_pct, games_missed_mean, perm_speed_penalty, perm_strength_penalty, perm_awareness_penalty, durability_penalty, draft_medical_penalty, position_sensitivity` |
| active_runtime | `data/active_runtime_csvs/injury_recurrence.csv` | 5 | `injury_family, recurrence_mult, permanent_athletic_loss_chance, potential_loss_min, potential_loss_max, position_sensitivity, recovery_bank_mult, draft_medical_penalty_min, draft_medical_penalty_max, notes` |
| active_runtime | `data/active_runtime_csvs/injury_severity_distribution.csv` | 32 | `injury_family, severity, probability, min_days, max_days, season_ending_prob` |
| active_runtime | `data/active_runtime_csvs/morale_model_weights.csv` | 7 | `component, weight, min_effect, max_effect, description, affects, source_basis` |
| active_runtime | `data/active_runtime_csvs/morale_promise_params.csv` | 5 | `driver, weight, good_threshold, bad_threshold, transfer_trigger_bonus` |
| active_runtime | `data/active_runtime_csvs/nfl_scouting_team_archetypes.csv` | 4 | `archetype, production_weight, traits_weight, medical_conservatism, small_school_confidence, combine_weight, interview_weight, regional_bias, risk_tolerance, notes` |
| active_runtime | `data/active_runtime_csvs/nfl_team_archetypes.csv` | 32 | `team_id, archetype, weight_traits, weight_production, weight_age, weight_medical, weight_competition, weight_allstar, small_school_confidence, source_basis` |
| active_runtime | `data/active_runtime_csvs/nil_market_proxies.csv` | 3 | `school_id, tier, nil_proxy_score, football_nil_pool_mean_usd, retention_pool_pct, hs_pool_pct, portal_pool_pct, source_basis` |
| active_runtime | `data/active_runtime_csvs/nil_player_demand_model.csv` | 7 | `component, weight, description` |
| active_runtime | `data/active_runtime_csvs/nil_position_budget_shares.csv` | 13 | `position_group, football_budget_share, source_basis` |
| active_runtime | `data/active_runtime_csvs/performance_constraints.csv` | 4 | `constraint_id, hard_rule, threshold_or_target, implementation_requirement, failure_mode_to_prevent` |
| active_runtime | `data/active_runtime_csvs/pick_values_257.csv` | 257 | `pick, round, pick_value, internal_value_default, source_basis` |
| active_runtime | `data/active_runtime_csvs/player_personality_archetypes.csv` | 5 | `personality, work_ethic_mult, coachability_mult, nil_sensitivity, playing_time_sensitivity, distance_sensitivity, loyalty_mult, decommit_risk_mult, portal_risk_mult, early_declare_aggression, notes` |
| active_runtime | `data/active_runtime_csvs/position_distribution.csv` | 13 | `position_group, spawn_pct, athlete_reclass_pct, height_mu, height_sigma, weight_mu, weight_sigma` |
| active_runtime | `data/active_runtime_csvs/position_distribution_rules.csv` | 3 | `tier, qb_min, rb_min, wr_min, te_min, ol_min, dl_min, lb_min, db_min, spec_min, ath_target` |
| active_runtime | `data/active_runtime_csvs/position_group_conversion.csv` | 7 | `source_group, stage, allowed_final_repo_positions, default_weights_json, hard_rule, notes` |
| active_runtime | `data/active_runtime_csvs/position_selector_aliases.csv` | 9 | `alias, canonical_selector, selector_type, notes` |
| active_runtime | `data/active_runtime_csvs/position_stat_profiles.csv` | 13 | `position_group, primary_stats, volume_driver, efficiency_driver` |
| active_runtime | `data/active_runtime_csvs/pro_day_adjustments.csv` | 3 | `measurement, pro_day_bias, max_positive_delta, max_negative_delta, confidence_penalty` |
| active_runtime | `data/active_runtime_csvs/production_formula_params.csv` | 5 | `param, value, unit, notes` |
| active_runtime | `data/active_runtime_csvs/promise_types.csv` | 4 | `promise_type, fulfillment_rule, target_value, evaluation_window, broken_severity, morale_impact, portal_impact, school_reputation_impact` |
| active_runtime | `data/active_runtime_csvs/rating_aliases.csv` | 12 | `alias, canonical_rating` |
| active_runtime | `data/active_runtime_csvs/rating_input_mapping.csv` | 85 | `position_group, formula, rating_key, weight, notes` |
| active_runtime | `data/active_runtime_csvs/recruit_interest_weights.csv` | 9 | `component, weight, min_effect, max_effect, notes` |
| active_runtime | `data/active_runtime_csvs/recruiting_calendar.csv` | 5 | `week, phase, allowed_actions, commitment_pressure, visit_bonus` |
| active_runtime | `data/active_runtime_csvs/recruiting_pipeline_state_weights.csv` | 3 | `pipeline_type, same_state_bonus, border_state_bonus, regional_bonus, national_penalty` |
| active_runtime | `data/active_runtime_csvs/roster_position_targets.csv` | 32 | `template_id, final_position, target_count, min_count, max_count` |
| active_runtime | `data/active_runtime_csvs/roster_templates.csv` | 2 | `template_id, subdivision_level, roster_size, scholarship_limit, walkon_soft_cap, notes` |
| active_runtime | `data/active_runtime_csvs/school_academic_rules.csv` | 3 | `school_id, academic_model, academic_strictness, transfer_acceptance_modifier, juco_acceptance_modifier, notes` |
| active_runtime | `data/active_runtime_csvs/school_archetypes.csv` | 3 | `archetype_id, scheme, recruiting_style, development_style, transfer_aggression, portal_aggression, notes` |
| active_runtime | `data/active_runtime_csvs/school_class_size_ranges.csv` | 4 | `subdivision_level, min_signings, target_signings, max_signings, walkon_target` |
| active_runtime | `data/active_runtime_csvs/school_finance_proxies.csv` | 3 | `school_id, athletic_revenue_proxy, football_expense_proxy, donor_booster_proxy, facilities_score, staff_budget_score, source_basis` |
| active_runtime | `data/active_runtime_csvs/school_overrides_curated.csv` | 3 | `school_id, field, value, reason` |
| active_runtime | `data/active_runtime_csvs/school_overrides_manual_top_programs.csv` | 1 | `school_id, prestige_override, recruiting_power_override, nil_power_override, development_override, reason` |
| active_runtime | `data/active_runtime_csvs/school_recruiting_power.csv` | 3 | `school_id, recruiting_power, blue_chip_access, regional_pull, national_pull, relationship_floor, source_basis` |
| active_runtime | `data/active_runtime_csvs/school_success_history.csv` | 3 | `school_id, historical_brand_score, recent_success_score, conference_strength_score, nfl_draft_output_proxy, prestige_score, source_basis` |
| active_runtime | `data/active_runtime_csvs/schools_master.csv` | 3 | `school_id, school_name, mascot, subdivision, subdivision_level, conference, city, state, active, ipeds_id, notes` |
| active_runtime | `data/active_runtime_csvs/snap_share_rules.csv` | 13 | `position_group, starter_share, rotation_depth, fatigue_sensitivity, blowout_backup_share` |
| active_runtime | `data/active_runtime_csvs/staff_effects.csv` | 6 | `staff_component, affected_system, effect_weight, min_effect, max_effect, notes` |
| active_runtime | `data/active_runtime_csvs/star_distribution.csv` | 3 | `class_size, stars_5, stars_4, stars_3, stars_2_or_unranked, source_basis` |
| active_runtime | `data/active_runtime_csvs/stat_generation_curves.csv` | 7 | `stat_curve_id, position_group, base_per_100_snaps, production_mult, scheme_mult_key, random_sigma` |
| active_runtime | `data/active_runtime_csvs/state_talent_weights.csv` | 11 | `state, state_name, talent_weight, nfhs_participants, region, notes` |
| active_runtime | `data/active_runtime_csvs/transfer_destination_weights.csv` | 8 | `component, weight, description` |
| active_runtime | `data/active_runtime_csvs/transfer_entry_reasons.csv` | 7 | `reason, weight, threshold, description` |
| active_runtime | `data/active_runtime_csvs/transfer_transition_probabilities.csv` | 16 | `from_level, to_level, probability` |
| active_runtime | `data/active_runtime_csvs/walk_on_generation_rules.csv` | 4 | `subdivision_level, walkon_quality_mean, walkon_quality_sigma, preferred_local_pct, max_stars` |
| active_runtime | `data/active_runtime_csvs/yearly_progression_gates.csv` | 3 | `gate_id, applies_to_class, max_single_year_gain, breakout_exception_allowed, notes` |
| implementation_control | `data/implementation_control_csvs/compile_checkpoints.csv` | 7 | `checkpoint_id, name, must_compile_files, final_phase_tests, test_policy` |
| implementation_control | `data/implementation_control_csvs/debug_screen_requirements.csv` | 12 | `screen, required_data, dev_only` |
| implementation_control | `data/implementation_control_csvs/feature_deferral_registry.csv` | 5 | `feature, status, reason` |
| implementation_control | `data/implementation_control_csvs/implementation_execution_checklist_v11.csv` | 14 | `step, checkpoint, task, required_output, blocks_runtime` |
| implementation_control | `data/implementation_control_csvs/module_boundaries.csv` | 7 | `module, single_job, may_not_do` |
| implementation_control | `data/implementation_control_csvs/no_research_policy.csv` | 4 | `rule_id, hard_rule, blocked_patterns, required_behavior` |
| implementation_control | `data/implementation_control_csvs/performance_benchmarks.csv` | 6 | `benchmark_id, target_ms, max_ms, dataset_size, notes` |
| implementation_control | `data/implementation_control_csvs/self_audit_requirements.csv` | 44 | `row_id, requirement, required_status_values, required_columns` |
| test_fixture | `data/test_fixtures/golden_test_fixture_players.csv` | 5 | `player_id, position, class_year, true_overall, true_potential, star_level, school_id, expected_final_position` |
| test_fixture | `data/test_fixtures/golden_test_fixture_teams.csv` | 2 | `team_id, school_id, expected_subdivision_level, expected_roster_template` |
| test_fixture | `data/test_fixtures/golden_test_numeric_assertions.csv` | 5 | `scenario_id, assertion_key, expected_value_json` |
| test_fixture | `data/test_fixtures/golden_test_scenarios.csv` | 4 | `scenario_id, description, seed, inputs_json, expected_range_json, notes` |
| test_fixture | `data/test_fixtures/long_run_balance_targets.csv` | 4 | `metric_id, metric_name, sim_horizon_years, target_min, target_max, severity, calculation_notes, source_basis` |
| test_fixture | `data/test_fixtures/new_universe_initialization_tests.csv` | 4 | `scenario, starting_state, required_behavior, expected_assertion` |
| test_fixture | `data/test_fixtures/nfl_validation_tests.csv` | 3 | `test_id, metric, min_value, max_value, severity, notes` |
| test_fixture | `data/test_fixtures/seeded_snapshot_expectations.csv` | 4 | `seed, metric, min_value, max_value, notes` |
| test_fixture | `data/test_fixtures/validator_failure_cases.csv` | 5 | `case_id, csv_name, mutation, expected_error_code` |


## Year Zero consolidated runtime bundles

These files preserve the detailed Year Zero V3.1 research rows in consolidated domain bundles. Load these only through the Year Zero bundle adapter.

| Bundle | Purpose |
|---|---|
| `data/active_runtime_csvs/year_zero/college_awards.csv` | Consolidated Year Zero `college_awards.csv` domain records. |
| `data/active_runtime_csvs/year_zero/college_production.csv` | Consolidated Year Zero `college_production.csv` domain records. |
| `data/active_runtime_csvs/year_zero/college_rosters.csv` | Consolidated Year Zero `college_rosters.csv` domain records. |
| `data/active_runtime_csvs/year_zero/draft_translation.csv` | Consolidated Year Zero `draft_translation.csv` domain records. |
| `data/active_runtime_csvs/year_zero/high_school_recruits.csv` | Consolidated Year Zero `high_school_recruits.csv` domain records. |
| `data/active_runtime_csvs/year_zero/injuries.csv` | Consolidated Year Zero `injuries.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_contracts.csv` | Consolidated Year Zero `misc_runtime.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_aging_decline.csv` | Consolidated Year Zero `nfl_aging_decline.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_awards.csv` | Consolidated Year Zero `nfl_awards.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_contracts.csv` | Consolidated Year Zero `nfl_contracts.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_free_agents.csv` | Consolidated Year Zero `nfl_free_agents.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_practice_squad.csv` | Consolidated Year Zero `nfl_practice_squad.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_reserve_status.csv` | Consolidated Year Zero `nfl_reserve_status.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_rosters.csv` | Consolidated Year Zero `nfl_rosters.csv` domain records. |
| `data/active_runtime_csvs/year_zero/nfl_team_strength.csv` | Consolidated Year Zero `nfl_team_strength.csv` domain records. |
| `data/active_runtime_csvs/year_zero/scouting.csv` | Consolidated Year Zero `scouting.csv` domain records. |
| `data/active_runtime_csvs/year_zero/transfer_portal.csv` | Consolidated Year Zero `transfer_portal.csv` domain records. |
| `data/active_runtime_csvs/year_zero/transfer_repair.csv` | Consolidated Year Zero `transfer_repair.csv` domain records. |
| `data/active_runtime_csvs/year_zero/udfa.csv` | Consolidated Year Zero `udfa.csv` domain records. |
| `data/active_runtime_csvs/year_zero/year_zero_core.csv` | Consolidated Year Zero `year_zero_core.csv` domain records. |


Bundle rows use:

```csv
domain,source_file,source_table,record_category,source_row,row_key,payload_json
```

Use `payload_json` as the source of original detailed tuning values.
