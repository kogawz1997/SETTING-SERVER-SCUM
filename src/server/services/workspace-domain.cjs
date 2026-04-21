function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const { normalizeKey, posixify, sortByName, walkFiles } = require('./workspace-utils.cjs');
const { createItemCatalogService } = require('./item-catalog-service.cjs');
const { createLootCoreService } = require('./loot-core-service.cjs');
const { createLootAnalyzerService } = require('./loot-analyzer-service.cjs');
const { createLootAutofixService } = require('./loot-autofix-service.cjs');
const { createLootGraphService } = require('./loot-graph-service.cjs');
const { createLootSimulatorService } = require('./loot-simulator-service.cjs');
const { createWorkspaceFileService } = require('./workspace-file-service.cjs');
const { createWorkspaceHealthService } = require('./workspace-health-service.cjs');
const { createWorkspaceSearchService } = require('./workspace-search-service.cjs');

function createWorkspaceDomain(deps) {
  const {
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
  } = deps;
  const walkProjectFiles = (dir, filter = () => true, baseDir = dir, results = []) => walkFiles(fs, path, dir, filter, baseDir, results);
  const nowIso = () => new Date().toISOString();

const lootCoreService = createLootCoreService({
  clone,
  path,
  stripBom,
  readText,
  normalizeKey,
  posixify,
  LOOT_RARITIES,
  scanLootWorkspace: () => scanLootWorkspace(),
});
const {
  detectLootKind,
  safeParseJson,
  readJsonObject,
  rarityWeight,
  buildValidation,
  mergeValidationResults,
  collectSpawnerRefEntries,
  collectSpawnerRefs,
  itemEntryName,
  itemEntryProbability,
  itemEntryIdentityKey,
  cloneWithoutProbability,
  parseBooleanLike,
  collectTreeLeaves,
  collectTreeRefs,
  normalizeSpawnerRef,
  buildRefIndex,
  analyzeLootObject,
  resolveRefNode,
} = lootCoreService;

const itemCatalogService = createItemCatalogService({
  fs,
  path,
  ITEM_ICON_DIR,
  ITEM_CATALOG_OVERRIDES_FILE,
  ITEM_CATEGORY_RULES,
  DEFAULT_ITEM_CATALOG_PACK,
  applyCuratedCatalogMetadata,
  walkProjectFiles,
  normalizeKey,
  loadJson,
  saveJson,
  appendActivity,
  scanLootWorkspace: () => scanLootWorkspace(),
  detectLootKind,
  itemEntryName,
  collectTreeLeaves,
});
const {
  categoryForItem,
  buildIconCatalogDefaults,
  loadItemCatalogOverrides,
  upsertItemCatalogOverride,
  importItemCatalogOverrides,
  deleteItemCatalogOverride,
  buildItemCatalog,
} = itemCatalogService;

const workspaceFileService = createWorkspaceFileService({
  fs,
  path,
  ini,
  Diff,
  CORE_FILES,
  resolvedPaths,
  walkProjectFiles,
  posixify,
  sortByName,
  readText,
  safeParseJson,
  readJsonObject,
  collectTreeRefs,
  buildRefIndex,
  buildValidation,
  mergeValidationResults,
  analyzeLootObject,
  validateLootLogic,
  validateServerSettingsLogic,
});
const {
  readLogicalFile,
  resolveLogicalPath,
  listLootFiles,
  scanLootWorkspace,
  safeScanLootWorkspace,
  validateContent,
  createDiff,
  allWorkspaceLogicalPaths,
} = workspaceFileService;

const lootSimulatorService = createLootSimulatorService({
  scanLootWorkspace: () => scanLootWorkspace(),
  readJsonObject,
  resolveLogicalPath,
  detectLootKind,
  itemEntryName,
  categoryForItem,
  collectSpawnerRefs,
  collectTreeRefs,
  resolveRefNode,
  rarityWeight,
});
const {
  createSeededRandom,
  simulateLootObject,
  simulateLootFile,
  compareSimulationResults,
} = lootSimulatorService;

const lootAutofixService = createLootAutofixService({
  clone,
  path,
  posixify,
  detectLootKind,
  itemEntryName,
  itemEntryProbability,
  itemEntryIdentityKey,
  cloneWithoutProbability,
  parseBooleanLike,
  normalizeSpawnerRef,
  LOOT_RARITIES,
  analyzeLootObject,
  scanLootWorkspace: () => scanLootWorkspace(),
});
const { autoFixLootObject } = lootAutofixService;

const lootAnalyzerService = createLootAnalyzerService({
  buildItemCatalog,
  loadLootAdvisoryIgnore,
  normalizeKey,
  collectSpawnerRefs,
  ITEM_CATEGORY_RULES,
  LOOT_RARITIES,
  detectLootKind,
  collectTreeLeaves,
  rarityWeight,
  itemEntryName,
  itemEntryProbability,
  categoryForItem,
  analyzeLootObject,
  safeScanLootWorkspace,
  LOOT_SCHEMA_VERSION,
  nowIso,
  LOOT_SCHEMA_HINTS,
});
const {
  analyzeOverview,
  buildLootSchemaReport,
  detectLootSchemaKinds,
} = lootAnalyzerService;

const workspaceHealthService = createWorkspaceHealthService({
  fs,
  ITEM_ICON_DIR,
  CORE_FILES,
  nowIso,
  buildHealthNextActions,
  loadConfig,
  resolvedPaths,
  inspectConfigFolder,
  inspectCommand,
  listBackups,
  safeScanLootWorkspace,
  analyzeLootObject,
  analyzeOverview,
  buildStartupDoctorReport,
  readActivity,
  buildItemCatalog,
  detectLootSchemaKinds,
  LOOT_SCHEMA_VERSION,
  ITEM_CATEGORY_RULES,
  ROOT,
});
const {
  buildReadinessReport,
  buildDiagnosticsReport,
} = workspaceHealthService;

const lootGraphService = createLootGraphService({
  clone,
  posixify,
  scanLootWorkspace: () => scanLootWorkspace(),
  detectLootKind,
  collectTreeRefs,
  normalizeSpawnerRef,
  collectSpawnerRefEntries,
  loadConfig,
  resolvedPaths,
  resolveLogicalPath,
  readText,
  writeText,
  safeParseJson,
  createDiff,
  validateContent,
  createBackup,
  appendActivity,
});
const {
  buildGraph,
  buildGraphRefEditPlan,
} = lootGraphService;

const workspaceSearchService = createWorkspaceSearchService({
  resolvedPaths,
  allWorkspaceLogicalPaths,
  resolveLogicalPath,
  readText,
  scanLootWorkspace: () => scanLootWorkspace(),
  analyzeOverview,
});
const { searchWorkspace } = workspaceSearchService;

  return {
    detectLootKind,
    safeParseJson,
    readJsonObject,
    buildValidation,
    mergeValidationResults,
    collectSpawnerRefEntries,
    collectSpawnerRefs,
    analyzeLootObject,
    buildItemCatalog,
    buildIconCatalogDefaults,
    loadItemCatalogOverrides,
    upsertItemCatalogOverride,
    importItemCatalogOverrides,
    deleteItemCatalogOverride,
    readLogicalFile,
    resolveLogicalPath,
    listLootFiles,
    scanLootWorkspace,
    safeScanLootWorkspace,
    validateContent,
    createDiff,
    allWorkspaceLogicalPaths,
    createSeededRandom,
    simulateLootObject,
    simulateLootFile,
    compareSimulationResults,
    autoFixLootObject,
    analyzeOverview,
    buildLootSchemaReport,
    detectLootSchemaKinds,
    buildReadinessReport,
    buildDiagnosticsReport,
    buildGraph,
    buildGraphRefEditPlan,
    searchWorkspace,
  };
}

module.exports = {
  createWorkspaceDomain,
};
