function registerSystemRoutes(app, ctx) {
  const {
    ROOT,
    fs,
    path,
    loadConfig,
    saveConfig,
    resolvedPaths,
    inspectConfigFolder,
    inspectCommand,
    runShellCommand,
    appendActivity,
    readActivity,
    loadRotation,
    buildReadinessReport,
    buildDiagnosticsReport,
    buildLootSchemaReport,
    safeScanLootWorkspace,
    SERVER_PRESETS,
    errorResponse,
  } = ctx;

  function writeProbe(dirPath) {
    try {
      if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return { ok: false, reason: 'missing_directory' };
      const probePath = path.join(dirPath, `.scum-control-write-test-${process.pid}.tmp`);
      fs.writeFileSync(probePath, 'ok', 'utf8');
      fs.unlinkSync(probePath);
      return { ok: true, reason: 'writable' };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  app.get('/api/bootstrap', (req, res) => {
    try {
      const config = loadConfig();
      const paths = resolvedPaths(config);
      const inspection = inspectConfigFolder(config.scumConfigDir, config.nodesDir, config.spawnersDir);
      const commandHealth = {
        reload: inspectCommand(config.reloadLootCommand),
        restart: inspectCommand(config.restartServerCommand),
      };
      const health = {
        configSet: Boolean(config.scumConfigDir),
        configPathExists: inspection.rootExists,
        nodesDirSet: Boolean(config.nodesDir || config.scumConfigDir),
        spawnersDirSet: Boolean(config.spawnersDir || config.scumConfigDir),
        backupDirSet: Boolean(config.backupDir),
        reloadConfigured: commandHealth.reload.configured,
        restartConfigured: commandHealth.restart.configured,
        ready: inspection.ready,
      };
      res.json({
        ok: true,
        config,
        health,
        fileHealth: inspection.fileHealth,
        configInspection: inspection,
        permissions: {
          configRoot: writeProbe(paths.scumConfigDir),
          backupDir: writeProbe(paths.backupDir),
        },
        commandHealth,
        presets: SERVER_PRESETS,
        activity: readActivity(20),
        rotation: loadRotation(),
        backupDir: paths.backupDir,
      });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.get('/api/readiness', (req, res) => {
    try {
      res.json({ ok: true, report: buildReadinessReport() });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.get('/api/diagnostics', (req, res) => {
    try {
      res.json({ ok: true, report: buildDiagnosticsReport({ includePaths: req.query.includePaths }) });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.get('/api/schemas/loot', (req, res) => {
    try {
      res.json({ ok: true, schema: buildLootSchemaReport(safeScanLootWorkspace(), { includeHints: true }) });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.put('/api/config', (req, res) => {
    try {
      const nextConfig = { ...loadConfig(), ...req.body };
      saveConfig(nextConfig);
      appendActivity('config_save', { keys: Object.keys(req.body || {}) });
      res.json({ ok: true, config: nextConfig });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/config/check', (req, res) => {
    try {
      const inspection = inspectConfigFolder(req.query.path || '', req.query.nodesPath || '', req.query.spawnersPath || '');
      res.json({ ok: true, inspection });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/config/discover', (req, res) => {
    try {
      const config = loadConfig();
      const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
      const candidates = [
        config.scumConfigDir,
        path.join(localAppData, 'SCUM', 'Saved', 'Config', 'WindowsNoEditor'),
        path.join(localAppData, 'SCUM', 'Saved', 'Config', 'WindowsServer'),
        path.join('C:\\', 'SCUM', 'Saved', 'Config', 'WindowsServer'),
      ].filter(Boolean);
      const seen = new Set();
      const found = candidates
        .map((candidate) => path.resolve(ROOT, candidate))
        .filter((candidate) => {
          if (seen.has(candidate)) return false;
          seen.add(candidate);
          return fs.existsSync(candidate);
        })
        .map((candidate) => inspectConfigFolder(candidate))
        .sort((a, b) => Number(b.ready) - Number(a.ready) || a.path.localeCompare(b.path));
      res.json({ ok: true, found });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.post('/api/command/check', (req, res) => {
    try {
      res.json({ ok: true, inspection: inspectCommand(req.body?.command || '') });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/action/reload-loot', (req, res) => {
    try {
      const config = loadConfig();
      const commandResult = runShellCommand(config.reloadLootCommand);
      appendActivity('action_reload', { ok: commandResult.ok, output: commandResult.output.slice(0, 500) });
      res.json({ ok: commandResult.ok, commandResult });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.post('/api/action/restart-server', (req, res) => {
    try {
      const config = loadConfig();
      const commandResult = runShellCommand(config.restartServerCommand);
      appendActivity('action_restart', { ok: commandResult.ok, output: commandResult.output.slice(0, 500) });
      res.json({ ok: commandResult.ok, commandResult });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });
}

module.exports = registerSystemRoutes;
