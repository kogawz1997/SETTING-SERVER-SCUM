const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const ini = require('ini');
const Diff = require('diff');
const { sendError } = require('./src/server/errors.cjs');
const {
  ensureDir,
  stripBom,
  readText,
  writeText,
  loadJson,
  saveJson,
} = require('./src/server/store/file-store.cjs');
const { createAppStore } = require('./src/server/store/app-store.cjs');
const { applyFileTransaction } = require('./src/server/store/file-transaction.cjs');
const { createCommandRunner } = require('./src/server/services/command-runner.cjs');
const { createBackupService } = require('./src/server/services/backup-service.cjs');
const { createProfileService } = require('./src/server/services/profile-service.cjs');
const { createKitTemplateService } = require('./src/server/services/kit-template-service.cjs');
const { validateServerSettingsLogic, validateLootLogic } = require('./src/server/validation.cjs');
const { buildSafeApplyPlan, applySafePlan } = require('./src/server/safe-apply.cjs');
const { createWorkspacePackage, parseWorkspacePackage } = require('./src/server/package-manager.cjs');
const {
  DEFAULT_ITEM_CATALOG_PACK,
  DEFAULT_KIT_TEMPLATE_LIBRARY,
  LOOT_TUNING_PRESETS,
  buildSupportBundle,
  buildHealthNextActions,
  summarizeSafeApplyPlan,
} = require('./src/server/local-polish.cjs');
const { applyCuratedCatalogMetadata } = require('./src/server/item-catalog-curated.cjs');
const { buildStartupDoctorReport } = require('./src/server/services/startup-doctor.cjs');
const { createWorkspaceDomain } = require('./src/server/services/workspace-domain.cjs');
const registerRoutes = require('./src/server/routes/index.cjs');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const KIT_TEMPLATES_FILE = path.join(DATA_DIR, 'kit-templates.json');
const ITEM_CATALOG_OVERRIDES_FILE = path.join(DATA_DIR, 'item-catalog-overrides.json');
const LOOT_ADVISORY_IGNORE_FILE = path.join(DATA_DIR, 'loot-advisory-ignore.json');
const ITEM_ICON_DIR = path.join(ROOT, 'scum_items-main');

