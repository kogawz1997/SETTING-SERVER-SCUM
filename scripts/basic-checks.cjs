const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`CHECK FAILED: ${message}`);
  process.exitCode = 1;
}

function runNodeCheck(relPath) {
  const fullPath = path.join(root, relPath);
  const result = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`Syntax check failed for ${relPath}\n${result.stderr || result.stdout}`);
  }
}

function assertSingleFunction(source, name) {
  const pattern = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, 'gm');
  const matches = source.match(pattern) || [];
  if (matches.length !== 1) {
    fail(`Expected exactly 1 top-level "${name}" in public/app.js, found ${matches.length}`);
  }
}

[
  'server.js',
  'public/app.js',
  'public/loot-overrides.js',
  'scripts/basic-checks.cjs',
  'scripts/repair-loot-refs.cjs',
  'scripts/ui-smoke.spec.cjs',
  'scripts/loot-studio-regression.spec.cjs',
  'scripts/settings-command-regression.spec.cjs',
  'scripts/backup-activity-regression.spec.cjs'
].forEach(runNodeCheck);

const appJs = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
[
  'fileButton',
  'openLootFile',
  'renderVisualBuilder',
  'renderFlatNodeBuilder',
  'renderTreeNodeCard',
  'renderTreeNodeBuilder',
  'renderSpawnerBuilder',
  'renderLootSummaryPanel',
  'renderLootDependencyPanel',
  'renderBuilderCoach'
].forEach((name) => assertSingleFunction(appJs, name));

if (process.exitCode) process.exit(process.exitCode);
console.log('Basic checks passed.');
