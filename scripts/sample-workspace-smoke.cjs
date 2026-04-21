const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateContent } = require('../server.js');
const { validateLootLogic } = require('../src/server/validation.cjs');

const root = path.resolve(__dirname, '..');
const sampleRoot = path.join(root, 'samples', 'scum-workspace', 'WindowsServer');
const requiredFiles = [
  'ServerSettings.ini',
  'GameUserSettings.ini',
  'EconomyOverride.json',
  'Loot/Nodes/Current/SampleWeapons.json',
  'Loot/Nodes/Current/SampleMedical.json',
  'Loot/Spawners/Presets/Override/SampleBunker.json',
  'broken-cases/Nodes/DuplicateItems.json',
  'broken-cases/Spawners/MissingRef.json',
];

for (const relPath of requiredFiles) {
  const fullPath = path.join(sampleRoot, relPath);
  assert.equal(fs.existsSync(fullPath), true, `sample workspace is missing ${relPath}`);
}

for (const relPath of requiredFiles.filter((entry) => /\.(json)$/i.test(entry))) {
  JSON.parse(fs.readFileSync(path.join(sampleRoot, relPath), 'utf8'));
}

const serverValidation = validateContent('ServerSettings.ini', fs.readFileSync(path.join(sampleRoot, 'ServerSettings.ini'), 'utf8'));
assert.equal(serverValidation.counts.critical, 0, 'sample ServerSettings.ini should not have critical validation issues');

const economyValidation = validateContent('EconomyOverride.json', fs.readFileSync(path.join(sampleRoot, 'EconomyOverride.json'), 'utf8'));
assert.equal(economyValidation.counts.critical, 0, 'sample EconomyOverride.json should parse cleanly');

const brokenDuplicate = JSON.parse(fs.readFileSync(path.join(sampleRoot, 'broken-cases', 'Nodes', 'DuplicateItems.json'), 'utf8'));
const duplicateValidation = validateLootLogic(brokenDuplicate, 'Nodes/DuplicateItems.json');
assert.equal(duplicateValidation.entries.some((entry) => entry.code === 'node.duplicate_item'), true, 'broken duplicate sample must trigger duplicate item validation');

const brokenSpawner = JSON.parse(fs.readFileSync(path.join(sampleRoot, 'broken-cases', 'Spawners', 'MissingRef.json'), 'utf8'));
const spawnerValidation = validateLootLogic(brokenSpawner, 'Spawners/MissingRef.json', { knownRefs: new Set(['ItemLootTreeNodes.SampleWeapons.Rifle']) });
assert.equal(spawnerValidation.entries.some((entry) => entry.code === 'spawner.missing_ref'), true, 'broken spawner sample must trigger missing ref validation');

console.log('Sample workspace smoke check passed.');