const CORE_FILES = ['ServerSettings.ini', 'GameUserSettings.ini', 'EconomyOverride.json'];
const DEFAULT_CONFIG = {
  scumConfigDir: '',
  nodesDir: '',
  spawnersDir: '',
  backupDir: '.control-plane-backups',
  reloadLootCommand: '',
  restartServerCommand: '',
  autoBackupCoreOnStart: false,
};
const DEFAULT_PROFILES = { profiles: [] };
const DEFAULT_ROTATION = { enabled: false, everyMinutes: 0, activeProfileId: '', entries: [], nextRunAt: '' };
const DEFAULT_LOOT_ADVISORY_IGNORE = { unusedNodes: [], notes: {} };
const appStore = createAppStore({
  root: ROOT,
  dataDir: DATA_DIR,
  defaultConfig: DEFAULT_CONFIG,
  defaultProfiles: DEFAULT_PROFILES,
  defaultRotation: DEFAULT_ROTATION,
  coreFiles: CORE_FILES,
});
const PROFILE_STORE_DIR = appStore.profileStoreDir;
const {
  loadConfig,
  saveConfig,
  loadProfilesData,
  saveProfilesData,
  loadRotation,
  saveRotation,
  resolvedPaths,
  inspectConfigFolder,
  appendActivity,
  appendOperationLog,
  readActivity,
  readOperationLogs,
  operationsLogFile,
  ensureStoreDirs,
} = appStore;
const LOOT_RARITIES = ['Abundant', 'Common', 'Uncommon', 'Rare', 'VeryRare', 'ExtremelyRare'];
const LOOT_SCHEMA_VERSION = '2026.04-local-p2.3';
const LOOT_SCHEMA_HINTS = {
  node: {
    label: 'Flat item node',
    description: 'A node with an Items array. Best for direct probability/weight item lists.',
    required: ['Name', 'Items'],
    itemIdentityFields: ['ClassName', 'Name', 'Item', 'Id'],
    numericFields: ['Probability', 'Chance', 'Min', 'Max'],
    fixableCodes: ['node.items_not_array', 'node.missing_name', 'node.duplicate_item', 'node.invalid_probability', 'node.zero_probability_total', 'node.probability_total_not_one'],
  },
  node_tree: {
    label: 'Tree node',
    description: 'A branching loot tree with Name, Rarity, and Children. Leaves behave like final item refs.',
    required: ['Name', 'Rarity', 'Children'],
    allowedRarities: LOOT_RARITIES,
    fixableCodes: ['tree.invalid_child', 'tree.missing_name', 'tree.invalid_rarity', 'tree.children_not_array'],
  },
  spawner: {
    label: 'Spawner',
    description: 'A spawner file that points to node tree refs through Nodes groups.',
    required: ['Name', 'Nodes'],
    booleanFields: ['AllowDuplicates', 'ShouldFilterItemsByZone', 'ShouldApplyLocationSpecificProbabilityModifier', 'ShouldApplyLocationSpecificDamageModifier'],
    numericFields: ['QuantityMin', 'QuantityMax', 'Probability'],
    numericNotes: { Probability: 'SCUM loot files commonly use this as a non-negative weight; values above 1 are valid.' },
    fixableCodes: ['spawner.nodes_not_array', 'spawner.quantity_range_reversed', 'spawner.invalid_probability', 'spawner.boolean_as_text', 'spawner.duplicate_ref'],
  },
};
const ITEM_CATEGORY_RULES = [
  { id: 'weapon', pattern: /(weapon|rifle|pistol|smg|shotgun|sniper|revolver|crossbow|grenade|sword|knife|axe|crowbar|machete|katana|bow|ak47|ak15|m16|mp5|ump|rpk|sks|kar98|mosin|deagle|1911|vhs|m82|m1|baseballbat)/ },
  { id: 'ammo', pattern: /(ammo|bullet|round|gauge|arrow|bolt|magazine|clip|shell|slug|buckshot|birdshot|762|556|9mm|45acp|338|50bmg|22lr|357|caliber)/ },
  { id: 'medical', pattern: /(bandage|dressing|painkiller|antibiotic|med|syringe|charcoal|tourniquet|vitamin|firstaid|defibrillator|bloodbag|morphine|penicillin|antiseptic|splint|painkiller)/ },
  { id: 'food', pattern: /(food|drink|water|soda|juice|beer|wine|vodka|whisky|mre|apple|banana|bread|canned|can_|canof|rice|corn|potato|meat|fish|tuna|sardine|pasta|sugar|salt|chocolate|milk)/ },
  { id: 'tool', pattern: /(tool|repair|screwdriver|wrench|hammer|pliers|saw|drill|lockpick|bobby|wire|ducttape|tape|sewing|needle|compass|lighter|matches|flashlight|battery|toolbox)/ },
  { id: 'clothing', pattern: /(shirt|pants|boots|shoes|gloves|jacket|hoodie|vest|helmet|hat|beanie|mask|backpack|holster|quiver|armor|armour|ghillie|balaclava)/ },
  { id: 'vehicle', pattern: /(vehicle|car|truck|bike|bicycle|motorcycle|wheel|tire|tyre|engine|fuel|gasoline|jerrycan|quad|tractor|boat)/ },
  { id: 'currency', pattern: /(cash|money|credit|coin|gold|silver|valuable|watch|jewelry|jewel|ring|necklace)/ },
];

const SERVER_PRESETS = {
  balanced_pvp: {
    label: 'Balanced PvP',
    description: 'Higher player cap, faster fame gain, and public map play.',
    apply(parsed) {
      const next = clone(parsed);
      next.General = next.General || {};
      next.General['scum.MaxPlayers'] = '90';
      next.General['scum.AllowMapScreen'] = 'True';
      next.General['scum.FameGainMultiplier'] = '100.000000';
      next.General['scum.AllowFirstPerson'] = 'True';
      return next;
    },
  },
  hardcore: {
    label: 'Hardcore Survival',
    description: 'Less UI help, harsher logout, and lower fame gain.',
    apply(parsed) {
      const next = clone(parsed);
      next.General = next.General || {};
      next.General['scum.AllowMapScreen'] = 'False';
      next.General['scum.AllowThirdPerson'] = 'False';
      next.General['scum.FameGainMultiplier'] = '25.000000';
      next.General['scum.LogoutTimer'] = '120.000000';
      return next;
    },
  },
  sandbox: {
    label: 'Sandbox / Test',
    description: 'Keep things permissive while tuning configs.',
    apply(parsed) {
      const next = clone(parsed);
      next.General = next.General || {};
      next.General['scum.AllowMapScreen'] = 'True';
      next.General['scum.AllowGlobalChat'] = 'True';
      next.General['scum.AllowEvents'] = 'True';
      next.World = next.World || {};
      next.World['scum.MaxAllowedPuppets'] = '200';
      return next;
    },
  },
};

