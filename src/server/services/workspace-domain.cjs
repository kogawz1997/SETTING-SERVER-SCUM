function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const { normalizeKey, posixify, sortByName, walkFiles } = require('./workspace-utils.cjs');
const { createItemCatalogService } = require('./item-catalog-service.cjs');
const { createLootGraphService } = require('./loot-graph-service.cjs');
const { createLootSimulatorService } = require('./loot-simulator-service.cjs');

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

function collectSpawnerRefEntries(object) {
  if (!Array.isArray(object?.Nodes)) return [];
  return object.Nodes.flatMap((entry, groupIndex) => {
    if (Array.isArray(entry?.Ids)) {
      return entry.Ids
        .map((value, refIndex) => ({ ref: typeof value === 'string' ? value.trim() : '', groupIndex, refIndex }))
        .filter((item) => item.ref);
    }
    return [entry?.Node || entry?.Name || entry?.Ref]
      .filter(Boolean)
      .map((value, refIndex) => ({ ref: String(value || '').trim(), groupIndex, refIndex }))
      .filter((item) => item.ref);
  });
}

function collectSpawnerRefs(object) {
  return collectSpawnerRefEntries(object).map((entry) => entry.ref);
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

function buildRefIndex(refs = []) {
  const index = new Map();
  refs.forEach((entry) => {
    index.set(entry.ref, entry);
    index.set(normalizeSpawnerRef(entry.ref), { ...entry, ref: normalizeSpawnerRef(entry.ref) });
  });
  return index;
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

function resolveRefNode(root, ref) {
  const cleanRef = String(ref || '').replace(/^ItemLootTreeNodes\.?/, '');
  const parts = cleanRef.split('.').filter(Boolean);
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
  const startupDoctor = buildStartupDoctorReport({ config, root: ROOT, inspectCommand });
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
    startupDoctor: {
      ready: startupDoctor.ready,
      counts: startupDoctor.counts,
      checks: (startupDoctor.checks || []).map(stripCheckDetail),
      nextStep: startupDoctor.nextStep,
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
