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
  '.gitignore',
  'package.json',
  'package-lock.json',
  'README.md',
  'data/loot-advisory-ignore.json',
  'start-local.cmd',
  'start-local.ps1',
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
  'docs/P2_3_STATUS.md',
  'docs/SAAS_TENANT_ARCHITECTURE.md',
  'scripts/repair-loot-refs.cjs',
].forEach(assertFile);

[
  'data',
  'public',
  'scripts',
].forEach(assertDir);

[
  'start',
  'check',
  'release:check',
  'repair:loot-refs',
  'test',
  'test:ui-smoke',
  'test:loot-regression',
  'test:settings-regression',
  'test:backup-activity',
].forEach(assertPackageScript);

assertIncludes('start-local.cmd', ['where node', 'node_modules\\express', 'node server.js']);
assertIncludes('start-local.ps1', ['Get-Command node', 'node_modules\\express', 'node server.js']);
assertIncludes('public/index.html', ['/loot-overrides.css', '/app.js', '/loot-overrides.js']);
assertIncludes('server.js', [
  '/api/bootstrap',
  '/api/readiness',
  '/api/diagnostics',
  '/api/schemas/loot',
  '/api/items',
  '/api/backups',
]);
assertIncludesAny('README.md', 'first-time setup instructions', ['First-Time Setup', 'วิธีตั้งค่าครั้งแรก']);
assertIncludesAny('README.md', 'safety model notes', ['Safety Model', 'ระบบกันพัง']);
assertIncludesAny('README.md', 'documentation links', ['More Documentation', 'เอกสารเพิ่มเติม']);
assertIncludes('README.md', ['P2.12', 'docs/assets/dashboard.png', 'docs/INSTALL_TH.md', 'KOGA.EXE']);
assertIncludes('docs/P2_3_STATUS.md', ['P2.12', 'broken-copy guardrails']);
assertIncludes('docs/USAGE_GUIDE.md', ['P2.12 final local polish']);
assertIncludes('public/index.html', ['KOGA.EXE', 'credit-badge', 'loot-shortcuts-panel', 'loot-file-tools', 'loot-file-scope', 'toggle-split']);
assertIncludes('public/app.js', ['routeByView', 'routeAliases', 'popstate', '/loot-studio', '/help', 'lootRoutePath', 'pendingRouteLootPath', 'scum_loot_recent', 'fileScope', 'loot-file-counts']);
assertIncludes('public/app.js', ['server-guide-panel', 'server-field-help', 'help-flow-map']);
assertIncludes('public/app.js', ['normalizeLootEditorMode', 'applyLootEditorModeDom', 'refreshSplitRawPreview']);
assertIncludes('public/loot-overrides.js', ['data-prob-preset', 'loot-field-cheatsheet', 'data-analyzer-target-path', 'data-analyzer-open-file', 'flat-row-workbench', 'flatRowOpenMode', 'spawner-group-workbench', 'spawnerGroupOpenMode', 'simulator-note', 'graph-help-strip']);
assertIncludes('public/style.css', ['loot-stage-split', 'readonly-preview']);
assertIncludes('public/loot-overrides.css', ['loot-shortcuts-panel', 'loot-shortcut-item', 'loot-file-tools', 'flat-row-workbench', 'spawner-group-workbench', 'simulator-note', 'graph-help-strip']);
[
  'README.md',
  'docs/P2_3_STATUS.md',
  'docs/USAGE_GUIDE.md',
  'public/app.js',
  'public/loot-overrides.js',
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
