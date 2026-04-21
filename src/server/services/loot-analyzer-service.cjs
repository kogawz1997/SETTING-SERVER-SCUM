function createLootAnalyzerService(deps) {
  const {
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
  } = deps;

  function analyzeOverview(scan = safeScanLootWorkspace()) {
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

  return {
    analyzeOverview,
    buildLootSchemaReport,
    detectLootSchemaKinds,
  };
}

module.exports = {
  createLootAnalyzerService,
};
