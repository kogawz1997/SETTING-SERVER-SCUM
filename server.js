const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const ini = require('ini');
const Diff = require('diff');
const { sendError } = require('./src/server/errors.cjs');
const commandSandbox = require('./src/server/command-sandbox.cjs');
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

function nowIso() {
  return new Date().toISOString();
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function normalizeKey(value) {
  return String(value || '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function posixify(value) {
  return String(value || '').replace(/\\/g, '/');
}

function sortByName(list, key = 'name') {
  return [...list].sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || '')));
}

function walkFiles(dir, filter = () => true, baseDir = dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, filter, baseDir, results);
    } else if (filter(fullPath, entry.name)) {
      results.push({
        fullPath,
        relPath: posixify(path.relative(baseDir, fullPath)),
        name: entry.name,
      });
    }
  }
  return results;
}

function inspectCommand(command) {
  return commandSandbox.inspectCommand(command, { cwd: ROOT });
}

function runShellCommand(command) {
  return commandSandbox.runShellCommand(command, { cwd: ROOT, timeout: 30000 });
}

function errorResponse(res, status, error) {
  sendError(res, error, status);
}

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

function resolveBackupRoot(backupName, paths = resolvedPaths()) {
  const root = path.resolve(paths.backupDir);
  const target = path.resolve(root, String(backupName || ''));
  if (!String(backupName || '').trim() || (target !== root && !target.startsWith(`${root}${path.sep}`))) throw new Error('Invalid backup name');
  return target;
}

function resolveBackupFilePath(backupRoot, logicalPath) {
  const normalized = posixify(logicalPath).replace(/^\/+/, '');
  const target = path.resolve(backupRoot, normalized);
  if (target !== backupRoot && !target.startsWith(`${path.resolve(backupRoot)}${path.sep}`)) throw new Error('Invalid backup file path');
  return target;
}

function readBackupMeta(backupName, paths = resolvedPaths()) {
  const metaPath = path.join(resolveBackupRoot(backupName, paths), '_meta.json');
  return fs.existsSync(metaPath) ? loadJson(metaPath, {}) : {};
}

function writeBackupMeta(backupName, meta, paths = resolvedPaths()) {
  const backupRoot = resolveBackupRoot(backupName, paths);
  if (!fs.existsSync(backupRoot)) throw new Error('Backup was not found');
  saveJson(path.join(backupRoot, '_meta.json'), meta);
}

function createBackup(paths = resolvedPaths(), logicalPaths = [], options = '') {
  const note = typeof options === 'string' ? options : String(options?.note || '');
  const tag = typeof options === 'string' ? '' : String(options?.tag || '');
  const stamp = nowStamp();
  let targetDir = path.join(paths.backupDir, stamp);
  let suffix = 1;
  while (fs.existsSync(targetDir)) {
    suffix += 1;
    targetDir = path.join(paths.backupDir, `${stamp}-${suffix}`);
  }
  ensureDir(targetDir);
  const selectedPaths = logicalPaths.length ? logicalPaths : allWorkspaceLogicalPaths(paths);
  const files = [];
  for (const logicalPath of selectedPaths) {
    const fullPath = resolveLogicalPath(logicalPath, paths);
    if (!fs.existsSync(fullPath)) continue;
    const backupPath = path.join(targetDir, posixify(logicalPath));
    ensureDir(path.dirname(backupPath));
    fs.copyFileSync(fullPath, backupPath);
    const stat = fs.statSync(fullPath);
    files.push({ relPath: posixify(logicalPath), size: stat.size, updatedAt: stat.mtime.toISOString() });
  }
  saveJson(path.join(targetDir, '_meta.json'), { createdAt: nowIso(), note, tag, files });
  appendActivity('backup', { backup: path.basename(targetDir), note, tag, fileCount: files.length });
  return { backupDir: targetDir, backupName: path.basename(targetDir), files };
}

