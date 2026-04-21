const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function assertFile(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    fail(`Missing required file: ${relPath}`);
  }
}

function assertDir(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    fail(`Missing required folder: ${relPath}`);
  }
}

function assertIncludes(relPath, needles) {
  const source = read(relPath);
  for (const needle of needles) {
    if (!source.includes(needle)) fail(`${relPath} must include "${needle}"`);
  }
}

function assertIncludesAny(relPath, label, needles) {
  const source = read(relPath);
  if (!needles.some((needle) => source.includes(needle))) {
    fail(`${relPath} must include ${label}`);
  }
}

function assertNotIncludes(relPath, needles) {
  const source = read(relPath);
  for (const needle of needles) {
    if (source.includes(needle)) fail(`${relPath} must not include "${needle}"`);
  }
}

function assertLineCountAtMost(relPath, maxLines) {
  const count = read(relPath).split(/\r?\n/).length;
  if (count > maxLines) fail(`${relPath} has ${count} lines; keep it at or below ${maxLines} by moving logic into services/routes`);
}

function assertNoMojibake(relPath) {
  const source = read(relPath);
  const badPatterns = [
    /\?{4,}/,
    /[\u00c0-\u00ff\ufffd]/,
  ];
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (badPatterns.some((pattern) => pattern.test(line))) {
      fail(`${relPath}:${index + 1} contains broken copy: ${line.trim().slice(0, 120)}`);
    }
  });
}

function assertPackageScript(name) {
  const pkg = JSON.parse(read('package.json'));
  if (!pkg.scripts || !pkg.scripts[name]) fail(`package.json is missing script "${name}"`);
}

[
  'server.js',
  '.github/workflows/local-portable-release.yml',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'README.md',
  'CHANGELOG.md',
  'data/loot-advisory-ignore.json',
  'start-local.cmd',
  'start-local.ps1',
  'Start SETTING SERVER SCUM.cmd',
  'Start SETTING SERVER SCUM.ps1',
  'public/index.html',
  'public/app.js',
  'public/style.css',
  'public/loot-overrides.js',
  'public/loot-overrides.css',
  'docs/assets/dashboard.png',
  'docs/INSTALL_TH.md',
  'docs/USAGE_GUIDE.md',
  'docs/PROJECT_STRUCTURE.md',
  'docs/RELEASE_CHECKLIST.md',
  'docs/RELEASE_QUALITY.md',
  'docs/QUICK_START.md',
  'docs/DAILY_USE.md',
  'docs/RECOVERY_GUIDE.md',
  'docs/POWER_USER_GUIDE.md',
  'docs/COMPATIBILITY.md',
  'docs/LOCAL_DEFINITION_OF_DONE.md',
  'docs/P2_3_STATUS.md',
  'docs/SAAS_TENANT_ARCHITECTURE.md',
  'scripts/changelog-check.cjs',
  'scripts/config-roundtrip-check.cjs',
  'scripts/create-portable-package.cjs',
  'scripts/docs-link-check.cjs',
  'scripts/portable-zip-smoke.cjs',
  'scripts/portable-package-smoke.cjs',
  'scripts/performance-smoke.cjs',
  'scripts/release-quality.cjs',
  'scripts/run-playwright-with-server.cjs',
  'scripts/repair-loot-refs.cjs',
  'scripts/sample-workspace-smoke.cjs',
  'scripts/version-bump.cjs',
  'scripts/server-core.unit.test.cjs',
  'scripts/server-api.integration.test.cjs',
  'src/server/errors.cjs',
  'src/server/command-sandbox.cjs',
  'src/server/validation.cjs',
  'src/server/item-catalog-curated.cjs',
  'src/server/store/file-store.cjs',
  'src/server/store/app-store.cjs',
  'src/server/store/file-transaction.cjs',
  'src/server/services/backup-service.cjs',
  'src/server/services/command-runner.cjs',
  'src/server/services/item-catalog-service.cjs',
  'src/server/services/kit-template-service.cjs',
  'src/server/services/loot-core-service.cjs',
  'src/server/services/loot-analyzer-service.cjs',
  'src/server/services/loot-autofix-service.cjs',
  'src/server/services/loot-graph-service.cjs',
  'src/server/services/loot-simulator-service.cjs',
  'src/server/services/profile-service.cjs',
  'src/server/services/startup-doctor.cjs',
  'src/server/services/workspace-domain.cjs',
  'src/server/services/workspace-file-service.cjs',
  'src/server/services/workspace-health-service.cjs',
  'src/server/services/workspace-search-service.cjs',
  'src/server/services/workspace-utils.cjs',
  'src/server/safe-apply.cjs',
  'src/server/package-manager.cjs',
  'src/server/routes/index.cjs',
  'src/server/routes/system.cjs',
  'src/server/routes/settings-files.cjs',
  'src/server/routes/loot.cjs',
  'src/server/routes/analysis.cjs',
  'src/server/routes/profiles.cjs',
  'src/server/routes/backups-package.cjs',
  'src/server/routes/static.cjs',
].forEach(assertFile);

