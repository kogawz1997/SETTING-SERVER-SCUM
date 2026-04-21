const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const ini = require('ini');
const Diff = require('diff');
const { sendError } = require('./src/server/errors.cjs');
const commandSandbox = require('./src/server/command-sandbox.cjs');
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
const registerRoutes = require('./src/server/routes/index.cjs');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const ROTATION_FILE = path.join(DATA_DIR, 'rotation.json');
const KIT_TEMPLATES_FILE = path.join(DATA_DIR, 'kit-templates.json');
const ITEM_CATALOG_OVERRIDES_FILE = path.join(DATA_DIR, 'item-catalog-overrides.json');
const LOOT_ADVISORY_IGNORE_FILE = path.join(DATA_DIR, 'loot-advisory-ignore.json');
const PROFILE_STORE_DIR = path.join(DATA_DIR, 'profile-store');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.jsonl');
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

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripBom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : '';
}

function readText(filePath) {
  return stripBom(fs.readFileSync(filePath, 'utf8'));
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return clone(fallback);
    return JSON.parse(readText(filePath));
  } catch {
    return clone(fallback);
  }
}

function saveJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

function appendActivity(type, detail = {}) {
  ensureDir(DATA_DIR);
  const entry = { at: nowIso(), type, ...detail };
  fs.appendFileSync(ACTIVITY_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}

function readActivity(limit = 100, filters = {}) {
  if (!fs.existsSync(ACTIVITY_FILE)) return [];
  let rows = readText(ACTIVITY_FILE)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const type = String(filters.type || '').trim().toLowerCase();
  const term = String(filters.term || '').trim().toLowerCase();
  const pathFilter = String(filters.path || '').trim().toLowerCase();
  if (type && type !== '__all') rows = rows.filter((entry) => String(entry.type || '').toLowerCase() === type);
  if (pathFilter) rows = rows.filter((entry) => String(entry.path || entry.backup || entry.from || entry.to || '').toLowerCase().includes(pathFilter));
  if (term) rows = rows.filter((entry) => JSON.stringify(entry).toLowerCase().includes(term));
  return rows.slice(-limit).reverse();
}

function loadConfig() {
  const data = loadJson(CONFIG_FILE, DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG, ...data };
}

function saveConfig(config) {
  saveJson(CONFIG_FILE, { ...DEFAULT_CONFIG, ...config });
}

function loadProfilesData() {
  return loadJson(PROFILES_FILE, DEFAULT_PROFILES);
}

function saveProfilesData(data) {
  saveJson(PROFILES_FILE, data);
}

function loadRotation() {
  return { ...DEFAULT_ROTATION, ...loadJson(ROTATION_FILE, DEFAULT_ROTATION) };
}

function saveRotation(data) {
  saveJson(ROTATION_FILE, { ...DEFAULT_ROTATION, ...data });
}

function resolvedPaths(config = loadConfig()) {
  const scumConfigDir = config.scumConfigDir ? path.resolve(ROOT, config.scumConfigDir) : '';
  const nodesDir = config.nodesDir
    ? path.resolve(ROOT, config.nodesDir)
    : (scumConfigDir ? path.join(scumConfigDir, 'Loot', 'Nodes', 'Current') : '');
  const spawnersDir = config.spawnersDir
    ? path.resolve(ROOT, config.spawnersDir)
    : (scumConfigDir ? path.join(scumConfigDir, 'Loot', 'Spawners', 'Presets', 'Override') : '');
  const backupDir = path.resolve(ROOT, config.backupDir || DEFAULT_CONFIG.backupDir);
  return { scumConfigDir, nodesDir, spawnersDir, backupDir };
}

function inspectConfigFolder(rootPath, nodesPath = '', spawnersPath = '') {
  const config = loadConfig();
  const root = rootPath ? path.resolve(ROOT, rootPath) : (config.scumConfigDir ? path.resolve(ROOT, config.scumConfigDir) : '');
  const resolvedNodes = nodesPath ? path.resolve(ROOT, nodesPath) : path.join(root, 'Loot', 'Nodes', 'Current');
  const resolvedSpawners = spawnersPath ? path.resolve(ROOT, spawnersPath) : path.join(root, 'Loot', 'Spawners', 'Presets', 'Override');
  const rootExists = !!root && fs.existsSync(root);
  const fileHealth = {
    'ServerSettings.ini': rootExists && fs.existsSync(path.join(root, 'ServerSettings.ini')),
    'GameUserSettings.ini': rootExists && fs.existsSync(path.join(root, 'GameUserSettings.ini')),
    'EconomyOverride.json': rootExists && fs.existsSync(path.join(root, 'EconomyOverride.json')),
    Nodes: fs.existsSync(resolvedNodes),
    Spawners: fs.existsSync(resolvedSpawners),
  };
  const missing = Object.entries(fileHealth).filter(([, ok]) => !ok).map(([key]) => key);
  return {
    path: root,
    exists: rootExists,
    ready: rootExists && missing.length === 0,
    missing,
    rootPath: root,
    rootExists,
    nodesPath: resolvedNodes,
    nodesExists: fileHealth.Nodes,
    spawnersPath: resolvedSpawners,
    spawnersExists: fileHealth.Spawners,
    usingCustomNodesDir: Boolean(nodesPath),
    usingCustomSpawnersDir: Boolean(spawnersPath),
    fileHealth,
  };
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

function detectLootKind(object) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return 'unknown';
  if (Array.isArray(object.Items)) return 'node';
  if (Array.isArray(object.Nodes)) return 'spawner';
  if (Array.isArray(object.Children) || typeof object.Rarity === 'string') return 'node_tree';
  return 'unknown';
}

function safeParseJson(text) {
  return JSON.parse(stripBom(text));
}

function readJsonObject(filePath) {
  return safeParseJson(readText(filePath));
}

function rarityWeight(rarity) {
  const map = {
    Abundant: 6,
    Common: 5,
    Uncommon: 4,
    Rare: 3,
    VeryRare: 2,
    ExtremelyRare: 1,
  };
  return map[rarity] || 1;
}

function buildValidation(entries = []) {
  const counts = { critical: 0, warning: 0, info: 0 };
  let highestSeverity = 'info';
  let fixableCount = 0;
  const rank = { critical: 3, warning: 2, info: 1 };
  for (const entry of entries) {
    counts[entry.severity] = (counts[entry.severity] || 0) + 1;
    if (entry.fixable) fixableCount += 1;
    if (rank[entry.severity] > rank[highestSeverity]) highestSeverity = entry.severity;
  }
  return { entries, counts, highestSeverity, fixableCount };
}

function mergeValidationResults(...validations) {
  const entries = validations.flatMap((validation) => Array.isArray(validation?.entries) ? validation.entries : []);
  const seen = new Set();
  return buildValidation(entries.filter((entry) => {
    const key = `${entry.code}:${entry.path}:${entry.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
}

function summarizeFlatNode(object, relPath) {
  const items = Array.isArray(object.Items) ? object.Items : [];
  return {
    kind: 'node',
    name: object.Name || path.basename(relPath, '.json'),
    itemCount: items.length,
    totalProbability: Number(items.reduce((sum, entry) => sum + Number(entry.Probability ?? entry.Chance ?? 0), 0).toFixed(4)),
  };
}

function summarizeTreeNode(object, relPath) {
  let leafCount = 0;
  let branchCount = 0;
  let totalNodes = 0;
  let maxDepth = 0;
  const walk = (node, depth) => {
    totalNodes += 1;
    maxDepth = Math.max(maxDepth, depth);
    const children = Array.isArray(node?.Children) ? node.Children : [];
    if (children.length) {
      branchCount += 1;
      children.forEach((child) => walk(child, depth + 1));
    } else {
      leafCount += 1;
    }
  };
  walk(object, 0);
  return {
    kind: 'node_tree',
    name: path.basename(relPath, '.json'),
    rootName: object.Name || '',
    leafCount,
    branchCount,
    totalNodes,
    itemCount: leafCount,
    maxDepth,
  };
}

function collectSpawnerRefs(object) {
  if (!Array.isArray(object?.Nodes)) return [];
  return object.Nodes.flatMap((entry) => {
    if (Array.isArray(entry?.Ids)) return entry.Ids.filter((value) => typeof value === 'string' && value.trim());
    return [entry?.Node || entry?.Name || entry?.Ref].filter(Boolean);
  });
}

function itemEntryName(entry = {}) {
  return entry?.ClassName || entry?.Id || entry?.Item || entry?.Name || '';
}

function itemEntryProbability(entry = {}) {
  return Number(entry?.Probability ?? entry?.Chance ?? 0);
}

function itemEntryIdentityKey(entry = {}) {
  return normalizeKey(itemEntryName(entry));
}

function cloneWithoutProbability(entry = {}) {
  const cloneEntry = clone(entry);
  delete cloneEntry.Probability;
  delete cloneEntry.Chance;
  return JSON.stringify(cloneEntry);
}

function parseBooleanLike(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value || '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'on'].includes(normalized);
}

function summarizeSpawner(object, relPath) {
  const refs = collectSpawnerRefs(object);
  return {
    kind: 'spawner',
    name: path.basename(relPath, '.json'),
    groupCount: Array.isArray(object.Nodes) ? object.Nodes.length : 0,
    nodeRefCount: refs.length,
    quantityMin: object.QuantityMin ?? 0,
    quantityMax: object.QuantityMax ?? 0,
    probability: object.Probability ?? 0,
  };
}

function collectTreeLeaves(node, prefix = []) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  const current = [...prefix, node.Name || ''];
  const children = Array.isArray(node.Children) ? node.Children : [];
  if (!children.length) {
    return [{
      name: node.Name || '',
      rarity: node.Rarity || '',
      pathParts: current.filter(Boolean),
    }];
  }
  return children.flatMap((child) => collectTreeLeaves(child, current));
}

function collectTreeRefs(object, relPath) {
  const refs = [];
  const walk = (node, nameParts = []) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const parts = [...nameParts, node.Name].filter(Boolean);
    const ref = parts.join('.');
    const children = Array.isArray(node.Children) ? node.Children : [];
    refs.push({
      ref,
      label: parts.slice(1).join(' / ') || path.basename(relPath, '.json'),
      node: path.basename(relPath, '.json'),
      path: relPath,
      kind: children.length ? 'branch' : 'leaf',
      rarity: node.Rarity || '',
    });
    children.forEach((child) => walk(child, parts));
  };
  walk(object, []);
  return refs;
}

function analyzeFlatValidation(object, relPath) {
  const entries = [];
  const items = Array.isArray(object.Items) ? object.Items : [];
  const isDirectItemSpawner = posixify(relPath).startsWith('Spawners/');
  if (!Array.isArray(object.Items)) {
    entries.push({ code: 'node.items_not_array', severity: 'critical', message: 'Items must be an array', path: 'Items', suggestion: 'Create an Items array before editing this node', fixable: true, suggestedFix: { action: 'create_items_array' } });
  }
  if (!object.Name && !isDirectItemSpawner) {
    entries.push({ code: 'node.missing_name', severity: 'warning', message: 'Node name is missing', path: 'Name', suggestion: `Use ${path.basename(relPath, '.json')} as a readable node name`, fixable: true, suggestedFix: { action: 'fill_name_from_file' } });
  }
  if (isDirectItemSpawner) {
    const min = Number(object.QuantityMin ?? 0);
    const max = Number(object.QuantityMax ?? 0);
    const spawnerProbability = Number(object.Probability ?? 0);
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      entries.push({ code: 'direct_spawner.quantity_range_reversed', severity: 'warning', message: 'QuantityMin is greater than QuantityMax', path: 'QuantityMin/QuantityMax', suggestion: 'Swap the values so the minimum is not above the maximum', fixable: true, suggestedFix: { action: 'swap_quantity_range' } });
    }
    if (object.Probability != null && (!Number.isFinite(spawnerProbability) || spawnerProbability < 0)) {
      entries.push({ code: 'direct_spawner.invalid_probability', severity: 'warning', message: 'Spawner probability must be a non-negative number', path: 'Probability', suggestion: 'Use 0 or a positive weight such as 1, 15, or 25', fixable: true, suggestedFix: { action: 'clamp_spawner_probability' } });
    }
    ['AllowDuplicates', 'ShouldFilterItemsByZone', 'ShouldApplyLocationSpecificProbabilityModifier', 'ShouldApplyLocationSpecificDamageModifier'].forEach((key) => {
      if (typeof object[key] === 'string') {
        entries.push({ code: 'direct_spawner.boolean_as_text', severity: 'info', message: `${key} is stored as text`, path: key, suggestion: 'Convert it to a real boolean', fixable: true, suggestedFix: { action: 'coerce_boolean' } });
      }
    });
  }
  const duplicateTracker = new Map();
  let totalProbability = 0;
  let finiteProbabilityCount = 0;
  let allProbabilitiesWithinUnitRange = true;
  items.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      entries.push({ code: 'node.item_not_object', severity: 'critical', message: 'Item row is not a valid object', path: `Items[${index}]`, suggestion: 'Remove or rebuild this item row', fixable: true, suggestedFix: { action: 'remove_invalid_row' } });
      return;
    }
    const className = itemEntryName(entry);
    const probability = itemEntryProbability(entry);
    if (!className) {
      entries.push({ code: 'node.item_missing_name', severity: 'critical', message: 'Item row is missing a class name', path: `Items[${index}]`, suggestion: 'Pick a real item from the catalog or remove the row', fixable: true, suggestedFix: { action: 'remove_blank_row' } });
    } else {
      const duplicateKey = `${itemEntryIdentityKey(entry)}:${cloneWithoutProbability(entry)}`;
      if (duplicateTracker.has(duplicateKey)) {
        entries.push({ code: 'node.duplicate_item', severity: 'info', message: 'Duplicate item row can be merged', path: `Items[${index}]`, suggestion: `Merge with Items[${duplicateTracker.get(duplicateKey)}] and add the probabilities together`, fixable: true, suggestedFix: { action: 'merge_duplicate_item', target: duplicateTracker.get(duplicateKey) } });
      } else {
        duplicateTracker.set(duplicateKey, index);
      }
    }
    if (!isDirectItemSpawner && (!Number.isFinite(probability) || probability < 0)) {
      entries.push({ code: 'node.invalid_probability', severity: 'warning', message: 'Item probability is invalid', path: `Items[${index}]`, suggestion: 'Use a number greater than or equal to 0', fixable: true, suggestedFix: { action: 'coerce_probability' } });
    }
    if (!isDirectItemSpawner && probability > 1) {
      entries.push({ code: 'node.probability_above_one', severity: 'info', message: 'Item probability is above 1', path: `Items[${index}]`, suggestion: 'Treat this as a weight, or normalize manually if this list expects 0..1 values', fixable: false });
      allProbabilitiesWithinUnitRange = false;
    }
    if (!isDirectItemSpawner && Number.isFinite(probability) && probability >= 0) {
      totalProbability += probability;
      finiteProbabilityCount += 1;
    }
  });
  if (!isDirectItemSpawner && items.length && finiteProbabilityCount === items.length && totalProbability <= 0) {
    entries.push({ code: 'node.zero_probability_total', severity: 'critical', message: 'All item probabilities add up to zero', path: 'Items', suggestion: 'Give at least one item a positive probability', fixable: true, suggestedFix: { action: 'spread_probability_evenly' } });
  } else if (!isDirectItemSpawner && items.length > 1 && allProbabilitiesWithinUnitRange && totalProbability > 0 && Math.abs(totalProbability - 1) > 0.001) {
    entries.push({ code: 'node.probability_total_not_one', severity: 'warning', message: 'Item probability total is not 1', path: 'Items', suggestion: `Normalize the visible probabilities. Current total is ${Number(totalProbability.toFixed(4))}`, fixable: true, suggestedFix: { action: 'normalize_probability_total' } });
  }
  return buildValidation(entries);
}

function analyzeTreeValidation(object, relPath) {
  const entries = [];
  const walk = (node, pathParts = ['root'], inheritedRarity = 'Uncommon') => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      entries.push({ code: 'tree.invalid_child', severity: 'critical', message: 'Tree child is not a valid object', path: pathParts.join('.'), suggestion: 'Remove the broken child entry', fixable: true, suggestedFix: { action: 'remove_invalid_child' } });
      return;
    }
    if (!node.Name) {
      entries.push({ code: 'tree.missing_name', severity: 'warning', message: 'Tree node is missing a name', path: pathParts.join('.'), suggestion: 'Give this node a readable label or item class', fixable: true, suggestedFix: { action: 'fill_tree_name' } });
    }
    if (!node.Rarity || !LOOT_RARITIES.includes(node.Rarity)) {
      entries.push({ code: 'tree.invalid_rarity', severity: 'warning', message: 'Tree node rarity is missing or unknown', path: pathParts.join('.'), suggestion: `Use one of ${LOOT_RARITIES.join(', ')}`, fixable: true, suggestedFix: { action: 'inherit_or_default_rarity' } });
    }
    const nextRarity = node.Rarity || inheritedRarity;
    if (node.Children != null && !Array.isArray(node.Children)) {
      entries.push({ code: 'tree.children_not_array', severity: 'critical', message: 'Tree Children must be an array', path: `${pathParts.join('.')}.Children`, suggestion: 'Convert Children to an array or remove the invalid value', fixable: true, suggestedFix: { action: 'drop_invalid_children' } });
    }
    const children = Array.isArray(node.Children) ? node.Children : [];
    const siblingNames = new Map();
    children.forEach((child, index) => {
      const key = normalizeKey(child?.Name || '');
      if (!key) return;
      if (siblingNames.has(key)) {
        entries.push({ code: 'tree.duplicate_sibling_name', severity: 'warning', message: 'Tree siblings share the same name', path: `${pathParts.join('.')}.Children[${index}]`, suggestion: `Rename one of the duplicate children or merge it with Children[${siblingNames.get(key)}]`, fixable: false });
      } else {
        siblingNames.set(key, index);
      }
    });
    children.forEach((child, index) => walk(child, [...pathParts, String(index)], nextRarity));
  };
  walk(object);
  if (!Array.isArray(object.Children) || !object.Children.length) {
    entries.push({ code: 'tree.empty_root', severity: 'info', message: 'Tree root has no children', path: path.basename(relPath), suggestion: 'Add at least one branch or item leaf', fixable: false });
  }
  return buildValidation(entries);
}

function analyzeSpawnerValidation(object, refIndex) {
  const entries = [];
  const groups = Array.isArray(object.Nodes) ? object.Nodes : [];
  if (!Array.isArray(object.Nodes)) {
    entries.push({ code: 'spawner.nodes_not_array', severity: 'critical', message: 'Spawner Nodes must be an array', path: 'Nodes', suggestion: 'Create a Nodes array before editing this spawner', fixable: true, suggestedFix: { action: 'create_nodes_array' } });
  }
  if (!groups.length) {
    entries.push({ code: 'spawner.empty_nodes', severity: 'warning', message: 'Spawner has no node groups', path: 'Nodes', suggestion: 'Add at least one group with valid tree refs', fixable: false });
  }
  const min = Number(object.QuantityMin ?? 0);
  const max = Number(object.QuantityMax ?? 0);
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
    entries.push({ code: 'spawner.quantity_range_reversed', severity: 'warning', message: 'QuantityMin is greater than QuantityMax', path: 'QuantityMin/QuantityMax', suggestion: 'Swap the values so the minimum is not above the maximum', fixable: true, suggestedFix: { action: 'swap_quantity_range' } });
  }
  const spawnerProbability = Number(object.Probability ?? 0);
  if (object.Probability != null && (!Number.isFinite(spawnerProbability) || spawnerProbability < 0)) {
    entries.push({ code: 'spawner.invalid_probability', severity: 'warning', message: 'Spawner probability must be a non-negative number', path: 'Probability', suggestion: 'Use 0 or a positive weight such as 1, 15, or 25', fixable: true, suggestedFix: { action: 'clamp_spawner_probability' } });
  }
  ['AllowDuplicates', 'ShouldFilterItemsByZone', 'ShouldApplyLocationSpecificProbabilityModifier', 'ShouldApplyLocationSpecificDamageModifier'].forEach((key) => {
    if (typeof object[key] === 'string') {
      entries.push({ code: 'spawner.boolean_as_text', severity: 'info', message: `${key} is stored as text`, path: key, suggestion: 'Convert it to a real boolean', fixable: true, suggestedFix: { action: 'coerce_boolean' } });
    }
  });
  groups.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      entries.push({ code: 'spawner.group_not_object', severity: 'critical', message: 'Spawner group is not a valid object', path: `Nodes[${index}]`, suggestion: 'Remove or rebuild this group', fixable: true, suggestedFix: { action: 'remove_invalid_group' } });
      return;
    }
    const ids = Array.isArray(entry?.Ids) ? entry.Ids : [entry?.Node || entry?.Name || entry?.Ref].filter(Boolean);
    if (!ids.length) {
      entries.push({ code: 'spawner.group_empty_refs', severity: 'critical', message: 'Spawner group has no refs', path: `Nodes[${index}]`, suggestion: 'Add at least one ItemLootTreeNodes ref', fixable: true, suggestedFix: { action: 'remove_empty_group' } });
      return;
    }
    if (!entry.Rarity || !LOOT_RARITIES.includes(entry.Rarity)) {
      entries.push({ code: 'spawner.invalid_group_rarity', severity: 'warning', message: 'Spawner group rarity is missing or unknown', path: `Nodes[${index}].Rarity`, suggestion: `Use one of ${LOOT_RARITIES.join(', ')}`, fixable: true, suggestedFix: { action: 'default_group_rarity' } });
    }
    const seen = new Set();
    ids.forEach((ref, refIndexInGroup) => {
      const trimmed = String(ref || '').trim();
      if (!trimmed) {
        entries.push({ code: 'spawner.empty_ref', severity: 'warning', message: 'Spawner group contains an empty ref', path: `Nodes[${index}].Ids[${refIndexInGroup}]`, suggestion: 'Remove empty lines from the ref list', fixable: true, suggestedFix: { action: 'remove_empty_ref' } });
        return;
      }
      if (seen.has(trimmed)) {
        entries.push({ code: 'spawner.duplicate_ref', severity: 'info', message: 'Spawner group contains a duplicate ref', path: `Nodes[${index}].Ids[${refIndexInGroup}]`, suggestion: 'Remove duplicates if you do not want to bias the group', fixable: true, suggestedFix: { action: 'dedupe_refs' } });
      }
      seen.add(trimmed);
      if (refIndex && !refIndex.has(trimmed)) {
        entries.push({ code: 'spawner.missing_ref', severity: 'critical', message: 'Spawner ref does not exist in the current node trees', path: `Nodes[${index}].Ids[${refIndexInGroup}]`, suggestion: 'Pick a ref from the node ref catalog or create the missing branch first', fixable: false });
      }
    });
  });
  return buildValidation(entries);
}

function analyzeLootObject(object, relPath, workspaceScan = null) {
  const kind = detectLootKind(object);
  const scan = workspaceScan || scanLootWorkspace();
  let summary = { kind, name: path.basename(relPath, '.json') };
  let validation = buildValidation([]);
  let dependencies = {};

  if (kind === 'node') {
    summary = summarizeFlatNode(object, relPath);
    validation = analyzeFlatValidation(object, relPath);
    dependencies = { usedBy: [] };
  } else if (kind === 'node_tree') {
    summary = summarizeTreeNode(object, relPath);
    validation = analyzeTreeValidation(object, relPath);
    const prefix = [object.Name, path.basename(relPath, '.json')].filter(Boolean).join('.');
    dependencies = {
      usedBy: scan.spawners.flatMap((spawner) => {
        const refs = collectSpawnerRefs(spawner.object);
        return refs
          .filter((ref) => ref.startsWith(prefix))
          .map((ref) => ({ spawner: spawner.logicalName, path: spawner.relPath, ref }));
      }),
    };
  } else if (kind === 'spawner') {
    summary = summarizeSpawner(object, relPath);
    validation = analyzeSpawnerValidation(object, scan.refIndex);
    dependencies = { refs: collectSpawnerRefs(object) };
  }

  return { ok: true, summary, validation, dependencies, object };
}

function categoryForItem(name) {
  const value = String(name || '').toLowerCase();
  if (!value) return 'other';
  const match = ITEM_CATEGORY_RULES.find((rule) => rule.pattern.test(value));
  if (match) return match.id;
  return 'other';
}

function buildIconIndex() {
  if (iconIndexCache) return iconIndexCache;
  const index = new Map();
  if (fs.existsSync(ITEM_ICON_DIR)) {
    const images = walkFiles(ITEM_ICON_DIR, (filePath) => /\.(png|webp|jpe?g|gif)$/i.test(filePath), ITEM_ICON_DIR);
    for (const image of images) {
      const key = normalizeKey(image.name);
      if (!index.has(key)) {
        index.set(key, `/item-icons/${image.relPath}`);
      }
    }
  }
  iconIndexCache = index;
  return index;
}

function getIconUrl(name) {
  const index = buildIconIndex();
  const key = normalizeKey(name);
  return index.get(key) || '';
}

function loadItemCatalogOverrides() {
  const data = loadJson(ITEM_CATALOG_OVERRIDES_FILE, {});
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

function saveItemCatalogOverrides(overrides) {
  saveJson(ITEM_CATALOG_OVERRIDES_FILE, overrides && typeof overrides === 'object' ? overrides : {});
}

function cleanItemCatalogOverride(value = {}) {
  return {
    displayName: String(value.displayName || '').trim(),
    category: String(value.category || '').trim(),
    favorite: Boolean(value.favorite),
    notes: String(value.notes || '').trim(),
  };
}

function sanitizeItemCatalogOverrides(input = {}) {
  const clean = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return clean;
  for (const [name, value] of Object.entries(input)) {
    const cleanName = String(name || '').trim();
    if (!cleanName) continue;
    const next = cleanItemCatalogOverride(value || {});
    if (next.displayName || next.category || next.favorite || next.notes) {
      clean[cleanName] = next;
    }
  }
  return clean;
}

function upsertItemCatalogOverride(name, value = {}) {
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('Item name is required');
  const overrides = loadItemCatalogOverrides();
  const next = cleanItemCatalogOverride(value);
  const hasValue = next.displayName || next.category || next.favorite || next.notes;
  if (hasValue) overrides[cleanName] = next;
  else delete overrides[cleanName];
  saveItemCatalogOverrides(overrides);
  appendActivity('item_catalog_override', { name: cleanName, cleared: !hasValue, category: next.category, favorite: next.favorite });
  return overrides[cleanName] || null;
}

function deleteItemCatalogOverride(name) {
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('Item name is required');
  const overrides = loadItemCatalogOverrides();
  const deleted = overrides[cleanName] || null;
  delete overrides[cleanName];
  saveItemCatalogOverrides(overrides);
  appendActivity('item_catalog_override_delete', { name: cleanName });
  return deleted;
}

function importItemCatalogOverrides(input = {}, mode = 'merge') {
  const incoming = sanitizeItemCatalogOverrides(input);
  const next = mode === 'replace' ? incoming : { ...loadItemCatalogOverrides(), ...incoming };
  saveItemCatalogOverrides(next);
  appendActivity('item_catalog_import', { mode: mode === 'replace' ? 'replace' : 'merge', importedCount: Object.keys(incoming).length, totalCount: Object.keys(next).length });
  return { overrides: next, importedCount: Object.keys(incoming).length, totalCount: Object.keys(next).length };
}

function buildItemCatalog(scan = scanLootWorkspace(), options = {}) {
  const counts = new Map();
  const sources = new Map();
  const overrides = loadItemCatalogOverrides();
  for (const lootFile of [...scan.nodes, ...scan.spawners]) {
    const kind = detectLootKind(lootFile.object);
    const names = kind === 'node'
      ? (Array.isArray(lootFile.object.Items) ? lootFile.object.Items.map((entry) => itemEntryName(entry)).filter(Boolean) : [])
      : kind === 'node_tree'
        ? collectTreeLeaves(lootFile.object).map((entry) => entry.name).filter(Boolean)
        : [];
    for (const name of names) {
      counts.set(name, (counts.get(name) || 0) + 1);
      if (!sources.has(name)) sources.set(name, new Set());
      sources.get(name).add(lootFile.relPath);
    }
  }
  const defaultCatalog = new Map(DEFAULT_ITEM_CATALOG_PACK.map((item) => [item.name, item]));
  const catalogNames = new Set([...counts.keys(), ...defaultCatalog.keys()]);
  let items = [...catalogNames].map((name) => {
    const appearances = counts.get(name) || 0;
    const sampleSources = [...(sources.get(name) || [])];
    const iconUrl = getIconUrl(name);
    const override = cleanItemCatalogOverride(overrides[name] || {});
    const defaults = defaultCatalog.get(name) || {};
    const inferredCategory = categoryForItem(name);
    return {
      name,
      displayName: override.displayName || defaults.displayName || name.replace(/_/g, ' '),
      category: override.category || defaults.category || inferredCategory,
      inferredCategory,
      favorite: Boolean(override.favorite),
      rarity: defaults.rarity || '',
      tags: Array.isArray(defaults.tags) ? defaults.tags : [],
      notes: override.notes || defaults.notes || '',
      builtIn: Boolean(defaults.name),
      hasOverride: Boolean(overrides[name]),
      appearances,
      sourceCount: sampleSources.length,
      sampleSources: sampleSources.slice(0, 5),
      iconUrl,
      hasIcon: Boolean(iconUrl),
    };
  });
  const query = String(options.q || '').trim().toLowerCase();
  const category = String(options.category || '__all');
  const favoritesOnly = String(options.favorites || '') === 'true' || String(options.favorite || '') === 'true';
  if (category !== '__all') items = items.filter((item) => item.category === category);
  if (favoritesOnly) items = items.filter((item) => item.favorite);
  if (query) {
    items = items.filter((item) => `${item.name} ${item.displayName} ${item.category} ${item.rarity || ''} ${(item.tags || []).join(' ')} ${item.notes} ${item.sampleSources.join(' ')}`.toLowerCase().includes(query));
  }
  const categoryIds = [...new Set(items.map((item) => item.category || 'other'))].sort((a, b) => a.localeCompare(b));
  const categories = categoryIds.map((id) => ({ id, count: items.filter((item) => item.category === id).length }));
  items.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.appearances - a.appearances || a.displayName.localeCompare(b.displayName));
  const limit = Number(options.limit || 2000);
  return { items: items.slice(0, limit), total: items.length, categories, overridesCount: Object.keys(overrides).length };
}

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
  const nodeFiles = walkFiles(paths.nodesDir, (filePath) => /\.json$/i.test(filePath), paths.nodesDir).map((entry) => ({
    relPath: `Nodes/${entry.relPath}`,
    name: entry.name,
    logicalName: path.basename(entry.name, '.json'),
  }));
  const spawnerFiles = walkFiles(paths.spawnersDir, (filePath) => /\.json$/i.test(filePath), paths.spawnersDir).map((entry) => ({
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
    refIndex: new Map(refs.map((entry) => [entry.ref, entry])),
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
    refIndex: new Map(refs.map((entry) => [entry.ref, entry])),
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

function randomChoiceWeighted(list, weightOf) {
  const total = list.reduce((sum, entry) => sum + Math.max(0, Number(weightOf(entry) || 0)), 0);
  if (!total) return list[0] || null;
  let pick = Math.random() * total;
  for (const entry of list) {
    pick -= Math.max(0, Number(weightOf(entry) || 0));
    if (pick <= 0) return entry;
  }
  return list[list.length - 1] || null;
}

function chooseLeafFromTree(node) {
  const children = Array.isArray(node?.Children) ? node.Children.filter(Boolean) : [];
  if (!children.length) return node?.Name || null;
  const picked = randomChoiceWeighted(children, (entry) => rarityWeight(entry?.Rarity));
  return chooseLeafFromTree(picked);
}

function simulateLootObject(object, relPath, count, scan = scanLootWorkspace()) {
  const kind = detectLootKind(object);
  const sampleRuns = [];
  const hitMap = new Map();
  const refLookup = scan.refIndex;
  let totalItems = 0;
  for (let index = 0; index < count; index += 1) {
    let run = [];
    if (kind === 'node') {
      const items = Array.isArray(object.Items) ? object.Items.filter(Boolean) : [];
      const picked = randomChoiceWeighted(items, (entry) => Number(entry.Probability ?? entry.Chance ?? 0) || 0);
      if (picked) run = [itemEntryName(picked)].filter(Boolean);
    } else if (kind === 'node_tree') {
      const picked = chooseLeafFromTree(object);
      if (picked) run = [picked];
    } else if (kind === 'spawner') {
      const refs = collectSpawnerRefs(object).map((ref) => refLookup.get(ref)).filter(Boolean);
      const quantityMin = Math.max(0, Number(object.QuantityMin ?? 1));
      const quantityMax = Math.max(quantityMin, Number(object.QuantityMax ?? quantityMin));
      const quantity = Math.round(quantityMin + Math.random() * Math.max(0, quantityMax - quantityMin));
      run = Array.from({ length: quantity }, () => {
        const ref = randomChoiceWeighted(refs, (entry) => rarityWeight(entry.rarity));
        if (!ref) return null;
        const treeFile = scan.nodes.find((entry) => entry.logicalName === ref.node);
        if (!treeFile) return null;
        const targetNode = collectTreeRefs(treeFile.object, treeFile.relPath).find((entry) => entry.ref === ref.ref);
        if (!targetNode) return null;
        const resolvedName = targetNode.kind === 'leaf' ? targetNode.ref.split('.').slice(-1)[0] : chooseLeafFromTree(resolveRefNode(treeFile.object, ref.ref));
        return resolvedName || null;
      }).filter(Boolean);
    }
    totalItems += run.length;
    run.forEach((name) => hitMap.set(name, (hitMap.get(name) || 0) + 1));
    if (sampleRuns.length < 8) sampleRuns.push(run);
  }
  const distinctItems = [...hitMap.entries()].map(([name, hits]) => ({ name, hits })).sort((a, b) => b.hits - a.hits || a.name.localeCompare(b.name));
  return {
    count,
    averageItemsPerRun: Number((totalItems / Math.max(1, count)).toFixed(2)),
    distinctItems,
    sampleRuns,
  };
}

function simulateLootFile(relPath, count, scan = scanLootWorkspace()) {
  const object = readJsonObject(resolveLogicalPath(relPath));
  return simulateLootObject(object, relPath, count, scan);
}

function compareSimulationResults(saved, draft) {
  const savedHits = new Map((saved?.distinctItems || []).map((entry) => [entry.name, entry.hits]));
  const draftHits = new Map((draft?.distinctItems || []).map((entry) => [entry.name, entry.hits]));
  const names = [...new Set([...savedHits.keys(), ...draftHits.keys()])];
  return names.map((name) => {
    const beforeHits = savedHits.get(name) || 0;
    const afterHits = draftHits.get(name) || 0;
    const beforeRate = beforeHits / Math.max(1, saved?.count || 1);
    const afterRate = afterHits / Math.max(1, draft?.count || 1);
    return {
      name,
      savedHits: beforeHits,
      draftHits: afterHits,
      savedRate: Number(beforeRate.toFixed(4)),
      draftRate: Number(afterRate.toFixed(4)),
      deltaHits: afterHits - beforeHits,
      deltaRate: Number((afterRate - beforeRate).toFixed(4)),
    };
  }).sort((a, b) => Math.abs(b.deltaRate) - Math.abs(a.deltaRate) || Math.abs(b.deltaHits) - Math.abs(a.deltaHits) || a.name.localeCompare(b.name));
}

function resolveRefNode(root, ref) {
  const parts = String(ref || '').split('.').filter(Boolean);
  if (!parts.length || root?.Name !== parts[0]) return null;
  let current = root;
  for (const name of parts.slice(1)) {
    const next = (Array.isArray(current.Children) ? current.Children : []).find((child) => child?.Name === name);
    if (!next) return null;
    current = next;
  }
  return current;
}

function setItemEntryProbability(entry, value) {
  if (!entry || typeof entry !== 'object') return;
  if ('Chance' in entry && !('Probability' in entry)) entry.Chance = value;
  else entry.Probability = value;
}

function normalizeSpawnerRef(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('ItemLootTreeNodes')
    ? trimmed
    : `ItemLootTreeNodes.${trimmed.replace(/^ItemLootTreeNodes\.?/, '')}`;
}

function normalizeFlatProbabilities(items, changes) {
  const validRows = items.filter((entry) => entry && typeof entry === 'object' && itemEntryName(entry));
  if (!validRows.length) return;
  const values = validRows.map((entry) => itemEntryProbability(entry));
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) return;
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    const even = Number((1 / validRows.length).toFixed(4));
    validRows.forEach((entry) => setItemEntryProbability(entry, even));
    changes.push('Spread probability evenly because the item total was zero');
    return;
  }
  if (validRows.length > 1 && Math.abs(total - 1) > 0.001) {
    validRows.forEach((entry) => {
      const normalized = Number((itemEntryProbability(entry) / total).toFixed(4));
      setItemEntryProbability(entry, normalized);
    });
    changes.push(`Normalized item probabilities from total ${Number(total.toFixed(4))} to 1`);
  }
}

function mergeDuplicateFlatItems(items, changes) {
  const merged = [];
  const indexByKey = new Map();
  for (const entry of items) {
    const name = itemEntryName(entry);
    const key = `${itemEntryIdentityKey(entry)}:${cloneWithoutProbability(entry)}`;
    if (!name || !indexByKey.has(key)) {
      if (name) indexByKey.set(key, merged.length);
      merged.push(entry);
      continue;
    }
    const target = merged[indexByKey.get(key)];
    setItemEntryProbability(target, Number((itemEntryProbability(target) + itemEntryProbability(entry)).toFixed(4)));
    changes.push(`Merged duplicate item row for ${name}`);
  }
  return merged;
}

function autoFixLootObject(object, relPath, scan = scanLootWorkspace()) {
  const kind = detectLootKind(object);
  const changes = [];
  const next = clone(object);
  if (kind === 'node') {
    const isDirectItemSpawner = posixify(relPath).startsWith('Spawners/');
    if (!next.Name && !isDirectItemSpawner) {
      next.Name = path.basename(relPath, '.json');
      changes.push('Filled missing node name from the file name');
    }
    next.Items = Array.isArray(next.Items) ? next.Items.filter((entry) => {
      const keep = Boolean(entry && typeof entry === 'object' && !Array.isArray(entry) && itemEntryName(entry));
      if (!keep) changes.push('Removed a blank item row');
      return keep;
    }) : [];
    next.Items.forEach((entry) => {
      if (entry.Chance != null && entry.Probability == null) {
        entry.Probability = entry.Chance;
        delete entry.Chance;
        changes.push(`Converted Chance to Probability for ${itemEntryName(entry) || 'an item row'}`);
      }
      if (entry.Probability != null) {
        const clamped = Math.max(0, Number(entry.Probability || 0));
        if (clamped !== entry.Probability) changes.push(`Clamped probability for ${itemEntryName(entry) || 'an item row'}`);
        entry.Probability = clamped;
      }
    });
    next.Items = mergeDuplicateFlatItems(next.Items, changes);
    if (!isDirectItemSpawner) normalizeFlatProbabilities(next.Items, changes);
    if (isDirectItemSpawner) {
      ['AllowDuplicates', 'ShouldFilterItemsByZone', 'ShouldApplyLocationSpecificProbabilityModifier', 'ShouldApplyLocationSpecificDamageModifier'].forEach((key) => {
        if (typeof next[key] === 'string') {
          next[key] = parseBooleanLike(next[key]);
          changes.push(`Converted ${key} from text to boolean`);
        }
      });
      if (next.Probability != null) {
        const numericProbability = Number(next.Probability || 0);
        const clamped = Number.isFinite(numericProbability) ? Math.max(0, numericProbability) : 0;
        if (clamped !== next.Probability) changes.push('Clamped direct item spawner Probability to a non-negative weight');
        next.Probability = clamped;
      }
      const min = Number(next.QuantityMin ?? 0);
      const max = Number(next.QuantityMax ?? 0);
      if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
        next.QuantityMin = max;
        next.QuantityMax = min;
        changes.push('Swapped QuantityMin and QuantityMax so the range is valid');
      }
    }
  } else if (kind === 'node_tree') {
    let unnamedIndex = 1;
    const walk = (node, fallbackRarity = 'Uncommon') => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
      const validFallbackRarity = LOOT_RARITIES.includes(fallbackRarity) ? fallbackRarity : 'Uncommon';
      if (!node.Name) {
        node.Name = `NewEntry_${unnamedIndex}`;
        unnamedIndex += 1;
        changes.push(`Filled a missing tree node name with ${node.Name}`);
      }
      if (!LOOT_RARITIES.includes(node.Rarity)) {
        node.Rarity = validFallbackRarity;
        changes.push(`Normalized tree rarity on ${node.Name}`);
      }
      if (Array.isArray(node.Children)) {
        node.Children = node.Children.map((child) => walk(child, node.Rarity)).filter(Boolean);
      } else if (node.Children != null) {
        delete node.Children;
        changes.push(`Removed invalid Children value from ${node.Name}`);
      }
      return node;
    };
    walk(next, next.Rarity || 'Uncommon');
  } else if (kind === 'spawner') {
    if (typeof next.AllowDuplicates === 'string') {
      next.AllowDuplicates = parseBooleanLike(next.AllowDuplicates);
      changes.push('Converted AllowDuplicates from text to boolean');
    }
    ['ShouldFilterItemsByZone', 'ShouldApplyLocationSpecificProbabilityModifier', 'ShouldApplyLocationSpecificDamageModifier'].forEach((key) => {
      if (typeof next[key] === 'string') {
        next[key] = parseBooleanLike(next[key]);
        changes.push(`Converted ${key} from text to boolean`);
      }
    });
    if (next.Probability != null) {
      const numericProbability = Number(next.Probability || 0);
      const clamped = Number.isFinite(numericProbability) ? Math.max(0, numericProbability) : 0;
      if (clamped !== next.Probability) changes.push('Clamped spawner Probability to a non-negative weight');
      next.Probability = clamped;
    }
    const min = Number(next.QuantityMin ?? 0);
    const max = Number(next.QuantityMax ?? 0);
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      next.QuantityMin = max;
      next.QuantityMax = min;
      changes.push('Swapped QuantityMin and QuantityMax so the range is valid');
    }
    next.Nodes = Array.isArray(next.Nodes) ? next.Nodes.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)).map((entry) => {
      const ids = Array.isArray(entry?.Ids) ? entry.Ids : [entry?.Node || entry?.Name || entry?.Ref].filter(Boolean);
      const normalizedIds = [...new Set(ids.map((value) => normalizeSpawnerRef(value)).filter(Boolean))];
      if (normalizedIds.length !== ids.length) changes.push('Removed blank or duplicate refs from a spawner group');
      const fixedEntry = {
        ...entry,
        Rarity: LOOT_RARITIES.includes(entry?.Rarity) ? entry.Rarity : 'Uncommon',
        Ids: normalizedIds,
      };
      delete fixedEntry.Node;
      delete fixedEntry.Name;
      delete fixedEntry.Ref;
      if (fixedEntry.Rarity !== entry?.Rarity) changes.push('Normalized an invalid spawner group rarity');
      return {
        ...fixedEntry,
      };
    }).filter((entry) => entry.Ids.length) : [];
  }
  const validation = analyzeLootObject(next, relPath, scan).validation;
  return { content: `${JSON.stringify(next, null, 2)}\n`, object: next, changes, validation };
}

function analyzeOverview(scan = scanLootWorkspace()) {
  const itemCatalog = buildItemCatalog(scan, { limit: 100000 });
  const advisoryIgnore = loadLootAdvisoryIgnore();
  const ignoredUnusedNodeNames = new Set((advisoryIgnore.unusedNodes || []).map((name) => normalizeKey(name)));
  const usedNodePrefixes = new Set();
  const missingRefs = [];
  const spawnerCoverage = [];
  scan.spawners.forEach((spawner) => {
    const refs = collectSpawnerRefs(spawner.object);
    let validRefs = 0;
    refs.forEach((ref) => {
      if (!scan.refIndex.has(ref)) {
        missingRefs.push({ nodeName: ref, spawner: spawner.logicalName });
      } else {
        validRefs += 1;
        const parts = ref.split('.');
        if (parts.length >= 2) usedNodePrefixes.add(parts[1]);
      }
    });
    spawnerCoverage.push({
      name: spawner.logicalName,
      path: spawner.relPath,
      refs: refs.length,
      validRefs,
      missingRefs: Math.max(0, refs.length - validRefs),
      coverage: refs.length ? Number(((validRefs / refs.length) * 100).toFixed(1)) : 0,
    });
  });
  const allUnusedNodes = scan.nodes
    .filter((node) => !usedNodePrefixes.has(node.logicalName))
    .map((node) => ({ nodeName: node.logicalName, path: node.relPath }));
  const ignoredUnusedNodes = allUnusedNodes
    .filter((node) => ignoredUnusedNodeNames.has(normalizeKey(node.nodeName)))
    .map((node) => ({ ...node, note: advisoryIgnore.notes?.[node.nodeName] || '' }));
  const unusedNodes = allUnusedNodes.filter((node) => !ignoredUnusedNodeNames.has(normalizeKey(node.nodeName)));
  const categoryCounts = itemCatalog.items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, Object.fromEntries(ITEM_CATEGORY_RULES.map((rule) => [rule.id, 0]).concat([['other', 0]])));
  const rarityCounts = LOOT_RARITIES.reduce((acc, rarity) => ({ ...acc, [rarity]: 0 }), {});
  const spawnerRarityCounts = LOOT_RARITIES.reduce((acc, rarity) => ({ ...acc, [rarity]: 0 }), {});
  const nodePowerScores = [];
  scan.nodes.forEach((nodeFile) => {
    const kind = detectLootKind(nodeFile.object);
    let itemNames = [];
    let rarityScore = 0;
    if (kind === 'node_tree') {
      const leaves = collectTreeLeaves(nodeFile.object);
      itemNames = leaves.map((leaf) => leaf.name).filter(Boolean);
      leaves.forEach((leaf) => {
        if (rarityCounts[leaf.rarity] != null) rarityCounts[leaf.rarity] += 1;
        rarityScore += rarityWeight(leaf.rarity);
      });
    } else if (kind === 'node') {
      const items = Array.isArray(nodeFile.object.Items) ? nodeFile.object.Items : [];
      itemNames = items.map((entry) => itemEntryName(entry)).filter(Boolean);
      rarityScore = items.reduce((sum, entry) => sum + Math.max(0, itemEntryProbability(entry) || 0), 0);
    }
    const categoryMix = itemNames.reduce((acc, name) => {
      const category = categoryForItem(name);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, Object.fromEntries(ITEM_CATEGORY_RULES.map((rule) => [rule.id, 0]).concat([['other', 0]])));
    const score = Number((itemNames.length * 2 + categoryMix.weapon * 4 + categoryMix.ammo * 2 + categoryMix.medical * 2 + rarityScore).toFixed(2));
    nodePowerScores.push({ name: nodeFile.logicalName, path: nodeFile.relPath, itemCount: itemNames.length, score, categoryMix });
  });
  scan.spawners.forEach((spawner) => {
    (Array.isArray(spawner.object.Nodes) ? spawner.object.Nodes : []).forEach((group) => {
      if (spawnerRarityCounts[group?.Rarity] != null) spawnerRarityCounts[group.Rarity] += 1;
    });
  });
  const weaponCount = categoryCounts.weapon || 0;
  const ammoCount = categoryCounts.ammo || 0;
  const medicalCount = categoryCounts.medical || 0;
  const totalCategorized = Object.values(categoryCounts).reduce((sum, value) => sum + value, 0) || 1;
  const ammoToWeaponRatio = weaponCount ? Number((ammoCount / weaponCount).toFixed(2)) : 0;
  const medicalShare = Number(((medicalCount / totalCategorized) * 100).toFixed(1));
  const nodeCoverage = scan.nodes.length ? Number((((scan.nodes.length - unusedNodes.length) / scan.nodes.length) * 100).toFixed(1)) : 0;
  const validSpawnerCount = spawnerCoverage.filter((entry) => entry.refs > 0 && entry.missingRefs === 0).length;
  const spawnerCoverageScore = scan.spawners.length ? Number(((validSpawnerCount / scan.spawners.length) * 100).toFixed(1)) : 0;
  const missingRefRisk = missingRefs.length ? Math.min(100, Math.round((missingRefs.length / Math.max(1, scan.spawners.length)) * 25)) : 0;
  const ammoScore = weaponCount ? Math.max(0, 100 - Math.round(Math.abs(ammoToWeaponRatio - 1.2) * 35)) : 60;
  const medicalScore = Math.max(0, 100 - Math.round(Math.abs(medicalShare - 12) * 4));
  const balanceScore = Math.max(0, Math.min(100, Math.round((nodeCoverage * 0.35) + (spawnerCoverageScore * 0.35) + (ammoScore * 0.15) + (medicalScore * 0.15) - missingRefRisk)));
  const warnings = [
    ...(missingRefs.length ? [{ severity: 'critical', message: `${missingRefs.length} missing node refs`, hint: 'Fix these before tuning drop rates.' }] : []),
    ...(unusedNodes.length ? [{ severity: 'warning', message: `${unusedNodes.length} unused node files`, hint: 'Unused nodes may be dead config or unfinished content.' }] : []),
    ...(weaponCount && ammoToWeaponRatio < 0.5 ? [{ severity: 'warning', message: 'Ammo appears low compared with weapons', hint: `Ammo/weapon ratio is ${ammoToWeaponRatio}.` }] : []),
    ...(medicalShare < 4 ? [{ severity: 'info', message: 'Medical items are a small share of the catalog', hint: `Medical share is ${medicalShare}%.` }] : []),
  ];
  return {
    totals: {
      nodes: scan.nodes.length,
      spawners: scan.spawners.length,
      uniqueItems: itemCatalog.total,
      totalRefs: spawnerCoverage.reduce((sum, entry) => sum + entry.refs, 0),
    },
    categoryCounts,
    rarityCounts,
    spawnerRarityCounts,
    balance: {
      score: balanceScore,
      nodeCoverage,
      spawnerCoverage: spawnerCoverageScore,
      ammoToWeaponRatio,
      medicalShare,
      missingRefRisk,
    },
    missingRefs,
    unusedNodes,
    ignoredUnusedNodes,
    spawnerCoverage: spawnerCoverage.sort((a, b) => b.missingRefs - a.missingRefs || a.coverage - b.coverage || a.name.localeCompare(b.name)).slice(0, 40),
    nodePowerScores: nodePowerScores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 30),
    warnings,
    topItems: itemCatalog.items.slice(0, 30).map((item) => ({ name: item.name, count: item.appearances, iconUrl: item.iconUrl, category: item.category })),
  };
}

function buildLootSchemaReport(scan = safeScanLootWorkspace(), options = {}) {
  const includeHints = options.includeHints !== false;
  const detectedKinds = { node: 0, node_tree: 0, spawner: 0, unknown: 0 };
  const validationCounts = { critical: 0, warning: 0, info: 0, fixable: 0 };
  const files = [];

  [...scan.nodes, ...scan.spawners].forEach((file) => {
    const result = analyzeLootObject(file.object, file.relPath, scan);
    const kind = result.summary?.kind || 'unknown';
    detectedKinds[kind] = (detectedKinds[kind] || 0) + 1;
    const counts = result.validation?.counts || {};
    validationCounts.critical += counts.critical || 0;
    validationCounts.warning += counts.warning || 0;
    validationCounts.info += counts.info || 0;
    validationCounts.fixable += result.validation?.fixableCount || 0;
    files.push({
      path: file.relPath,
      kind,
      critical: counts.critical || 0,
      warning: counts.warning || 0,
      info: counts.info || 0,
      fixable: result.validation?.fixableCount || 0,
    });
  });

  const catalog = buildItemCatalog(scan, { limit: 1 });
  return {
    version: LOOT_SCHEMA_VERSION,
    generatedAt: nowIso(),
    hints: includeHints ? LOOT_SCHEMA_HINTS : undefined,
    categories: ITEM_CATEGORY_RULES.map((rule) => rule.id).concat('other'),
    workspace: {
      nodes: scan.nodes.length,
      spawners: scan.spawners.length,
      files: scan.nodes.length + scan.spawners.length,
      parseErrors: scan.errors || [],
      detectedKinds,
      validationCounts,
      validationFiles: files
        .filter((file) => file.critical || file.warning || file.info)
        .sort((a, b) => b.critical - a.critical || b.warning - a.warning || b.info - a.info || a.path.localeCompare(b.path))
        .slice(0, 50),
      catalog: {
        total: catalog.total || 0,
        categories: catalog.categories || [],
        overridesCount: catalog.overridesCount || 0,
      },
    },
  };
}

function detectLootSchemaKinds(scan = safeScanLootWorkspace()) {
  return [...scan.nodes, ...scan.spawners].reduce((acc, file) => {
    const kind = detectLootKind(file.object) || 'unknown';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, { node: 0, node_tree: 0, spawner: 0, unknown: 0 });
}

function readinessCheck(id, label, status, severity, detail = '', action = '') {
  return { id, label, status, severity, detail, action };
}

function buildReadinessReport(config = loadConfig(), paths = resolvedPaths(config)) {
  const inspection = inspectConfigFolder(config.scumConfigDir, config.nodesDir, config.spawnersDir);
  const commandHealth = {
    reload: inspectCommand(config.reloadLootCommand),
    restart: inspectCommand(config.restartServerCommand),
  };
  const checks = [];
  const fileHealth = inspection.fileHealth || {};
  checks.push(readinessCheck(
    'config_root',
    'SCUM config folder',
    inspection.rootExists ? 'ok' : 'bad',
    inspection.rootExists ? 'info' : 'critical',
    inspection.rootPath || 'Not configured',
    'Set the real server config folder in App Settings.',
  ));
  CORE_FILES.forEach((fileName) => {
    checks.push(readinessCheck(
      `core_${fileName}`,
      fileName,
      fileHealth[fileName] ? 'ok' : 'bad',
      fileHealth[fileName] ? 'info' : 'critical',
      fileHealth[fileName] ? 'Found in config root' : `Missing ${fileName}`,
      `Put ${fileName} in the configured SCUM config folder.`,
    ));
  });
  checks.push(readinessCheck(
    'nodes_folder',
    'Nodes folder',
    inspection.nodesExists ? 'ok' : 'bad',
    inspection.nodesExists ? 'info' : 'critical',
    inspection.nodesPath || 'Not configured',
    'Set Nodes folder or leave it blank only if the default SCUM path exists.',
  ));
  checks.push(readinessCheck(
    'spawners_folder',
    'Spawners folder',
    inspection.spawnersExists ? 'ok' : 'bad',
    inspection.spawnersExists ? 'info' : 'critical',
    inspection.spawnersPath || 'Not configured',
    'Set Spawners folder or leave it blank only if the default SCUM path exists.',
  ));
  checks.push(readinessCheck(
    'reload_command',
    'Reload command',
    commandHealth.reload.runnable ? 'ok' : 'warn',
    commandHealth.reload.runnable ? 'info' : 'warning',
    commandHealth.reload.command || commandHealth.reload.reason || 'Not configured',
    'Optional, but needed for Save + Reload.',
  ));
  checks.push(readinessCheck(
    'restart_command',
    'Restart command',
    commandHealth.restart.runnable ? 'ok' : 'warn',
    commandHealth.restart.runnable ? 'info' : 'warning',
    commandHealth.restart.command || commandHealth.restart.reason || 'Not configured',
    'Optional safety command for full server restart.',
  ));

  let backups = [];
  let backupError = '';
  try {
    backups = listBackups(paths);
    checks.push(readinessCheck(
      'backup_folder',
      'Backup folder',
      'ok',
      'info',
      `${paths.backupDir} (${backups.length} backups)`,
      'Backups are available before save/apply.',
    ));
    if (!backups.length) {
      checks.push(readinessCheck(
        'backup_history',
        'Backup history',
        'warn',
        'warning',
        'No backup has been created yet',
        'Create a manual backup before the first real edit.',
      ));
    }
  } catch (error) {
    backupError = error instanceof Error ? error.message : String(error);
    checks.push(readinessCheck(
      'backup_folder',
      'Backup folder',
      'bad',
      'critical',
      backupError,
      'Fix backup folder permission or path.',
    ));
  }

  let scan = { nodes: [], spawners: [], refs: [], refIndex: new Map(), errors: [], listed: { nodes: [], spawners: [] } };
  let overview = null;
  const validationCounts = { critical: 0, warning: 0, info: 0, fixable: 0 };
  const validationFiles = [];
  if (inspection.nodesExists || inspection.spawnersExists) {
    scan = safeScanLootWorkspace(paths);
    for (const error of scan.errors) {
      checks.push(readinessCheck(
        `parse_${error.path}`,
        `Invalid JSON: ${error.path}`,
        'bad',
        'critical',
        error.message,
        'Open the file and fix JSON syntax before saving/applying.',
      ));
    }
    [...scan.nodes, ...scan.spawners].forEach((file) => {
      const result = analyzeLootObject(file.object, file.relPath, scan);
      const counts = result.validation?.counts || {};
      validationCounts.critical += counts.critical || 0;
      validationCounts.warning += counts.warning || 0;
      validationCounts.info += counts.info || 0;
      validationCounts.fixable += result.validation?.fixableCount || 0;
      if ((counts.critical || 0) || (counts.warning || 0)) {
        validationFiles.push({
          path: file.relPath,
          critical: counts.critical || 0,
          warning: counts.warning || 0,
          fixable: result.validation?.fixableCount || 0,
        });
      }
    });
    overview = analyzeOverview(scan);
  }

  const lootFileCount = scan.nodes.length + scan.spawners.length;
  checks.push(readinessCheck(
    'loot_files',
    'Loot files',
    lootFileCount ? 'ok' : 'warn',
    lootFileCount ? 'info' : 'warning',
    `${scan.nodes.length} nodes, ${scan.spawners.length} spawners`,
    'Add or point to real Nodes/Spawners files to use Loot Studio.',
  ));
  if (validationCounts.critical || validationCounts.warning) {
    checks.push(readinessCheck(
      'loot_validation',
      'Loot validation',
      validationCounts.critical ? 'bad' : 'warn',
      validationCounts.critical ? 'critical' : 'warning',
      `${validationCounts.critical} critical, ${validationCounts.warning} warnings, ${validationCounts.fixable} fixable`,
      'Open Loot Studio and use Fix draft/Auto-fix on the listed files.',
    ));
  } else if (lootFileCount) {
    checks.push(readinessCheck('loot_validation', 'Loot validation', 'ok', 'info', 'No blocking validation issues found', ''));
  }
  if (overview?.missingRefs?.length) {
    checks.push(readinessCheck(
      'missing_refs',
      'Missing node refs',
      'bad',
      'critical',
      `${overview.missingRefs.length} spawner refs point to missing node branches`,
      'Fix spawner refs or create the missing node branches.',
    ));
  } else if (lootFileCount) {
    checks.push(readinessCheck('missing_refs', 'Missing node refs', 'ok', 'info', 'No missing spawner refs found', ''));
  }
  if (overview?.unusedNodes?.length) {
    checks.push(readinessCheck(
      'unused_nodes',
      'Unused node files',
      'ok',
      'info',
      `${overview.unusedNodes.length} node files are not referenced by spawners`,
      'Advisory only. Review unused nodes in Analyzer/Search before deleting or wiring them.',
    ));
  }
  checks.push(readinessCheck(
    'item_icons',
    'Item icons',
    fs.existsSync(ITEM_ICON_DIR) ? 'ok' : 'warn',
    fs.existsSync(ITEM_ICON_DIR) ? 'info' : 'warning',
    fs.existsSync(ITEM_ICON_DIR) ? ITEM_ICON_DIR : 'Icon folder not found',
    'Put item icon files in scum_items-main to improve Loot Studio autocomplete.',
  ));

  const counts = {
    nodes: scan.nodes.length,
    spawners: scan.spawners.length,
    files: lootFileCount,
    backups: backups.length,
    parseErrors: scan.errors.length,
    critical: checks.filter((check) => check.status === 'bad').length,
    warning: checks.filter((check) => check.status === 'warn').length,
    validationCritical: validationCounts.critical,
    validationWarning: validationCounts.warning,
    validationInfo: validationCounts.info,
    fixable: validationCounts.fixable,
    missingRefs: overview?.missingRefs?.length || 0,
    unusedNodes: overview?.unusedNodes?.length || 0,
  };
  const score = Math.max(0, Math.min(100, 100
    - (counts.critical * 14)
    - (counts.warning * 5)
    - Math.min(25, counts.validationCritical * 4)
    - Math.min(12, counts.validationWarning)
    - Math.min(18, counts.missingRefs * 3)));
  const blockers = checks.filter((check) => check.status === 'bad');
  const ready = blockers.length === 0 && counts.validationCritical === 0 && counts.parseErrors === 0 && counts.missingRefs === 0;
  const reportCore = { ready, score, counts, checks, blockers, latestBackup: backups[0] || null };
  return {
    ready,
    score,
    generatedAt: nowIso(),
    counts,
    checks,
    blockers,
    nextActions: buildHealthNextActions(reportCore),
    validationFiles: validationFiles.sort((a, b) => b.critical - a.critical || b.warning - a.warning || a.path.localeCompare(b.path)).slice(0, 30),
    latestBackup: backups[0] || null,
    backupError,
    overview: overview ? {
      balance: overview.balance,
      warnings: overview.warnings,
      totals: overview.totals,
    } : null,
    paths,
    commandHealth,
  };
}

function commandDiagnostic(command = {}) {
  return {
    configured: Boolean(command.configured),
    runnable: Boolean(command.runnable),
    reason: command.reason || '',
  };
}

function buildDiagnosticsReport(options = {}) {
  const includePaths = String(options.includePaths ?? 'true') !== 'false';
  const config = loadConfig();
  const paths = resolvedPaths(config);
  const readiness = buildReadinessReport(config, paths);
  const activity = readActivity(80);
  let scan = { nodes: [], spawners: [], errors: [] };
  let itemCatalog = { total: 0, categories: [], overridesCount: 0 };
  try {
    scan = safeScanLootWorkspace(paths);
    itemCatalog = buildItemCatalog(scan, { limit: 1 });
  } catch (error) {
    scan.errors = [{ path: 'workspace', type: 'scan', message: error instanceof Error ? error.message : String(error) }];
  }
  const activityCounts = activity.reduce((acc, entry) => {
    acc[entry.type || 'unknown'] = (acc[entry.type || 'unknown'] || 0) + 1;
    return acc;
  }, {});
  const stripCheckDetail = (check) => ({
    id: check.id,
    label: check.label,
    status: check.status,
    severity: check.severity,
    detail: includePaths ? check.detail : '',
    action: check.action,
  });
  return {
    generatedAt: nowIso(),
    app: {
      name: 'scum-local-control',
      version: '1.0.0',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: includePaths ? ROOT : '',
    },
    config: {
      hasConfigRoot: Boolean(config.scumConfigDir),
      hasCustomNodesDir: Boolean(config.nodesDir),
      hasCustomSpawnersDir: Boolean(config.spawnersDir),
      hasBackupDir: Boolean(config.backupDir),
      scumConfigDir: includePaths ? paths.scumConfigDir : '',
      nodesDir: includePaths ? paths.nodesDir : '',
      spawnersDir: includePaths ? paths.spawnersDir : '',
      backupDir: includePaths ? paths.backupDir : '',
      reloadCommand: commandDiagnostic(readiness.commandHealth?.reload),
      restartCommand: commandDiagnostic(readiness.commandHealth?.restart),
    },
    readiness: {
      ready: readiness.ready,
      score: readiness.score,
      counts: readiness.counts,
      checks: (readiness.checks || []).map(stripCheckDetail),
      blockers: (readiness.blockers || []).map(stripCheckDetail),
      validationFiles: readiness.validationFiles || [],
      latestBackup: readiness.latestBackup ? {
        name: readiness.latestBackup.name,
        updatedAt: readiness.latestBackup.updatedAt,
        tag: readiness.latestBackup.tag,
        fileCount: readiness.latestBackup.fileCount,
      } : null,
    },
    loot: {
      nodes: scan.nodes.length,
      spawners: scan.spawners.length,
      parseErrors: scan.errors || [],
      schema: {
        version: LOOT_SCHEMA_VERSION,
        categories: ITEM_CATEGORY_RULES.map((rule) => rule.id).concat('other'),
        detectedKinds: detectLootSchemaKinds(scan),
      },
      itemCatalog: {
        total: itemCatalog.total || 0,
        categories: itemCatalog.categories || [],
        overridesCount: itemCatalog.overridesCount || 0,
      },
      overview: readiness.overview || null,
    },
    activity: {
      sampled: activity.length,
      counts: activityCounts,
      recent: activity.slice(0, 20).map((entry) => ({
        at: entry.at,
        type: entry.type,
        path: includePaths ? (entry.path || '') : '',
        backup: entry.backup || '',
        ok: entry.ok,
      })),
    },
  };
}

function buildGraph(scan = scanLootWorkspace(), focus = '') {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const pushNode = (node) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    nodes.push(node);
  };
  scan.nodes.forEach((nodeFile) => {
    pushNode({ id: nodeFile.relPath, label: nodeFile.logicalName, kind: 'node', path: nodeFile.relPath });
    if (detectLootKind(nodeFile.object) === 'node_tree') {
      collectTreeRefs(nodeFile.object, nodeFile.relPath).forEach((refEntry) => {
        pushNode({ id: `ref:${refEntry.ref}`, label: refEntry.ref, kind: refEntry.kind === 'leaf' ? 'item' : 'node', path: nodeFile.relPath, rarity: refEntry.rarity || '' });
        edges.push({ from: nodeFile.relPath, to: `ref:${refEntry.ref}`, kind: refEntry.kind === 'leaf' ? 'contains_item' : 'contains_branch' });
      });
    }
  });
  scan.spawners.forEach((spawnerFile) => {
    pushNode({ id: spawnerFile.relPath, label: spawnerFile.logicalName, kind: 'spawner', path: spawnerFile.relPath });
    collectSpawnerRefs(spawnerFile.object).forEach((ref) => {
      const refMeta = scan.refIndex.get(ref);
      pushNode({ id: `ref:${ref}`, label: ref, kind: refMeta ? (refMeta.kind === 'leaf' ? 'item' : 'node') : 'missing_ref', path: refMeta?.path || spawnerFile.relPath, rarity: refMeta?.rarity || '', missing: !refMeta });
      edges.push({ from: spawnerFile.relPath, to: `ref:${ref}`, kind: refMeta ? 'uses_ref' : 'missing_ref', missing: !refMeta });
    });
  });
  const normalizedFocus = String(focus || '').trim().toLowerCase();
  const focusIds = normalizedFocus
    ? nodes.filter((node) => node.label.toLowerCase().includes(normalizedFocus) || node.path.toLowerCase().includes(normalizedFocus)).map((node) => node.id)
    : [];
  const focusSet = new Set(focusIds);
  const neighborhoodIds = new Set(focusIds);
  edges.forEach((edge) => {
    if (focusSet.has(edge.from) || focusSet.has(edge.to)) {
      neighborhoodIds.add(edge.from);
      neighborhoodIds.add(edge.to);
    }
  });
  const neighborhood = nodes.filter((node) => neighborhoodIds.has(node.id));
  return { nodes, edges, neighborhood, focus, focusIds };
}

function exactLineMatch(line, term) {
  const escaped = String(term || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  return new RegExp(`(^|[^A-Za-z0-9_.-])${escaped}($|[^A-Za-z0-9_.-])`, 'i').test(line);
}

function logicalPathSearchScope(logicalPath) {
  if (logicalPath.startsWith('Nodes/')) return 'nodes';
  if (logicalPath.startsWith('Spawners/')) return 'spawners';
  if (logicalPath.endsWith('.ini')) return 'ini';
  return 'core';
}

function matchesSearchScope(logicalPath, scope) {
  if (!scope || scope === '__all') return true;
  if (scope === 'json') return logicalPath.endsWith('.json');
  if (scope === 'ini') return logicalPath.endsWith('.ini');
  if (scope === 'core') return !logicalPath.startsWith('Nodes/') && !logicalPath.startsWith('Spawners/');
  return logicalPathSearchScope(logicalPath) === scope;
}

function searchIssueResults(issue, term, scan = scanLootWorkspace()) {
  const lowered = String(term || '').trim().toLowerCase();
  const overview = analyzeOverview(scan);
  if (issue === 'missing_refs') {
    return (overview.missingRefs || [])
      .filter((entry) => !lowered || `${entry.nodeName} ${entry.spawner}`.toLowerCase().includes(lowered))
      .map((entry) => {
        const spawnerFile = scan.spawners.find((file) => file.logicalName === entry.spawner);
        return {
          path: spawnerFile?.relPath || entry.spawner,
          type: 'missing_ref',
          scope: 'spawners',
          matchCount: 1,
          matches: [{ path: entry.nodeName, preview: `Missing node ref "${entry.nodeName}" used by ${entry.spawner}` }],
        };
      });
  }
  if (issue === 'unused_nodes') {
    return (overview.unusedNodes || [])
      .filter((entry) => !lowered || `${entry.nodeName} ${entry.path}`.toLowerCase().includes(lowered))
      .map((entry) => ({
        path: entry.path,
        type: 'unused_node',
        scope: 'nodes',
        matchCount: 1,
        matches: [{ path: entry.nodeName, preview: `Node file "${entry.nodeName}" is not referenced by any spawner` }],
      }));
  }
  return [];
}

function searchWorkspace(term, paths = resolvedPaths(), options = {}) {
  const lowered = String(term || '').trim().toLowerCase();
  const issue = String(options.issue || '__all');
  if (issue !== '__all') return searchIssueResults(issue, term);
  if (!lowered) return [];
  const scope = String(options.scope || '__all');
  const exact = String(options.match || 'partial') === 'exact';
  const logicalPaths = allWorkspaceLogicalPaths(paths).filter((logicalPath) => matchesSearchScope(logicalPath, scope));
  const results = logicalPaths.map((logicalPath) => {
    const content = readText(resolveLogicalPath(logicalPath, paths));
    const lines = content.split(/\r?\n/);
    const matches = [];
    lines.forEach((line, index) => {
      const isMatch = exact ? exactLineMatch(line, term) : line.toLowerCase().includes(lowered);
      if (isMatch && matches.length < 8) {
        matches.push({ path: `line ${index + 1}`, preview: line.trim().slice(0, 180) });
      }
    });
    return matches.length ? { path: logicalPath, type: logicalPath.endsWith('.json') ? 'json' : 'ini', scope: logicalPathSearchScope(logicalPath), matchCount: matches.length, matches } : null;
  }).filter(Boolean);
  return results.sort((a, b) => b.matchCount - a.matchCount || a.path.localeCompare(b.path));
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
  workspacePackageFiles,
  createWorkspacePackage,
  parseWorkspacePackage,
  buildSupportBundle,
  buildReadinessReport,
  buildDiagnosticsReport,
  buildLootSchemaReport,
};

registerRoutes(app, serverContext);
const port = Number(process.env.PORT || 3000);
function startServer(listenPort = port) {
  ensureDir(DATA_DIR);
  ensureDir(PROFILE_STORE_DIR);
  ensureDir(resolvedPaths(loadConfig()).backupDir);
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
  searchWorkspace,
  buildReadinessReport,
  buildDiagnosticsReport,
  buildSafeApplyPlan,
  createWorkspacePackage,
  parseWorkspacePackage,
  buildSupportBundle,
  summarizeSafeApplyPlan,
};

