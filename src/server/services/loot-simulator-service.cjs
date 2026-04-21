function createLootSimulatorService(deps) {
  const {
    scanLootWorkspace,
    readJsonObject,
    resolveLogicalPath,
    detectLootKind,
    itemEntryName,
    categoryForItem,
    resolveRefNode,
    rarityWeight,
  } = deps;

  function createSeededRandom(seed) {
    const value = String(seed || '');
    if (!value) return Math.random;
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return () => {
      hash += 0x6D2B79F5;
      let next = hash;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomChoiceWeighted(list, weightOf, random = Math.random) {
    const total = (Array.isArray(list) ? list : []).reduce((sum, entry) => sum + Math.max(0, Number(weightOf(entry) || 0)), 0);
    if (!Array.isArray(list) || !list.length) return null;
    if (!total) return list[0] || null;
    let pick = random() * total;
    for (const entry of list) {
      pick -= Math.max(0, Number(weightOf(entry) || 0));
      if (pick <= 0) return entry;
    }
    return list[list.length - 1] || null;
  }

  function weightedEntries(list, weightOf) {
    const rows = (Array.isArray(list) ? list : []).map((entry) => ({ entry, weight: Math.max(0, Number(weightOf(entry) || 0)) }));
    const total = rows.reduce((sum, row) => sum + row.weight, 0);
    if (!total) return rows.map((row, index) => ({ entry: row.entry, rate: index === 0 ? 1 : 0 }));
    return rows.map((row) => ({ entry: row.entry, rate: row.weight / total }));
  }

  function normalizeRef(value = '') {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return trimmed.startsWith('ItemLootTreeNodes')
      ? trimmed
      : `ItemLootTreeNodes.${trimmed.replace(/^ItemLootTreeNodes\.?/, '')}`;
  }

  function resolveRefMeta(ref, scan = scanLootWorkspace()) {
    const clean = String(ref || '').trim();
    if (!clean) return null;
    return scan.refIndex.get(clean) || scan.refIndex.get(normalizeRef(clean)) || null;
  }

  function spawnerRefGroups(object, scan = scanLootWorkspace()) {
    if (!Array.isArray(object?.Nodes)) return [];
    return object.Nodes.map((group, groupIndex) => {
      const rawRefs = Array.isArray(group?.Ids)
        ? group.Ids
        : [group?.Node || group?.Name || group?.Ref].filter(Boolean);
      const refs = rawRefs
        .map((value, refIndex) => {
          const ref = normalizeRef(value);
          return { ref, rawRef: String(value || '').trim(), refIndex, groupIndex, meta: resolveRefMeta(ref, scan) };
        })
        .filter((entry) => entry.ref);
      return {
        groupIndex,
        rarity: group?.Rarity || '',
        weight: rarityWeight(group?.Rarity),
        refs,
      };
    }).filter((group) => group.refs.length);
  }

  function unresolvedRefsFromGroups(groups = []) {
    const seen = new Set();
    return groups.flatMap((group) => group.refs
      .filter((entry) => !entry.meta)
      .map((entry) => ({ ref: entry.ref, rawRef: entry.rawRef, groupIndex: group.groupIndex, refIndex: entry.refIndex })))
      .filter((entry) => {
        const key = `${entry.groupIndex}:${entry.ref}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function treeFileForRef(meta, scan = scanLootWorkspace()) {
    return scan.nodes.find((file) => file.logicalName === meta?.node || file.relPath === meta?.path) || null;
  }

  function leafNameForRef(meta, scan = scanLootWorkspace(), random = Math.random) {
    if (!meta) return null;
    const treeFile = treeFileForRef(meta, scan);
    const refNode = treeFile ? resolveRefNode(treeFile.object, meta.ref) : null;
    if (!refNode) return String(meta.ref || '').split('.').filter(Boolean).slice(-1)[0] || null;
    const children = Array.isArray(refNode.Children) ? refNode.Children.filter(Boolean) : [];
    if (!children.length) return refNode.Name || String(meta.ref || '').split('.').filter(Boolean).slice(-1)[0] || null;
    return chooseLeafFromTree(refNode, random);
  }

  function expectedRatesForRef(meta, scan = scanLootWorkspace(), multiplier = 1) {
    if (!meta) return [];
    const treeFile = treeFileForRef(meta, scan);
    const refNode = treeFile ? resolveRefNode(treeFile.object, meta.ref) : null;
    const fallbackName = String(meta.ref || '').split('.').filter(Boolean).slice(-1)[0] || '';
    const rates = refNode ? expectedTreeLeafRates(refNode, multiplier) : [{ name: fallbackName, expectedRate: multiplier, rarity: meta.rarity || '' }];
    return rates.filter((entry) => entry.name);
  }

  function chooseLeafFromTree(node, random = Math.random) {
    const children = Array.isArray(node?.Children) ? node.Children.filter(Boolean) : [];
    if (!children.length) return node?.Name || null;
    const picked = randomChoiceWeighted(children, (entry) => rarityWeight(entry?.Rarity), random);
    return chooseLeafFromTree(picked, random);
  }

  function expectedTreeLeafRates(node, multiplier = 1) {
    const children = Array.isArray(node?.Children) ? node.Children.filter(Boolean) : [];
    if (!children.length) return [{ name: node?.Name || '', expectedRate: multiplier, rarity: node?.Rarity || '' }].filter((entry) => entry.name);
    return weightedEntries(children, (entry) => rarityWeight(entry?.Rarity))
      .flatMap(({ entry, rate }) => expectedTreeLeafRates(entry, multiplier * rate));
  }

  function expectedLootRates(object, relPath, scan = scanLootWorkspace()) {
    const kind = detectLootKind(object);
    if (kind === 'node') {
      const items = Array.isArray(object.Items) ? object.Items.filter(Boolean) : [];
      return weightedEntries(items, (entry) => Number(entry.Probability ?? entry.Chance ?? 0) || 0)
        .map(({ entry, rate }) => ({ name: itemEntryName(entry), expectedRate: Number(rate.toFixed(6)), category: categoryForItem(itemEntryName(entry)) }))
        .filter((entry) => entry.name);
    }
    if (kind === 'node_tree') {
      return expectedTreeLeafRates(object).map((entry) => ({ ...entry, expectedRate: Number(entry.expectedRate.toFixed(6)), category: categoryForItem(entry.name) }));
    }
    if (kind === 'spawner') {
      const groups = spawnerRefGroups(object, scan);
      const quantityMin = Math.max(0, Number(object.QuantityMin ?? 1));
      const quantityMax = Math.max(quantityMin, Number(object.QuantityMax ?? quantityMin));
      const averageQuantity = (quantityMin + quantityMax) / 2;
      const rates = new Map();
      weightedEntries(groups, (group) => group.weight).forEach(({ entry: group, rate: groupRate }) => {
        weightedEntries(group.refs, () => 1).forEach(({ entry: refEntry, rate: refRate }) => {
          if (!refEntry.meta) return;
          expectedRatesForRef(refEntry.meta, scan, averageQuantity * groupRate * refRate).forEach((leaf) => {
            rates.set(leaf.name, (rates.get(leaf.name) || 0) + leaf.expectedRate);
          });
        });
      });
      return [...rates.entries()].map(([name, expectedRate]) => ({ name, expectedRate: Number(expectedRate.toFixed(6)), category: categoryForItem(name) }));
    }
    return [];
  }

  function summarizeExpectedCategories(expectedRates = []) {
    const totals = new Map();
    for (const item of expectedRates) {
      const category = item.category || categoryForItem(item.name);
      totals.set(category, (totals.get(category) || 0) + Number(item.expectedRate || 0));
    }
    const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
    return [...totals.entries()]
      .map(([category, expectedItemsPerRun]) => ({
        category,
        expectedItemsPerRun: Number(expectedItemsPerRun.toFixed(6)),
        share: Number((expectedItemsPerRun / Math.max(total, 1)).toFixed(6)),
      }))
      .sort((a, b) => b.expectedItemsPerRun - a.expectedItemsPerRun || a.category.localeCompare(b.category));
  }

  function summarizeCategoriesFromHits(distinctItems) {
    const totals = new Map();
    for (const item of distinctItems) {
      const category = categoryForItem(item.name);
      totals.set(category, (totals.get(category) || 0) + Number(item.hits || 0));
    }
    return [...totals.entries()]
      .map(([category, hits]) => ({ category, hits }))
      .sort((a, b) => b.hits - a.hits || a.category.localeCompare(b.category));
  }

  function simulateLootObject(object, relPath, count, scan = scanLootWorkspace(), options = {}) {
    const kind = detectLootKind(object);
    const sampleRuns = [];
    const hitMap = new Map();
    const seed = options && typeof options === 'object' ? String(options.seed || '') : '';
    const random = createSeededRandom(seed);
    const groups = kind === 'spawner' ? spawnerRefGroups(object, scan) : [];
    const unresolvedRefs = kind === 'spawner' ? unresolvedRefsFromGroups(groups) : [];
    let totalItems = 0;
    for (let index = 0; index < count; index += 1) {
      let run = [];
      if (kind === 'node') {
        const items = Array.isArray(object.Items) ? object.Items.filter(Boolean) : [];
        const picked = randomChoiceWeighted(items, (entry) => Number(entry.Probability ?? entry.Chance ?? 0) || 0, random);
        if (picked) run = [itemEntryName(picked)].filter(Boolean);
      } else if (kind === 'node_tree') {
        const picked = chooseLeafFromTree(object, random);
        if (picked) run = [picked];
      } else if (kind === 'spawner') {
        const quantityMin = Math.max(0, Number(object.QuantityMin ?? 1));
        const quantityMax = Math.max(quantityMin, Number(object.QuantityMax ?? quantityMin));
        const quantity = Math.round(quantityMin + random() * Math.max(0, quantityMax - quantityMin));
        run = Array.from({ length: quantity }, () => {
          const group = randomChoiceWeighted(groups, (entry) => entry.weight, random);
          const refEntry = randomChoiceWeighted(group?.refs || [], () => 1, random);
          return leafNameForRef(refEntry?.meta, scan, random);
        }).filter(Boolean);
      }
      totalItems += run.length;
      run.forEach((name) => hitMap.set(name, (hitMap.get(name) || 0) + 1));
      if (sampleRuns.length < 8) sampleRuns.push(run);
    }
    const distinctItems = [...hitMap.entries()]
      .map(([name, hits]) => ({ name, hits, dropRate: Number((hits / Math.max(1, count)).toFixed(6)), category: categoryForItem(name) }))
      .sort((a, b) => b.hits - a.hits || a.name.localeCompare(b.name));
    const expectedRates = expectedLootRates(object, relPath, scan).sort((a, b) => b.expectedRate - a.expectedRate || a.name.localeCompare(b.name));
    const rollPlan = kind === 'spawner'
      ? {
        kind,
        groups: groups.length,
        refs: groups.reduce((sum, group) => sum + group.refs.length, 0),
        resolvedRefs: groups.reduce((sum, group) => sum + group.refs.filter((entry) => entry.meta).length, 0),
        unresolvedRefs: unresolvedRefs.length,
        quantityMin: Math.max(0, Number(object.QuantityMin ?? 1)),
        quantityMax: Math.max(Math.max(0, Number(object.QuantityMin ?? 1)), Number(object.QuantityMax ?? object.QuantityMin ?? 1)),
      }
      : { kind, entries: kind === 'node' ? (Array.isArray(object.Items) ? object.Items.length : 0) : expectedRates.length };
    return {
      count,
      seed,
      averageItemsPerRun: Number((totalItems / Math.max(1, count)).toFixed(2)),
      distinctItems,
      expectedRates,
      expectedCategorySummary: summarizeExpectedCategories(expectedRates),
      categorySummary: summarizeCategoriesFromHits(distinctItems),
      unresolvedRefs,
      rollPlan,
      sampleRuns,
    };
  }

  function simulateLootFile(relPath, count, scan = scanLootWorkspace(), options = {}) {
    const object = readJsonObject(resolveLogicalPath(relPath));
    return simulateLootObject(object, relPath, count, scan, options);
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

  return {
    createSeededRandom,
    simulateLootObject,
    simulateLootFile,
    compareSimulationResults,
  };
}

module.exports = {
  createLootSimulatorService,
};
