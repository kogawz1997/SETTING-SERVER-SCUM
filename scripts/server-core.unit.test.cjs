const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('workspace utilities normalize file keys and walk nested JSON files', () => {
  const { clone, normalizeKey, posixify, sortByName, walkFiles } = require('../src/server/services/workspace-utils.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-workspace-utils-'));
  const nested = path.join(root, 'Nodes Folder', 'Military Zone');
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(root, 'ServerSettings.ini'), '[General]\n', 'utf8');
  fs.writeFileSync(path.join(nested, 'Bunker Loot.json'), '{}\n', 'utf8');

  const files = walkFiles(fs, path, root, (_fullPath, name) => name.endsWith('.json'), root)
    .map((entry) => entry.relPath)
    .sort();
  const original = { nested: { ok: true } };
  const copy = clone(original);

  assert.equal(normalizeKey('Weapon_AK-47.png'), 'weaponak47');
  assert.equal(posixify('Nodes\\Military\\Bunker Loot.json'), 'Nodes/Military/Bunker Loot.json');
  assert.deepEqual(copy, original);
  assert.notEqual(copy.nested, original.nested);
  assert.deepEqual(sortByName([{ name: 'zeta' }, { name: 'alpha' }]).map((entry) => entry.name), ['alpha', 'zeta']);
  assert.deepEqual(files, ['Nodes Folder/Military Zone/Bunker Loot.json']);
});

test('item catalog service builds icon-backed catalog entries and saves overrides', () => {
  const { createItemCatalogService } = require('../src/server/services/item-catalog-service.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-item-catalog-'));
  const iconDir = path.join(root, 'icons');
  fs.mkdirSync(iconDir, { recursive: true });
  fs.writeFileSync(path.join(iconDir, 'AK47.png'), 'fake-image', 'utf8');
  const saved = {};
  const activity = [];
  const { normalizeKey } = require('../src/server/services/workspace-utils.cjs');
  const service = createItemCatalogService({
    fs,
    path,
    ITEM_ICON_DIR: iconDir,
    ITEM_CATALOG_OVERRIDES_FILE: path.join(root, 'overrides.json'),
    ITEM_CATEGORY_RULES: [{ id: 'weapon', pattern: /ak47/i }],
    DEFAULT_ITEM_CATALOG_PACK: [{ name: 'Bandage', category: 'medical', displayName: 'Bandage' }],
    applyCuratedCatalogMetadata: (_name, metadata) => metadata,
    normalizeKey,
    walkProjectFiles: (dir, filter, baseDir, results = []) => {
      const { walkFiles } = require('../src/server/services/workspace-utils.cjs');
      return walkFiles(fs, path, dir, filter, baseDir, results);
    },
    loadJson: () => saved.overrides || {},
    saveJson: (_file, value) => { saved.overrides = value; },
    appendActivity: (event, detail) => activity.push({ event, detail }),
    scanLootWorkspace: () => ({
      nodes: [{ relPath: 'Nodes/Bunker.json', object: { Items: [{ Name: 'AK47' }, 'Bandage'] } }],
      spawners: [],
    }),
    detectLootKind: (object) => (Array.isArray(object.Items) ? 'node' : 'unknown'),
    itemEntryName: (entry) => (typeof entry === 'string' ? entry : entry.Name),
    collectTreeLeaves: () => [],
  });

  const catalog = service.buildItemCatalog();
  const ak = catalog.items.find((item) => item.name === 'AK47');
  assert.equal(ak.category, 'weapon');
  assert.equal(ak.hasIcon, true);
  assert.equal(catalog.items.some((item) => item.name === 'Bandage'), true);

  service.upsertItemCatalogOverride('AK47', { favorite: true, displayName: 'AK tuned' });
  assert.equal(saved.overrides.AK47.favorite, true);
  assert.equal(activity[0].event, 'item_catalog_override');
});

test('AppError serializes safe Thai-friendly API errors', () => {
  const { AppError, toHttpError } = require('../src/server/errors.cjs');
  const error = new AppError('เลือกไฟล์ไม่ถูกต้อง', {
    status: 400,
    code: 'invalid_logical_path',
    details: { path: '../ServerSettings.ini' },
  });

  assert.deepEqual(toHttpError(error), {
    status: 400,
    body: {
      ok: false,
      error: 'เลือกไฟล์ไม่ถูกต้อง',
      code: 'invalid_logical_path',
      details: { path: '../ServerSettings.ini' },
    },
  });
});

