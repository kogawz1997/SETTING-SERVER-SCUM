# Project Structure

```text
scum-next-build/
  data/
    activity.log           # activity history
    config.json            # saved app settings
    config.example.json    # example config
    item-catalog-overrides.json
    kit-templates.json
    profiles.json          # profile snapshot metadata
    rotation.json          # rotation scheduler data
  docs/
    PROJECT_STRUCTURE.md
    P2_3_STATUS.md
    RELEASE_CHECKLIST.md
    SAAS_TENANT_ARCHITECTURE.md
    USAGE_GUIDE.md
  public/
    app.js                 # front-end app logic
    index.html             # UI shell
    loot-overrides.css     # P2 UI and catalog/readiness styling
    loot-overrides.js      # P2 UI and behavior overrides
    style.css              # styles
  scripts/
    README.txt             # helper notes
    release-check.cjs      # handoff readiness checks
    *regression.spec.cjs   # Playwright regression tests
  scum_items-main/         # optional item icon source folder
  server.js                # Express API and file operations
  package.json             # dependencies and scripts
  package-lock.json
  start-local.cmd          # Windows double-click launcher
  start-local.ps1          # PowerShell launcher
```

## Backend Responsibilities
`server.js` handles:
- bootstrap and local data files
- reading and writing app settings
- reading and writing SCUM files
- backup and restore
- backup cleanup, backup notes/tags, and backup compare
- parsed INI handling
- loot validation and simulator helpers
- loot schema report and diagnostics export
- item catalog, icon matching, metadata import/export
- analyzer and graph API responses
- profile snapshot and rotation features
- activity logging

## Frontend Responsibilities
`public/app.js` handles:
- page navigation
- bootstrap loading
- language switching
- parsed server settings editing
- core file raw editing
- loot file listing and editing
- analyzer and graph rendering
- profiles, rotation, backups, and activity views

`public/loot-overrides.js` and `public/loot-overrides.css` add the P2 workspace UI:
- dashboard readiness and diagnostics panels
- cleaner Loot Studio layout
- item catalog editing and autocomplete helpers
- analyzer and graph polish
- backup cleanup and metadata tools

## Data Files
### `data/config.json`
Stores local app settings such as SCUM config path and commands.

### `data/profiles.json`
Stores snapshot metadata used by the Profiles page.

### `data/rotation.json`
Stores scheduler state and rotation entries.

### `data/activity.log`
Append-only log of actions performed through the app.

### `data/item-catalog-overrides.json`
Stores friendly names, categories, favorites, and notes for discovered items.
