const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const artifactsDir = path.join(root, 'artifacts');
const playwrightArgs = process.argv.slice(2);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort() {
  const preferred = Number(process.env.PLAYWRIGHT_SERVER_PORT || 3105);
  for (let port = preferred; port < preferred + 100; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error(`No free test port found from ${preferred} to ${preferred + 99}`);
}

async function waitForServer(baseUrl, serverProcess) {
  let lastError = '';
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Test server exited early with code ${serverProcess.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/startup-doctor`, {
        headers: { accept: 'application/json' },
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.ok) return;
      }
      lastError = `HTTP ${response.status} ${contentType}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }
  throw new Error(`Test server did not become ready at ${baseUrl}: ${lastError}`);
}

function runPlaywright(baseUrl) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npx';
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npx.cmd', 'playwright', 'test', ...playwrightArgs]
      : ['playwright', 'test', ...playwrightArgs];
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, BASE_URL: baseUrl },
      shell: false,
      stdio: 'inherit',
      windowsHide: false,
    });
    child.on('error', (error) => {
      console.error(`Could not start Playwright: ${error.message}`);
      resolve(1);
    });
    child.on('exit', (code) => resolve(code || 0));
  });
}

function attachServerLog(serverProcess, port) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  const logPath = path.join(artifactsDir, `playwright-server-${port}.log`);
  const stream = fs.createWriteStream(logPath, { flags: 'a' });
  stream.write(`\n--- ${new Date().toISOString()} starting test server on ${port} ---\n`);
  serverProcess.stdout.on('data', (chunk) => stream.write(chunk));
  serverProcess.stderr.on('data', (chunk) => stream.write(chunk));
  serverProcess.on('close', (code) => {
    stream.write(`\n--- server exited with ${code} ---\n`);
    stream.end();
  });
}

async function main() {
  if (!playwrightArgs.length) {
    console.error('Usage: node scripts/run-playwright-with-server.cjs <spec> [playwright args...]');
    process.exit(1);
  }

  if (process.env.BASE_URL) {
    process.exit(await runPlaywright(process.env.BASE_URL));
  }

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  attachServerLog(serverProcess, port);

  let exitCode = 1;
  try {
    await waitForServer(baseUrl, serverProcess);
    exitCode = await runPlaywright(baseUrl);
  } finally {
    if (serverProcess.exitCode === null) {
      serverProcess.kill();
      await sleep(250);
      if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
    }
  }
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
