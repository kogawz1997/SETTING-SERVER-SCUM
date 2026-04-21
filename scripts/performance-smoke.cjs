const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  safeScanLootWorkspace,
  analyzeOverview,
  buildGraph,
  searchWorkspace,
} = require('../server.js');

const sampleRoot = path.resolve(__dirname, '..', 'samples', 'scum-workspace', 'WindowsServer');
const samplePaths = {
  scumConfigDir: sampleRoot,
  nodesDir: path.join(sampleRoot, 'Loot', 'Nodes', 'Current'),
  spawnersDir: path.join(sampleRoot, 'Loot', 'Spawners', 'Presets', 'Override'),
  backupDir: path.resolve(__dirname, '..', '.control-plane-backups'),
};

function timed(label, fn, budgetMs) {
  const started = Date.now();
  const result = fn();
  const elapsed = Date.now() - started;
  console.log(`${label}: ${elapsed}ms`);
  assert.equal(elapsed <= budgetMs, true, `${label} exceeded ${budgetMs}ms`);
  return result;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createLargeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-large-workspace-'));
  const nodesDir = path.join(root, 'Loot', 'Nodes', 'Current');
  const spawnersDir = path.join(root, 'Loot', 'Spawners', 'Presets', 'Override');
  fs.mkdirSync(nodesDir, { recursive: true });
  fs.mkdirSync(spawnersDir, { recursive: true });
  fs.writeFileSync(path.join(root, 'ServerSettings.ini'), '[General]\nServerName=Large Smoke\n');
  fs.writeFileSync(path.join(root, 'GameUserSettings.ini'), '[ServerSettings]\nMaxPlayers=64\n');
  writeJson(path.join(root, 'EconomyOverride.json'), { Economy: { Enabled: true } });

  const itemNames = ['Weapon_AK47', 'Weapon_M16A4', 'Ammo_762x39', 'Ammo_556x45', 'Bandage', 'MRE_Ration'];
  for (let index = 0; index < 160; index += 1) {
    writeJson(path.join(nodesDir, `Node_${index}.json`), {
      Name: `ItemLootTreeNodes.Node_${index}`,
      Items: itemNames.map((name, itemIndex) => ({
        ClassName: `${name}_${index % 7}`,
        Probability: Number((0.02 + ((index + itemIndex) % 12) / 100).toFixed(4)),
      })),
    });
  }
  for (let index = 0; index < 55; index += 1) {
    writeJson(path.join(spawnersDir, `Spawner_${index}.json`), {
      Name: `Spawner_${index}`,
      Probability: Number((0.2 + (index % 8) / 20).toFixed(4)),
      QuantityMin: 1,
      QuantityMax: 4,
      Nodes: Array.from({ length: 8 }, (_, offset) => ({
        Rarity: offset % 3 === 0 ? 'Rare' : 'Common',
        Ids: [`ItemLootTreeNodes.Node_${(index * 3 + offset) % 160}`],
      })),
    });
  }
  return {
    scumConfigDir: root,
    nodesDir,
    spawnersDir,
    backupDir: path.join(root, 'Backups'),
  };
}

const scan = timed('loot workspace scan', () => safeScanLootWorkspace(samplePaths), 5000);
timed('analyzer overview', () => analyzeOverview(scan), 5000);
timed('dependency graph', () => buildGraph(scan), 5000);
timed('workspace search', () => searchWorkspace('Weapon', samplePaths, { scope: 'all', match: 'partial' }), 5000);

const largePaths = createLargeWorkspace();
const largeScan = timed('large workspace scan', () => safeScanLootWorkspace(largePaths), 6000);
timed('large analyzer overview', () => analyzeOverview(largeScan), 6000);
timed('large dependency graph', () => buildGraph(largeScan), 6000);
timed('large workspace search', () => searchWorkspace('Weapon', largePaths, { scope: 'all', match: 'partial' }), 6000);
assert.equal(largeScan.nodes.length >= 160, true, 'large smoke workspace should include generated nodes');
assert.equal(largeScan.spawners.length >= 55, true, 'large smoke workspace should include generated spawners');

console.log(`Performance smoke passed (${scan.nodes.length}/${scan.spawners.length} sample, ${largeScan.nodes.length}/${largeScan.spawners.length} large).`);