[
  'data',
  'public',
  'scripts',
  'samples/scum-workspace/WindowsServer',
].forEach(assertDir);

[
  'start',
  'check',
  'release:check',
  'release:quality',
  'config:roundtrip',
  'sample:smoke',
  'performance:smoke',
  'docs:check',
  'changelog:check',
  'version:bump',
  'package:portable',
  'package:portable:smoke',
  'package:portable:zip-smoke',
  'repair:loot-refs',
  'test',
  'test:unit',
  'test:integration',
  'test:ui-smoke',
  'test:loot-regression',
  'test:settings-regression',
  'test:backup-activity',
].forEach(assertPackageScript);

assertIncludes('start-local.cmd', ['where node', 'node_modules\\express', 'node server.js']);
assertIncludes('start-local.ps1', ['Get-Command node', 'node_modules\\express', 'node server.js']);
assertIncludes('Start SETTING SERVER SCUM.cmd', ['Portable Launcher', 'Start SETTING SERVER SCUM.ps1']);
assertIncludes('Start SETTING SERVER SCUM.ps1', ['node_modules\\express', '3000..3010', 'Start-Process $TargetUrl', 'portable-manifest.json', '$requiredFiles', 'Missing required portable files', 'startup.log', 'How to fix:', 'Checking portable files', 'Checking Node.js', 'Opening browser']);
assertIncludes('public/index.html', ['/loot-overrides.css', '/app.js', '/loot-overrides.js']);
assertIncludes('server.js', [
  'registerRoutes(app, serverContext)',
  'createCommandRunner',
  'createBackupService',
  'createProfileService',
  'createKitTemplateService',
  'module.exports',
]);
assertLineCountAtMost('server.js', 650);
assertNotIncludes('server.js', [
  'function resolveBackupRoot(',
  'function createKitTemplate(',
  'function createProfileSnapshot(',
  'spawnSync(',
  'shell: true',
]);
assertIncludes('src/server/routes/system.cjs', [
  '/api/bootstrap',
  '/api/readiness',
  '/api/diagnostics',
  '/api/startup-doctor',
  '/api/support/bundle',
  '/api/schemas/loot',
]);
assertIncludes('src/server/command-sandbox.cjs', ['shell: false', 'outside_allowlist', 'buildExecutionPlan']);
assertIncludes('src/server/store/file-store.cjs', ['atomicWriteText', 'fingerprintFile', 'renameSync']);
assertIncludes('src/server/store/app-store.cjs', ['createAppStore', 'inspectConfigFolder', 'readActivity', 'readOperationLogs', 'operations.jsonl']);
assertIncludes('src/server/store/file-transaction.cjs', ['applyFileTransaction', 'restoreSnapshot', 'file_transaction_rollback']);
assertIncludes('src/server/services/command-runner.cjs', ['createCommandRunner', 'allowedRoots', 'runConfiguredCommand', 'command_run']);
assertIncludes('src/server/services/backup-service.cjs', ['createBackupService', 'restoreBackupFile', 'workspacePackageFiles']);
assertIncludes('src/server/services/item-catalog-service.cjs', ['createItemCatalogService', 'buildItemCatalog', 'upsertItemCatalogOverride', 'categoryForItem']);
assertIncludes('src/server/services/kit-template-service.cjs', ['createKitTemplateService', 'sanitizeKitItems']);
assertIncludes('src/server/services/loot-core-service.cjs', ['createLootCoreService', 'detectLootKind', 'analyzeLootObject', 'buildRefIndex', 'normalizeSpawnerRef']);
assertIncludes('src/server/services/loot-analyzer-service.cjs', ['createLootAnalyzerService', 'analyzeOverview', 'buildLootSchemaReport', 'detectLootSchemaKinds']);
assertIncludes('src/server/services/loot-autofix-service.cjs', ['createLootAutofixService', 'autoFixLootObject', 'normalizeFlatProbabilities']);
assertIncludes('src/server/services/loot-graph-service.cjs', ['createLootGraphService', 'buildGraph', 'buildGraphRefEditPlan']);
assertIncludes('src/server/services/loot-simulator-service.cjs', ['createLootSimulatorService', 'simulateLootObject', 'compareSimulationResults', 'spawnerRefGroups', 'expectedCategorySummary', 'unresolvedRefs', 'rollPlan']);
assertIncludes('src/server/services/profile-service.cjs', ['createProfileService', 'applyFileTransaction', 'runRotation']);
assertIncludes('src/server/services/startup-doctor.cjs', ['buildStartupDoctorReport', 'writeProbe', 'nextStep']);
assertIncludes('src/server/services/workspace-domain.cjs', ['createWorkspaceDomain', 'workspace-utils.cjs', 'buildGraphRefEditPlan', 'buildReadinessReport']);
assertLineCountAtMost('src/server/services/workspace-domain.cjs', 330);
assertNotIncludes('src/server/services/workspace-domain.cjs', ['function buildItemCatalog(', 'function upsertItemCatalogOverride(', 'function simulateLootObject(', 'function compareSimulationResults(', 'function buildGraph(', 'function buildGraphRefEditPlan(', 'function searchWorkspace(', 'function autoFixLootObject(', 'function analyzeOverview(', 'function buildLootSchemaReport(', 'function buildReadinessReport(', 'function buildDiagnosticsReport(', 'function detectLootKind(', 'function buildValidation(', 'function analyzeLootObject(', 'function resolveRefNode(', 'function normalizeSpawnerRef(', 'function readLogicalFile(', 'function resolveLogicalPath(', 'function scanLootWorkspace(', 'function validateContent(']);
assertIncludes('src/server/services/workspace-file-service.cjs', ['createWorkspaceFileService', 'resolveLogicalPath', 'safeScanLootWorkspace', 'validateContent', 'createDiff']);
assertIncludes('src/server/services/workspace-health-service.cjs', ['createWorkspaceHealthService', 'buildReadinessReport', 'buildDiagnosticsReport']);
assertIncludes('src/server/services/workspace-search-service.cjs', ['createWorkspaceSearchService', 'searchWorkspace', 'matchesSearchScope']);
assertIncludes('src/server/services/workspace-utils.cjs', ['normalizeKey', 'posixify', 'sortByName', 'walkFiles']);
assertIncludes('src/server/item-catalog-curated.cjs', ['12_Gauge_Buckshot', 'Military_Backpack', 'Gold_Bar', 'displayNameTh']);
assertIncludes('src/server/routes/loot.cjs', [
  '/api/items',
  '/api/loot/files',
  '/api/loot/presets',
]);
assertIncludes('src/server/routes/backups-package.cjs', [
  '/api/backups',
  '/api/package/export',
  '/api/package/import/preview',
  'portable',
]);
assertIncludes('src/server/package-manager.cjs', ['sanitizePortableConfig', 'remapPortableConfig', 'pathSanitized']);
assertIncludesAny('README.md', 'first-time setup instructions', ['First-Time Setup', 'วิธีตั้งค่าครั้งแรก']);
assertIncludesAny('README.md', 'safety model notes', ['Safety Model', 'ระบบกันพัง']);
assertIncludesAny('README.md', 'documentation links', ['More Documentation', 'เอกสารเพิ่มเติม']);
assertIncludes('README.md', ['P2.13', 'docs/assets/dashboard.png', 'docs/INSTALL_TH.md', 'KOGA.EXE']);
assertIncludes('README.md', ['docs/QUICK_START.md', 'npm run release:quality', 'CHANGELOG.md']);
assertIncludes('README.md', ['package:portable', 'Start SETTING SERVER SCUM.exe', 'Start SETTING SERVER SCUM.cmd']);
assertIncludes('CHANGELOG.md', ['## 1.0.0']);
assertIncludes('docs/RELEASE_QUALITY.md', ['npm run release:quality', 'config/package roundtrip']);
assertIncludes('docs/COMPATIBILITY.md', ['Windows 10/11', 'Node.js 18+']);
assertIncludes('scripts/release-quality.cjs', ['performance:smoke', 'package:portable', 'package:portable:smoke', 'package:portable:zip-smoke']);
assertIncludes('scripts/run-playwright-with-server.cjs', ['BASE_URL', 'server.js', '/api/startup-doctor']);
assertIncludes('package.json', ['run-playwright-with-server.cjs scripts/ui-smoke.spec.cjs', 'run-playwright-with-server.cjs scripts/loot-studio-regression.spec.cjs']);
assertIncludes('.github/workflows/local-portable-release.yml', [
  'actions/checkout@v5',
  'actions/setup-node@v5',
  'node-version: 22',
  'gh release create',
  'GH_TOKEN: ${{ github.token }}',
  'npm run package:portable:smoke',
  'npm run package:portable:zip-smoke',
]);
assertNotIncludes('.github/workflows/local-portable-release.yml', [
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'node-version: 20',
  'softprops/action-gh-release',
]);
assertIncludes('scripts/create-portable-package.cjs', ['SETTING-SERVER-SCUM-local', 'README_PORTABLE.txt', 'portable-manifest.json', 'requiredFiles', 'launcherBuilt']);
assertIncludes('scripts/portable-package-smoke.cjs', ['portable-manifest.json', 'requiredFiles', 'privateFilesExcluded', 'Portable package smoke passed']);
assertIncludes('scripts/portable-zip-smoke.cjs', ['Expand-Archive', 'portable-manifest.json', 'requiredFiles', 'privateFilesExcluded', 'Portable zip smoke passed']);
assertIncludes('docs/P2_3_STATUS.md', ['P2.13', 'broken-copy guardrails']);
assertIncludes('docs/USAGE_GUIDE.md', ['P2.13 local power-pack polish']);
assertIncludes('public/index.html', ['KOGA.EXE', 'credit-badge', 'loot-shortcuts-panel', 'loot-file-tools', 'loot-file-scope', 'toggle-split']);
assertNotIncludes('public/index.html', ['data-view="release"', 'data-view="activity">Activity', 'data-view="diff">Diff Preview', 'customer-ready-panel']);
assertIncludes('public/app.js', ['routeByView', 'routeAliases', 'popstate', '/loot-studio', '/help', 'lootRoutePath', 'pendingRouteLootPath', 'scum_loot_recent', 'fileScope', 'loot-file-counts', 'diff-summary', 'loot-undo']);
assertIncludes('public/app.js', ['server-guide-panel', 'server-field-help', 'help-flow-map']);
assertIncludes('public/app.js', ['normalizeLootEditorMode', 'applyLootEditorModeDom', 'refreshSplitRawPreview']);
assertIncludes('public/loot-overrides.js', ['data-prob-preset', 'loot-field-cheatsheet', 'data-analyzer-target-path', 'data-analyzer-open-file', 'flat-row-workbench', 'flatRowOpenMode', 'spawner-group-workbench', 'spawnerGroupOpenMode', 'simulator-note', 'sim-roll-plan', 'sim-expected-category-card', 'expectedCategorySummary', 'graph-help-strip', 'graph-connect-mode', 'graph-edit-mode', 'graph-relationship-manager', 'data-graph-stage-remove', 'graph-connect-preview-line', 'graph-connect-preview-label', 'graph-staged-edit-summary', 'loot-setup-wizard', 'downloadSupportBundle', 'startup-doctor-panel', '/api/startup-doctor']);
assertIncludes('public/style.css', ['loot-stage-split', 'readonly-preview']);
assertIncludes('public/loot-overrides.css', ['loot-shortcuts-panel', 'loot-shortcut-item', 'loot-file-tools', 'flat-row-workbench', 'spawner-group-workbench', 'simulator-note', 'sim-category-row', 'sim-unresolved-list', 'graph-help-strip', 'connect-mode', 'edit-mode', 'graph-relationship-manager', 'graph-relationship-row', 'graph-connect-preview-line', 'graph-connect-preview-label', 'graph-staged-edit-summary', 'release-check-grid', 'loot-wizard-grid', 'startup-doctor-check']);
[
  'README.md',
  'docs/P2_3_STATUS.md',
  'docs/USAGE_GUIDE.md',
  'public/app.js',
  'public/loot-overrides.js',
  'src/server/item-catalog-curated.cjs',
].forEach(assertNoMojibake);

const pkg = JSON.parse(read('package.json'));
if (pkg.author !== 'KOGA.EXE') {
  fail('package.json author must be "KOGA.EXE"');
}
for (const dependency of ['express', 'ini', 'diff']) {
  if (!pkg.dependencies || !pkg.dependencies[dependency]) {
    fail(`package.json is missing dependency "${dependency}"`);
  }
}

if (failures.length) {
  console.error('Release checks failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('Release checks passed.');
