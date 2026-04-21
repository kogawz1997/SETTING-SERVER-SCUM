function registerSettingsFilesRoutes(app, ctx) {
  const {
    fs,
    ini,
    SERVER_PRESETS,
    loadConfig,
    resolvedPaths,
    readLogicalFile,
    validateServerSettingsLogic,
    validateContent,
    buildSafeApplyPlan,
    applySafePlan,
    summarizeSafeApplyPlan,
    resolveLogicalPath,
    createDiff,
    readText,
    writeText,
    createBackup,
    appendActivity,
    runShellCommand,
    errorResponse,
  } = ctx;

  app.get('/api/server-settings/parsed', (req, res) => {
    try {
      const file = readLogicalFile('ServerSettings.ini');
      const parsed = ini.parse(file.content);
      res.json({ ok: true, parsed, presets: SERVER_PRESETS, validation: validateServerSettingsLogic(parsed) });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.post('/api/server-settings/dry-run', (req, res) => {
    try {
      const parsed = req.body?.parsed || {};
      const nextContent = ini.stringify(parsed);
      const paths = resolvedPaths(loadConfig());
      const plan = buildSafeApplyPlan({
        logicalPath: 'ServerSettings.ini',
        content: nextContent,
        resolveLogicalPath: (logicalPath) => resolveLogicalPath(logicalPath, paths),
        validateContent,
        createDiff,
        readText,
      });
      res.json({ ok: true, plan: { ...plan, summary: summarizeSafeApplyPlan(plan) } });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.put('/api/server-settings/parsed', (req, res) => {
    try {
      const config = loadConfig();
      const paths = resolvedPaths(config);
      const parsed = req.body?.parsed || {};
      const nextContent = ini.stringify(parsed);
      const plan = applySafePlan({
        logicalPath: 'ServerSettings.ini',
        content: nextContent,
        paths,
        resolveLogicalPath: (logicalPath) => resolveLogicalPath(logicalPath, paths),
        validateContent,
        createDiff,
        readText,
        writeText,
        createBackup,
        appendActivity,
        backupNote: 'server-settings-save',
      });
      const commandResult = req.body?.reloadAfter ? runShellCommand(config.reloadLootCommand) : null;
      appendActivity('server_settings_save', { reloadAfter: !!req.body?.reloadAfter, changed: plan.changed });
      res.json({ ok: true, commandResult, plan: { ...plan, summary: summarizeSafeApplyPlan(plan) } });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/server-settings/preset', (req, res) => {
    try {
      const preset = SERVER_PRESETS[req.body?.presetId];
      if (!preset) throw new Error('Preset was not found');
      const current = ini.parse(readText(resolveLogicalPath('ServerSettings.ini')));
      const nextParsed = preset.apply(current);
      const currentText = ini.stringify(current);
      const nextText = ini.stringify(nextParsed);
      const patch = createDiff('ServerSettings.ini', currentText, nextText);
      if (req.body?.apply) {
        createBackup(resolvedPaths(), ['ServerSettings.ini'], `preset-${req.body.presetId}`);
        writeText(resolveLogicalPath('ServerSettings.ini'), nextText);
        if (req.body?.reloadAfter) runShellCommand(loadConfig().reloadLootCommand);
      }
      res.json({ ok: true, patch, parsed: nextParsed });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/file', (req, res) => {
    try {
      const logicalPath = String(req.query.path || '');
      const file = readLogicalFile(logicalPath);
      const validation = validateContent(logicalPath, file.content);
      res.json({ ok: true, content: file.content, meta: file.meta, validation });
    } catch (error) {
      errorResponse(res, 404, error);
    }
  });

  app.put('/api/file', (req, res) => {
    try {
      const config = loadConfig();
      const paths = resolvedPaths(config);
      const logicalPath = String(req.body?.path || '');
      const content = String(req.body?.content || '');
      const plan = applySafePlan({
        logicalPath,
        content,
        paths,
        resolveLogicalPath: (targetPath) => resolveLogicalPath(targetPath, paths),
        validateContent,
        createDiff,
        readText,
        writeText,
        createBackup,
        appendActivity,
        backupNote: `file-save:${logicalPath}`,
      });
      appendActivity('file_save', { path: logicalPath, reloadAfter: !!req.body?.reloadAfter, changed: plan.changed });
      const commandResult = req.body?.reloadAfter ? runShellCommand(config.reloadLootCommand) : null;
      res.json({ ok: true, commandResult, plan: { ...plan, summary: summarizeSafeApplyPlan(plan) } });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/file/dry-run', (req, res) => {
    try {
      const paths = resolvedPaths(loadConfig());
      const logicalPath = String(req.body?.path || '');
      const content = String(req.body?.content || '');
      const plan = buildSafeApplyPlan({
        logicalPath,
        content,
        resolveLogicalPath: (targetPath) => resolveLogicalPath(targetPath, paths),
        validateContent,
        createDiff,
        readText,
      });
      res.json({ ok: true, plan: { ...plan, summary: summarizeSafeApplyPlan(plan) } });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/file/safe-apply', (req, res) => {
    try {
      const config = loadConfig();
      const paths = resolvedPaths(config);
      const logicalPath = String(req.body?.path || '');
      const content = String(req.body?.content || '');
      const plan = applySafePlan({
        logicalPath,
        content,
        paths,
        resolveLogicalPath: (targetPath) => resolveLogicalPath(targetPath, paths),
        validateContent,
        createDiff,
        readText,
        writeText,
        createBackup,
        appendActivity,
        backupNote: `safe-apply:${logicalPath}`,
      });
      const commandResult = req.body?.reloadAfter ? runShellCommand(config.reloadLootCommand) : null;
      res.json({ ok: true, plan: { ...plan, summary: summarizeSafeApplyPlan(plan) }, commandResult });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/file/diff', (req, res) => {
    try {
      const logicalPath = String(req.body?.path || '');
      const nextContent = String(req.body?.content || '');
      const fullPath = resolveLogicalPath(logicalPath);
      const currentContent = fs.existsSync(fullPath) ? readText(fullPath) : '';
      res.json({ ok: true, patch: createDiff(logicalPath, currentContent, nextContent) });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });
}

module.exports = registerSettingsFilesRoutes;
