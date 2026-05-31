# CSV Consolidation Guide V11.6.3

The Year Zero data is bundled by subsystem. Each bundle has the same columns:

```csv
domain,source_file,source_table,record_category,source_row,row_key,payload_json
```

`payload_json` contains the original detailed source row. This preserves detail while reducing active file count.

## Bundle map

| Bundle | Source CSVs | Records | Main purpose |
|---|---:|---:|---|
| `college_awards.csv` | 13 | 157 | College awards, All-American, award rarity, award-to-draft signal. |
| `college_production.csv` | 26 | 2071 | Generated college stats, role tiers, production ranges, draft signal. |
| `college_rosters.csv` | 33 | 848 | 105-player college rosters, class distribution, position distribution, redshirts, quality. |
| `draft_translation.csv` | 9 | 1061 | Draft class selection and college-to-NFL rating translation. |
| `high_school_recruits.csv` | 34 | 794 | HS recruit positions, stars, sleepers, ATH conversion, specialist rules. |
| `injuries.csv` | 19 | 1741 | Injury history, recurrence, missed time, ratings/development/contract effects. |
| `nfl_aging_decline.csv` | 14 | 3744 | NFL aging, decline, experience, wear, retirement pressure. |
| `nfl_awards.csv` | 17 | 422 | NFL awards, All-Pro, Pro Bowl, award history and reputation effects. |
| `nfl_contracts.csv` | 40 | 1046 | Initial NFL contracts, rookie scale, cap environment, guarantees, contract history, and initial contract source mix. |
| `nfl_free_agents.csv` | 12 | 880 | Initial free-agent market size, quality, phase, contracts, source mix. |
| `nfl_practice_squad.csv` | 19 | 342 | Practice squad quality, eligibility, poaching, elevations, salary. |
| `nfl_reserve_status.csv` | 16 | 176 | IR/PUP/NFI/stash frequency and reserve status rules. |
| `nfl_rosters.csv` | 12 | 372 | NFL roster targets and veteran history setup. |
| `nfl_team_strength.csv` | 18 | 181 | Fictional, seed-driven NFL team strength tiers and unit strength generation. |
| `scouting.csv` | 26 | 377 | Evaluator-specific scouting uncertainty and update rules. |
| `transfer_portal.csv` | 6 | 39 | Year Zero portal size, quality, reasons, source/destination movement. |
| `transfer_repair.csv` | 22 | 329 | Post-portal roster repair back to 105. |
| `udfa.csv` | 18 | 268 | UDFA career paths, signing priority, PS path, long-term outcomes. |
| `year_zero_core.csv` | 6 | 91 | Year Zero phases, RNG streams, loading progress, global balance. |

## Original source file index

See `data/implementation_control_csvs/year_zero/source_file_consolidation_index.csv`.

## Important V11.6.3 cleanup

There is no active `misc_runtime.csv` bundle. The initial NFL contract generation matrix, initial contract source mix, initial team cap-health targets, and related contract research basis rows now live in `data/active_runtime_csvs/year_zero/nfl_contracts.csv`.
