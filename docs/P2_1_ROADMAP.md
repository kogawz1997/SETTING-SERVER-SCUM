# P2.1 Roadmap

## 1. Reality Check From Current Code

The current project is already a usable local-first tool, but several areas are still partial implementations rather than finished systems.

### Confirmed working now

- `server.js`
  - Express API for bootstrap, config, file reads/writes, diff, loot analysis, simulator, analyzer, graph, profiles, rotation, backups, restore, and activity
  - Local backup-before-write flow is already in place
  - Basic loot validation and auto-fix exist
- `public/index.html`
  - Single-page dashboard shell with all main views already present
- `public/app.js`
  - Navigation, API calls, language toggle, loot editor, analyzer, graph, profiles, rotation, backups, and activity rendering
- `public/style.css`
  - Shared dashboard layout, cards, graph cards, visual builder rows, and responsive rules

### Confirmed partial or weak areas

- i18n is present but incomplete
  - There is a translation dictionary, but many runtime strings are still hardcoded in English
  - Translation application depends on fragile DOM selectors and `nth-child` patterns
- Loot Builder is usable but still basic
  - Reorder is button-based, not drag-and-drop
  - No item catalog or autocomplete yet
  - No bulk edit or advanced balancing flow
- Graph is not interactive yet
  - Backend returns nodes and edges
  - Frontend renders grouped cards, not a true pan/zoom graph canvas
- Validation and auto-fix are still schema-light
  - Current checks are mostly missing name, probability coercion, duplicate rows, and missing refs
  - No typed schema engine, severity model, or cross-file repair suggestions
- Analyzer is still first-pass
  - Totals, repeated items, missing refs, unused nodes, and simple category counts exist
  - No rarity, coverage, power score, or before/after comparison
- Setup and onboarding are not finished
  - There is an App Settings page, but no guided setup wizard

## 2. P2.1 Goal

P2.1 should make the app feel deliberate and comfortable to use, without turning this version into a full rewrite.

### Target outcome

- complete Thai/English coverage
- stable UI patterns across all views
- real item catalog and autocomplete in Loot Studio
- deeper validation plus smarter auto-fix
- interactive graph that is actually worth using

### Explicitly out of scope for P2.1

- AI assist
- goal-based tuning
- SaaS or multi-user auth
- full visual graph editor with drag-created relationships

Those belong to P3 after the foundations below exist.

## 3. Recommended Architecture Direction

Do not jump frameworks yet. Keep Express + static frontend for P2.1, but stop growing `server.js` and `public/app.js` as monoliths.

### Proposed backend structure

```text
server/
  index.js
  routes/
    bootstrap.js
    config.js
    files.js
    loot.js
    analyzer.js
    graph.js
    profiles.js
    backups.js
    actions.js
  services/
    app-config.js
    activity-log.js
    backup-service.js
    profile-service.js
    rotation-service.js
  loot/
    catalog.js
    schema.js
    validation.js
    autofix.js
    simulator.js
    analyzer.js
    graph.js
  utils/
    fs-safe.js
    paths.js
    diff.js
```

### Proposed frontend structure

```text
public/
  index.html
  app/
    main.js
    state.js
    api.js
    i18n.js
    dom.js
    views/
      dashboard.js
      settings.js
      server.js
      corefiles.js
      loot.js
      analyzer.js
      graph.js
      profiles.js
      backups.js
      activity.js
    components/
      toast.js
      empty-state.js
      status-pill.js
      diff-view.js
      validation-list.js
      file-list.js
      graph-panel.js
  styles/
    tokens.css
    base.css
    layout.css
    components.css
    views.css
```

### Data additions for P2.1

```text
data/
  item-catalog.json
  schemas/
    node.schema.json
    spawner.schema.json
    economy.schema.json
```

If time is tight, keep physical files where they are for now, but organize code by modules with the same boundaries above.

## 4. Workstreams

## Workstream A: i18n Completion

### Why first

This is already half-built. Finishing it early removes duplicated cleanup later.

### Current issues

- hardcoded strings still exist in `public/app.js`
- validation/analyzer/graph messages mix translated and untranslated output
- DOM translation code is selector-heavy and brittle

### Deliverables

- move all user-facing strings into `public/app/i18n.js`
- replace hardcoded strings in render functions, prompts, confirms, toasts, and empty states
- use translation keys in analyzer, graph, simulator, backups, and profile flows
- add a small helper for templated messages, not raw string concatenation everywhere

### Definition of done

- switching language changes all visible UI text in every page
- toast, prompt, confirm, validation, empty state, and graph text all switch with the current language
- no new user-facing string is allowed outside the i18n module

## Workstream B: UI Consistency

### Why second

The app already has a visual direction. It needs discipline, not a redesign.

### Current issues

- repeated card markup and action groups
- inconsistent empty/loading/error states
- one large stylesheet with view-specific and component-specific rules mixed together

### Deliverables

- extract CSS tokens for spacing, radius, surface, focus, and status colors
- standardize section headers, action bars, cards, file lists, and empty states
- add reusable loading, empty, error, and success blocks
- reduce selector fragility in `applyTranslations()`

### Definition of done

- every view uses the same card/header/action rhythm
- empty/loading/error states look like part of one product
- CSS is split so new pages do not require hunting inside one big file

## Workstream C: Item Catalog + Loot Builder Upgrade

### Why third

This produces the biggest usability jump with the least conceptual risk.

### Backend tasks

- add a catalog loader that reads from `data/item-catalog.json`
- add API endpoints:
  - `GET /api/items`
  - `GET /api/items/search?q=`
  - `GET /api/items/categories`
- optionally merge a static catalog with items discovered from live nodes

### Frontend tasks