function listBackups(paths = resolvedPaths()) {
  ensureDir(paths.backupDir);
  return fs.readdirSync(paths.backupDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const metaPath = path.join(paths.backupDir, entry.name, '_meta.json');
      const meta = fs.existsSync(metaPath) ? loadJson(metaPath, {}) : {};
      return {
        name: entry.name,
        updatedAt: meta.createdAt || fs.statSync(path.join(paths.backupDir, entry.name)).mtime.toISOString(),
        note: meta.note || '',
        tag: meta.tag || '',
        fileCount: Array.isArray(meta.files) ? meta.files.length : listBackupFiles(entry.name, paths).length,
      };
    })
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function listBackupFiles(backupName, paths = resolvedPaths()) {
  const backupRoot = resolveBackupRoot(backupName, paths);
  const files = walkFiles(backupRoot, (filePath, name) => name !== '_meta.json', backupRoot);
  return files.map((entry) => {
    const stat = fs.statSync(entry.fullPath);
    return { relPath: entry.relPath, size: stat.size, updatedAt: stat.mtime.toISOString() };
  });
}

function restoreBackupFile(backupName, logicalPath, paths = resolvedPaths()) {
  const backupRoot = resolveBackupRoot(backupName, paths);
  const sourcePath = resolveBackupFilePath(backupRoot, logicalPath);
  if (!fs.existsSync(sourcePath)) throw new Error('Backup file was not found');
  const targetPath = resolveLogicalPath(logicalPath, paths);
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  appendActivity('restore', { backup: backupName, path: logicalPath });
}

function updateBackupMeta(backupName, updates = {}, paths = resolvedPaths()) {
  const meta = readBackupMeta(backupName, paths);
  const next = {
    ...meta,
    note: updates.note != null ? String(updates.note) : (meta.note || ''),
    tag: updates.tag != null ? String(updates.tag) : (meta.tag || ''),
    updatedMetaAt: nowIso(),
  };
  writeBackupMeta(backupName, next, paths);
  appendActivity('backup_meta_update', { backup: backupName, tag: next.tag, note: next.note });
  return next;
}

function compareBackupFiles(baseBackup, targetBackup, logicalPath = '', paths = resolvedPaths()) {
  const baseRoot = resolveBackupRoot(baseBackup, paths);
  const targetRoot = resolveBackupRoot(targetBackup, paths);
  if (!fs.existsSync(baseRoot) || !fs.existsSync(targetRoot)) throw new Error('Backup was not found');
  if (logicalPath) {
    const normalized = posixify(logicalPath);
    const basePath = resolveBackupFilePath(baseRoot, normalized);
    const targetPath = resolveBackupFilePath(targetRoot, normalized);
    const before = fs.existsSync(basePath) ? readText(basePath) : '';
    const after = fs.existsSync(targetPath) ? readText(targetPath) : '';
    return {
      mode: 'file',
      path: normalized,
      existsInBase: fs.existsSync(basePath),
      existsInTarget: fs.existsSync(targetPath),
      changed: before !== after,
      patch: createDiff(normalized, before, after),
    };
  }
  const baseFiles = new Map(listBackupFiles(baseBackup, paths).map((file) => [posixify(file.relPath), file]));
  const targetFiles = new Map(listBackupFiles(targetBackup, paths).map((file) => [posixify(file.relPath), file]));
  const allPaths = [...new Set([...baseFiles.keys(), ...targetFiles.keys()])].sort();
  const files = allPaths.map((filePath) => {
    const baseFile = baseFiles.get(filePath);
    const targetFile = targetFiles.get(filePath);
    let status = 'changed';
    if (!baseFile) status = 'added';
    else if (!targetFile) status = 'removed';
    else {
      const baseText = readText(resolveBackupFilePath(baseRoot, filePath));
      const targetText = readText(resolveBackupFilePath(targetRoot, filePath));
      status = baseText === targetText ? 'same' : 'changed';
    }
    return { relPath: filePath, status, baseSize: baseFile?.size || 0, targetSize: targetFile?.size || 0 };
  });
  return {
    mode: 'summary',
    files,
    counts: files.reduce((acc, file) => {
      acc[file.status] = (acc[file.status] || 0) + 1;
      return acc;
    }, { added: 0, removed: 0, changed: 0, same: 0 }),
  };
}

function isProtectedBackup(backup) {
  const tag = String(backup?.tag || '').trim().toLowerCase();
  return ['keep', 'pinned', 'protected'].includes(tag);
}

