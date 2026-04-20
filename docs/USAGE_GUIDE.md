# Usage Guide

## Safe Quick Start
Use this order when setting up a real server:
1. Open **App Settings** and set the real SCUM config folder.
2. Set **Nodes folder** and **Spawners folder**, or leave them blank only if the default folders under the config root exist.
3. Return to **Dashboard** and run **Preflight**.
4. Open **Backups** and create a tagged backup. Use `keep`, `pinned`, or `protected` for snapshots that cleanup should skip.
5. Open **Loot Studio**, edit with the visual builder, and use item autocomplete instead of typing unknown class names.
6. Open the **Validation** context tab and fix critical issues before saving.
7. Use **Preview Diff** before saving when the change is large.
8. Use **Save + Reload** only after the reload command is configured and tested.
9. If a change goes wrong, open **Backups**, select a snapshot, select a file, then restore only that file.
10. Before handing the folder to another machine, run `npm run release:check` and `npm test`.

## 1. Dashboard
Use Dashboard for quick checks:
- Confirm the config directory is set
- Confirm Nodes and Spawners folders are found
- Follow the Quick Start workflow
- Run the readiness Preflight report
- Run backup, reload, or restart actions
- Search globally for items, nodes, spawners, or setting names

## 2. App Settings
Fields:
- **SCUM config folder**: Main SCUM config directory
- **Backup folder**: Where timestamped backups will be stored
- **Reload loot command**: Optional shell command or script
- **Restart server command**: Optional shell command or script
- **Auto backup core files on start**: Creates backups for core files during startup if enabled

## 3. Server Settings
- Use the filter box to narrow keys
- Edit values directly in the parsed grid
- Use preset cards to preview or apply common loot-related setups
- Use **Save + Reload** after changes when needed

## 4. Core Files
- Choose `GameUserSettings.ini` or `EconomyOverride.json`
- Review validation and metadata
- Use **Preview Diff** before saving
- Save writes a backup first

## 5. Loot Studio
### Left column
- Search files
- Browse `Nodes` and `Spawners`
- Create new files

### Middle column
- Validation results
- Auto-fix preview and auto-fix save
- Dependency list
- Loot simulator
- Quick kit templates

### Right column
- Edit using either visual builder or raw JSON
- Clone or delete the current file
- Save or save with reload

### Item Catalog
- Use the catalog search when you do not remember the exact item class name
- Icons appear when matching files exist in `scum_items-main`
- Edit friendly names, categories, favorite flags, and notes from the catalog card
- Export metadata before sharing a tuned catalog with another server
- Import metadata in merge mode unless you intentionally want to replace all local overrides

### Validation
- Critical issues should be fixed before saving
- Warnings are usually safe to review manually, but missing refs and invalid probabilities should not be ignored
- The schema endpoint is available at `/api/schemas/loot` for tooling or diagnostics

## 6. Analyzer
Use Analyzer to spot:
- Missing node references
- Unused nodes
- Frequently repeated items
- Category distribution
- Balance indicators for weapon/ammo/medical ratios and spawner coverage

## 7. Graph
Use Graph to understand relationships:
- Filter by item, node, or spawner name
- Click cards to inspect focus neighborhoods

## 8. Profiles
- Create snapshots of the whole config state
- Select one and apply it later
- Configure rotation entries and run them manually or on schedule

## 9. Backups
- Choose a backup snapshot
- Inspect individual files
- Restore only the file you need
- Add notes and tags to important snapshots
- Compare two backups before restoring
- Cleanup old backups after previewing the delete list
- Tags `keep`, `pinned`, and `protected` are skipped by cleanup unless explicitly included

## 10. Activity
- Review recent operations and timestamps
- Filter activity by operation type, path, or text

## 11. Local Handoff
- Run `npm install` once on the target machine
- Run `npm run release:check`
- Run `npm test` if Playwright browsers are installed
- Start with `start-local.cmd`
- Configure paths from **App Settings**
- Create one tagged backup before the first save

## 12. Repair Tools
- Run `npm run repair:loot-refs -- --dry-run` to preview case-sensitive node ref repairs.
- Run `npm run repair:loot-refs` to apply safe case repairs after the dry run reports `unresolvedRefs: 0`.
- The repair script creates a backup named like `YYYY-MM-DD_HH-MM-SS-repair-loot-refs` before writing files.

## 13. Analyzer Advisory Ignore
- `data/loot-advisory-ignore.json` stores known-safe advisory exceptions.
- `Insects` is ignored as an unused-node advisory because it is a standalone forage/insect tree and should not be deleted or wired through a fake spawner just to improve coverage numbers.
- Do not add missing refs or validation errors to this file; only use it for non-blocking analyzer noise.
