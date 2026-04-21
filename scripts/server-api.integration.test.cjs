const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('../server.js');
const { createWorkspacePackage } = require('../src/server/package-manager.cjs');

const configPath = path.resolve(__dirname, '..', 'data', 'config.json');
const sampleRoot = path.resolve(__dirname, '..', 'samples', 'scum-workspace', 'WindowsServer');

function writeWorkspaceConfig(scumConfigDir, backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-api-backups-'))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({
    scumConfigDir,
    nodesDir: path.join(scumConfigDir, 'Loot', 'Nodes', 'Current'),
    spawnersDir: path.join(scumConfigDir, 'Loot', 'Spawners', 'Presets', 'Override'),
    backupDir,
  }, null, 2));
}

function withConfigRestore() {
  const originalConfig = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : null;
  return () => {
    if (originalConfig == null) fs.rmSync(configPath, { force: true });
    else fs.writeFileSync(configPath, originalConfig);
  };
}

function listen() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function request(server, path, options = {}) {
  const port = server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  return { response, body };
}

test('command check API blocks dangerous shell commands', async () => {
  const server = await listen();
  try {
    const { response, body } = await request(server, '/api/command/check', {
      method: 'POST',
      body: JSON.stringify({ command: 'powershell -Command "Remove-Item C:\\server -Recurse"' }),
    });

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.inspection.runnable, false);
    assert.equal(body.inspection.reason, 'blocked_token');
  } finally {
    server.close();
  }
});

test('file dry-run API rejects unsafe logical paths before touching disk', async () => {
  const server = await listen();
  try {
    const { response, body } = await request(server, '/api/file/dry-run', {
      method: 'POST',
      body: JSON.stringify({ path: '../ServerSettings.ini', content: '[General]\nscum.MaxPlayers=64\n' }),
    });

    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.equal(body.code, 'invalid_logical_path');
  } finally {
    server.close();
  }
});

test('package import preview returns dry-run plans without applying files', async () => {
  const server = await listen();
  const restoreConfig = withConfigRestore();
  writeWorkspaceConfig(sampleRoot, fs.mkdtempSync(path.join(os.tmpdir(), 'scum-api-preview-backups-')));
  const packageData = createWorkspacePackage({
    config: {},
    files: [{ path: 'ServerSettings.ini', content: '[General]\nscum.MaxPlayers=64\n' }],
    meta: { note: 'integration-preview' },
  });

  try {
    const { response, body } = await request(server, '/api/package/import/preview', {
      method: 'POST',
      body: JSON.stringify({ package: packageData }),
    });

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.counts.files, 1);
    assert.equal(body.plans[0].dryRun, true);
    assert.equal(body.plans[0].logicalPath, 'ServerSettings.ini');
  } finally {
    restoreConfig();
    server.close();
  }
});

test('support bundle and loot preset APIs return local-safe release helpers', async () => {
  const server = await listen();
  try {
    const support = await request(server, '/api/support/bundle?includePaths=false');
    assert.equal(support.response.status, 200);
    assert.equal(support.body.ok, true);
    assert.equal(support.body.fileName.endsWith('.zip'), true);
    assert.equal(support.body.mime, 'application/zip');
    assert.equal(support.body.files.includes('support/diagnostics.json'), true);
    assert.equal(support.body.files.includes('logs/operations.jsonl'), true);

    const presets = await request(server, '/api/loot/presets');
    assert.equal(presets.response.status, 200);
    assert.equal(presets.body.ok, true);
    assert.equal(presets.body.presets.some((preset) => preset.id === 'solo_balanced'), true);
  } finally {
    server.close();
  }
});

test('startup doctor API summarizes first-run readiness checks', async () => {
  const server = await listen();
  const restoreConfig = withConfigRestore();
  writeWorkspaceConfig(sampleRoot);
  try {
    const { response, body } = await request(server, '/api/startup-doctor');
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.report.ready, true);
    assert.equal(body.report.nextStep.action, 'open-dashboard');
    assert.equal(body.report.checks.some((check) => check.id === 'paths.nodes' && check.status === 'ok'), true);
    assert.equal(body.report.checks.some((check) => check.id === 'commands.reload' && check.status === 'warn'), true);
  } finally {
    restoreConfig();
    server.close();
  }
});

test('P2.13 item catalog expands icon pack metadata with readable names and tags', async () => {
  const server = await listen();
  const restoreConfig = withConfigRestore();
  writeWorkspaceConfig(sampleRoot);
  try {
    const { response, body } = await request(server, '/api/items?limit=3000');
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.total > 1000, true);

    const buckshot = body.items.find((item) => item.name === '12_Gauge_Buckshot');
    assert.ok(buckshot);
    assert.equal(buckshot.category, 'ammo');
    assert.equal(buckshot.hasIcon, true);
    assert.equal(buckshot.displayNameEn, '12 Gauge Buckshot');
    assert.equal(typeof buckshot.displayNameTh, 'string');
    assert.equal(buckshot.displayNameTh.length > 0, true);
    assert.equal(buckshot.tags.includes('ammo'), true);
    assert.equal(Boolean(buckshot.rarity), true);
  } finally {
    restoreConfig();
    server.close();
  }
});

