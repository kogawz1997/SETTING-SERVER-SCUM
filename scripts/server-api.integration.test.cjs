const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('../server.js');
const { createWorkspacePackage } = require('../src/server/package-manager.cjs');

const configPath = path.resolve(__dirname, '..', 'data', 'config.json');
const sampleRoot = path.resolve(__dirname, '..', 'samples', 'scum-workspace', 'WindowsServer');

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
  const originalConfig = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : null;
  const tempBackupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scum-api-preview-backups-'));
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({
    scumConfigDir: sampleRoot,
    nodesDir: path.join(sampleRoot, 'Loot', 'Nodes', 'Current'),
    spawnersDir: path.join(sampleRoot, 'Loot', 'Spawners', 'Presets', 'Override'),
    backupDir: tempBackupDir,
  }, null, 2));
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
    if (originalConfig == null) fs.rmSync(configPath, { force: true });
    else fs.writeFileSync(configPath, originalConfig);
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

    const presets = await request(server, '/api/loot/presets');
    assert.equal(presets.response.status, 200);
    assert.equal(presets.body.ok, true);
    assert.equal(presets.body.presets.some((preset) => preset.id === 'solo_balanced'), true);
  } finally {
    server.close();
  }
});
