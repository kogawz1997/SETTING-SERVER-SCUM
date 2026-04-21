function snapshotMeta(snapshot) {
  return {
    id: snapshot.id,
    name: snapshot.name,
    notes: snapshot.notes || '',
    updatedAt: snapshot.createdAt,
    fileCount: Array.isArray(snapshot.files) ? snapshot.files.length : 0,
  };
}

function createProfileService(options = {}) {
  const {
    path,
    profileStoreDir,
    loadProfilesData,
    saveProfilesData,
    loadRotation,
    saveRotation,
    resolvedPaths,
    allWorkspaceLogicalPaths,
    readLogicalFile,
    resolveLogicalPath,
    createBackup,
    runConfiguredCommand,
    applyFileTransaction,
    ensureDir,
    loadJson,
    saveJson,
    appendActivity,
    writeText,
  } = options;
  const nowIso = options.nowIso || (() => new Date().toISOString());

  function createProfileSnapshot(name, notes, paths = resolvedPaths()) {
    ensureDir(profileStoreDir);
    const id = `profile_${Date.now()}`;
    const snapshot = {
      id,
      name,
      notes,
      createdAt: nowIso(),
      files: allWorkspaceLogicalPaths(paths).map((logicalPath) => {
        const { content } = readLogicalFile(logicalPath, paths);
        return { path: logicalPath, content };
      }),
    };
    saveJson(path.join(profileStoreDir, `${id}.json`), snapshot);
    const data = loadProfilesData();
    data.profiles = [snapshotMeta(snapshot), ...(data.profiles || []).filter((profile) => profile.id !== id)];
    saveProfilesData(data);
    if (appendActivity) appendActivity('profile_create', { id, name, fileCount: snapshot.files.length });
    return snapshotMeta(snapshot);
  }

  function readProfileSnapshot(id) {
    const filePath = path.join(profileStoreDir, `${id}.json`);
    const snapshot = loadJson(filePath, null);
    if (!snapshot) throw new Error('Profile snapshot was not found');
    return snapshot;
  }

  function applyProfileSnapshot(id, reloadAfter = false, paths = resolvedPaths(), config = null) {
    const snapshot = readProfileSnapshot(id);
    createBackup(paths, snapshot.files.map((file) => file.path), `profile-${id}`);
    const transaction = applyFileTransaction({
      operations: snapshot.files.map((entry) => ({
        logicalPath: entry.path,
        targetPath: resolveLogicalPath(entry.path, paths),
        content: entry.content,
      })),
      writeText,
      appendActivity,
    });
    if (appendActivity) appendActivity('profile_apply', { id, name: snapshot.name, fileCount: snapshot.files.length });
    const commandResult = reloadAfter ? runConfiguredCommand('reload', { config }) : null;
    return { activeProfile: snapshotMeta(snapshot), commandResult, transaction };
  }

  function nextRotationRun(rotation) {
    if (!rotation.enabled || !rotation.everyMinutes) return '';
    return new Date(Date.now() + Number(rotation.everyMinutes) * 60000).toISOString();
  }

  function runRotation(force = false, config = null, paths = resolvedPaths()) {
    const rotation = loadRotation();
    const enabledEntries = (rotation.entries || []).filter((entry) => entry.enabled !== false && entry.profileId);
    if (!rotation.enabled && !force) return { ran: false, reason: 'rotation-disabled', nextRunAt: rotation.nextRunAt || '' };
    if (!enabledEntries.length) return { ran: false, reason: 'no-enabled-entries', nextRunAt: rotation.nextRunAt || '' };
    const currentIndex = enabledEntries.findIndex((entry) => entry.profileId === rotation.activeProfileId);
    const nextEntry = enabledEntries[(currentIndex + 1) % enabledEntries.length] || enabledEntries[0];
    const result = applyProfileSnapshot(nextEntry.profileId, true, paths, config);
    const nextState = { ...rotation, activeProfileId: nextEntry.profileId, nextRunAt: nextRotationRun(rotation) };
    saveRotation(nextState);
    if (appendActivity) appendActivity('rotation_run', { profileId: nextEntry.profileId });
    return { ran: true, activeProfile: result.activeProfile, commandResult: result.commandResult, nextRunAt: nextState.nextRunAt, rotation: nextState };
  }

  return {
    createProfileSnapshot,
    snapshotMeta,
    readProfileSnapshot,
    applyProfileSnapshot,
    nextRotationRun,
    runRotation,
  };
}

module.exports = {
  createProfileService,
  snapshotMeta,
};