- add item autocomplete for `ClassName`
- add category filter inside Loot Studio
- add quick insert from catalog results
- add bulk probability edit for selected rows
- replace up/down reorder with drag-and-drop
- keep raw JSON and visual builder in sync without losing undoable intent

### Definition of done

- users no longer need to memorize class names
- item insertion is faster than raw JSON editing
- reorder is mouse-friendly and stable

## Workstream D: Validation + Smart Auto-Fix

### Why fourth

Catalog and builder become much stronger when validation understands actual structure.

### Current gaps

- no schema versioning
- no severity levels
- no probability total checks beyond per-row sanity
- no cross-file repair suggestions

### Deliverables

- define file-type schemas for:
  - node
  - spawner
  - economy override
- add structured validation result format:
  - `code`
  - `message`
  - `severity`
  - `path`
  - `suggestedFix`
- add rules for:
  - missing or invalid field types
  - missing refs
  - broken reference chains
  - suspicious probability totals
  - duplicate refs with merge candidates
- extend auto-fix to:
  - repair probability fields
  - normalize totals safely
  - rename unnamed entries from deterministic patterns
  - merge or drop duplicates by explicit rule

### Definition of done

- validation output is consistent across all relevant files
- users can preview smart fixes before saving
- warnings can be filtered by severity

## Workstream E: Interactive Graph

### Why fifth

This is valuable only after catalog and validation can enrich what the graph shows.

### Recommended implementation

Use a lightweight browser graph library rather than hand-building pan/zoom from scratch.

Good fit:

- Cytoscape.js for pan/zoom/filter/highlight

### Deliverables

- real node-edge graph canvas
- zoom and pan
- click-to-focus neighborhood
- filter by kind, category, and text
- highlight missing refs and unused nodes
- side inspector that stays synced with selected node

### Definition of done

- graph view is faster for dependency inspection than current card groups
- large graphs remain usable
- focus state is consistent with analyzer warnings

## 5. Page-by-Page Delivery Order

This is the order that gives the best ratio between user value and implementation risk.

### Phase 1: Foundation

1. App Settings
   - finish i18n
   - add setup validation messages
   - prepare the future wizard state model
2. Shared UI shell
   - standardize headers, cards, empty states, and toasts
3. Shared data layer
   - split API helpers, state, and i18n out of `public/app.js`

### Phase 2: Loot-first usability

4. Loot Studio
   - add item catalog API
   - add autocomplete
   - add bulk actions
   - add drag-and-drop reorder
5. Validation panel
   - structured severities
   - better rule coverage
   - smart autofix preview and apply

### Phase 3: Inspection tools

6. Analyzer
   - reuse structured validation output
   - add deeper metrics incrementally
7. Graph
   - replace grouped cards with interactive graph
   - keep a synced focus inspector

### Phase 4: Quality-of-life wrap-up

8. Backups
   - tags, notes, and compare flow
9. Activity
   - structured event list with filters
10. Setup Wizard
   - guided first-run path and permission checks

## 6. Concrete File Ownership For P2.1

If the work is split across tickets, use these write boundaries.

### Ticket group 1: frontend foundation

- `public/index.html`
- `public/app/main.js`
- `public/app/state.js`
- `public/app/api.js`
- `public/app/i18n.js`
- `public/styles/*`

### Ticket group 2: loot domain backend

- `server/loot/catalog.js`
- `server/loot/schema.js`
- `server/loot/validation.js`
- `server/loot/autofix.js`
- `server/routes/loot.js`
- `data/item-catalog.json`

### Ticket group 3: loot domain frontend

- `public/app/views/loot.js`
- `public/app/components/validation-list.js`
- `public/app/components/file-list.js`

### Ticket group 4: analysis and graph

- `server/loot/analyzer.js`
- `server/loot/graph.js`
- `server/routes/analyzer.js`
- `server/routes/graph.js`
- `public/app/views/analyzer.js`
- `public/app/views/graph.js`

### Ticket group 5: backups, activity, onboarding

- `server/services/backup-service.js`
- `server/services/activity-log.js`
- `public/app/views/backups.js`
- `public/app/views/activity.js`
- `public/app/views/settings.js`

## 7. Milestone Plan

## Milestone M1: Stabilize the shell

- modularize frontend bootstrap
- complete i18n
- unify states and shared components

Exit criteria:

- dashboard, settings, server settings, core files, and profiles all use the same shell patterns

## Milestone M2: Loot Studio becomes comfortable

- item catalog
- autocomplete
- bulk edit
- drag-and-drop reorder
- smarter validation/autofix

Exit criteria:

- common loot edits are faster in the builder than in raw JSON

## Milestone M3: Inspection becomes trustworthy

- analyzer deeper metrics
- interactive graph
- shared warning model

Exit criteria:

- missing refs, unused nodes, and suspicious distributions can be investigated without leaving the app

## Milestone M4: Operational polish

- better backups
- better activity feed
- setup wizard

Exit criteria:

- first-time setup and rollback are both low-stress

## 8. Recommended First Ticket Set

If only one short cycle is available, do these first:

1. extract i18n into its own module and remove hardcoded strings
2. add `item-catalog.json` plus basic search API
3. wire autocomplete into Loot Studio
4. refactor validation output to severity-based objects
5. replace graph card rendering with a library-backed interactive graph

That is the highest-value P2.1 slice.

## 9. What Not To Do Yet

- do not migrate to React/Vue just to organize the code
- do not add AI features before the schema and catalog layers exist
- do not build a full graph editor before the read-only graph is solid
- do not expand analyzer metrics without first normalizing validation and catalog data

The project is still small enough that disciplined modularization is cheaper than a stack rewrite.