test('command sandbox blocks shell chaining and dangerous commands', () => {
  const { inspectCommand } = require('../src/server/command-sandbox.cjs');

  assert.equal(inspectCommand('cmd /c "scripts\\reload-scum-loot.cmd" && del C:\\server\\*.ini').runnable, false);
  assert.equal(inspectCommand('powershell -Command "Remove-Item C:\\server -Recurse"').reason, 'blocked_token');
});

test('command sandbox allows project scripts by explicit file path', () => {
  const { inspectCommand } = require('../src/server/command-sandbox.cjs');
  const cwd = path.resolve(__dirname, '..');
  const result = inspectCommand('cmd /c "scripts\\reload-scum-loot.cmd"', { cwd });

  assert.equal(result.configured, true);
  assert.equal(result.runnable, true);
  assert.equal(result.sandboxed, true);
  assert.match(result.resolvedPath, /reload-scum-loot\.cmd$/i);
});

test('command sandbox builds a no-shell execution plan and enforces allowed roots', () => {
  const { inspectCommand, runShellCommand } = require('../src/server/command-sandbox.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-command-'));
  const scriptPath = path.join(tmp, 'echo.cmd');
  fs.writeFileSync(scriptPath, '@echo off\r\necho command-ok %1\r\n', 'utf8');

  const inspection = inspectCommand(`"${scriptPath}" smoke`, { cwd: tmp, allowedRoots: [tmp] });
  assert.equal(inspection.runnable, true);
  assert.equal(inspection.execution.shell, false);
  assert.match(inspection.execution.runner, /cmd\.exe$/i);
  assert.deepEqual(inspection.execution.args.slice(0, 3), ['/d', '/s', '/c']);

  const outside = path.join(os.tmpdir(), `outside-${Date.now()}.cmd`);
  fs.writeFileSync(outside, '@echo off\r\necho no\r\n', 'utf8');
  const blocked = inspectCommand(`"${outside}"`, { cwd: tmp, allowedRoots: [tmp] });
  assert.equal(blocked.runnable, false);
  assert.equal(blocked.reason, 'outside_allowlist');

  const result = runShellCommand(`"${scriptPath}" smoke`, { cwd: tmp, allowedRoots: [tmp] });
  assert.equal(result.ok, true);
  assert.match(result.output, /command-ok smoke/);
  assert.equal(result.inspection.execution.shell, false);
});

test('command runner only runs configured commands from allowed roots and writes operation logs', () => {
  const { createCommandRunner } = require('../src/server/services/command-runner.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-command-runner-'));
  const commandDir = path.join(root, 'server scripts');
  fs.mkdirSync(commandDir, { recursive: true });
  const reloadScript = path.join(commandDir, 'reload loot.cmd');
  fs.writeFileSync(reloadScript, '@echo off\r\necho reload-ok %1\r\n', 'utf8');
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-outside-command-'));
  const outsideScript = path.join(outsideDir, 'restart.cmd');
  fs.writeFileSync(outsideScript, '@echo off\r\necho outside\r\n', 'utf8');
  const operationLogs = [];
  const activity = [];
  const runner = createCommandRunner({
    root,
    loadConfig: () => ({
      reloadLootCommand: `"${reloadScript}" smoke`,
      restartServerCommand: '',
    }),
    appendOperationLog: (event, detail) => operationLogs.push({ event, detail }),
    appendActivity: (event, detail) => activity.push({ event, detail }),
  });

  const configured = runner.inspectCommand(`"${reloadScript}" smoke`);
  assert.equal(configured.runnable, true);
  assert.equal(configured.execution.shell, false);

  const blocked = runner.inspectCommand(`"${outsideScript}"`);
  assert.equal(blocked.runnable, false);
  assert.equal(blocked.reason, 'outside_allowlist');

  const result = runner.runConfiguredCommand('reload');
  assert.equal(result.ok, true);
  assert.match(result.output, /reload-ok smoke/);
  assert.equal(result.inspection.execution.shell, false);
  assert.equal(operationLogs[0].event, 'command_run');
  assert.equal(operationLogs[0].detail.kind, 'reload');
  assert.equal(operationLogs[0].detail.ok, true);
  assert.equal(activity[0].event, 'command_run');
});

