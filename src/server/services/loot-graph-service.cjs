function createLootGraphService(deps) {
  const {
    clone,
    posixify,
    scanLootWorkspace,
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
  } = deps;

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
          const refId = normalizeSpawnerRef(refEntry.ref);
          pushNode({ id: `ref:${refId}`, label: refId, kind: refEntry.kind === 'leaf' ? 'item' : 'node', path: nodeFile.relPath, rarity: refEntry.rarity || '' });
          edges.push({ from: nodeFile.relPath, to: `ref:${refId}`, kind: refEntry.kind === 'leaf' ? 'contains_item' : 'contains_branch' });
        });
      }
    });
    scan.spawners.forEach((spawnerFile) => {
      pushNode({ id: spawnerFile.relPath, label: spawnerFile.logicalName, kind: 'spawner', path: spawnerFile.relPath });
      collectSpawnerRefEntries(spawnerFile.object).forEach((entry) => {
        const refMeta = scan.refIndex.get(entry.ref);
        const refId = normalizeSpawnerRef(entry.ref);
        pushNode({ id: `ref:${refId}`, label: refId, kind: refMeta ? (refMeta.kind === 'leaf' ? 'item' : 'node') : 'missing_ref', path: refMeta?.path || spawnerFile.relPath, rarity: refMeta?.rarity || '', missing: !refMeta });
        edges.push({ from: spawnerFile.relPath, to: `ref:${refId}`, kind: refMeta ? 'uses_ref' : 'missing_ref', missing: !refMeta, groupIndex: entry.groupIndex, refIndex: entry.refIndex, ref: refId });
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

  function editSpawnerRefObject(object, options = {}) {
    const next = clone(object);
    next.Nodes = Array.isArray(next.Nodes) ? next.Nodes : [];
    const groupIndex = Math.max(0, Number(options.groupIndex || 0));
    if (!next.Nodes[groupIndex]) next.Nodes[groupIndex] = { Rarity: 'Uncommon', Ids: [] };
    const group = next.Nodes[groupIndex];
    const refs = Array.isArray(group.Ids)
      ? group.Ids.map((value) => String(value || '').trim()).filter(Boolean)
      : [group.Node || group.Name || group.Ref].filter(Boolean).map((value) => String(value || '').trim());
    const action = String(options.action || 'add').trim().toLowerCase();
    const ref = normalizeSpawnerRef(options.ref || options.newRef || '');
    const oldRef = normalizeSpawnerRef(options.oldRef || options.fromRef || '');
    if ((action === 'add' || action === 'remove') && !ref) throw new Error('Node ref is required');
    if (action === 'replace' && (!oldRef || !ref)) throw new Error('Both oldRef and ref are required for replace');

    let nextRefs = refs;
    if (action === 'add') {
      if (!nextRefs.includes(ref)) nextRefs = [...nextRefs, ref];
    } else if (action === 'remove') {
      nextRefs = nextRefs.filter((value) => value !== ref);
    } else if (action === 'replace') {
      nextRefs = nextRefs.map((value) => (value === oldRef ? ref : value));
      if (!nextRefs.includes(ref)) nextRefs.push(ref);
    } else {
      throw new Error('Unsupported graph ref edit action');
    }

    group.Ids = [...new Set(nextRefs)];
    delete group.Node;
    delete group.Name;
    delete group.Ref;
    return next;
  }

  function buildGraphRefEditPlan(options = {}) {
    const logicalPath = posixify(options.path || options.logicalPath || '');
    if (!logicalPath.startsWith('Spawners/')) throw new Error('Graph ref editor can only edit Spawners files');
    const apply = Boolean(options.apply);
    const paths = resolvedPaths(loadConfig());
    const fullPath = resolveLogicalPath(logicalPath, paths);
    const before = readText(fullPath);
    const object = safeParseJson(before);
    const nextObject = editSpawnerRefObject(object, options);
    const content = `${JSON.stringify(nextObject, null, 2)}\n`;
    const patch = createDiff(logicalPath, before, content);
    const changed = before !== content;
    const validation = validateContent(logicalPath, content);
    const plan = {
      ok: true,
      dryRun: !apply,
      logicalPath,
      groupIndex: Math.max(0, Number(options.groupIndex || 0)),
      action: String(options.action || 'add'),
      ref: normalizeSpawnerRef(options.ref || options.newRef || ''),
      oldRef: normalizeSpawnerRef(options.oldRef || options.fromRef || ''),
      changed,
      willWrite: apply && changed,
      patch,
      validation,
    };
    if (apply && changed) {
      createBackup(paths, [logicalPath], `graph-ref-edit:${logicalPath}`);
      writeText(fullPath, content);
      appendActivity('graph_ref_edit', {
        path: logicalPath,
        action: plan.action,
        ref: plan.ref,
        oldRef: plan.oldRef,
        groupIndex: plan.groupIndex,
      });
      plan.dryRun = false;
    }
    return { plan, content, object: nextObject };
  }

  return {
    buildGraph,
    buildGraphRefEditPlan,
  };
}

module.exports = {
  createLootGraphService,
};
