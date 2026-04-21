# Local Release Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining local-only hardening work for portable release quality, launcher usability, curated catalog coverage, graph drag editing, and the next tagged local release.

**Architecture:** Keep release/package validation in standalone scripts under `scripts/`, keep launcher checks in the portable PowerShell entrypoint, keep item metadata in `src/server/item-catalog-curated.cjs`, and keep graph UX in `public/loot-overrides.js`/CSS with Playwright coverage. Do not add SaaS, auth, remote control, or new server architecture.

**Tech Stack:** Node.js CommonJS scripts, PowerShell launcher, Playwright smoke tests, existing Express local app, GitHub Actions Windows runner.

---

### Task 1: Zip Smoke And Extracted Zip Smoke

**Files:**
- Create: `scripts/portable-zip-smoke.cjs`
- Modify: `package.json`
- Modify: `scripts/release-quality.cjs`
- Modify: `scripts/release-check.cjs`
- Modify: `.github/workflows/local-portable-release.yml`

- [ ] Add a failing release guard requiring `package:portable:zip-smoke`.
- [ ] Add a Node script that creates or accepts a zip, extracts it to a temp folder, reads `portable-manifest.json`, verifies required files exist, and verifies private files are absent.
- [ ] Run `npm.cmd run package:portable`, `npm.cmd run package:portable:zip-smoke`, and `npm.cmd run release:check`.

### Task 2: Launcher UX Polish

**Files:**
- Modify: `Start SETTING SERVER SCUM.ps1`
- Modify: `scripts/release-check.cjs`

- [ ] Add clearer error output with "How to fix" and log path hints.
- [ ] Add startup step messages for manifest, Node, dependencies, port, and browser URL.
- [ ] Run `npm.cmd run release:check`.

### Task 3: Curated Catalog Expansion

**Files:**
- Modify: `src/server/item-catalog-curated.cjs`
- Modify: `scripts/server-api.integration.test.cjs`
- Modify: `scripts/release-check.cjs`

- [ ] Add curated entries for common firearms, ammo boxes, military medical, food/drink, tools, and vehicle parts.
- [ ] Add integration assertions for representative new entries.
- [ ] Run `npm.cmd run test:integration`.

### Task 4: Graph Drag Editor Polish

**Files:**
- Modify: `public/loot-overrides.js`
- Modify: `public/loot-overrides.css`
- Modify: `scripts/ui-smoke.spec.cjs`
- Modify: `scripts/release-check.cjs`

- [ ] Add a visible drag connection preview line while dragging from spawner to node.
- [ ] Add a staged edit summary in the graph editor strip so users know what will be applied.
- [ ] Add Playwright coverage for the preview/staged summary.
- [ ] Run `npm.cmd run test:ui-smoke`.

### Task 5: v1.0.9-local Release

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `CHANGELOG.md`
- Create: `docs/releases/v1.0.9-local.md`

- [ ] Bump version to `1.0.9`.
- [ ] Add release note for zip smoke, launcher UX, catalog, and graph drag polish.
- [ ] Run `npm.cmd run release:quality`.
- [ ] Commit, push `main`, tag `v1.0.9-local`, push tag, and verify GitHub Actions/release asset.
