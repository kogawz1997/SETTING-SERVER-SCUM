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

function readLogicalFile(logicalPath, paths = resolvedPaths()) {
  const fullPath = resolveLogicalPath(logicalPath, paths);
  return {
    fullPath,
    logicalPath,
    content: readText(fullPath),
    meta: {
      updatedAt: fs.statSync(fullPath).mtime.toISOString(),
      size: fs.statSync(fullPath).size,
    },
  };
}

function resolveLogicalPath(logicalPath, paths = resolvedPaths()) {
  const normalized = posixify(logicalPath).replace(/^\/+/, '');
  if (CORE_FILES.includes(normalized)) {
    if (!paths.scumConfigDir) throw new Error('SCUM config folder is not configured');
    return path.join(paths.scumConfigDir, normalized);
  }
  if (normalized.startsWith('Nodes/')) {
    if (!paths.nodesDir) throw new Error('Nodes folder is not configured');
    const candidate = path.resolve(paths.nodesDir, normalized.slice('Nodes/'.length));
    if (!candidate.startsWith(path.resolve(paths.nodesDir))) throw new Error('Invalid node path');
    return candidate;
  }
  if (normalized.startsWith('Spawners/')) {
    if (!paths.spawnersDir) throw new Error('Spawners folder is not configured');
    const candidate = path.resolve(paths.spawnersDir, normalized.slice('Spawners/'.length));
    if (!candidate.startsWith(path.resolve(paths.spawnersDir))) throw new Error('Invalid spawner path');
    return candidate;
  }
  throw new Error(`Unsupported file path: ${logicalPath}`);
}

function listLootFiles(paths = resolvedPaths()) {
  const nodeFiles = walkProjectFiles(paths.nodesDir, (filePath) => /\.json$/i.test(filePath), paths.nodesDir).map((entry) => ({
    relPath: `Nodes/${entry.relPath}`,
    name: entry.name,
    logicalName: path.basename(entry.name, '.json'),
  }));
  const spawnerFiles = walkProjectFiles(paths.spawnersDir, (filePath) => /\.json$/i.test(filePath), paths.spawnersDir).map((entry) => ({
    relPath: `Spawners/${entry.relPath}`,
    name: entry.name,
    logicalName: path.basename(entry.name, '.json'),
  }));
  return { nodes: sortByName(nodeFiles, 'relPath'), spawners: sortByName(spawnerFiles, 'relPath') };
}

function scanLootWorkspace(paths = resolvedPaths()) {
  const listed = listLootFiles(paths);
  const nodes = listed.nodes.map((file) => ({ ...file, object: readJsonObject(resolveLogicalPath(file.relPath, paths)) }));
  const spawners = listed.spawners.map((file) => ({ ...file, object: readJsonObject(resolveLogicalPath(file.relPath, paths)) }));
  const refs = nodes.flatMap((file) => collectTreeRefs(file.object, file.relPath));
  return {
    nodes,
    spawners,
    refs,
    refIndex: buildRefIndex(refs),
  };
}

function safeScanLootWorkspace(paths = resolvedPaths()) {
  const listed = listLootFiles(paths);
  const errors = [];
  const readLootFile = (file, type) => {
    try {
      return { ...file, object: readJsonObject(resolveLogicalPath(file.relPath, paths)) };
    } catch (error) {
      errors.push({ path: file.relPath, type, message: error instanceof Error ? error.message : String(error) });
      return null;
    }
  };
  const nodes = listed.nodes.map((file) => readLootFile(file, 'node')).filter(Boolean);
  const spawners = listed.spawners.map((file) => readLootFile(file, 'spawner')).filter(Boolean);
  const refs = nodes.flatMap((file) => collectTreeRefs(file.object, file.relPath));
  return {
    nodes,
    spawners,
    refs,
    refIndex: buildRefIndex(refs),
    errors,
    listed,
  };
}

function validateContent(logicalPath, content) {
  if (/\.json$/i.test(logicalPath)) {
    const object = safeParseJson(content);
    if (/^(Nodes|Spawners)\//.test(posixify(logicalPath))) {
      const scan = safeScanLootWorkspace();
      const knownRefs = scan?.refIndex instanceof Map ? new Set(scan.refIndex.keys()) : null;
      return mergeValidationResults(
        analyzeLootObject(object, logicalPath, scan).validation,
        validateLootLogic(object, logicalPath, knownRefs ? { knownRefs } : {}),
      );
    }
    return buildValidation([]);
  }
  if (/\.ini$/i.test(logicalPath)) {
    const parsed = ini.parse(content);
    if (posixify(logicalPath) === 'ServerSettings.ini') {
      return validateServerSettingsLogic(parsed);
    }
    return buildValidation([]);
  }
  return buildValidation([]);
}

function createDiff(logicalPath, beforeText, afterText) {
  return Diff.createPatch(logicalPath, beforeText, afterText, 'before', 'after');
}

  function allWorkspaceLogicalPaths(paths = resolvedPaths()) {
    const listed = listLootFiles(paths);
    return [
      ...CORE_FILES,
      ...listed.nodes.map((file) => file.relPath),
      ...listed.spawners.map((file) => file.relPath),
    ];
  }

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
