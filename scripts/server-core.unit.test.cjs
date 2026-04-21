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

test('loot simulator service produces deterministic flat-node results and compares rates', () => {
  const { createLootSimulatorService } = require('../src/server/services/loot-simulator-service.cjs');
  const service = createLootSimulatorService({
    scanLootWorkspace: () => ({ refIndex: new Map(), nodes: [] }),
    readJsonObject: () => ({}),
    resolveLogicalPath: (relPath) => relPath,
    detectLootKind: (object) => (Array.isArray(object.Items) ? 'node' : 'unknown'),
    itemEntryName: (entry) => (typeof entry === 'string' ? entry : entry.Name),
    categoryForItem: (name) => (/bandage/i.test(name) ? 'medical' : 'weapon'),
    collectSpawnerRefs: () => [],
    collectTreeRefs: () => [],
    resolveRefNode: () => null,
    rarityWeight: () => 1,
  });
  const object = {
    Items: [
      { Name: 'AK47', Probability: 1 },
      { Name: 'Bandage', Probability: 0 },
    ],
  };

  const first = service.simulateLootObject(object, 'Nodes/Test.json', 10, undefined, { seed: 'fixed' });
  const second = service.simulateLootObject(object, 'Nodes/Test.json', 10, undefined, { seed: 'fixed' });
  const compare = service.compareSimulationResults(
    { count: 10, distinctItems: [{ name: 'AK47', hits: 10 }] },
    { count: 10, distinctItems: [{ name: 'AK47', hits: 5 }, { name: 'Bandage', hits: 5 }] },
  );

  assert.deepEqual(second, first);
  assert.equal(first.averageItemsPerRun, 1);
  assert.equal(first.distinctItems[0].name, 'AK47');
  assert.equal(first.distinctItems[0].hits, 10);
  assert.equal(first.expectedRates[0].expectedRate, 1);
  assert.equal(first.categorySummary[0].category, 'weapon');
  assert.equal(compare[0].name, 'AK47');
  assert.equal(compare[0].deltaRate, -0.5);
});

test('loot graph service builds graph refs and previews spawner ref edits', () => {
  const { createLootGraphService } = require('../src/server/services/loot-graph-service.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-graph-service-'));
  const spawnerPath = path.join(root, 'Military.json');
  fs.writeFileSync(spawnerPath, JSON.stringify({ Nodes: [{ Ids: ['ItemLootTreeNodes.Bunker.Old'] }] }, null, 2), 'utf8');
  const writes = [];
  const service = createLootGraphService({
    clone: (value) => JSON.parse(JSON.stringify(value)),
    posixify: (value) => String(value || '').replace(/\\/g, '/'),
    scanLootWorkspace: () => ({ nodes: [], spawners: [], refIndex: new Map() }),
    detectLootKind: (object) => (Array.isArray(object.Children) ? 'node_tree' : 'unknown'),
    collectTreeRefs: () => [{ ref: 'ItemLootTreeNodes.Bunker.AK47', kind: 'leaf', rarity: '' }],
    normalizeSpawnerRef: (value) => String(value || '').startsWith('ItemLootTreeNodes')
      ? String(value || '')
      : `ItemLootTreeNodes.${String(value || '').replace(/^ItemLootTreeNodes\.?/, '')}`,
    collectSpawnerRefEntries: (object) => (object.Nodes || []).flatMap((group, groupIndex) => (group.Ids || []).map((ref, refIndex) => ({ ref, groupIndex, refIndex }))),
    loadConfig: () => ({}),
    resolvedPaths: () => ({}),
    resolveLogicalPath: () => spawnerPath,
    readText: (target) => fs.readFileSync(target, 'utf8'),
    writeText: (target, content) => writes.push({ target, content }),
    safeParseJson: (text) => JSON.parse(text),
    createDiff: (_logicalPath, before, after) => `${before}\n---\n${after}`,
    validateContent: () => ({ entries: [], counts: { critical: 0, warning: 0, info: 0 } }),
    createBackup: () => ({ backupName: 'test' }),
    appendActivity: () => {},
  });
  const graph = service.buildGraph({
    nodes: [{ relPath: 'Nodes/Bunker.json', logicalName: 'Bunker', object: { Children: [] } }],
    spawners: [{ relPath: 'Spawners/Military.json', logicalName: 'Military', object: { Nodes: [{ Ids: ['ItemLootTreeNodes.Bunker.AK47'] }] } }],
    refIndex: new Map([['ItemLootTreeNodes.Bunker.AK47', { kind: 'leaf', path: 'Nodes/Bunker.json', rarity: '' }]]),
  });
  const result = service.buildGraphRefEditPlan({
    logicalPath: 'Spawners/Military.json',
    action: 'replace',
    oldRef: 'ItemLootTreeNodes.Bunker.Old',
    ref: 'Bunker.AK47',
    apply: false,
  });

  assert.equal(graph.edges.some((edge) => edge.kind === 'uses_ref'), true);
  assert.equal(result.plan.dryRun, true);
  assert.equal(result.plan.changed, true);
  assert.match(result.content, /ItemLootTreeNodes\.Bunker\.AK47/);
  assert.equal(writes.length, 0);
});

