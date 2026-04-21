const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'test-results', 'artifacts'].includes(entry.name)) walk(fullPath, predicate, out);
    } else if (predicate(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function localTarget(baseFile, rawTarget) {
  let target = String(rawTarget || '').trim();
  if (!target || target.startsWith('#')) return null;
  if (/^(https?:|mailto:|tel:)/i.test(target)) return null;
  target = target.replace(/^<|>$/g, '').split('#')[0].split('?')[0];
  if (!target) return null;
  return path.resolve(path.dirname(baseFile), decodeURIComponent(target));
}

function collectMarkdownLinks(content) {
  const links = [];
  const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(content))) links.push(match[1]);
  return links;
}

function checkMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawTarget of collectMarkdownLinks(content)) {
    const target = localTarget(filePath, rawTarget);
    if (!target) continue;
    if (!fs.existsSync(target)) {
      fail(`${path.relative(root, filePath)} links to missing target: ${rawTarget}`);
    }
  }
}

function checkRequiredDocs() {
  [
    'docs/QUICK_START.md',
    'docs/DAILY_USE.md',
    'docs/RECOVERY_GUIDE.md',
    'docs/POWER_USER_GUIDE.md',
    'docs/COMPATIBILITY.md',
    'docs/LOCAL_DEFINITION_OF_DONE.md',
    'docs/RELEASE_QUALITY.md',
  ].forEach((relPath) => {
    if (!fs.existsSync(path.join(root, relPath))) fail(`Missing required docs page: ${relPath}`);
  });
}

function runDocsLinkCheck() {
  checkRequiredDocs();
  const markdownFiles = [
    path.join(root, 'README.md'),
    path.join(root, 'CHANGELOG.md'),
    ...walk(path.join(root, 'docs'), (filePath) => /\.md$/i.test(filePath)),
    ...walk(path.join(root, 'samples'), (filePath) => /\.md$/i.test(filePath)),
  ].filter((filePath, index, list) => filePath && fs.existsSync(filePath) && list.indexOf(filePath) === index);
  markdownFiles.forEach(checkMarkdownFile);
  return { ok: failures.length === 0, failures };
}

if (require.main === module) {
  const result = runDocsLinkCheck();
  if (!result.ok) {
    console.error('Docs link check failed:');
    result.failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
  }
  console.log(`Docs link check passed (${walk(path.join(root, 'docs'), (filePath) => /\.md$/i.test(filePath)).length + 1} docs scanned).`);
}

module.exports = {
  collectMarkdownLinks,
  runDocsLinkCheck,
};
