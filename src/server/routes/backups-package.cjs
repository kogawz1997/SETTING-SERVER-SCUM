function registerBackupsPackageRoutes(app, ctx) {
  const {
    fs,
    loadConfig,
    saveConfig,
    resolvedPaths,
    listBackups,
    listBackupFiles,
    resolveBackupRoot,
    resolveBackupFilePath,
    updateBackupMeta,
    backupCleanupCandidates,
    cleanupBackups,
    compareBackupFiles,
    createBackup,
    restoreBackupFile,
    readText,
    writeText,
    resolveLogicalPath,
    validateContent,
    createDiff,
    buildSafeApplyPlan,
    createWorkspacePackage,
    parseWorkspacePackage,
    workspacePackageFiles,
    appendActivity,
    readActivity,
    errorResponse,
  } = ctx;

  app.get('/api/backups', (req, res) => {
    try {
      res.json({ ok: true, backups: listBackups() });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.get('/api/backup/files', (req, res) => {
    try {
      res.json({ ok: true, files: listBackupFiles(String(req.query.backup || '')) });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/backup/file', (req, res) => {
    try {
      const backup = String(req.query.backup || '');
      const filePath = String(req.query.path || '');
      const fullPath = resolveBackupFilePath(resolveBackupRoot(backup), filePath);
      if (!fs.existsSync(fullPath)) throw new Error('Backup file was not found');
      res.json({ ok: true, content: readText(fullPath) });
    } catch (error) {
      errorResponse(res, 404, error);
    }
  });

  app.post('/api/backup', (req, res) => {
    try {
      const result = createBackup(resolvedPaths(), [], { note: req.body?.note || 'manual-backup', tag: req.body?.tag || 'manual' });
      res.json({ ok: true, backupPath: result.backupName, files: result.files });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.put('/api/backup/meta', (req, res) => {
    try {
      const backup = String(req.body?.backup || '');
      const meta = updateBackupMeta(backup, { note: req.body?.note, tag: req.body?.tag });
      res.json({ ok: true, meta });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/backups/cleanup/preview', (req, res) => {
    try {
      res.json({ ok: true, plan: backupCleanupCandidates(req.body || {}) });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/backups/cleanup', (req, res) => {
    try {
      const confirmed = Boolean(req.body?.confirm);
      if (!confirmed) throw new Error('Cleanup must be confirmed');
      res.json({ ok: true, result: cleanupBackups(req.body || {}) });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/backup/compare', (req, res) => {
    try {
      const result = compareBackupFiles(String(req.query.base || ''), String(req.query.target || ''), String(req.query.path || ''));
      res.json({ ok: true, ...result });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/package/export', (req, res) => {
    try {
      const config = loadConfig();
      const paths = resolvedPaths(config);
      const portable = req.query.portable !== '0';
      const packageData = createWorkspacePackage({
        config,
        files: workspacePackageFiles(paths),
        meta: { note: String(req.query.note || (portable ? 'portable-workspace-export' : 'full-workspace-export')) },
        portable,
      });
      appendActivity('package_export', { fileCount: packageData.files.length, portable });
      res.json({ ok: true, package: packageData });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });

  app.post('/api/package/export', (req, res) => {
    try {
      const config = loadConfig();
      const paths = resolvedPaths(config);
      const portable = req.body?.portable !== false;
      const packageData = createWorkspacePackage({
        config,
        files: workspacePackageFiles(paths, Array.isArray(req.body?.paths) ? req.body.paths : []),
        meta: { note: String(req.body?.note || (portable ? 'portable-selected-workspace-export' : 'selected-workspace-export')) },
        portable,
      });
      appendActivity('package_export', { fileCount: packageData.files.length, selected: Boolean(req.body?.paths?.length), portable });
      res.json({ ok: true, package: packageData });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/package/import/preview', (req, res) => {
    try {
      const packageData = parseWorkspacePackage(req.body?.package || req.body?.text || req.body);
      const paths = resolvedPaths(loadConfig());
      const plans = packageData.files.map((file) => buildSafeApplyPlan({
        logicalPath: file.path,
        content: file.content,
        resolveLogicalPath: (targetPath) => resolveLogicalPath(targetPath, paths),
        validateContent,
        createDiff,
        readText,
      }));
      const counts = plans.reduce((acc, plan) => {
        acc.files += 1;
        if (plan.changed) acc.changed += 1;
        if (!plan.ok) acc.blocked += 1;
        acc.critical += plan.validation?.counts?.critical || 0;
        acc.warning += plan.validation?.counts?.warning || 0;
        return acc;
      }, { files: 0, changed: 0, blocked: 0, critical: 0, warning: 0 });
      res.json({ ok: true, package: { ...packageData, files: packageData.files.map((file) => ({ path: file.path, size: file.content.length })) }, plans, counts });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/package/import/apply', (req, res) => {
    try {
      if (!req.body?.confirm) throw new Error('Package import must be confirmed');
      const packageData = parseWorkspacePackage(req.body?.package || req.body?.text || {});
      const paths = resolvedPaths(loadConfig());
      const plans = packageData.files.map((file) => buildSafeApplyPlan({
        logicalPath: file.path,
        content: file.content,
        resolveLogicalPath: (targetPath) => resolveLogicalPath(targetPath, paths),
        validateContent,
        createDiff,
        readText,
      }));
      const blocked = plans.filter((plan) => !plan.ok);
      if (blocked.length) {
        throw new Error(`Package import blocked by ${blocked.length} file(s) with critical validation`);
      }
      const changedFiles = plans.filter((plan) => plan.changed).map((plan) => plan.logicalPath);
      const backup = changedFiles.length ? createBackup(paths, changedFiles, { note: 'package-import', tag: 'package' }) : null;
      packageData.files.forEach((file) => {
        const plan = plans.find((entry) => entry.logicalPath === file.path);
        if (plan?.changed) writeText(resolveLogicalPath(file.path, paths), file.content);
      });
      if (req.body?.applyConfig) {
        saveConfig({ ...loadConfig(), ...packageData.config });
      }
      appendActivity('package_import', { fileCount: packageData.files.length, changed: changedFiles.length, backup: backup?.backupName || '' });
      res.json({ ok: true, changedFiles, backup, appliedConfig: Boolean(req.body?.applyConfig) });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.post('/api/restore', (req, res) => {
    try {
      restoreBackupFile(String(req.body?.backup || ''), String(req.body?.path || ''));
      res.json({ ok: true });
    } catch (error) {
      errorResponse(res, 400, error);
    }
  });

  app.get('/api/activity', (req, res) => {
    try {
      res.json({ ok: true, entries: readActivity(Number(req.query.limit || 200), { type: req.query.type, term: req.query.term, path: req.query.path }) });
    } catch (error) {
      errorResponse(res, 500, error);
    }
  });
}

module.exports = registerBackupsPackageRoutes;