test('server settings logical validation catches reversed ranges and impossible values', () => {
  const { validateServerSettingsLogic } = require('../src/server/validation.cjs');
  const result = validateServerSettingsLogic({
    General: {
      'scum.MaxPlayers': '-1',
      'scum.MinServerTickRate': '120',
      'scum.MaxServerTickRate': '30',
      'scum.LogoutTimer': '-10',
      'scum.SunriseTime': '22',
      'scum.SunsetTime': '6',
      'scum.MaxPing': '0',
    },
    Vehicles: {
      'scum.MaxAllowedVehicles': '10',
      'scum.MaxFunctionalVehicles': '15',
    },
  });

  assert.equal(result.counts.critical >= 2, true);
  assert.equal(result.entries.some((entry) => entry.code === 'server.max_players_invalid'), true);
  assert.equal(result.entries.some((entry) => entry.code === 'server.tick_rate_reversed'), true);
  assert.equal(result.entries.some((entry) => entry.code === 'server.vehicle_functional_exceeds_total'), true);
});

test('loot logical validation catches duplicate refs, missing names, and bad ranges', () => {
  const { validateLootLogic } = require('../src/server/validation.cjs');
  const result = validateLootLogic({
    Nodes: [
      { Rarity: 'Bad', Ids: ['ItemLootTreeNodes.Bunker.AK', 'ItemLootTreeNodes.Bunker.AK'] },
    ],
    QuantityMin: 5,
    QuantityMax: 2,
    Probability: -1,
  }, 'Spawners/Test.json', { knownRefs: new Set(['ItemLootTreeNodes.Bunker.MP5']) });

  assert.equal(result.entries.some((entry) => entry.code === 'spawner.quantity_range_reversed'), true);
  assert.equal(result.entries.some((entry) => entry.code === 'spawner.duplicate_ref'), true);
  assert.equal(result.entries.some((entry) => entry.code === 'spawner.missing_ref'), true);
  assert.equal(result.entries.some((entry) => entry.code === 'spawner.invalid_group_rarity'), true);
});

test('safe apply dry-run produces validation, diff, and does not write files', () => {
  const { buildSafeApplyPlan } = require('../src/server/safe-apply.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-safe-apply-'));
  const filePath = path.join(tmp, 'ServerSettings.ini');
  fs.writeFileSync(filePath, '[General]\nscum.MaxPlayers=32\n', 'utf8');

  const plan = buildSafeApplyPlan({
    logicalPath: 'ServerSettings.ini',
    content: '[General]\nscum.MaxPlayers=64\n',
    resolveLogicalPath: () => filePath,
    validateContent: () => ({ entries: [], counts: { critical: 0, warning: 0, info: 0 }, highestSeverity: 'info', fixableCount: 0 }),
    createDiff: (name, before, after) => `${name}\n-${before}+${after}`,
    readText: (target) => fs.readFileSync(target, 'utf8'),
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.willWrite, true);
  assert.match(plan.patch, /scum\.MaxPlayers=64/);
  assert.equal(fs.readFileSync(filePath, 'utf8'), '[General]\nscum.MaxPlayers=32\n');
});

test('safe apply rolls back the original file when a write fails midway', () => {
  const { applySafePlan } = require('../src/server/safe-apply.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-safe-rollback-'));
  const backupRoot = path.join(tmp, 'backups', 'rollback-test');
  const filePath = path.join(tmp, 'ServerSettings.ini');
  fs.writeFileSync(filePath, '[General]\nscum.MaxPlayers=32\n', 'utf8');

  assert.throws(() => applySafePlan({
    logicalPath: 'ServerSettings.ini',
    content: '[General]\nscum.MaxPlayers=64\n',
    paths: { backupDir: path.join(tmp, 'backups') },
    resolveLogicalPath: () => filePath,
    validateContent: () => ({ entries: [], counts: { critical: 0, warning: 0, info: 0 }, highestSeverity: 'info', fixableCount: 0 }),
    createDiff: () => '@@\n-old\n+new\n',
    readText: (target) => fs.readFileSync(target, 'utf8'),
    writeText: (target, content) => {
      fs.writeFileSync(target, 'partial-write', 'utf8');
      throw new Error('disk locked');
    },
    createBackup: () => {
      fs.mkdirSync(backupRoot, { recursive: true });
      fs.copyFileSync(filePath, path.join(backupRoot, 'ServerSettings.ini'));
      return { backupDir: backupRoot, backupName: 'rollback-test', files: ['ServerSettings.ini'] };
    },
  }), /disk locked/);

  assert.equal(fs.readFileSync(filePath, 'utf8'), '[General]\nscum.MaxPlayers=32\n');
});

