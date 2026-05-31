# NO RESEARCH OR R RULE

This package is coding-first.

Codex must not:

- create R files
- run Rscript
- import R packages
- create RMarkdown notebooks
- build scrapers
- build broad research extractors
- build dataset confidence-upgrade plans
- pause implementation to search for better data
- add new external data dependencies unless the user explicitly asks later

Allowed data sources:

1. Active CSVs in this package.
2. Existing repo data already present in the project.
3. Test fixtures in `test_csvs` during test mode only.
4. Synthetic gameplay tuning values clearly marked with `source_basis`.

The correct behavior when data is missing is to fail validation with a useful error, not to research around it.


## V11.6.4 enforcement

The package contains no R or RMarkdown files. Codex should not create any. Research work is out of scope unless the user explicitly asks for it.
