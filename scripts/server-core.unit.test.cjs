const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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