test('file store writes atomically and reports stable fingerprints', () => {
  const { atomicWriteText, fingerprintFile } = require('../src/server/store/file-store.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-file-store-'));
  const filePath = path.join(tmp, 'nested', 'file.txt');

  atomicWriteText(filePath, 'first');
  const first = fingerprintFile(filePath);
  atomicWriteText(filePath, 'second');
  const second = fingerprintFile(filePath);

  assert.equal(first.exists, true);
  assert.equal(first.size, 5);
  assert.equal(second.exists, true);
  assert.equal(second.size, 6);
  assert.notEqual(first.sha256, second.sha256);
  assert.equal(fs.readFileSync(filePath, 'utf8'), 'second');
  assert.equal(fs.readdirSync(path.dirname(filePath)).some((name) => name.includes('.tmp-')), false);
});

test('file transaction rolls back all touched files when one write fails', () => {
  const { applyFileTransaction } = require('../src/server/store/file-transaction.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-file-transaction-'));
  const firstPath = path.join(tmp, 'One.ini');
  const secondPath = path.join(tmp, 'สอง ทดสอบ.ini');
  fs.writeFileSync(firstPath, 'one-before', 'utf8');
  fs.writeFileSync(secondPath, 'two-before', 'utf8');

  assert.throws(() => applyFileTransaction({
    operations: [
      { logicalPath: 'One.ini', targetPath: firstPath, content: 'one-after' },
      { logicalPath: 'สอง ทดสอบ.ini', targetPath: secondPath, content: 'two-after' },
    ],
    writeText: (targetPath, content) => {
      if (targetPath === secondPath) {
        fs.writeFileSync(targetPath, 'partial-two', 'utf8');
        throw new Error('write failed');
      }
      fs.writeFileSync(targetPath, content, 'utf8');
    },
  }), /write failed/);

  assert.equal(fs.readFileSync(firstPath, 'utf8'), 'one-before');
  assert.equal(fs.readFileSync(secondPath, 'utf8'), 'two-before');
});

