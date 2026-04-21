const assert = require('node:assert/strict');
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

const scan = timed('loot workspace scan', () => safeScanLootWorkspace(samplePaths), 5000);
timed('analyzer overview', () => analyzeOverview(scan), 5000);
timed('dependency graph', () => buildGraph(scan), 5000);
timed('workspace search', () => searchWorkspace('Weapon', samplePaths, { scope: 'all', match: 'partial' }), 5000);

console.log(`Performance smoke passed (${scan.nodes.length} nodes, ${scan.spawners.length} spawners).`);
