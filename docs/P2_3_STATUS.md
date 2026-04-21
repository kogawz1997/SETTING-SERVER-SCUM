# P2.13 Local Status

This project is now in a practical local-ready P2.13 state.

Latest packaged release: `v1.0.6-local`

The `v1.0.6-local` patch keeps the P2.13 feature set but tightens local readiness: Startup Doctor is visible on Dashboard/Settings, support bundles include recent structured operation logs, UI regression tests run against an isolated test server, and Loot Studio kit template saving is covered by regression tests.

## Done
- Local web UI and Express backend.
- App Settings with SCUM config folder, backup folder, Nodes folder, Spawners folder, reload command, and restart command.
- Dashboard readiness, Quick Start, diagnostics export, and command health.
- Startup Doctor for config path, Nodes/Spawners folders, backup path, permissions, and reload/restart command readiness.
- Parsed Server Settings editor with grouped filters, field-level explanations, and boolean controls that show enabled/disabled choices instead of raw typing.
- Core file editor with validation and diff preview.
- Loot Studio with cleaner workspace, explicit Builder / Split / Raw editor modes, spawner group workbench, item row workbench, file scope filters, visible file counts, visual editing, quick access for recent/pinned files, beginner cheat sheets, probability presets for selected item rows, shareable file deep links, raw JSON fallback, validation, quick fixes, deterministic simulator, kit templates, catalog search, and icon-backed item suggestions.
- Final local polish guard that blocks broken UI copy such as question-mark blocks and mojibake in important app/docs files during release checks.
- Item Catalog with discovered items, icons from `scum_items-main`, readable Thai/English names, inferred rarity, tags, categories, favorites, notes, import, and export.
- Analyzer with missing refs, unused nodes, repeated items, category distribution, balance score, node power score, spawner coverage, human-readable next actions, and direct open-file buttons on result cards.
- Graph with focus/filter, zoom/pan style controls in the UI layer, usage hints, dependency inspection, drag-to-connect spawner refs, and reference editing with dry-run/apply support.
- Profiles, rotation, backups, restore selected file, backup notes/tags, backup compare, and backup cleanup.
- Activity log.
- Structured operation log at `logs/operations.jsonl`, included in support bundles for easier debugging.
- Per-page browser routes for local pages such as `/dashboard`, `/settings`, `/loot-studio`, `/analyzer`, `/help`, and `/backups`; Loot Studio also supports `/loot-studio?file=Nodes/...` or `/loot-studio?file=Spawners/...`.
- In-app Help guide for first setup, a five-step working flow, Loot Studio concepts, safe save flow, and Server Settings filters.
- Release check script and Windows launchers.
- Bulk case-sensitive loot ref repair script with backup-before-write.
- Direct item spawner validation that supports SCUM weight-style `Probability` values above 1.
- Analyzer advisory ignore list for known-safe unused nodes such as `Insects`.

## Local-Ready Criteria
- `npm run release:check` verifies required files, scripts, launchers, routes, UI override assets, and broken-copy guardrails.
- `npm test` runs syntax checks and regression tests. Browser regression suites start their own isolated local server so stale `localhost:3000` processes do not hide failures.
- `npm run release:quality` verifies checks, docs, sample workspace smoke, performance smoke, portable packaging, and the full test suite before release.
- Dashboard Preflight verifies real machine paths and live config state.
- Backups are created before save/restore flows.

## Still Future P3
- True hosted multi-tenant SaaS.
- Local agent installer and secure remote apply queue.
- Authentication and tenant permissions.
- Goal-based tuning and AI-assisted change proposals.
- Full freeform graph editor for every relationship type. Current graph editing supports safe spawner ref add/remove/replace and drag-to-connect from spawner to node/ref.
- Deep SCUM-runtime-perfect simulator. The current simulator is deterministic and useful for sanity/compare work, but still is not a full runtime clone.