test('backup service round-trips files with spaces and unicode using atomic restore', () => {
  const { createBackupService } = require('../src/server/services/backup-service.cjs');
  const { ensureDir, readText, writeText, loadJson, saveJson } = require('../src/server/store/file-store.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-backup-service-'));
  const workspace = path.join(tmp, 'Windows Server');
  const backupDir = path.join(tmp, 'Backups');
  const logicalPath = 'Nodes/ไทย file.json';
  const sourcePath = path.join(workspace, 'Nodes', 'ไทย file.json');
  ensureDir(path.dirname(sourcePath));
  fs.writeFileSync(sourcePath, '{"before":true}\n', 'utf8');
  const activities = [];
  const service = createBackupService({
    fs,
    path,
    CORE_FILES: [],
    resolvedPaths: () => ({ scumConfigDir: workspace, backupDir }),
    resolveLogicalPath: (targetPath) => path.join(workspace, targetPath.replace(/\//g, path.sep)),
    listLootFiles: () => ({ nodes: [{ relPath: logicalPath }], spawners: [] }),
    createDiff: (name, before, after) => `${name}\n-${before}+${after}`,
    ensureDir,
    readText,
    writeText,
    loadJson,
    saveJson,
    appendActivity: (type, detail) => activities.push({ type, detail }),
  });

  const backup = service.createBackup(undefined, [logicalPath], { note: 'space-path', tag: 'keep' });
  writeText(sourcePath, '{"after":true}\n');
  service.restoreBackupFile(backup.backupName, logicalPath);

  assert.equal(readText(sourcePath), '{"before":true}\n');
  assert.equal(service.listBackups()[0].tag, 'keep');
  assert.equal(service.listBackupFiles(backup.backupName)[0].relPath, logicalPath);
  assert.equal(activities.some((entry) => entry.type === 'backup'), true);
  assert.equal(activities.some((entry) => entry.type === 'restore'), true);
});

test('profile service applies snapshots through file transactions and rolls back on write failure', () => {
  const { createProfileService } = require('../src/server/services/profile-service.cjs');
  const { ensureDir, readText, writeText, loadJson, saveJson } = require('../src/server/store/file-store.cjs');
  const { applyFileTransaction } = require('../src/server/store/file-transaction.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-profile-service-'));
  const profileStoreDir = path.join(tmp, 'profile-store');
  const firstPath = path.join(tmp, 'ServerSettings.ini');
  const secondPath = path.join(tmp, 'Nodes', 'Broken.json');
  ensureDir(path.dirname(secondPath));
  fs.writeFileSync(firstPath, 'server-before', 'utf8');
  fs.writeFileSync(secondPath, 'node-before', 'utf8');
  saveJson(path.join(profileStoreDir, 'profile_test.json'), {
    id: 'profile_test',
    name: 'Rollback Test',
    createdAt: '2026-04-21T00:00:00.000Z',
    files: [
      { path: 'ServerSettings.ini', content: 'server-after' },
      { path: 'Nodes/Broken.json', content: 'node-after' },
    ],
  });
  const service = createProfileService({
    path,
    profileStoreDir,
    loadProfilesData: () => ({ profiles: [] }),
    saveProfilesData: () => {},
    loadRotation: () => ({ enabled: false, entries: [] }),
    saveRotation: () => {},
    resolvedPaths: () => ({ backupDir: path.join(tmp, 'Backups') }),
    allWorkspaceLogicalPaths: () => ['ServerSettings.ini', 'Nodes/Broken.json'],
    readLogicalFile: (logicalPath) => ({ content: readText(logicalPath === 'ServerSettings.ini' ? firstPath : secondPath) }),
    resolveLogicalPath: (logicalPath) => (logicalPath === 'ServerSettings.ini' ? firstPath : secondPath),
    createBackup: () => ({ backupName: 'profile-backup', files: [] }),
    runConfiguredCommand: () => null,
    applyFileTransaction,
    loadJson,
    saveJson,
    appendActivity: () => {},
    writeText: (targetPath, content) => {
      if (targetPath === secondPath) {
        fs.writeFileSync(targetPath, 'partial-node', 'utf8');
        throw new Error('disk locked');
      }
      writeText(targetPath, content);
    },
  });

  assert.throws(() => service.applyProfileSnapshot('profile_test'), /disk locked/);
  assert.equal(readText(firstPath), 'server-before');
  assert.equal(readText(secondPath), 'node-before');
});

test('startup doctor reports first-run path, backup, permission, and command checks', () => {
  const { buildStartupDoctorReport } = require('../src/server/services/startup-doctor.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-doctor-'));
  const configRoot = path.join(tmp, 'WindowsServer');
  const nodesDir = path.join(configRoot, 'Loot', 'Nodes', 'Current');
  const spawnersDir = path.join(configRoot, 'Loot', 'Spawners', 'Presets', 'Override');
  const backupDir = path.join(tmp, 'Backups');
  fs.mkdirSync(nodesDir, { recursive: true });
  fs.mkdirSync(spawnersDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(configRoot, 'ServerSettings.ini'), '[General]\n', 'utf8');
  fs.writeFileSync(path.join(configRoot, 'GameUserSettings.ini'), '[ServerSettings]\n', 'utf8');
  fs.writeFileSync(path.join(configRoot, 'EconomyOverride.json'), '{}\n', 'utf8');

  const report = buildStartupDoctorReport({
    config: {
      scumConfigDir: configRoot,
      nodesDir,
      spawnersDir,
      backupDir,
      reloadLootCommand: '',
      restartServerCommand: '',
    },
    root: tmp,
    inspectCommand: () => ({ configured: false, runnable: false, reason: 'missing' }),
  });

  assert.equal(report.ready, true);
  assert.equal(report.checks.every((check) => check.status !== 'bad'), true);
  assert.equal(report.checks.some((check) => check.id === 'paths.nodes' && check.status === 'ok'), true);
  assert.equal(report.checks.some((check) => check.id === 'permissions.backup' && check.status === 'ok'), true);
  assert.equal(report.nextStep.action, 'open-dashboard');
});

