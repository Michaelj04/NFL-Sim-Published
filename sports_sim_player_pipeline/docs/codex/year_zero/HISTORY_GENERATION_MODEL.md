# History Generation Model

## Purpose

Year Zero histories explain why a player currently exists in his generated state.

Histories should be visible and detailed, but they should not constantly recalculate ratings after initialization.

## College history fields

Minimum fields:

```text
recruiting_year
recruiting_stars
recruiting_rank_band
home_state
signed_school_id
redshirt_status
class_year
season_stats_by_year
award_history
injury_history
transfer_history
development_arc_summary
role_history
```

## NFL history fields

Minimum fields:

```text
high_school_profile
college_id
college_stats_by_year
college_awards
college_injuries
draft_year
draft_round
draft_pick
udfa_status
nfl_team_history
nfl_stats_by_year
nfl_awards
nfl_injuries
contract_history
development_arc_summary
decline_arc_summary
```

## History impact

Histories mostly explain current state.

Allowed rating impact at generation time:

- injuries can reduce current ability or durability
- awards can raise visibility and scouting confidence
- high production can improve draft stock
- poor production can reduce visible grade
- long-term role history can affect confidence and market value

After initialization, histories should be stable records.