function backupCleanupCandidates(options = {}, paths = resolvedPaths()) {
  const keepLatest = Math.max(1, Math.min(500, Number(options.keepLatest || 10)));
  const tag = String(options.tag || '').trim();
  const includeProtected = Boolean(options.includeProtected);
  const backups = listBackups(paths);
  const keptLatest = new Set(backups.slice(0, keepLatest).map((backup) => backup.name));
  const candidates = backups.filter((backup) => {
    if (keptLatest.has(backup.name)) return false;
    if (!includeProtected && isProtectedBackup(backup)) return false;
    if (tag && backup.tag !== tag) return false;
    return true;
  });
  return {
    keepLatest,
    tag,
    includeProtected,
    total: backups.length,
    protectedCount: backups.filter(isProtectedBackup).length,
    candidates,
    kept: backups.length - candidates.length,
  };
}

function cleanupBackups(options = {}, paths = resolvedPaths()) {
  const plan = backupCleanupCandidates(options, paths);
  const deleted = [];
  for (const backup of plan.candidates) {
    const backupRoot = resolveBackupRoot(backup.name, paths);
    if (!fs.existsSync(backupRoot)) continue;
    fs.rmSync(backupRoot, { recursive: true, force: true });
    deleted.push(backup);
  }
  appendActivity('backup_cleanup', {
    deletedCount: deleted.length,
    keepLatest: plan.keepLatest,
    tag: plan.tag,
    includeProtected: plan.includeProtected,
  });
  return { ...plan, deleted };
}

function allWorkspaceLogicalPaths(paths = resolvedPaths()) {
  const loot = listLootFiles(paths);
  return [...CORE_FILES.filter((file) => fs.existsSync(resolveLogicalPath(file, paths))), ...loot.nodes.map((file) => file.relPath), ...loot.spawners.map((file) => file.relPath)];
}

function workspacePackageFiles(paths = resolvedPaths(), requestedPaths = []) {
  const available = new Set(allWorkspaceLogicalPaths(paths).map(posixify));
  const selected = requestedPaths.length ? requestedPaths.map(posixify) : [...available];
  return selected
    .filter((logicalPath) => available.has(logicalPath))
    .map((logicalPath) => ({ path: logicalPath, content: readText(resolveLogicalPath(logicalPath, paths)) }));
}

function loadUserKitTemplates() {
  const data = loadJson(KIT_TEMPLATES_FILE, []);
  return Array.isArray(data) ? data : [];
}

function loadKitTemplates() {
  const userTemplates = loadUserKitTemplates();
  const userIds = new Set(userTemplates.map((entry) => entry.id));
  return [...userTemplates, ...DEFAULT_KIT_TEMPLATE_LIBRARY.filter((entry) => !userIds.has(entry.id))];
}

function saveKitTemplates(templates) {
  saveJson(KIT_TEMPLATES_FILE, Array.isArray(templates) ? templates : []);
}

function itemEntryName(entry = {}) {
  return entry?.ClassName || entry?.Id || entry?.Item || entry?.Name || '';
}

function itemEntryProbability(entry = {}) {
  const value = Number(entry?.Probability ?? entry?.Chance ?? 1);
  return Number.isFinite(value) ? value : 1;
}

function sanitizeKitItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((entry) => {
      const name = String(itemEntryName(entry) || '').trim();
      const probability = Number(itemEntryProbability(entry));
      if (!name) return null;
      return {
        ClassName: name,
        Probability: Number.isFinite(probability) && probability >= 0 ? Number(probability.toFixed(4)) : 1,
      };
    })
    .filter(Boolean);
}

