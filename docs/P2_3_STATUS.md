# P2.5 Local Status

This project is now in a practical local-ready P2.5 state.

## Done
- Local web UI and Express backend.
- App Settings with SCUM config folder, backup folder, Nodes folder, Spawners folder, reload command, and restart command.
- Dashboard readiness, Quick Start, diagnostics export, and command health.
- Parsed Server Settings editor with grouped filters, field-level explanations, and boolean controls that show enabled/disabled choices instead of raw typing.
- Core file editor with validation and diff preview.
- Loot Studio with cleaner workspace, visual editing, beginner cheat sheets, probability presets for selected item rows, raw JSON fallback, validation, quick fixes, simulator, kit templates, catalog search, and icon-backed item suggestions.
- Item Catalog with discovered items, icons from `scum_items-main`, friendly names, categories, favorites, notes, import, and export.
- Analyzer with missing refs, unused nodes, repeated items, category distribution, balance score, node power score, spawner coverage, and human-readable next actions that can open the related loot file when a concrete target exists.
- Graph with focus/filter, zoom/pan style controls in the UI layer, and dependency inspection.
- Profiles, rotation, backups, restore selected file, backup notes/tags, backup compare, and backup cleanup.
- Activity log.
- Per-page browser routes for local pages such as `/dashboard`, `/settings`, `/loot-studio`, `/analyzer`, `/help`, and `/backups`.
- In-app Help guide for first setup, a five-step working flow, Loot Studio concepts, safe save flow, and Server Settings filters.
- Release check script and Windows launchers.
- Bulk case-sensitive loot ref repair script with backup-before-write.
- Direct item spawner validation that supports SCUM weight-style `Probability` values above 1.
- Analyzer advisory ignore list for known-safe unused nodes such as `Insects`.

## Local-Ready Criteria
- `npm run release:check` verifies required files, scripts, launchers, routes, and UI override assets.
- `npm test` runs syntax checks and regression tests.
- Dashboard Preflight verifies real machine paths and live config state.
- Backups are created before save/restore flows.

## Still Future P3
- True hosted multi-tenant SaaS.
- Local agent installer and secure remote apply queue.
- Authentication and tenant permissions.
- Goal-based tuning and AI-assisted change proposals.
- Full graph editor where relationships can be edited directly from the graph.
- Deep SCUM-runtime-perfect simulator. The current simulator is a sanity tool, not a full runtime clone.
