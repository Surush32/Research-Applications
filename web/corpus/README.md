# Reference corpus (school project)

This folder is the "known code" library Lineage scans against.

## How scanning works

1. User selects one or more `.py` files from GitHub (or uploads locally later).
2. `/api/scan` fingerprints the suspect file (identifiers, imports, functions, classes).
3. It ranks the nearest corpus entries by fingerprint similarity.
4. For the top candidates, it calls the existing AST `/compare` API.
5. The UI shows possible matches with scores and license metadata.

## Adding files

1. Put a `.py` file in `files/`.
2. Add an entry to `manifest.json` with `id`, `title`, `filename`, `license`, `source`, and `description`.

## Demo tip

Upload or scan a lightly renamed copy of `user_analytics_pipeline.py` (for example the project's `AST/AST/suspect.py`) to see a high-similarity match.
