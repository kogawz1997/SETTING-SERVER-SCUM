Put optional Windows command wrappers here if you want to call them from the web UI.
Examples:
- reload-scum-loot.cmd
- reload-scum-loot.ps1
- restart-scum-server.cmd

Then point reloadLootCommand or restartServerCommand in App Settings to those files.

Before handing the project to another machine, run:

  npm run release:check
  npm test
