const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server.js');
const { createWorkspacePackage } = require('../src/server/package-manager.cjs');

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
    server.close();
  }
});
