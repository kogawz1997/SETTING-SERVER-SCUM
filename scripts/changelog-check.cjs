const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const changelogPath = path.join(root, 'CHANGELOG.md');

if (!fs.existsSync(changelogPath)) {
  console.error('CHANGELOG.md is missing.');
  process.exit(1);
}

const changelog = fs.readFileSync(changelogPath, 'utf8');
const versionPattern = new RegExp(`^## \\[?${pkg.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]?\\b`, 'm');

if (!versionPattern.test(changelog)) {
  console.error(`CHANGELOG.md does not contain an entry for package version ${pkg.version}.`);
  process.exit(1);
}

console.log(`Changelog check passed for version ${pkg.version}.`);
