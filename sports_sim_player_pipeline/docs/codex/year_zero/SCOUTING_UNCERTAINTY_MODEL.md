# Scouting Uncertainty Model

## Purpose

The same prospect should not look identical to every school or NFL team.

## Hidden truth

Each player has hidden values:

```text
trueCurrentAbility
truePotential
trueDevelopmentProfile
trueRiskProfile
```

## Visible views

Each evaluator gets a view:

```text
evaluator_id
player_id
view_context
current_low
current_high
potential_low
potential_high
confidence
bias_profile
known_flags
unknown_flags
last_updated_phase
```

## Evaluator differences

Evaluator views differ because of:

- staff scouting quality
- region familiarity
- conference familiarity
- position expertise
- prior assignments
- player visibility
- player volatility
- medical uncertainty
- production sample size
- small-school adjustment

## Initial Year Zero views

Generate initial views for:

```text
college teams viewing high school recruits
college teams viewing transfer portal players
NFL teams viewing draft prospects
```

NFL veterans do not need deep uncertainty by default. Veteran ratings are primarily known through pro sample size, although injury/decline uncertainty may remain.

## Later systems

The user plans to build fully fleshed out scouting systems later. Therefore Year Zero should store enough scaffolding for:

- scouting assignments
- staff improvements
- tape grades
- campus visits
- combine/pro day updates
- medical rechecks
- private workouts
- confidence progression
