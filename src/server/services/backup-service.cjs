function defaultNowIso() {
  return new Date().toISOString();
}

function defaultNowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function defaultPosixify(value) {
  return String(value || '').replace(/\\/g, '/');
}

function createBackupService(options = {}) {
  const {
    fs,
    path,
    CORE_FILES = [],
    resolvedPaths,
    resolveLogicalPath,
    listLootFiles,
    createDiff,
    ensureDir,
    readText,
    writeText,
    loadJson,
    saveJson,
    appendActivity,
  } = options;
  const nowIso = options.nowIso || defaultNowIso;
  const nowStamp = options.nowStamp || defaultNowStamp;
  const posixify = options.posixify || defaultPosixify;

  function pathsOrDefault(paths) {
    return paths || resolvedPaths();
  }

  function resolveBackupRoot(backupName, paths = pathsOrDefault()) {
    const root = path.resolve(paths.backupDir);
    const target = path.resolve(root, String(backupName || ''));
    if (!String(backupName || '').trim() || (target !== root && !target.startsWith(`${root}${path.sep}`))) {
      throw new Error('Invalid backup name');
    }
    return target;
  }

  function resolveBackupFilePath(backupRoot, logicalPath) {
    const normalized = posixify(logicalPath).replace(/^\/+/, '');
    const root = path.resolve(backupRoot);
    const target = path.resolve(root, normalized);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid backup file path');
    return target;
  }

  function readBackupMeta(backupName, paths = pathsOrDefault()) {
    const metaPath = path.join(resolveBackupRoot(backupName, paths), '_meta.json');
    return fs.existsSync(metaPath) ? loadJson(metaPath, {}) : {};
  }

  function writeBackupMeta(backupName, meta, paths = pathsOrDefault()) {
    const backupRoot = resolveBackupRoot(backupName, paths);
    if (!fs.existsSync(backupRoot)) throw new Error('Backup was not found');
    saveJson(path.join(backupRoot, '_meta.json'), meta);
  }

  function listBackupFiles(backupName, paths = pathsOrDefault()) {
    const backupRoot = resolveBackupRoot(backupName, paths);
    const files = [];
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else if (entry.name !== '_meta.json') {
          const stat = fs.statSync(fullPath);
          files.push({
            relPath: posixify(path.relative(backupRoot, fullPath)),
            size: stat.size,
            updatedAt: stat.mtime.toISOString(),
          });
        }
      }
    }
    walk(backupRoot);
    return files;
  }

  function allWorkspaceLogicalPaths(paths = pathsOrDefault()) {
    const loot = listLootFiles(paths);
    return [
      ...CORE_FILES.filter((file) => fs.existsSync(resolveLogicalPath(file, paths))),
      ...(loot.nodes || []).map((file) => file.relPath),
      ...(loot.spawners || []).map((file) => file.relPath),
    ];
  }

  function createBackup(paths = pathsOrDefault(), logicalPaths = [], optionsArg = '') {
    const note = typeof optionsArg === 'string' ? optionsArg : String(optionsArg?.note || '');
    const tag = typeof optionsArg === 'string' ? '' : String(optionsArg?.tag || '');
    const stamp = nowStamp();
    let targetDir = path.join(paths.backupDir, stamp);
    let suffix = 1;
    while (fs.existsSync(targetDir)) {
      suffix += 1;
      targetDir = path.join(paths.backupDir, `${stamp}-${suffix}`);
    }
    ensureDir(targetDir);
    const selectedPaths = logicalPaths.length ? logicalPaths : allWorkspaceLogicalPaths(paths);
    const files = [];
    for (const logicalPath of selectedPaths) {
      const fullPath = resolveLogicalPath(logicalPath, paths);
      if (!fs.existsSync(fullPath)) continue;
      const backupPath = path.join(targetDir, posixify(logicalPath));
      ensureDir(path.dirname(backupPath));
      fs.copyFileSync(fullPath, backupPath);
      const stat = fs.statSync(fullPath);
      files.push({ relPath: posixify(logicalPath), size: stat.size, updatedAt: stat.mtime.toISOString() });
    }
    saveJson(path.join(targetDir, '_meta.json'), { createdAt: nowIso(), note, tag, files });
    if (appendActivity) appendActivity('backup', { backup: path.basename(targetDir), note, tag, fileCount: files.length });
    return { backupDir: targetDir, backupName: path.basename(targetDir), files };
  }

  function listBackups(paths = pathsOrDefault()) {
    ensureDir(paths.backupDir);
    return fs.readdirSync(paths.backupDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const metaPath = path.join(paths.backupDir, entry.name, '_meta.json');
        const meta = fs.existsSync(metaPath) ? loadJson(metaPath, {}) : {};
        return {
          name: entry.name,
          updatedAt: meta.createdAt || fs.statSync(path.join(paths.backupDir, entry.name)).mtime.toISOString(),
          note: meta.note || '',
          tag: meta.tag || '',
          fileCount: Array.isArray(meta.files) ? meta.files.length : listBackupFiles(entry.name, paths).length,
        };
      })
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function restoreBackupFile(backupName, logicalPath, paths = pathsOrDefault()) {
    const backupRoot = resolveBackupRoot(backupName, paths);
    const sourcePath = resolveBackupFilePath(backupRoot, logicalPath);
    if (!fs.existsSync(sourcePath)) throw new Error('Backup file was not found');
    const targetPath = resolveLogicalPath(logicalPath, paths);
    ensureDir(path.dirname(targetPath));
    writeText(targetPath, readText(sourcePath));
    if (appendActivity) appendActivity('restore', { backup: backupName, path: logicalPath });
  }

  function updateBackupMeta(backupName, updates = {}, paths = pathsOrDefault()) {
    const meta = readBackupMeta(backupName, paths);
    const next = {
      ...meta,
      note: updates.note != null ? String(updates.note) : (meta.note || ''),
      tag: updates.tag != null ? String(updates.tag) : (meta.tag || ''),
      updatedMetaAt: nowIso(),
    };
    writeBackupMeta(backupName, next, paths);
    if (appendActivity) appendActivity('backup_meta_update', { backup: backupName, tag: next.tag, note: next.note });
    return next;
  }

  function compareBackupFiles(baseBackup, targetBackup, logicalPath = '', paths = pathsOrDefault()) {
    const baseRoot = resolveBackupRoot(baseBackup, paths);
    const targetRoot = resolveBackupRoot(targetBackup, paths);
    if (!fs.existsSync(baseRoot) || !fs.existsSync(targetRoot)) throw new Error('Backup was not found');
    if (logicalPath) {
      const normalized = posixify(logicalPath);
      const basePath = resolveBackupFilePath(baseRoot, normalized);
      const targetPath = resolveBackupFilePath(targetRoot, normalized);
      const before = fs.existsSync(basePath) ? readText(basePath) : '';
      const after = fs.existsSync(targetPath) ? readText(targetPath) : '';
      return {
        mode: 'file',
        path: normalized,
        existsInBase: fs.existsSync(basePath),
        existsInTarget: fs.existsSync(targetPath),
        changed: before !== after,
        patch: createDiff(normalized, before, after),
      };
    }
    const baseFiles = new Map(listBackupFiles(baseBackup, paths).map((file) => [posixify(file.relPath), file]));
    const targetFiles = new Map(listBackupFiles(targetBackup, paths).map((file) => [posixify(file.relPath), file]));
    const allPaths = [...new Set([...baseFiles.keys(), ...targetFiles.keys()])].sort();
    const files = allPaths.map((filePath) => {
      const baseFile = baseFiles.get(filePath);
      const targetFile = targetFiles.get(filePath);
      let status = 'changed';
      if (!baseFile) status = 'added';
      else if (!targetFile) status = 'removed';
      else {
        const baseText = readText(resolveBackupFilePath(baseRoot, filePath));
        const targetText = readText(resolveBackupFilePath(targetRoot, filePath));
        status = baseText === targetText ? 'same' : 'changed';
      }
      return { relPath: filePath, status, baseSize: baseFile?.size || 0, targetSize: targetFile?.size || 0 };
    });
    return {
      mode: 'summary',
      files,
      counts: files.reduce((acc, file) => {
        acc[file.status] = (acc[file.status] || 0) + 1;
        return acc;
      }, { added: 0, removed: 0, changed: 0, same: 0 }),
    };
  }

  function isProtectedBackup(backup) {
    const tag = String(backup?.tag || '').trim().toLowerCase();
    return ['keep', 'pinned', 'protected'].includes(tag);
  }

  function backupCleanupCandidates(optionsArg = {}, paths = pathsOrDefault()) {
    const keepLatest = Math.max(1, Math.min(500, Number(optionsArg.keepLatest || 10)));
    const tag = String(optionsArg.tag || '').trim();
    const includeProtected = Boolean(optionsArg.includeProtected);
    const backups = listBackups(paths);
    const keptLatest = new Set(backups.slice(0, keepLatest).map((backup) => backup.name));
    const candidates = backups.filter((backup) => {
      if (keptLatest.has(backup.name)) return false;
      if (!includeProtected && isProtectedBackup(backup)) return false;
      if (tag && backup.tag !== tag) return false;
      return true;
    });
    return {
      keepLatest,
      tag,
      includeProtected,
      total: backups.length,
      protectedCount: backups.filter(isProtectedBackup).length,
      candidates,
      kept: backups.length - candidates.length,
    };
  }

  function cleanupBackups(optionsArg = {}, paths = pathsOrDefault()) {
    const plan = backupCleanupCandidates(optionsArg, paths);
    const deleted = [];
    for (const backup of plan.candidates) {
      const backupRoot = resolveBackupRoot(backup.name, paths);
      if (!fs.existsSync(backupRoot)) continue;
      fs.rmSync(backupRoot, { recursive: true, force: true });
      deleted.push(backup);
    }
    if (appendActivity) {
      appendActivity('backup_cleanup', {
        deletedCount: deleted.length,
        keepLatest: plan.keepLatest,
        tag: plan.tag,
        includeProtected: plan.includeProtected,
      });
    }
    return { ...plan, deleted };
  }

  function workspacePackageFiles(paths = pathsOrDefault(), requestedPaths = []) {
    const available = new Set(allWorkspaceLogicalPaths(paths).map(posixify));
    const selected = requestedPaths.length ? requestedPaths.map(posixify) : [...available];
    return selected
      .filter((logicalPath) => available.has(logicalPath))
      .map((logicalPath) => ({ path: logicalPath, content: readText(resolveLogicalPath(logicalPath, paths)) }));
  }

  return {
    resolveBackupRoot,
    resolveBackupFilePath,
    readBackupMeta,
    writeBackupMeta,
    createBackup,
    listBackups,
    listBackupFiles,
    restoreBackupFile,
    updateBackupMeta,
    compareBackupFiles,
    backupCleanupCandidates,
    cleanupBackups,
    allWorkspaceLogicalPaths,
    workspacePackageFiles,
  };
}

module.exports = {
  createBackupService,
};
