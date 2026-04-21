function registerLootRoutes(app, ctx) {
  const {
    path,
    fs,
    loadConfig,
    resolvedPaths,
    scanLootWorkspace,
    readJsonObject,
    resolveLogicalPath,
    analyzeLootObject,
    safeParseJson,
    simulateLootFile,
    simulateLootObject,
    compareSimulationResults,
    writeText,
    appendActivity,
    createBackup,
    readText,
    autoFixLootObject,
    createDiff,
    runShellCommand,
    buildItemCatalog,
    upsertItemCatalogOverride,
    loadItemCatalogOverrides,
    importItemCatalogOverrides,
    deleteItemCatalogOverride,
    loadKitTemplates,
    createKitTemplate,
    deleteKitTemplate,
    errorResponse,
  } = ctx;

  app.get('/api/loot/files', (req, res) => {
    try {
      const scan = scanLootWorkspace();
      res.json({
        ok: true,
        nodes: scan.nodes.map((file) => ({ relPath: file.relPath, name: file.name, logicalName: file.logicalName, summary: analyzeLootObject(file.object, file.relPath, scan).summary })),
        spawners: scan.spawners.map((file) => ({ relPath: file.relPath, name: file.name, logicalName: file.logicalName, summary: analyzeLootObject(file.object, file.relPath, scan).summary })),
      });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.get('/api/loot/analyze', (req, res) => {
    try {
      const relPath = String(req.query.path || '');
      const scan = scanLootWorkspace();
      const object = readJsonObject(resolveLogicalPath(relPath));
      res.json(analyzeLootObject(object, relPath, scan));
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/loot/analyze-content', (req, res) => {
    try {
      const relPath = String(req.body?.path || '');
      const content = String(req.body?.content || '{}');
      const object = safeParseJson(content);
      res.json(analyzeLootObject(object, relPath, scanLootWorkspace()));
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/loot/simulate', (req, res) => {
    try {
      const count = Math.max(1, Math.min(10000, Number(req.body?.count || 100)));
      const pathValue = String(req.body?.path || '');
      const scan = scanLootWorkspace();
      res.json({ ok: true, result: simulateLootFile(pathValue, count, scan) });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/loot/simulate/compare', (req, res) => {
    try {
      const count = Math.max(1, Math.min(10000, Number(req.body?.count || 1000)));
      const pathValue = String(req.body?.path || '');
      const content = String(req.body?.content || '{}');
      const scan = scanLootWorkspace();
      const saved = simulateLootFile(pathValue, count, scan);
      const draftObject = JSON.parse(content);
      const draft = simulateLootObject(draftObject, pathValue, count, scan);
      res.json({ ok: true, saved, draft, comparison: compareSimulationResults(saved, draft) });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/loot/file', (req, res) => {
    try {
      const kind = String(req.body?.kind || '');
      const fileName = String(req.body?.fileName || '').trim();
      if (!fileName) throw new Error('File name is required');
      const normalizedName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
      const logicalPath = kind === 'spawners' ? `Spawners/${normalizedName}` : `Nodes/${normalizedName}`;
      const template = kind === 'spawners'
        ? { Nodes: [{ Rarity: 'Uncommon', Ids: ['ItemLootTreeNodes.NewGroup'] }], Probability: 1, QuantityMin: 1, QuantityMax: 1, AllowDuplicates: false }
        : { Name: path.basename(normalizedName, '.json'), Notes: '', Items: [] };
      writeText(resolveLogicalPath(logicalPath), `${JSON.stringify(template, null, 2)}\n`);
      appendActivity('loot_create', { path: logicalPath });
      res.json({ ok: true, path: logicalPath });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/loot/clone', (req, res) => {
    try {
      const sourcePath = String(req.body?.sourcePath || '');
      const kind = String(req.body?.kind || '');
      const fileName = String(req.body?.fileName || '').trim();
      const targetLogicalPath = kind === 'spawners' ? `Spawners/${fileName.endsWith('.json') ? fileName : `${fileName}.json`}` : `Nodes/${fileName.endsWith('.json') ? fileName : `${fileName}.json`}`;
      const source = readText(resolveLogicalPath(sourcePath));
      writeText(resolveLogicalPath(targetLogicalPath), source);
      appendActivity('loot_clone', { from: sourcePath, to: targetLogicalPath });
      res.json({ ok: true, path: targetLogicalPath });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.delete('/api/loot/file', (req, res) => {
    try {
      const logicalPath = String(req.query.path || '');
      createBackup(resolvedPaths(), [logicalPath], `delete:${logicalPath}`);
      fs.unlinkSync(resolveLogicalPath(logicalPath));
      appendActivity('loot_delete', { path: logicalPath });
      res.json({ ok: true });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/loot/autofix', (req, res) => {
    try {
      const config = loadConfig();
      const paths = resolvedPaths(config);
      const logicalPath = String(req.body?.path || '');
      const scan = scanLootWorkspace(paths);
      const currentText = readText(resolveLogicalPath(logicalPath, paths));
      const currentObject = safeParseJson(currentText);
      const fixed = autoFixLootObject(currentObject, logicalPath, scan);
      const patch = createDiff(logicalPath, currentText, fixed.content);
      let commandResult = null;
      if (req.body?.apply) {
        createBackup(paths, [logicalPath], `autofix:${logicalPath}`);
        writeText(resolveLogicalPath(logicalPath, paths), fixed.content);
        appendActivity('loot_autofix_apply', { path: logicalPath, changes: fixed.changes.length });
        if (req.body?.reloadAfter) commandResult = runShellCommand(config.reloadLootCommand);
      }
      res.json({ ok: true, patch, content: fixed.content, changes: fixed.changes, warnings: fixed.changes, validation: fixed.validation, commandResult });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/items', (req, res) => {
    try {
      const catalog = buildItemCatalog(scanLootWorkspace(), req.query);
      res.json({ ok: true, ...catalog });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.put('/api/items/override', (req, res) => {
    try {
      const name = String(req.body?.name || '');
      const override = upsertItemCatalogOverride(name, req.body || {});
      res.json({ ok: true, override });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/items/overrides', (req, res) => {
    try {
      const overrides = loadItemCatalogOverrides();
      res.json({ ok: true, overrides, count: Object.keys(overrides).length });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.put('/api/items/overrides', (req, res) => {
    try {
      const result = importItemCatalogOverrides(req.body?.overrides || {}, String(req.body?.mode || 'merge'));
      res.json({ ok: true, ...result });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.delete('/api/items/override', (req, res) => {
    try {
      const deleted = deleteItemCatalogOverride(req.query.name || req.body?.name);
      res.json({ ok: true, deleted });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/kits', (req, res) => {
    try {
      res.json({ ok: true, kits: loadKitTemplates() });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.post('/api/kits', (req, res) => {
    try {
      const kit = createKitTemplate(req.body?.name, req.body?.notes, req.body?.items);
      res.json({ ok: true, kit });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.delete('/api/kits', (req, res) => {
    try {
      const kit = deleteKitTemplate(req.query.id || req.body?.id);
      res.json({ ok: true, kit });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/node-refs', (req, res) => {
    try {
      const scan = scanLootWorkspace();
      const refs = [...scan.refs];
      const nodes = [...new Set(refs.map((entry) => entry.node))].sort((a, b) => a.localeCompare(b));
      const query = String(req.query.q || '').trim().toLowerCase();
      const nodeFilter = String(req.query.node || '__all');
      let filtered = refs;
      if (nodeFilter !== '__all') filtered = filtered.filter((entry) => entry.node === nodeFilter);
      if (query) filtered = filtered.filter((entry) => `${entry.ref} ${entry.label} ${entry.node}`.toLowerCase().includes(query));
      const limit = Number(req.query.limit || 8000);
      res.json({ ok: true, refs: filtered.slice(0, limit), nodes, total: filtered.length });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });
}

module.exports = registerLootRoutes;
