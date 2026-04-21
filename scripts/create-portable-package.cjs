const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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
  'launcher',
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
  'bin',
  'obj',
]);

const skipDataFiles = new Set([
  'config.json',
  'config.testbackup.json',
  'activity.jsonl',
  'activity.log',
]);

const requiredFiles = [
  'server.js',
  'package.json',
  'public/index.html',
  'public/app.js',
  'public/style.css',
  'public/loot-overrides.js',
  'public/loot-overrides.css',
  'src/server/routes/index.cjs',
  'src/server/services/workspace-domain.cjs',
  'Start SETTING SERVER SCUM.ps1',
  'Start SETTING SERVER SCUM.cmd',
];

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

function commandExists(command) {
  try {
    execFileSync('where.exe', [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasDotnetSdk() {
  if (!commandExists('dotnet.exe')) return false;
  try {
    const output = execFileSync('dotnet.exe', ['--list-sdks'], { encoding: 'utf8' }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

function findFrameworkCompiler() {
  const windir = process.env.WINDIR || 'C:\\Windows';
  const candidates = [
    path.join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(windir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function buildLauncherWithCsc() {
  const compiler = findFrameworkCompiler();
  const sourcePath = path.join(root, 'launcher', 'SettingServerScumLauncher', 'Program.cs');
  const exePath = path.join(outDir, 'Start SETTING SERVER SCUM.exe');
  if (!compiler || !fs.existsSync(sourcePath)) return false;
  execFileSync(compiler, [
    '/nologo',
    '/target:exe',
    `/out:${exePath}`,
    sourcePath,
  ], { stdio: 'inherit' });
  return fs.existsSync(exePath);
}

function buildLauncherExe() {
  const projectPath = path.join(root, 'launcher', 'SettingServerScumLauncher', 'SettingServerScumLauncher.csproj');
  if (!fs.existsSync(projectPath)) return false;
  if (!hasDotnetSdk()) {
    const builtWithCsc = buildLauncherWithCsc();
    if (!builtWithCsc) {
      console.warn('No .NET SDK or .NET Framework C# compiler was found; portable package will keep the .cmd launcher fallback only.');
    }
    return builtWithCsc;
  }
  const publishDir = path.join(distRoot, 'launcher-publish');
  fs.rmSync(publishDir, { recursive: true, force: true });
  ensureDir(publishDir);
  try {
    execFileSync('dotnet.exe', [
      'publish',
      projectPath,
      '-c',
      'Release',
      '-r',
      'win-x64',
      '--self-contained',
      'true',
      '-p:PublishSingleFile=true',
      '-p:EnableCompressionInSingleFile=true',
      '-p:DebugType=None',
      '-p:DebugSymbols=false',
      '-o',
      publishDir,
    ], { stdio: 'inherit' });
    const exePath = path.join(publishDir, 'Start SETTING SERVER SCUM.exe');
    if (!fs.existsSync(exePath)) throw new Error(`Launcher publish did not create ${exePath}`);
    fs.copyFileSync(exePath, path.join(outDir, 'Start SETTING SERVER SCUM.exe'));
    return true;
  } catch (error) {
    console.warn(`dotnet publish failed, trying .NET Framework compiler fallback: ${error.message}`);
    return buildLauncherWithCsc();
  } finally {
    fs.rmSync(publishDir, { recursive: true, force: true });
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

const launcherBuilt = buildLauncherExe();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = {
  name: 'SETTING SERVER SCUM',
  version: packageJson.version,
  generatedAt: new Date().toISOString(),
  nodeMinimum: '18.0.0',
  launcherBuilt,
  startEntrypoints: [
    launcherBuilt ? 'Start SETTING SERVER SCUM.exe' : null,
    'Start SETTING SERVER SCUM.cmd',
    'Start SETTING SERVER SCUM.ps1',
  ].filter(Boolean),
  requiredFiles,
  optionalFolders: [
    'scum_items-main',
    'samples',
    'docs',
  ],
  privateFilesExcluded: [
    'data/config.json',
    'logs/',
    'backups/',
    'profile-store/',
  ],
};

fs.writeFileSync(path.join(outDir, 'portable-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

fs.writeFileSync(path.join(outDir, 'README_PORTABLE.txt'), [
  'SETTING SERVER SCUM - Portable Local Build',
  '',
  'How to start:',
  '1. Double-click "Start SETTING SERVER SCUM.exe" when it is included.',
  '2. If Windows blocks the EXE or it is not included, double-click "Start SETTING SERVER SCUM.cmd".',
  '3. Install Node.js 18 or newer if this computer does not have it.',
  '4. The launcher installs missing dependencies, finds a free port, starts the server, and opens the browser.',
  '5. If the folder looks incomplete, open portable-manifest.json and compare the requiredFiles list.',
  '',
  `EXE launcher included: ${launcherBuilt ? 'yes' : 'no'}`,
  `Version: ${manifest.version}`,
  '',
  'Private files are intentionally not included:',
  '- data/config.json',
  '- logs/',
  '- backups/',
  '- profile-store/',
  '',
].join('\r\n'));

console.log(`Portable package created: ${outDir}`);
