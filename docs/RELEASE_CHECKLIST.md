# Release Checklist

Use this before handing the project to another machine or before editing a real live server.

## Local Machine
1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Run `npm run release:quality`.
4. Run `npm run package:portable`.
5. Zip `dist/SETTING-SERVER-SCUM-local` if you are doing a manual release.
6. For GitHub Release automation, push a tag like `v1.0.2-local`; the workflow creates and attaches the portable zip.
7. Start with `Start SETTING SERVER SCUM.cmd`, `start-local.cmd`, or `npm start`.

## App Setup
1. Open **App Settings**.
2. Set the SCUM config root.
3. Set custom Nodes and Spawners folders when they are not under the config root.
4. Set the backup folder.
5. Configure reload/restart scripts only after testing them outside the app.
6. Run Dashboard Preflight.

## Before First Real Save
1. Create a tagged backup.
2. Open Loot Studio and check validation.
3. Fix critical validation issues.
4. Use Preview Diff before saving.
5. Use Save + Reload only when the reload command reports runnable.

## Loot Repair
1. If Preflight shows missing refs, run `npm run repair:loot-refs -- --dry-run`.
2. Apply only when `unresolvedRefs` is `0`.
3. Run `npm run repair:loot-refs`.
4. Run Dashboard Preflight again.
5. Keep the generated `repair-loot-refs` backup until the server has been tested in-game.

## Handoff Notes
- Keep `data/config.json` machine-specific.
- Share `data/item-catalog-overrides.json` only when you want another machine to reuse friendly names/categories.
- Keep important backups tagged with `keep`, `pinned`, or `protected`.
- Use Diagnostics export when reporting a bug. Turn off path details before sharing outside your machine.
