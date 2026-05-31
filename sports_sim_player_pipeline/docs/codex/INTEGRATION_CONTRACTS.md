# INTEGRATION CONTRACTS

## Existing repo integration

Prefer adapters over rewrites.

If the repo already has teams, players, positions, or game simulation types, adapt them in `dataAdapters.ts`.

If a repo type cannot represent a required concept, add a pipeline type instead of dropping the concept.

## Player visibility contract

Normal user-facing screens show:

- stars
- role projection
- scouted current range
- scouted potential range
- scouting confidence
- position fit
- notes

Developer debug mode may show:

- true overall
- true potential
- hidden development traits
- exact RNG inputs
- formula components

## School profile contract

SchoolProfile combines:

- `schools_master.csv`
- `campus_locations_verified.csv`
- school finance proxies
- school success history
- recruiting power
- NIL market proxies
- academic rules
- overrides
- staff profile defaults

## Game simulation contract

The existing game sim can own play-by-play. This pipeline must own:

- roster validity
- depth chart
- snap share
- production score
- player stats if detailed stats do not already exist
- development inputs
- draft outputs

## Debug explanation contract

Every major decision should return a `PipelineDebugEvent` with:

- stage
- entity type
- entity ID
- decision
- inputs
- outputs
- reasons
- blockers
- CSV sources
