function createLootCoreService(deps) {
  const {
    clone,
    path,
    stripBom,
    readText,
    normalizeKey,
    posixify,
    LOOT_RARITIES,
    scanLootWorkspace,
  } = deps;

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

  function normalizeSpawnerRef(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return trimmed.startsWith('ItemLootTreeNodes')
      ? trimmed
      : `ItemLootTreeNodes.${trimmed.replace(/^ItemLootTreeNodes\.?/, '')}`;
  }

  function buildRefIndex(refs = []) {
    const index = new Map();
    refs.forEach((entry) => {
      index.set(entry.ref, entry);
      index.set(normalizeSpawnerRef(entry.ref), { ...entry, ref: normalizeSpawnerRef(entry.ref) });
      const shortRef = String(entry.ref || '').replace(/^ItemLootTreeNodes\.?/, '');
      if (shortRef && shortRef !== entry.ref) {
        index.set(shortRef, { ...entry, ref: shortRef });
      }
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

  function resolveRefNode(root, ref) {
    const rawParts = String(ref || '').split('.').filter(Boolean);
    const cleanParts = String(ref || '').replace(/^ItemLootTreeNodes\.?/, '').split('.').filter(Boolean);
    const parts = root?.Name === rawParts[0] ? rawParts : cleanParts;
    if (!parts.length || root?.Name !== parts[0]) return null;
    let current = root;
    for (const name of parts.slice(1)) {
      const next = (Array.isArray(current.Children) ? current.Children : []).find((child) => child?.Name === name);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  return {
    detectLootKind,
    safeParseJson,
    readJsonObject,
    rarityWeight,
    buildValidation,
    mergeValidationResults,
    summarizeFlatNode,
    summarizeTreeNode,
    collectSpawnerRefEntries,
    collectSpawnerRefs,
    itemEntryName,
    itemEntryProbability,
    itemEntryIdentityKey,
    cloneWithoutProbability,
    parseBooleanLike,
    summarizeSpawner,
    collectTreeLeaves,
    collectTreeRefs,
    normalizeSpawnerRef,
    buildRefIndex,
    analyzeFlatValidation,
    analyzeTreeValidation,
    analyzeSpawnerValidation,
    analyzeLootObject,
    resolveRefNode,
  };
}

module.exports = {
  createLootCoreService,
};