test('workspace search service filters scopes, exact matches, and issue views', () => {
  const { createWorkspaceSearchService } = require('../src/server/services/workspace-search-service.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-search-service-'));
  const nodesDir = path.join(root, 'Nodes');
  const spawnersDir = path.join(root, 'Spawners');
  fs.mkdirSync(nodesDir, { recursive: true });
  fs.mkdirSync(spawnersDir, { recursive: true });
  fs.writeFileSync(path.join(root, 'ServerSettings.ini'), 'MaxPlayers=64\n', 'utf8');
  fs.writeFileSync(path.join(nodesDir, 'Loot.json'), '{"Name":"AK47"}\n', 'utf8');
  fs.writeFileSync(path.join(spawnersDir, 'Military.json'), '{"Ref":"MissingNode"}\n', 'utf8');
  const service = createWorkspaceSearchService({
    resolvedPaths: () => ({}),
    allWorkspaceLogicalPaths: () => ['ServerSettings.ini', 'Nodes/Loot.json', 'Spawners/Military.json'],
    resolveLogicalPath: (logicalPath) => path.join(root, logicalPath.replace(/\//g, path.sep)),
    readText: (target) => fs.readFileSync(target, 'utf8'),
    scanLootWorkspace: () => ({ spawners: [{ logicalName: 'Military', relPath: 'Spawners/Military.json' }] }),
    analyzeOverview: () => ({
      missingRefs: [{ nodeName: 'MissingNode', spawner: 'Military' }],
      unusedNodes: [{ nodeName: 'UnusedNode', path: 'Nodes/Unused.json' }],
    }),
  });

  const nodeMatches = service.searchWorkspace('AK47', undefined, { scope: 'nodes', match: 'exact' });
  const issueMatches = service.searchWorkspace('MissingNode', undefined, { issue: 'missing_refs' });

  assert.deepEqual(nodeMatches.map((entry) => entry.path), ['Nodes/Loot.json']);
  assert.equal(nodeMatches[0].scope, 'nodes');
  assert.equal(service.searchWorkspace('AK47', undefined, { scope: 'ini' }).length, 0);
  assert.equal(issueMatches[0].path, 'Spawners/Military.json');
  assert.equal(issueMatches[0].type, 'missing_ref');
});

test('loot autofix service normalizes flat item probabilities and converts legacy fields', () => {
  const { createLootAutofixService } = require('../src/server/services/loot-autofix-service.cjs');
  const service = createLootAutofixService({
    clone: (value) => JSON.parse(JSON.stringify(value)),
    path,
    posixify: (value) => String(value || '').replace(/\\/g, '/'),
    detectLootKind: (object) => (Array.isArray(object.Items) ? 'node' : 'unknown'),
    itemEntryName: (entry) => entry?.Name || entry?.Item || '',
    itemEntryProbability: (entry) => Number(entry?.Probability ?? entry?.Chance ?? 0) || 0,
    itemEntryIdentityKey: (entry) => entry?.Name || '',
    cloneWithoutProbability: (entry) => JSON.stringify({ Name: entry?.Name || '', Extra: entry?.Extra || '' }),
    parseBooleanLike: (value) => String(value).toLowerCase() === 'true',
    normalizeSpawnerRef: (value) => `ItemLootTreeNodes.${String(value || '').replace(/^ItemLootTreeNodes\.?/, '')}`,
    LOOT_RARITIES: ['Common', 'Uncommon', 'Rare'],
    analyzeLootObject: () => ({ validation: { entries: [], counts: { critical: 0, warning: 0, info: 0 } } }),
    scanLootWorkspace: () => ({ refIndex: new Map() }),
  });
  const result = service.autoFixLootObject({
    Items: [
      { Name: 'AK47', Chance: 0.2 },
      { Name: 'AK47', Probability: 0.3 },
      { Name: 'Bandage', Probability: 0.5 },
      {},
    ],
    AllowDuplicates: 'false',
  }, 'Nodes/Test.json', { refIndex: new Map() });

  assert.match(result.content, /"Name": "Test"/);
  assert.equal(result.object.Name, 'Test');
  assert.equal(result.object.Items.length, 2);
  assert.equal(result.object.Items[0].Probability, 0.5);
  assert.equal(result.object.Items[0].Chance, undefined);
  assert.equal(result.changes.some((entry) => entry.includes('Merged duplicate item row')), true);
});

test('loot analyzer service summarizes balance, schema kinds, and validation files', () => {
  const { createLootAnalyzerService } = require('../src/server/services/loot-analyzer-service.cjs');
  const scan = {
    nodes: [
      { logicalName: 'Bunker', relPath: 'Nodes/Bunker.json', object: { Name: 'Bunker', Children: [{ Name: 'AK47', Rarity: 'Rare' }] } },
      { logicalName: 'Unused', relPath: 'Nodes/Unused.json', object: { Items: [{ Name: 'Bandage', Probability: 1 }] } },
    ],
    spawners: [
      { logicalName: 'Military', relPath: 'Spawners/Military.json', object: { Nodes: [{ Rarity: 'Rare', Ids: ['ItemLootTreeNodes.Bunker.AK47', 'ItemLootTreeNodes.Missing.Ref'] }] } },
    ],
    refIndex: new Map([['ItemLootTreeNodes.Bunker.AK47', { node: 'Bunker', kind: 'leaf', rarity: 'Rare' }]]),
    errors: [],
  };
  const service = createLootAnalyzerService({
    buildItemCatalog: () => ({
      total: 2,
      items: [
        { name: 'AK47', appearances: 2, category: 'weapon', iconUrl: '' },
        { name: 'Bandage', appearances: 1, category: 'medical', iconUrl: '' },
      ],
      categories: [{ id: 'weapon', count: 1 }, { id: 'medical', count: 1 }],
      overridesCount: 0,
    }),
    loadLootAdvisoryIgnore: () => ({ unusedNodes: ['Unused'], notes: { Unused: 'demo ignore' } }),
    normalizeKey: (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
    collectSpawnerRefs: (object) => (object.Nodes || []).flatMap((group) => group.Ids || []),
    ITEM_CATEGORY_RULES: [{ id: 'weapon' }, { id: 'medical' }],
    LOOT_RARITIES: ['Common', 'Uncommon', 'Rare'],
    detectLootKind: (object) => (Array.isArray(object.Children) ? 'node_tree' : Array.isArray(object.Items) ? 'node' : Array.isArray(object.Nodes) ? 'spawner' : 'unknown'),
    collectTreeLeaves: (object) => (object.Children || []).map((child) => ({ name: child.Name, rarity: child.Rarity })),
    rarityWeight: (rarity) => (rarity === 'Rare' ? 6 : 1),
    itemEntryName: (entry) => entry?.Name || '',
    itemEntryProbability: (entry) => Number(entry?.Probability || 0),
    categoryForItem: (name) => (/ak/i.test(name) ? 'weapon' : 'medical'),
    analyzeLootObject: (_object, relPath) => ({
      summary: { kind: relPath.includes('Spawners') ? 'spawner' : relPath.includes('Unused') ? 'node' : 'node_tree' },
      validation: {
        counts: relPath.includes('Spawners') ? { critical: 1, warning: 0, info: 0 } : { critical: 0, warning: 0, info: 0 },
        fixableCount: relPath.includes('Spawners') ? 1 : 0,
      },
    }),
    safeScanLootWorkspace: () => scan,
    LOOT_SCHEMA_VERSION: 'test-schema',
    nowIso: () => '2026-04-21T00:00:00.000Z',
    LOOT_SCHEMA_HINTS: { node: ['Items'] },
  });

  const overview = service.analyzeOverview(scan);
  const schema = service.buildLootSchemaReport(scan);
  const kinds = service.detectLootSchemaKinds(scan);

  assert.equal(overview.totals.nodes, 2);
  assert.equal(overview.missingRefs[0].nodeName, 'ItemLootTreeNodes.Missing.Ref');
  assert.equal(overview.ignoredUnusedNodes[0].nodeName, 'Unused');
  assert.equal(overview.unusedNodes.length, 0);
  assert.equal(schema.version, 'test-schema');
  assert.equal(schema.workspace.validationCounts.critical, 1);
  assert.equal(schema.workspace.detectedKinds.spawner, 1);
  assert.equal(kinds.node_tree, 1);
});

test('workspace health service builds readiness and sanitized diagnostics reports', () => {
  const { createWorkspaceHealthService } = require('../src/server/services/workspace-health-service.cjs');
  const paths = {
    scumConfigDir: 'C:\\SCUM\\Config',
    nodesDir: 'C:\\SCUM\\Config\\Nodes',
    spawnersDir: 'C:\\SCUM\\Config\\Spawners',
    backupDir: 'C:\\SCUM\\Backups',
  };
  const scan = {
    nodes: [{ relPath: 'Nodes/Bunker.json', object: {}, logicalName: 'Bunker' }],
    spawners: [{ relPath: 'Spawners/Military.json', object: {}, logicalName: 'Military' }],
    errors: [],
  };
  const service = createWorkspaceHealthService({
    fs: { existsSync: (target) => target === 'icons-ready' },
    ITEM_ICON_DIR: 'icons-ready',
    CORE_FILES: ['ServerSettings.ini', 'GameUserSettings.ini'],
    nowIso: () => '2026-04-21T00:00:00.000Z',
    buildHealthNextActions: (report) => report.blockers.length ? ['Fix critical blockers first'] : ['Ready to use'],
    loadConfig: () => ({ scumConfigDir: paths.scumConfigDir, reloadLootCommand: 'reload.cmd', restartServerCommand: '' }),
    resolvedPaths: () => paths,
    inspectConfigFolder: () => ({
      rootExists: true,
      rootPath: paths.scumConfigDir,
      nodesExists: true,
      nodesPath: paths.nodesDir,
      spawnersExists: false,
      spawnersPath: paths.spawnersDir,
      fileHealth: { 'ServerSettings.ini': true, 'GameUserSettings.ini': false },
    }),
    inspectCommand: (command) => ({ configured: Boolean(command), runnable: command === 'reload.cmd', command, reason: command ? '' : 'empty' }),
    listBackups: () => [{ name: 'backup-one', updatedAt: 'now', tag: 'manual', fileCount: 2 }],
    safeScanLootWorkspace: () => scan,
    analyzeLootObject: (_object, relPath) => ({
      validation: {
        counts: relPath.startsWith('Spawners') ? { critical: 1, warning: 0, info: 0 } : { critical: 0, warning: 1, info: 0 },
        fixableCount: relPath.startsWith('Spawners') ? 1 : 0,
      },
    }),
    analyzeOverview: () => ({ missingRefs: [{ nodeName: 'MissingNode', spawner: 'Military' }], unusedNodes: [], balance: { score: 70 }, warnings: [], totals: { nodes: 1 } }),
    buildStartupDoctorReport: () => ({ ready: false, counts: { bad: 1 }, checks: [{ id: 'startup', label: 'Startup', status: 'bad', severity: 'critical', detail: paths.scumConfigDir, action: 'Fix path' }], nextStep: 'Fix path' }),
    readActivity: () => [{ at: 'now', type: 'save', path: 'C:\\SCUM\\Config\\ServerSettings.ini', backup: 'backup-one', ok: true }],
    buildItemCatalog: () => ({ total: 1, categories: [{ id: 'weapon', count: 1 }], overridesCount: 0 }),
    detectLootSchemaKinds: () => ({ node: 1, node_tree: 0, spawner: 1, unknown: 0 }),
    LOOT_SCHEMA_VERSION: 'health-test',
    ITEM_CATEGORY_RULES: [{ id: 'weapon' }],
    ROOT: 'C:\\scum-next-build',
  });

  const readiness = service.buildReadinessReport();
  const diagnostics = service.buildDiagnosticsReport({ includePaths: 'false' });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.counts.validationCritical, 1);
  assert.equal(readiness.counts.missingRefs, 1);
  assert.equal(readiness.commandHealth.reload.runnable, true);
  assert.equal(readiness.checks.some((check) => check.id === 'spawners_folder' && check.status === 'bad'), true);
  assert.equal(diagnostics.app.cwd, '');
  assert.equal(diagnostics.config.scumConfigDir, '');
  assert.equal(diagnostics.readiness.checks.some((check) => check.detail === ''), true);
  assert.equal(diagnostics.activity.recent[0].path, '');
  assert.equal(diagnostics.loot.schema.version, 'health-test');
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
