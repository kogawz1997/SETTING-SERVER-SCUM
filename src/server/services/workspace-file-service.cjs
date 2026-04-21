function createWorkspaceFileService(deps) {
  const {
    fs,
    path,
    ini,
    Diff,
    CORE_FILES,
    resolvedPaths,
    walkProjectFiles,
    posixify,
    sortByName,
    readText,
    safeParseJson,
    readJsonObject,
    collectTreeRefs,
    buildRefIndex,
    buildValidation,
    mergeValidationResults,
    analyzeLootObject,
    validateLootLogic,
    validateServerSettingsLogic,
  } = deps;

  function readLogicalFile(logicalPath, paths = resolvedPaths()) {
    const fullPath = resolveLogicalPath(logicalPath, paths);
    return {
      fullPath,
      logicalPath,
      content: readText(fullPath),
      meta: {
        updatedAt: fs.statSync(fullPath).mtime.toISOString(),
        size: fs.statSync(fullPath).size,
      },
    };
  }

  function resolveLogicalPath(logicalPath, paths = resolvedPaths()) {
    const normalized = posixify(logicalPath).replace(/^\/+/, '');
    if (CORE_FILES.includes(normalized)) {
      if (!paths.scumConfigDir) throw new Error('SCUM config folder is not configured');
      return path.join(paths.scumConfigDir, normalized);
    }
    if (normalized.startsWith('Nodes/')) {
      if (!paths.nodesDir) throw new Error('Nodes folder is not configured');
      const candidate = path.resolve(paths.nodesDir, normalized.slice('Nodes/'.length));
      if (!candidate.startsWith(path.resolve(paths.nodesDir))) throw new Error('Invalid node path');
      return candidate;
    }
    if (normalized.startsWith('Spawners/')) {
      if (!paths.spawnersDir) throw new Error('Spawners folder is not configured');
      const candidate = path.resolve(paths.spawnersDir, normalized.slice('Spawners/'.length));
      if (!candidate.startsWith(path.resolve(paths.spawnersDir))) throw new Error('Invalid spawner path');
      return candidate;
    }
    throw new Error(`Unsupported file path: ${logicalPath}`);
  }

  function listLootFiles(paths = resolvedPaths()) {
    const nodeFiles = walkProjectFiles(paths.nodesDir, (filePath) => /\.json$/i.test(filePath), paths.nodesDir).map((entry) => ({
      relPath: `Nodes/${entry.relPath}`,
      name: entry.name,
      logicalName: path.basename(entry.name, '.json'),
    }));
    const spawnerFiles = walkProjectFiles(paths.spawnersDir, (filePath) => /\.json$/i.test(filePath), paths.spawnersDir).map((entry) => ({
      relPath: `Spawners/${entry.relPath}`,
      name: entry.name,
      logicalName: path.basename(entry.name, '.json'),
    }));
    return { nodes: sortByName(nodeFiles, 'relPath'), spawners: sortByName(spawnerFiles, 'relPath') };
  }

  function scanLootWorkspace(paths = resolvedPaths()) {
    const listed = listLootFiles(paths);
    const nodes = listed.nodes.map((file) => ({ ...file, object: readJsonObject(resolveLogicalPath(file.relPath, paths)) }));
    const spawners = listed.spawners.map((file) => ({ ...file, object: readJsonObject(resolveLogicalPath(file.relPath, paths)) }));
    const refs = nodes.flatMap((file) => collectTreeRefs(file.object, file.relPath));
    return {
      nodes,
      spawners,
      refs,
      refIndex: buildRefIndex(refs),
    };
  }

  function safeScanLootWorkspace(paths = resolvedPaths()) {
    const listed = listLootFiles(paths);
    const errors = [];
    const readLootFile = (file, type) => {
      try {
        return { ...file, object: readJsonObject(resolveLogicalPath(file.relPath, paths)) };
      } catch (error) {
        errors.push({ path: file.relPath, type, message: error instanceof Error ? error.message : String(error) });
        return null;
      }
    };
    const nodes = listed.nodes.map((file) => readLootFile(file, 'node')).filter(Boolean);
    const spawners = listed.spawners.map((file) => readLootFile(file, 'spawner')).filter(Boolean);
    const refs = nodes.flatMap((file) => collectTreeRefs(file.object, file.relPath));
    return {
      nodes,
      spawners,
      refs,
      refIndex: buildRefIndex(refs),
      errors,
      listed,
    };
  }

  function validateContent(logicalPath, content) {
    if (/\.json$/i.test(logicalPath)) {
      const object = safeParseJson(content);
      if (/^(Nodes|Spawners)\//.test(posixify(logicalPath))) {
        const scan = safeScanLootWorkspace();
        const knownRefs = scan?.refIndex instanceof Map ? new Set(scan.refIndex.keys()) : null;
        return mergeValidationResults(
          analyzeLootObject(object, logicalPath, scan).validation,
          validateLootLogic(object, logicalPath, knownRefs ? { knownRefs } : {}),
        );
      }
      return buildValidation([]);
    }
    if (/\.ini$/i.test(logicalPath)) {
      const parsed = ini.parse(content);
      if (posixify(logicalPath) === 'ServerSettings.ini') {
        return validateServerSettingsLogic(parsed);
      }
      return buildValidation([]);
    }
    return buildValidation([]);
  }

  function createDiff(logicalPath, beforeText, afterText) {
    return Diff.createPatch(logicalPath, beforeText, afterText, 'before', 'after');
  }

  function allWorkspaceLogicalPaths(paths = resolvedPaths()) {
    const listed = listLootFiles(paths);
    return [
      ...CORE_FILES,
      ...listed.nodes.map((file) => file.relPath),
      ...listed.spawners.map((file) => file.relPath),
    ];
  }

  return {
    readLogicalFile,
    resolveLogicalPath,
    listLootFiles,
    scanLootWorkspace,
    safeScanLootWorkspace,
    validateContent,
    createDiff,
    allWorkspaceLogicalPaths,
  };
}

module.exports = {
  createWorkspaceFileService,
};