test('app store writes activity and structured operation logs together', () => {
  const { createAppStore } = require('../src/server/store/app-store.cjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-app-store-logs-'));
  const store = createAppStore({
    root: tmp,
    dataDir: path.join(tmp, 'data'),
    defaultConfig: { backupDir: 'Backups' },
  });

  store.appendActivity('loot_save', { path: 'Nodes/ไทย Test.json', ok: true });
  const activity = store.readActivity(10);
  const logs = store.readOperationLogs(10);

  assert.equal(activity.length, 1);
  assert.equal(activity[0].type, 'loot_save');
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event, 'loot_save');
  assert.equal(logs[0].path, 'Nodes/ไทย Test.json');
  assert.equal(fs.existsSync(path.join(tmp, 'logs', 'operations.jsonl')), true);
});

test('workspace package export/import round-trips config and selected files', () => {
  const { createWorkspacePackage, parseWorkspacePackage } = require('../src/server/package-manager.cjs');
  const pkg = createWorkspacePackage({
    config: { scumConfigDir: 'ConfigRoot' },
    files: [
      { path: 'ServerSettings.ini', content: '[General]\nscum.MaxPlayers=32\n' },
      { path: 'Nodes/Test.json', content: '{"Name":"Test","Items":[]}' },
    ],
    meta: { note: 'snapshot' },
  });
  const parsed = parseWorkspacePackage(JSON.stringify(pkg));

  assert.equal(parsed.version, 1);
  assert.equal(parsed.files.length, 2);
  assert.equal(parsed.files[1].path, 'Nodes/Test.json');
  assert.equal(parsed.config.scumConfigDir, 'ConfigRoot');
});

test('portable package config sanitizes machine paths and remaps on import', () => {
  const { createWorkspacePackage, parseWorkspacePackage, remapPortableConfig } = require('../src/server/package-manager.cjs');
  const pkg = createWorkspacePackage({
    config: {
      scumConfigDir: 'C:\\Servers\\SCUM\\Saved\\Config\\WindowsServer',
      nodesDir: 'C:\\Servers\\SCUM\\Saved\\Config\\WindowsServer\\Loot\\Nodes\\Current',
      spawnersDir: 'C:\\Servers\\SCUM\\Saved\\Config\\WindowsServer\\Loot\\Spawners\\Presets\\Override',
      backupDir: 'D:\\SCUMBackups',
      reloadLootCommand: 'cmd /c "C:\\server\\reload.cmd"',
      restartServerCommand: 'powershell -File C:\\server\\restart.ps1',
      autoBackupCoreOnStart: true,
    },
    files: [{ path: 'ServerSettings.ini', content: '[General]\nscum.MaxPlayers=32\n' }],
    portable: true,
  });
  const parsed = parseWorkspacePackage(JSON.stringify(pkg));

  assert.equal(parsed.config.scumConfigDir, '');
  assert.equal(parsed.config.nodesDir, '');
  assert.equal(parsed.config.spawnersDir, '');
  assert.equal(parsed.config.reloadLootCommand, '');
  assert.equal(parsed.config.restartServerCommand, '');
  assert.equal(parsed.config.autoBackupCoreOnStart, true);
  assert.equal(parsed.meta.pathSanitized, true);

  const remapped = remapPortableConfig(parsed.config, {
    scumConfigDir: 'E:\\NewServer\\WindowsServer',
    backupDir: 'E:\\SCUMBackups',
    nodesDir: 'E:\\NewServer\\WindowsServer\\Loot\\Nodes\\Current',
    spawnersDir: 'E:\\NewServer\\WindowsServer\\Loot\\Spawners\\Presets\\Override',
  });

  assert.equal(remapped.scumConfigDir, 'E:\\NewServer\\WindowsServer');
  assert.equal(remapped.backupDir, 'E:\\SCUMBackups');
  assert.equal(remapped.reloadLootCommand, '');
});

