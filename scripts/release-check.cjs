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
assertIncludes('README.md', ['First-Time Setup', 'Safety Model', 'More Documentation']);

const pkg = JSON.parse(read('package.json'));
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
