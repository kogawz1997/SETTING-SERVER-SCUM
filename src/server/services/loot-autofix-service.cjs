function createLootAutofixService(deps) {
  const {
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
    scanLootWorkspace,
  } = deps;

  function setItemEntryProbability(entry, value) {
    if (!entry || typeof entry !== 'object') return;
    if ('Chance' in entry && !('Probability' in entry)) entry.Chance = value;
    else entry.Probability = value;
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

  return {
    autoFixLootObject,
  };
}

module.exports = {
  createLootAutofixService,
};