function createKitTemplate(name, notes, items) {
  const cleanName = String(name || '').trim();
  const cleanItems = sanitizeKitItems(items);
  if (!cleanName) throw new Error('Kit template name is required');
  if (!cleanItems.length) throw new Error('Kit template needs at least one item');
  const template = {
    id: `kit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: cleanName,
    notes: String(notes || '').trim(),
    items: cleanItems,
    itemCount: cleanItems.length,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const templates = loadUserKitTemplates();
  saveKitTemplates([template, ...templates.filter((entry) => entry.id !== template.id)]);
  appendActivity('kit_create', { id: template.id, name: template.name, itemCount: template.itemCount });
  return template;
}

function deleteKitTemplate(id) {
  const cleanId = String(id || '').trim();
  if (DEFAULT_KIT_TEMPLATE_LIBRARY.some((entry) => entry.id === cleanId)) throw new Error('Built-in kit templates cannot be deleted');
  const templates = loadUserKitTemplates();
  const target = templates.find((entry) => entry.id === cleanId);
  if (!target) throw new Error('Kit template was not found');
  saveKitTemplates(templates.filter((entry) => entry.id !== cleanId));
  appendActivity('kit_delete', { id: cleanId, name: target.name });
  return target;
}

function createProfileSnapshot(name, notes, paths = resolvedPaths()) {
  ensureDir(PROFILE_STORE_DIR);
  const id = `profile_${Date.now()}`;
  const snapshot = {
    id,
    name,
    notes,
    createdAt: nowIso(),
    files: allWorkspaceLogicalPaths(paths).map((logicalPath) => {
      const { content } = readLogicalFile(logicalPath, paths);
      return { path: logicalPath, content };
    }),
  };
  saveJson(path.join(PROFILE_STORE_DIR, `${id}.json`), snapshot);
  const data = loadProfilesData();
  data.profiles = [snapshotMeta(snapshot), ...(data.profiles || []).filter((profile) => profile.id !== id)];
  saveProfilesData(data);
  appendActivity('profile_create', { id, name, fileCount: snapshot.files.length });
  return snapshotMeta(snapshot);
}

function snapshotMeta(snapshot) {
  return {
    id: snapshot.id,
    name: snapshot.name,
    notes: snapshot.notes || '',
    updatedAt: snapshot.createdAt,
    fileCount: Array.isArray(snapshot.files) ? snapshot.files.length : 0,
  };
}

function readProfileSnapshot(id) {
  const filePath = path.join(PROFILE_STORE_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) throw new Error('Profile snapshot was not found');
  return loadJson(filePath, null);
}

function applyProfileSnapshot(id, reloadAfter = false, paths = resolvedPaths(), config = loadConfig()) {
  const snapshot = readProfileSnapshot(id);
  createBackup(paths, snapshot.files.map((file) => file.path), `profile-${id}`);
  snapshot.files.forEach((entry) => {
    writeText(resolveLogicalPath(entry.path, paths), entry.content);
  });
  appendActivity('profile_apply', { id, name: snapshot.name, fileCount: snapshot.files.length });
  const commandResult = reloadAfter ? runShellCommand(config.reloadLootCommand) : null;
  return { activeProfile: snapshotMeta(snapshot), commandResult };
}

function nextRotationRun(rotation) {
  if (!rotation.enabled || !rotation.everyMinutes) return '';
  return new Date(Date.now() + Number(rotation.everyMinutes) * 60000).toISOString();
}

function runRotation(force = false, config = loadConfig(), paths = resolvedPaths()) {
  const rotation = loadRotation();
  const enabledEntries = (rotation.entries || []).filter((entry) => entry.enabled !== false && entry.profileId);
  if (!rotation.enabled && !force) return { ran: false, reason: 'rotation-disabled', nextRunAt: rotation.nextRunAt || '' };
  if (!enabledEntries.length) return { ran: false, reason: 'no-enabled-entries', nextRunAt: rotation.nextRunAt || '' };
  const currentIndex = enabledEntries.findIndex((entry) => entry.profileId === rotation.activeProfileId);
  const nextEntry = enabledEntries[(currentIndex + 1) % enabledEntries.length] || enabledEntries[0];
  const result = applyProfileSnapshot(nextEntry.profileId, true, paths, config);
  const nextState = { ...rotation, activeProfileId: nextEntry.profileId, nextRunAt: nextRotationRun(rotation) };
  saveRotation(nextState);
  appendActivity('rotation_run', { profileId: nextEntry.profileId });
  return { ran: true, activeProfile: result.activeProfile, commandResult: result.commandResult, nextRunAt: nextState.nextRunAt, rotation: nextState };
}

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