let iconIndexCache = null;
let iconCatalogCache = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadLootAdvisoryIgnore() {
  const data = loadJson(LOOT_ADVISORY_IGNORE_FILE, DEFAULT_LOOT_ADVISORY_IGNORE);
  return {
    unusedNodes: Array.isArray(data.unusedNodes) ? data.unusedNodes.map((value) => String(value || '').trim()).filter(Boolean) : [],
    notes: data.notes && typeof data.notes === 'object' && !Array.isArray(data.notes) ? data.notes : {},
  };
}

const commandRunner = createCommandRunner({
  root: ROOT,
  loadConfig,
  appendActivity,
  appendOperationLog,
  timeout: 30000,
});
const {
  inspectCommand,
  runShellCommand,
  runConfiguredCommand,
} = commandRunner;

const kitTemplateService = createKitTemplateService({
  kitTemplatesFile: KIT_TEMPLATES_FILE,
  defaultTemplates: DEFAULT_KIT_TEMPLATE_LIBRARY,
  loadJson,
  saveJson,
  appendActivity,
});
const {
  loadKitTemplates,
  createKitTemplate,
  deleteKitTemplate,
} = kitTemplateService;

function errorResponse(res, status, error) {
  sendError(res, error, status);
}

let backupService;
let profileService;
function createBackup(...args) { return backupService.createBackup(...args); }
function listBackups(...args) { return backupService.listBackups(...args); }
function allWorkspaceLogicalPaths(...args) { return backupService.allWorkspaceLogicalPaths(...args); }

const workspaceDomain = createWorkspaceDomain({
  fs,
  path,
  ini,
  Diff,
  ROOT,
  CORE_FILES,
  ITEM_ICON_DIR,
  ITEM_CATALOG_OVERRIDES_FILE,
  LOOT_SCHEMA_VERSION,
  LOOT_SCHEMA_HINTS,
  LOOT_RARITIES,
  ITEM_CATEGORY_RULES,
  DEFAULT_ITEM_CATALOG_PACK,
  buildHealthNextActions,
  validateLootLogic,
  validateServerSettingsLogic,
  applyCuratedCatalogMetadata,
  loadConfig,
  resolvedPaths,
  inspectConfigFolder,
  inspectCommand,
  listBackups,
  createBackup,
  appendActivity,
  readActivity,
  readText,
  writeText,
  loadJson,
  saveJson,
  stripBom,
  loadLootAdvisoryIgnore,
  buildStartupDoctorReport,
});
const {
  detectLootKind,
  safeParseJson,
  readJsonObject,
  analyzeLootObject,
  autoFixLootObject,
  simulateLootFile,
  simulateLootObject,
  compareSimulationResults,
  buildItemCatalog,
  upsertItemCatalogOverride,
  loadItemCatalogOverrides,
  importItemCatalogOverrides,
  deleteItemCatalogOverride,
  readLogicalFile,
  resolveLogicalPath,
  listLootFiles,
  scanLootWorkspace,
  safeScanLootWorkspace,
  validateContent,
  createDiff,
  analyzeOverview,
  buildGraph,
  buildGraphRefEditPlan,
  searchWorkspace,
  buildReadinessReport,
  buildDiagnosticsReport,
  buildLootSchemaReport,
} = workspaceDomain;

