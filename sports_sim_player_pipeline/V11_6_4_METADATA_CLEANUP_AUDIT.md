# V11.6.4 Metadata Cleanup Audit

## Changes

- Removed duplicate `data/active_runtime_csvs/year_zero/nfl_contracts.csv` entry from `yearZeroBundleCsvs`.
- Updated `package_version` to `v11_6_4` and `packageVersion` to `V11.6.4 Metadata Cleanup`.
- Updated Year Zero bundle count wording from 20 to 19.
- Updated major package-facing stale V11.6.2/V11.5 wording to V11.6.4.
- Updated `CODEX_START_HERE.md` title wording to remove loader-contract-fix labeling.

## Validation

| Check | Result |
|---|---:|
| Year Zero bundle entries in manifest | 19 |
| Unique Year Zero bundle entries | 19 |
| Year Zero bundled rows | 14939 |
| Original source CSVs represented | 360 |
| Original source tables represented | 360 |
| Bad payload_json rows | 0 |
| Duplicate composite keys | 0 |
| Stale important wording hits | 0 |

## Notes

No gameplay tuning values were changed.
