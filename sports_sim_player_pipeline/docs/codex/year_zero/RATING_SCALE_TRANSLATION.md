# Rating Scale Translation

## Core rule

College and NFL ratings are separate 1-100 scales.

Do not treat a 90 college player as a 90 NFL player.

## Why the scales must differ

A college rating measures dominance inside the college ecosystem. An NFL rating measures usefulness against professional athletes, play speed, professional schemes, and roster competition.

A 92 college OVR player may be one of the best players in college football while still entering the NFL as a 66-74 current OVR rookie. The player's NFL potential may be much higher than his NFL current rating.

## Required player fields

Players who can cross league boundaries should support:

```text
collegeOverall
collegeRatings
collegePotential
nflOverall
nflRatings
nflPotential
ratingScaleContext
translationDebug
```

## Draft translation inputs

The translation engine must use:

```text
position_group
draft_capital_tier
college_ovr_band
college_potential
age
competition_level
production_index
athletic_testing_profile
medical_profile
work_ethic
position_skill_readiness
team_scouting_view
```

## Translation process

1. Look up base range in `college_to_nfl_rating_translation.csv`.
2. Apply position learning curve from `college_to_nfl_position_translation_profiles.csv`.
3. Apply draft capital anchor from `draft_tier_rookie_rating_anchors.csv`.
4. Apply modifiers from `college_to_nfl_translation_modifiers.csv`.
5. Clamp using rookie ceiling/floor guardrails.
6. Store debug explanation.
7. Produce team-specific scouted NFL projection ranges.

## Example

```text
College player: 96 OVR CB
Draft tier: top_5
Competition: elite_fbs
Production: dominant
Athletic profile: elite
NFL rookie current: 78-84
NFL potential: 88-96
```

```text
College player: 94 OVR QB
Draft tier: top_5
Competition: power_fbs
Production: good
NFL rookie current: 69-75
NFL potential: 82-92
```

## Rookie rating guardrails

```text
Rookie 84+ current OVR: rare top-of-class, usually non-QB or exceptional specialist/skill/defense profile.
Rookie QB 78+ current OVR: rare/generational exception.
Round 1 rookies: usually 64-78 current depending on position and profile.
Round 2 rookies: usually 60-72 current.
Round 3 rookies: usually 56-68 current.
Day 3 rookies: usually 48-64 current.
UDFAs: usually 42-58 current, with rare exceptions.
```

## NFL veteran reconstruction

For an existing veteran, the Year Zero engine reconstructs:

```text
high school talent -> college development -> draft translation -> NFL growth -> prime -> aging/decline
```

The veteran's current NFL rating is the result of this path, not a direct random roll.