backupService = createBackupService({
  fs,
  path,
  CORE_FILES,
  resolvedPaths,
  resolveLogicalPath,
  listLootFiles,
  createDiff,
  ensureDir,
  readText,
  writeText,
  loadJson,
  saveJson,
  appendActivity,
});
const {
  resolveBackupRoot,
  resolveBackupFilePath,
  listBackupFiles,
  restoreBackupFile,
  updateBackupMeta,
  compareBackupFiles,
  backupCleanupCandidates,
  cleanupBackups,
  workspacePackageFiles,
} = backupService;

profileService = createProfileService({
  path,
  profileStoreDir: PROFILE_STORE_DIR,
  loadProfilesData,
  saveProfilesData,
  loadRotation,
  saveRotation,
  resolvedPaths,
  allWorkspaceLogicalPaths,
  readLogicalFile,
  resolveLogicalPath,
  createBackup,
  runConfiguredCommand,
  applyFileTransaction,
  ensureDir,
  loadJson,
  saveJson,
  appendActivity,
  writeText,
});
const {
  createProfileSnapshot,
  applyProfileSnapshot,
  nextRotationRun,
  runRotation,
} = profileService;

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
if (fs.existsSync(ITEM_ICON_DIR)) {
  app.use('/item-icons', express.static(ITEM_ICON_DIR, { maxAge: '1d', immutable: false }));
}
app.use(express.static(PUBLIC_DIR, { etag: false }));

const serverContext = {
  fs,
  path,
  ini,
  ROOT,
  PUBLIC_DIR,
  PROFILE_STORE_DIR,
  SERVER_PRESETS,
  loadConfig,
  saveConfig,
  loadProfilesData,
  saveProfilesData,
  loadRotation,
  saveRotation,
  resolvedPaths,
  inspectConfigFolder,
  inspectCommand,
  runShellCommand,
  runConfiguredCommand,
  errorResponse,
  readLogicalFile,
  resolveLogicalPath,
  validateContent,
  validateServerSettingsLogic,
  buildSafeApplyPlan,
  applySafePlan,
  summarizeSafeApplyPlan,
  createDiff,
  readText,
  writeText,
  createBackup,
  appendActivity,
  readActivity,
  readOperationLogs,
  operationsLogFile,
  scanLootWorkspace,
  safeScanLootWorkspace,
  readJsonObject,
  safeParseJson,
  analyzeLootObject,
  autoFixLootObject,
  simulateLootFile,
  simulateLootObject,
  compareSimulationResults,
  buildItemCatalog,
  LOOT_TUNING_PRESETS,
  upsertItemCatalogOverride,
  loadItemCatalogOverrides,
  importItemCatalogOverrides,
  deleteItemCatalogOverride,
  loadKitTemplates,
  createKitTemplate,
  deleteKitTemplate,
  analyzeOverview,
  buildGraph,
  buildGraphRefEditPlan,
  searchWorkspace,
  createProfileSnapshot,
  applyProfileSnapshot,
  nextRotationRun,
  runRotation,
  listBackups,
  listBackupFiles,
  resolveBackupRoot,
  resolveBackupFilePath,
  updateBackupMeta,
  backupCleanupCandidates,
  cleanupBackups,
  compareBackupFiles,
  restoreBackupFile,
  applyFileTransaction,
  workspacePackageFiles,
  createWorkspacePackage,
  parseWorkspacePackage,
  buildSupportBundle,
  buildReadinessReport,
  buildDiagnosticsReport,
  buildLootSchemaReport,
  buildStartupDoctorReport,
};

registerRoutes(app, serverContext);
const port = Number(process.env.PORT || 3000);
function startServer(listenPort = port) {
  ensureStoreDirs(loadConfig());
  return app.listen(listenPort, () => {
    console.log(`SCUM control plane listening on http://127.0.0.1:${listenPort}`);
  });
}

if (require.main === module) {
  startServer(port);
}

module.exports = {
  app,
  startServer,
  inspectCommand,
  validateContent,
  safeScanLootWorkspace,
  analyzeOverview,
  buildGraph,
  buildGraphRefEditPlan,
  searchWorkspace,
  buildReadinessReport,
  buildDiagnosticsReport,
  buildStartupDoctorReport,
  buildSafeApplyPlan,
  createWorkspacePackage,
  parseWorkspacePackage,
  buildSupportBundle,
  summarizeSafeApplyPlan,
};


