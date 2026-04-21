const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

function bumpVersion(version, level = 'patch') {
  const parts = String(version || '0.0.0').split('.').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  if (level === 'major') return `${parts[0] + 1}.0.0`;
  if (level === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function selectedLevel() {
  if (process.argv.includes('--major')) return 'major';
  if (process.argv.includes('--minor')) return 'minor';
  return 'patch';
}

function updateJsonVersion(filePath, version) {
  if (!fs.existsSync(filePath)) return;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  data.version = version;
  if (data.packages?.['']) data.packages[''].version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function updateChangelog(version, note) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '# Changelog\n\n';
  const entry = `## ${version} - ${today}\n\n- ${note || 'Local release readiness update.'}\n\n`;
  if (new RegExp(`^## \\[?${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]?\\b`, 'm').test(existing)) return;
  fs.writeFileSync(changelogPath, existing.replace(/^# Changelog\s*/i, `# Changelog\n\n${entry}`), 'utf8');
}

if (require.main === module) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const next = argValue('set') || bumpVersion(pkg.version, selectedLevel());
  updateJsonVersion(pkgPath, next);
  updateJsonVersion(lockPath, next);
  updateChangelog(next, argValue('note'));
  console.log(`Version bumped to ${next}.`);
}

module.exports = {
  bumpVersion,
};