test('curated item catalog applies human Thai names, category, rarity, and tags', async () => {
  const server = await listen();
  const restoreConfig = withConfigRestore();
  writeWorkspaceConfig(sampleRoot);
  try {
    const names = [
      'Magazine_AK47',
      'Car_Repair_Kit',
      'Antibiotics_01',
      'BabyFood',
      'Screwdriver',
      '12_Gauge_Buckshot',
      '2H_Katana',
      'Military_Backpack',
      'Gold_Bar',
      'FuelCan',
      'Absinthe',
    ];
    const catalog = new Map();
    for (const name of names) {
      const { response, body } = await request(server, `/api/items?q=${encodeURIComponent(name)}&limit=20`);
      assert.equal(response.status, 200);
      const item = body.items.find((entry) => entry.name === name);
      assert.ok(item, `${name} should exist in item catalog`);
      catalog.set(name, item);
    }

    assert.equal(catalog.get('Magazine_AK47').category, 'ammo');
    assert.equal(catalog.get('Magazine_AK47').rarity, 'uncommon');
    assert.equal(catalog.get('Magazine_AK47').displayNameTh, 'แม็กกาซีน AK-47');
    assert.equal(catalog.get('Magazine_AK47').tags.includes('ak'), true);

    assert.equal(catalog.get('Car_Repair_Kit').category, 'vehicle');
    assert.equal(catalog.get('Car_Repair_Kit').rarity, 'rare');
    assert.equal(catalog.get('Car_Repair_Kit').displayNameTh, 'ชุดซ่อมรถ');
    assert.equal(catalog.get('Car_Repair_Kit').tags.includes('repair'), true);

    assert.equal(catalog.get('Antibiotics_01').category, 'medical');
    assert.equal(catalog.get('Antibiotics_01').displayNameTh, 'ยาปฏิชีวนะ');
    assert.equal(catalog.get('BabyFood').displayNameTh, 'อาหารเด็ก');
    assert.equal(catalog.get('Screwdriver').displayNameTh, 'ไขควง');
    assert.equal(catalog.get('Screwdriver').tags.includes('raid'), true);

    assert.equal(catalog.get('12_Gauge_Buckshot').displayNameTh, 'กระสุนลูกปราย 12 เกจ');
    assert.equal(catalog.get('12_Gauge_Buckshot').tags.includes('shotgun'), true);
    assert.equal(catalog.get('2H_Katana').category, 'weapon');
    assert.equal(catalog.get('2H_Katana').displayNameTh, 'คาตานะสองมือ');
    assert.equal(catalog.get('Military_Backpack').category, 'clothing');
    assert.equal(catalog.get('Military_Backpack').displayNameTh, 'กระเป๋าทหาร');
    assert.equal(catalog.get('Gold_Bar').category, 'currency');
    assert.equal(catalog.get('Gold_Bar').displayNameTh, 'ทองแท่ง');
    assert.equal(catalog.get('FuelCan').category, 'vehicle');
    assert.equal(catalog.get('FuelCan').displayNameTh, 'ถังน้ำมัน');
    assert.equal(catalog.get('Absinthe').category, 'food');
    assert.equal(catalog.get('Absinthe').displayNameTh, 'แอ็บซินธ์');
  } finally {
    restoreConfig();
    server.close();
  }
});

test('P2.13 simulator is deterministic with seed and returns expected rates', async () => {
  const server = await listen();
  const restoreConfig = withConfigRestore();
  writeWorkspaceConfig(sampleRoot);
  try {
    const payload = { path: 'Nodes/SampleWeapons.json', count: 250, seed: 'p2-13-seed' };
    const first = await request(server, '/api/loot/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const second = await request(server, '/api/loot/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    assert.equal(first.response.status, 200);
    assert.deepEqual(first.body.result.distinctItems, second.body.result.distinctItems);
    assert.equal(first.body.result.seed, 'p2-13-seed');
    assert.equal(first.body.result.distinctItems.some((entry) => typeof entry.dropRate === 'number'), true);
    assert.equal(first.body.result.expectedRates.some((entry) => entry.name === 'Weapon_AK47'), true);
    assert.equal(first.body.result.categorySummary.some((entry) => entry.category === 'weapon'), true);
  } finally {
    restoreConfig();
    server.close();
  }
});

test('P2.13 graph ref editor previews and applies spawner ref changes safely', async () => {
  const server = await listen();
  const restoreConfig = withConfigRestore();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-graph-edit-workspace-'));
  fs.cpSync(sampleRoot, tempRoot, { recursive: true });
  writeWorkspaceConfig(tempRoot);
  const spawnerPath = path.join(tempRoot, 'Loot', 'Spawners', 'Presets', 'Override', 'SampleBunker.json');
  const newRef = 'ItemLootTreeNodes.SampleWeapons.Weapon_AK47';

  try {
    const preview = await request(server, '/api/graph/edit-ref', {
      method: 'POST',
      body: JSON.stringify({
        path: 'Spawners/SampleBunker.json',
        action: 'add',
        groupIndex: 0,
        ref: newRef,
        apply: false,
      }),
    });

    assert.equal(preview.response.status, 200);
    assert.equal(preview.body.ok, true);
    assert.equal(preview.body.plan.dryRun, true);
    assert.match(preview.body.plan.patch, /Weapon_AK47/);
    assert.equal(fs.readFileSync(spawnerPath, 'utf8').includes(newRef), false);

    const applied = await request(server, '/api/graph/edit-ref', {
      method: 'POST',
      body: JSON.stringify({
        path: 'Spawners/SampleBunker.json',
        action: 'add',
        groupIndex: 0,
        ref: newRef,
        apply: true,
      }),
    });

    assert.equal(applied.response.status, 200);
    assert.equal(applied.body.ok, true);
    assert.equal(applied.body.plan.dryRun, false);
    assert.equal(fs.readFileSync(spawnerPath, 'utf8').includes(newRef), true);
  } finally {
    restoreConfig();
    server.close();
  }
});
