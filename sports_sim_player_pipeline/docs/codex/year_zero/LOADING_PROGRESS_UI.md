# Loading and Progress UI

The Year Zero engine may take longer than ordinary new-save creation. Show a progress screen.

## Minimum UI fields

```text
phase_label
phase_detail
percent_complete
current_count
total_count
elapsed_time_optional
```

## Required UX behavior

- Do not freeze the app without feedback.
- Show high-level progress, not every single generated player.
- Display deterministic seed and selected universe settings after completion.
- If generation fails, show the failed phase and validation reason.

## Example status messages

```text
Loading Year Zero data...
Building college program strength ranges...
Generating full college rosters...
Backfilling player histories...
Selecting the draft class from college players...
Reconstructing NFL veteran careers...
Building NFL free-agent market...
Creating team-specific scouting views...
Validating startup balance...
Finalizing new save...
```