test('local polish utilities summarize risky saves and build sanitized support zip', () => {
  const {
    summarizeSafeApplyPlan,
    buildSupportBundle,
    sanitizeSupportConfig,
    DEFAULT_ITEM_CATALOG_PACK,
    DEFAULT_KIT_TEMPLATE_LIBRARY,
  } = require('../src/server/local-polish.cjs');

  const summary = summarizeSafeApplyPlan({
    logicalPath: 'Nodes/Bunker.json',
    changed: true,
    willWrite: true,
    validation: { counts: { critical: 1, warning: 2, info: 0 } },
    blockers: [{ severity: 'critical', message: 'Missing item name' }],
    patch: '@@\n-old\n+new\n',
  });

  assert.equal(summary.risk, 'critical');
  assert.equal(summary.changedLines, 2);
  assert.equal(summary.requiresConfirmation, true);
  assert.equal(summary.humanAction.includes('แก้ critical'), true);

  const sanitized = sanitizeSupportConfig({
    scumConfigDir: 'C:\\Users\\IT\\Server',
    nodesDir: 'C:\\Users\\IT\\Server\\Loot\\Nodes',
    backupDir: 'D:\\Backups',
    reloadLootCommand: 'cmd /c C:\\secret\\reload.cmd',
    autoBackupCoreOnStart: true,
  });
  assert.equal(sanitized.scumConfigDir, '');
  assert.equal(sanitized.reloadLootCommand, '');
  assert.equal(sanitized.autoBackupCoreOnStart, true);

  const bundle = buildSupportBundle({
    config: sanitized,
    diagnostics: { ok: true, localPath: 'C:\\ShouldNotLeak' },
    readiness: { score: 88 },
    activity: [{ type: 'backup', path: 'Nodes/Test.json' }],
    logs: [{ name: 'startup.log', content: 'SCUM control plane listening' }],
    now: () => '2026-04-21T00:00:00.000Z',
  });

  assert.equal(bundle.fileName, 'scum-support-bundle-2026-04-21T00-00-00-000Z.zip');
  assert.equal(bundle.buffer.subarray(0, 2).toString('utf8'), 'PK');
  assert.equal(bundle.files.includes('support/diagnostics.json'), true);
  assert.equal(bundle.files.includes('logs/startup.log'), true);
  assert.equal(DEFAULT_ITEM_CATALOG_PACK.some((item) => item.tags.includes('weapon')), true);
  assert.equal(DEFAULT_KIT_TEMPLATE_LIBRARY.some((kit) => kit.locked && /solo/i.test(kit.id)), true);
});

test('P2.13 built-in loot presets cover common server playstyles', () => {
  const { DEFAULT_KIT_TEMPLATE_LIBRARY, LOOT_TUNING_PRESETS } = require('../src/server/local-polish.cjs');
  const kitIds = new Set(DEFAULT_KIT_TEMPLATE_LIBRARY.map((kit) => kit.id));
  const tuningIds = new Set(LOOT_TUNING_PRESETS.map((preset) => preset.id));

  [
    'preset_solo_starter',
    'preset_pvp_fight',
    'preset_hardcore_poor',
    'preset_bunker_rich',
    'preset_survival_poor',
    'preset_medical_relief',
    'preset_police_station',
    'preset_starter_friendly',
    'preset_vehicle_support',
    'preset_rare_weapons_low',
  ].forEach((id) => assert.equal(kitIds.has(id), true, `missing kit ${id}`));

  [
    'solo_balanced',
    'pvp_hot',
    'hardcore_sparse',
    'bunker_rich',
    'survival_poor',
    'medical_relief',
    'police_station',
    'starter_friendly',
    'vehicle_support',
    'rare_weapons_low',
  ].forEach((id) => assert.equal(tuningIds.has(id), true, `missing tuning preset ${id}`));
});

test('P2.13 launcher has buildable Windows EXE source', () => {
  const root = path.resolve(__dirname, '..');
  const csproj = path.join(root, 'launcher', 'SettingServerScumLauncher', 'SettingServerScumLauncher.csproj');
  const program = path.join(root, 'launcher', 'SettingServerScumLauncher', 'Program.cs');

  assert.equal(fs.existsSync(csproj), true);
  assert.equal(fs.existsSync(program), true);
  assert.match(fs.readFileSync(program, 'utf8'), /Start SETTING SERVER SCUM\.ps1/);
  assert.match(fs.readFileSync(program, 'utf8'), /ProcessStartInfo/);
});
