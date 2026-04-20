const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'config.json'), 'utf8'));
const nodesDir = path.resolve(root, config.nodesDir || path.join(config.scumConfigDir || '', 'Loot', 'Nodes', 'Current'));
const spawnersDir = path.resolve(root, config.spawnersDir || path.join(config.scumConfigDir || '', 'Loot', 'Spawners', 'Presets', 'Override'));
const backupDir = path.resolve(root, config.backupDir || '.control-plane-backups');
const dryRun = process.argv.includes('--dry-run');

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function walkJson(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJson(fullPath));
    else if (/\.json$/i.test(entry.name)) out.push(fullPath);
  }
  return out;
}

function collectRefs(node, parts = []) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  const current = [...parts, node.Name].filter(Boolean);
  const children = Array.isArray(node.Children) ? node.Children : [];
  return [current.join('.')].concat(children.flatMap((child) => collectRefs(child, current)));
}

function posixRelative(base, filePath) {
  return path.relative(base, filePath).replace(/\\/g, '/');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyToBackup(filePath, backupRoot) {
  const relative = filePath.startsWith(nodesDir)
    ? path.join('Nodes', path.relative(nodesDir, filePath))
    : path.join('Spawners', path.relative(spawnersDir, filePath));
  const target = path.join(backupRoot, relative);
  ensureDir(path.dirname(target));
  fs.copyFileSync(filePath, target);
}

const nodeFiles = walkJson(nodesDir);
const spawnerFiles = walkJson(spawnersDir);
const refIndex = new Map();

for (const filePath of nodeFiles) {
  const object = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const ref of collectRefs(object)) {
    const key = ref.toLowerCase();
    if (!refIndex.has(key)) refIndex.set(key, new Set());
    refIndex.get(key).add(ref);
  }
}

const changedFiles = [];
const unresolved = new Map();
let totalRefsChecked = 0;
let totalRefsRepaired = 0;
let totalDuplicateRefsRemoved = 0;

for (const filePath of spawnerFiles) {
  const object = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(object.Nodes)) continue;
  let changed = false;
  for (const group of object.Nodes) {
    if (!group || typeof group !== 'object') continue;
    const ids = Array.isArray(group.Ids) ? group.Ids : [group.Node, group.Name, group.Ref].filter(Boolean);
    const nextIds = [];
    const seen = new Set();
    for (const rawId of ids) {
      const id = String(rawId || '').trim();
      if (!id) continue;
      totalRefsChecked += 1;
      const candidates = [...(refIndex.get(id.toLowerCase()) || [])];
      const repaired = candidates.length === 1 ? candidates[0] : id;
      if (candidates.length === 1 && repaired !== id) {
        changed = true;
        totalRefsRepaired += 1;
      }
      if (candidates.length !== 1) {
        unresolved.set(id, (unresolved.get(id) || 0) + 1);
      }
      if (seen.has(repaired)) {
        changed = true;
        totalDuplicateRefsRemoved += 1;
        continue;
      }
      seen.add(repaired);
      nextIds.push(repaired);
    }
    if (nextIds.length !== ids.length || nextIds.some((value, index) => value !== ids[index])) changed = true;
    group.Ids = nextIds;
    delete group.Node;
    delete group.Name;
    delete group.Ref;
  }
  const beforeGroupCount = object.Nodes.length;
  object.Nodes = object.Nodes.filter((group) => group && typeof group === 'object' && Array.isArray(group.Ids) && group.Ids.length);
  if (object.Nodes.length !== beforeGroupCount) changed = true;
  if (changed) changedFiles.push({ filePath, object });
}

let backupName = '';
if (changedFiles.length && !dryRun) {
  backupName = `${nowStamp()}-repair-loot-refs`;
  const backupRoot = path.join(backupDir, backupName);
  ensureDir(backupRoot);
  for (const file of changedFiles) copyToBackup(file.filePath, backupRoot);
  fs.writeFileSync(path.join(backupRoot, '_meta.json'), `${JSON.stringify({
    createdAt: new Date().toISOString(),
    note: 'repair loot refs before bulk case-sensitive ref fix',
    tag: 'repair-loot-refs',
    files: changedFiles.map((file) => ({
      path: file.filePath.startsWith(nodesDir)
        ? `Nodes/${posixRelative(nodesDir, file.filePath)}`
        : `Spawners/${posixRelative(spawnersDir, file.filePath)}`,
    })),
  }, null, 2)}\n`, 'utf8');
  for (const file of changedFiles) {
    fs.writeFileSync(file.filePath, `${JSON.stringify(file.object, null, 2)}\n`, 'utf8');
  }
}

const summary = {
  dryRun,
  nodes: nodeFiles.length,
  spawners: spawnerFiles.length,
  refsChecked: totalRefsChecked,
  refsRepaired: totalRefsRepaired,
  duplicateRefsRemoved: totalDuplicateRefsRemoved,
  changedFiles: changedFiles.length,
  unresolvedRefs: unresolved.size,
  unresolvedTop: [...unresolved.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
  backupName,
};

console.log(JSON.stringify(summary, null, 2));
if (unresolved.size) process.exitCode = 2;
