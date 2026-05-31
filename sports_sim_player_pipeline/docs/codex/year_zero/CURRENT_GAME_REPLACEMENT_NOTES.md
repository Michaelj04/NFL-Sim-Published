# Current Game Replacement Notes

The current game already has useful NFL systems:

- free-agent player list
- sign/release logic
- cap checks
- free-agency offers and waves
- CPU offers
- practice squad signings, elevations, promotions, and protections
- waiver integration
- draft prospect generation

The problem is not the existence of these systems. The problem is the initial player-base generation path.

## Replace during new save creation

Replace current hardcoded startup generation for:

```text
NFL rosters
practice squads
free-agent pool
draft prospects
```

with Year Zero output.

## Keep/adapt after new save creation

Keep and adapt:

```text
cap engine
free agency engine
practice squad engine
waiver engine
IR engine
roster AI
selectors
ratings display
scouting UI
save parser/normalizer
```

## Migration approach

1. Create Year Zero output types that map to current `Player`, `Prospect`, and `GameSave` models.
2. Add missing fields for separate college/NFL rating scales if the current model cannot represent them.
3. Preserve existing free-agent signing flows.
4. Preserve existing practice squad flows.
5. Replace initial generated prospects with draft prospects derived from generated college players.
6. Add a loading/progress UI before committing the new save.
