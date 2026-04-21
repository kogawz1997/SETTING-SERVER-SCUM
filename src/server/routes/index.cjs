const registerSystemRoutes = require('./system.cjs');
const registerSettingsFilesRoutes = require('./settings-files.cjs');
const registerLootRoutes = require('./loot.cjs');
const registerAnalysisRoutes = require('./analysis.cjs');
const registerProfilesRoutes = require('./profiles.cjs');
const registerBackupsPackageRoutes = require('./backups-package.cjs');
const registerStaticRoutes = require('./static.cjs');

function registerRoutes(app, ctx) {
  registerSystemRoutes(app, ctx);
  registerSettingsFilesRoutes(app, ctx);
  registerLootRoutes(app, ctx);
  registerAnalysisRoutes(app, ctx);
  registerProfilesRoutes(app, ctx);
  registerBackupsPackageRoutes(app, ctx);
  registerStaticRoutes(app, ctx);
}

module.exports = registerRoutes;
