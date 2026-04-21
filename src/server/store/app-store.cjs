const fs = require('node:fs');
const path = require('node:path');
const { ensureDir, readText, loadJson, saveJson } = require('./file-store.cjs');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function posixify(value) {
  return String(value || '').replace(/\\/g, '/');
}

function createAppStore(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const dataDir = path.resolve(root, options.dataDir || 'data');
  const configFile = path.join(dataDir, options.configFile || 'config.json');
  const profilesFile = path.join(dataDir, options.profilesFile || 'profiles.json');
  const rotationFile = path.join(dataDir, options.rotationFile || 'rotation.json');
  const activityFile = path.join(dataDir, options.activityFile || 'activity.jsonl');
  const logsDir = path.resolve(root, options.logsDir || 'logs');
  const operationsLogFile = path.join(logsDir, options.operationsLogFile || 'operations.jsonl');
  const profileStoreDir = path.join(dataDir, options.profileStoreDir || 'profile-store');
  const defaultConfig = clone(options.defaultConfig || {});
  const defaultProfiles = clone(options.defaultProfiles || { profiles: [] });
  const defaultRotation = clone(options.defaultRotation || { enabled: false, everyMinutes: 0, activeProfileId: '', entries: [], nextRunAt: '' });
  const coreFiles = Array.isArray(options.coreFiles) ? options.coreFiles : ['ServerSettings.ini', 'GameUserSettings.ini', 'EconomyOverride.json'];

  function loadConfig() {
    const data = loadJson(configFile, defaultConfig);
    return { ...defaultConfig, ...data };
  }

  function saveConfig(config) {
    saveJson(configFile, { ...defaultConfig, ...config });
  }

  function loadProfilesData() {
    return loadJson(profilesFile, defaultProfiles);
  }

  function saveProfilesData(data) {
    saveJson(profilesFile, data);
  }

  function loadRotation() {
    return { ...defaultRotation, ...loadJson(rotationFile, defaultRotation) };
  }

  function saveRotation(data) {
    saveJson(rotationFile, { ...defaultRotation, ...data });
  }

  function resolvedPaths(config = loadConfig()) {
    const scumConfigDir = config.scumConfigDir ? path.resolve(root, config.scumConfigDir) : '';
    const nodesDir = config.nodesDir
      ? path.resolve(root, config.nodesDir)
      : (scumConfigDir ? path.join(scumConfigDir, 'Loot', 'Nodes', 'Current') : '');
    const spawnersDir = config.spawnersDir
      ? path.resolve(root, config.spawnersDir)
      : (scumConfigDir ? path.join(scumConfigDir, 'Loot', 'Spawners', 'Presets', 'Override') : '');
    const backupDir = path.resolve(root, config.backupDir || defaultConfig.backupDir || '.control-plane-backups');
    return { scumConfigDir, nodesDir, spawnersDir, backupDir };
  }

  function inspectConfigFolder(rootPath, nodesPath = '', spawnersPath = '') {
    const config = loadConfig();
    const configRoot = rootPath ? path.resolve(root, rootPath) : (config.scumConfigDir ? path.resolve(root, config.scumConfigDir) : '');
    const resolvedNodes = nodesPath ? path.resolve(root, nodesPath) : path.join(configRoot, 'Loot', 'Nodes', 'Current');
    const resolvedSpawners = spawnersPath ? path.resolve(root, spawnersPath) : path.join(configRoot, 'Loot', 'Spawners', 'Presets', 'Override');
    const rootExists = !!configRoot && fs.existsSync(configRoot);
    const fileHealth = Object.fromEntries(coreFiles.map((fileName) => [
      fileName,
      rootExists && fs.existsSync(path.join(configRoot, fileName)),
    ]));
    fileHealth.Nodes = fs.existsSync(resolvedNodes);
    fileHealth.Spawners = fs.existsSync(resolvedSpawners);
    const missing = Object.entries(fileHealth).filter(([, ok]) => !ok).map(([key]) => key);
    return {
      path: configRoot,
      exists: rootExists,
      ready: rootExists && missing.length === 0,
      missing,
      rootPath: configRoot,
      rootExists,
      nodesPath: resolvedNodes,
      nodesExists: fileHealth.Nodes,
      spawnersPath: resolvedSpawners,
      spawnersExists: fileHealth.Spawners,
      usingCustomNodesDir: Boolean(nodesPath),
      usingCustomSpawnersDir: Boolean(spawnersPath),
      fileHealth,
    };
  }

  function appendActivity(type, detail = {}) {
    ensureDir(dataDir);
    const entry = { at: new Date().toISOString(), type, ...detail };
    fs.appendFileSync(activityFile, `${JSON.stringify(entry)}\n`, 'utf8');
    appendOperationLog(type, detail, entry.at);
    return entry;
  }

  function appendOperationLog(event, detail = {}, at = new Date().toISOString()) {
    ensureDir(logsDir);
    const entry = {
      at,
      event,
      ok: detail.ok !== false,
      path: detail.path || detail.from || detail.to || '',
      backup: detail.backup || '',
      detail,
    };
    fs.appendFileSync(operationsLogFile, `${JSON.stringify(entry)}\n`, 'utf8');
    return entry;
  }

  function readJsonl(filePath, limit = 100) {
    if (!fs.existsSync(filePath)) return [];
    return readText(filePath)
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .slice(-limit);
  }

  function readActivity(limit = 100, filters = {}) {
    let rows = readJsonl(activityFile, Number.MAX_SAFE_INTEGER);
    const type = String(filters.type || '').trim().toLowerCase();
    const term = String(filters.term || '').trim().toLowerCase();
    const pathFilter = String(filters.path || '').trim().toLowerCase();
    if (type && type !== '__all') rows = rows.filter((entry) => String(entry.type || '').toLowerCase() === type);
    if (pathFilter) rows = rows.filter((entry) => String(entry.path || entry.backup || entry.from || entry.to || '').toLowerCase().includes(pathFilter));
    if (term) rows = rows.filter((entry) => JSON.stringify(entry).toLowerCase().includes(term));
    return rows.slice(-limit).reverse();
  }

  function readOperationLogs(limit = 100) {
    return readJsonl(operationsLogFile, limit).reverse();
  }

  function ensureStoreDirs(config = loadConfig()) {
    ensureDir(dataDir);
    ensureDir(logsDir);
    ensureDir(profileStoreDir);
    ensureDir(resolvedPaths(config).backupDir);
  }

  return {
    dataDir,
    profileStoreDir,
    configFile,
    profilesFile,
    rotationFile,
    activityFile,
    logsDir,
    operationsLogFile,
    loadConfig,
    saveConfig,
    loadProfilesData,
    saveProfilesData,
    loadRotation,
    saveRotation,
    resolvedPaths,
    inspectConfigFolder,
    appendActivity,
    appendOperationLog,
    readActivity,
    readOperationLogs,
    ensureStoreDirs,
    posixify,
  };
}

module.exports = {
  createAppStore,
};
