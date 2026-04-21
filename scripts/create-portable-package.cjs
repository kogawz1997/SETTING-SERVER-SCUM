const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distRoot = path.join(root, 'dist');
const outDir = path.join(distRoot, 'SETTING-SERVER-SCUM-local');

const files = [
  'package.json',
  'package-lock.json',
  'server.js',
  'README.md',
  'CHANGELOG.md',
  'start-local.cmd',
  'start-local.ps1',
  'Start SETTING SERVER SCUM.cmd',
  'Start SETTING SERVER SCUM.ps1',
  '.gitignore',
  '.gitattributes',
];

const dirs = [
  'public',
  'src',
  'scripts',
  'docs',
  'samples',
  'data',
  'scum_items-main',
];

const skipNames = new Set([
  'node_modules',
  '.git',
  'logs',
  'dist',
  'artifacts',
  'output',
  'test-results',
  '.control-plane-backups',
]);

const skipDataFiles = new Set([
  'config.json',
  'config.testbackup.json',
  'activity.jsonl',
  'activity.log',
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeExistingOutput() {
  const resolved = path.resolve(outDir);
  const allowed = path.resolve(distRoot) + path.sep;
  if (!resolved.startsWith(allowed)) throw new Error(`Refusing to clean unexpected output path: ${resolved}`);
  fs.rmSync(resolved, { recursive: true, force: true });
}

function shouldSkip(srcPath, name) {
  if (skipNames.has(name)) return true;
  if (srcPath.includes(`${path.sep}data${path.sep}`) && skipDataFiles.has(name)) return true;
  return false;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (shouldSkip(path.join(src, entry.name), entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

removeExistingOutput();
ensureDir(outDir);

for (const relPath of files) {
  const src = path.join(root, relPath);
  if (fs.existsSync(src)) {
    ensureDir(path.dirname(path.join(outDir, relPath)));
    fs.copyFileSync(src, path.join(outDir, relPath));
  }
}

for (const relPath of dirs) {
  copyDir(path.join(root, relPath), path.join(outDir, relPath));
}

fs.writeFileSync(path.join(outDir, 'README_PORTABLE.txt'), [
  'SETTING SERVER SCUM - Portable Local Build',
  '',
  'How to start:',
  '1. Install Node.js 18 or newer if this computer does not have it.',
  '2. Double-click "Start SETTING SERVER SCUM.cmd".',
  '3. The launcher installs missing dependencies, finds a free port, starts the server, and opens the browser.',
  '',
  'Private files are intentionally not included:',
  '- data/config.json',
  '- logs/',
  '- backups/',
  '- profile-store/',
  '',
].join('\r\n'));

console.log(`Portable package created: ${outDir}`);
