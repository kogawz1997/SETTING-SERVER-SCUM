const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'dist', 'SETTING-SERVER-SCUM-local');
const defaultZipPath = path.join(root, 'dist', 'SETTING-SERVER-SCUM-local-smoke.zip');
const failures = [];

function fail(message) {
  failures.push(message);
}

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function quotePs(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runPowerShell(script) {
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    cwd: root,
    stdio: 'pipe',
  });
}

function exists(baseDir, relPath) {
  return fs.existsSync(path.join(baseDir, relPath));
}

function assertExists(baseDir, relPath) {
  if (!exists(baseDir, relPath)) fail(`Zip is missing required file: ${relPath}`);
}

function assertNotExists(baseDir, relPath) {
  if (exists(baseDir, relPath)) fail(`Zip must not include private path: ${relPath}`);
}

function createZipIfNeeded(zipPath) {
  if (zipPath !== defaultZipPath) return;
  if (!fs.existsSync(outDir)) {
    throw new Error('Portable package output is missing. Run npm run package:portable first.');
  }
  fs.rmSync(zipPath, { force: true });
  runPowerShell(`Compress-Archive -Path ${quotePs(path.join(outDir, '*'))} -DestinationPath ${quotePs(zipPath)} -Force`);
}

function inspectExtractedZip(extractDir) {
  assertExists(extractDir, 'portable-manifest.json');
  assertExists(extractDir, 'README_PORTABLE.txt');
  assertExists(extractDir, 'Start SETTING SERVER SCUM.cmd');
  assertExists(extractDir, 'Start SETTING SERVER SCUM.ps1');
  assertExists(extractDir, 'server.js');
  assertExists(extractDir, 'package.json');

  if (!exists(extractDir, 'portable-manifest.json')) return;
  const manifest = JSON.parse(fs.readFileSync(path.join(extractDir, 'portable-manifest.json'), 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const requiredFiles = Array.isArray(manifest.requiredFiles) ? manifest.requiredFiles : [];
  const privateFilesExcluded = Array.isArray(manifest.privateFilesExcluded) ? manifest.privateFilesExcluded : [];

  if (manifest.name !== 'SETTING SERVER SCUM') fail('portable-manifest.json has the wrong product name.');
  if (manifest.version !== packageJson.version) fail(`portable-manifest.json version ${manifest.version} does not match package.json ${packageJson.version}.`);
  if (!requiredFiles.length) fail('portable-manifest.json must list requiredFiles.');
  if (!privateFilesExcluded.length) fail('portable-manifest.json must list privateFilesExcluded.');

  requiredFiles.forEach((relPath) => assertExists(extractDir, relPath));
  privateFilesExcluded.forEach((relPath) => assertNotExists(extractDir, relPath.replace(/\/$/, '')));
  if (manifest.launcherBuilt) assertExists(extractDir, 'Start SETTING SERVER SCUM.exe');

  [
    'data/config.json',
    'data/activity.jsonl',
    'logs',
    'backups',
    'profile-store',
    'node_modules',
    '.git',
  ].forEach((relPath) => assertNotExists(extractDir, relPath));
}

const zipPath = path.resolve(root, argValue('zip', defaultZipPath));
const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-portable-zip-'));

try {
  createZipIfNeeded(zipPath);
  if (!fs.existsSync(zipPath) || !fs.statSync(zipPath).isFile()) {
    fail(`Release zip was not found: ${zipPath}`);
  } else {
    runPowerShell(`Expand-Archive -LiteralPath ${quotePs(zipPath)} -DestinationPath ${quotePs(extractDir)} -Force`);
    inspectExtractedZip(extractDir);
  }
} catch (error) {
  fail(error.message);
} finally {
  fs.rmSync(extractDir, { recursive: true, force: true });
  if (zipPath === defaultZipPath) fs.rmSync(zipPath, { force: true });
}

if (failures.length) {
  console.error('Portable zip smoke failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('Portable zip smoke passed.');
