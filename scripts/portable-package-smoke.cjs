const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'dist', 'SETTING-SERVER-SCUM-local');
const failures = [];

function fail(message) {
  failures.push(message);
}

function exists(relPath) {
  return fs.existsSync(path.join(outDir, relPath));
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(outDir, relPath), 'utf8'));
}

function assertExists(relPath) {
  if (!exists(relPath)) fail(`Missing portable file: ${relPath}`);
}

function assertNotExists(relPath) {
  if (exists(relPath)) fail(`Portable package must not include private path: ${relPath}`);
}

if (!fs.existsSync(outDir)) {
  fail('Portable package output is missing. Run npm run package:portable first.');
} else {
  assertExists('portable-manifest.json');
  assertExists('README_PORTABLE.txt');
  assertExists('Start SETTING SERVER SCUM.cmd');
  assertExists('Start SETTING SERVER SCUM.ps1');
  assertExists('server.js');
  assertExists('package.json');

  if (exists('portable-manifest.json')) {
    const manifest = readJson('portable-manifest.json');
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const requiredFiles = Array.isArray(manifest.requiredFiles) ? manifest.requiredFiles : [];
    const privateFilesExcluded = Array.isArray(manifest.privateFilesExcluded) ? manifest.privateFilesExcluded : [];

    if (manifest.name !== 'SETTING SERVER SCUM') fail('portable-manifest.json has the wrong product name.');
    if (manifest.version !== packageJson.version) fail(`portable-manifest.json version ${manifest.version} does not match package.json ${packageJson.version}.`);
    if (manifest.nodeMinimum !== '18.0.0') fail('portable-manifest.json must declare nodeMinimum 18.0.0.');
    if (!requiredFiles.length) fail('portable-manifest.json must list requiredFiles.');
    if (!privateFilesExcluded.length) fail('portable-manifest.json must list privateFilesExcluded.');

    for (const relPath of requiredFiles) {
      assertExists(relPath);
    }
    for (const relPath of privateFilesExcluded) {
      assertNotExists(relPath.replace(/\/$/, ''));
    }
    if (manifest.launcherBuilt) {
      assertExists('Start SETTING SERVER SCUM.exe');
    }
  }

  [
    'data/config.json',
    'data/activity.jsonl',
    'logs',
    'backups',
    'profile-store',
    'node_modules',
    '.git',
  ].forEach(assertNotExists);
}

if (failures.length) {
  console.error('Portable package smoke failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('Portable package smoke passed.');
