# P2.13 Local Power Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stronger local-only power pack for item catalog metadata, portable EXE launch, loot presets, simulator accuracy, and graph-based spawner ref editing.

**Architecture:** Keep the app local-first and reuse current Express routes and vanilla frontend. Add narrow server helpers for deterministic simulation and safe graph edits, generate richer catalog defaults from icon names, and build a Windows launcher from a small .NET console app during portable packaging.

**Tech Stack:** Node.js, Express, Node test runner, Playwright, PowerShell launcher, .NET 8 console launcher.

---

### Task 1: RED Tests

**Files:**
- Modify: `scripts/server-core.unit.test.cjs`
- Modify: `scripts/server-api.integration.test.cjs`

- [ ] Add tests that require richer catalog fields: `displayNameEn`, `displayNameTh`, `rarity`, `tags`, icon coverage, and generated catalog entries from `scum_items-main`.
- [ ] Add tests that require preset IDs for solo, pvp, hardcore, bunker, survival poor, medical relief, police station, starter friendly, vehicle support, and rare weapons low.
- [ ] Add tests that require deterministic simulator output from a seed plus expected drop-rate fields.
- [ ] Add tests that require graph edit preview/apply for spawner refs through an API route.
- [ ] Add tests that require portable package output to include `Start SETTING SERVER SCUM.exe` when .NET is available.

### Task 2: Catalog And Presets

**Files:**
- Modify: `src/server/local-polish.cjs`
- Modify: `server.js`
- Modify: `public/loot-overrides.js`

- [ ] Add richer built-in catalog metadata and generated fallback metadata from icon filenames.
- [ ] Preserve user overrides, but allow default English/Thai names, category, rarity, and tags to surface in API responses.
- [ ] Expand kit and tuning presets with the agreed local scenarios.

### Task 3: Simulator

**Files:**
- Modify: `server.js`
- Modify: `public/app.js`

- [ ] Add seeded random support.
- [ ] Add expected item rate and category summary fields.
- [ ] Keep compare before/after stable enough for regression tests.

### Task 4: Graph Ref Editor

**Files:**
- Modify: `server.js`
- Modify: `src/server/routes/analysis.cjs`
- Modify: `public/app.js`

- [ ] Add server helper to edit `Spawner.Nodes[*].Ids` by add/remove/replace.
- [ ] Add dry-run preview with diff and validation.
- [ ] Add apply mode with backup before write.
- [ ] Add graph inspector controls for selected spawner refs.

### Task 5: EXE Launcher

**Files:**
- Create: `launcher/SettingServerScumLauncher/SettingServerScumLauncher.csproj`
- Create: `launcher/SettingServerScumLauncher/Program.cs`
- Modify: `scripts/create-portable-package.cjs`
- Modify: `docs/RELEASE_CHECKLIST.md`

- [ ] Build a framework-dependent Windows `.exe` from .NET when available.
- [ ] Copy `Start SETTING SERVER SCUM.exe` into portable output.
- [ ] Keep `.cmd` fallback for machines without .NET build tooling.

### Task 6: Verification

**Commands:**
- `npm run test:unit`
- `npm run test:integration`
- `npm run release:check`
- `npm run package:portable`
- `npm run release:quality`

- [ ] Run targeted tests after each subsystem.
- [ ] Run release quality before claiming completion.
