# SCUM Local Control P2.3

Modern local-first control panel for managing SCUM configuration, loot files, backups, profiles, and rotations.

## Highlights
- Modern UI with dark dashboard layout
- English / Thai language toggle from the top bar
- Parsed editor for `ServerSettings.ini`
- Raw editors for `GameUserSettings.ini` and `EconomyOverride.json`
- Loot Studio for `Nodes/*.json` and `Spawners/*.json`
- Validation, dependency checks, simulator, and auto-fix preview for loot JSON
- Dashboard Preflight and Quick Start workflow for safe first-time use
- Global Search across settings and loot files
- Profile snapshots and rotation scheduler
- Backups with notes, tags, compare, cleanup preview, and restore per file
- Activity log and diff preview
- Item catalog with icon matching, editable friendly names, favorites, import/export metadata, and autocomplete support
- Diagnostics export and release checks for handoff
- Bulk repair for case-sensitive loot refs with backup-before-write
- Analyzer advisory ignore list for known-safe unused nodes

## Requirements
- Node.js 18 or newer
- A SCUM config directory, usually something like:
  - `C:\scumserver\SCUM\Saved\Config\WindowsServer`

## Install and Run
```bash
npm install
npm start
```

Open:
```text
http://localhost:3000
```

For non-technical local usage on Windows, double-click `start-local.cmd` or run `start-local.ps1`.

## First-Time Setup
1. Open **App Settings**
2. Set:
   - **SCUM config folder**
   - **Backup folder**
   - **Nodes folder** and **Spawners folder** if your server uses custom paths
   - **Reload loot command** if you have a script for it
   - **Restart server command** if you have a script for it
3. Click **Save App Config**
4. Return to **Dashboard** and run **Preflight**
5. Follow the **Quick Start** checklist before editing live loot files

## Recommended Folder Layout on the SCUM Side
The app expects a config root containing files like:
```text
WindowsServer/
  ServerSettings.ini
  GameUserSettings.ini
  EconomyOverride.json
  Nodes/
  Spawners/
```

## Main Pages
### Dashboard
Health cards, Preflight readiness, Quick Start workflow, command buttons, and global search.

### App Settings
Local paths and commands used by the app.

### Server Settings
Parsed editor for `ServerSettings.ini`. Includes presets and save with optional reload.

### Core Files
Raw editor for `GameUserSettings.ini` and `EconomyOverride.json`.

### Loot Studio
List, create, clone, validate, simulate, auto-fix preview, and edit loot files.

### Analyzer
Shows totals, missing refs, unused nodes, and repeated items.

### Graph
Shows practical dependency chains from spawners to nodes to items.

### Profiles
Create snapshots and apply them later. Rotation settings live here too.

### Backups
Browse backup snapshots, tag important snapshots, compare backups, cleanup old backups after preview, and restore individual files.

### Activity
Simple audit trail for saves, backups, restores, commands, and profile actions.

## Safety Model
- A backup is created before writes and before restore operations
- Invalid JSON is blocked
- Malformed INI is blocked
- Loot files get extra validation for missing refs and suspicious probability values
- `npm run repair:loot-refs` creates a dedicated backup before applying ref case repairs

## Language Toggle
Use the language button in the top bar.
- `ไทย` switches to Thai
- `EN` switches back to English

## Notes
- This is still a local-first admin tool, not a multi-user SaaS app
- Reload/restart actions only work if you provide valid local commands or wrapper scripts
- Loot simulation is a sanity tool, not a perfect runtime mirror of SCUM internals
- An online hosted version cannot directly edit customer files unless a local agent/desktop bridge is installed on the customer's machine

## Suggested Wrapper Script Pattern
```bat
@echo off
REM Put your own reload/restart logic here
call C:\scripts\reload_loot.bat
```

## More Documentation
- `docs/USAGE_GUIDE.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/P2_3_STATUS.md`
- `docs/SAAS_TENANT_ARCHITECTURE.md`


## P2 Additions

- Analyzer overview with missing refs, unused nodes, and top items
- Global search across nodes, spawners, settings, and economy
- Graph focus inspector with neighborhood counts
- Auto-fix preview/apply for loot JSON
- Visual builder upgrades: slider, normalize, duplicate, reorder, quick add
