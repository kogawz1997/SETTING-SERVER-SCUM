const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  ['basic checks', ['run', 'check']],
  ['release file checks', ['run', 'release:check']],
  ['config roundtrip check', ['run', 'config:roundtrip']],
  ['sample workspace smoke test', ['run', 'sample:smoke']],
  ['performance smoke test', ['run', 'performance:smoke']],
  ['docs link check', ['run', 'docs:check']],
  ['changelog check', ['run', 'changelog:check']],
  ['portable package build', ['run', 'package:portable']],
  ['portable package smoke check', ['run', 'package:portable:smoke']],
  ['portable zip smoke check', ['run', 'package:portable:zip-smoke']],
  ['full test suite', ['test']],
];

function runStep([label, args]) {
  const started = Date.now();
  console.log(`\n== ${label} ==`);
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : npmCmd;
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', [npmCmd, ...args].join(' ')]
    : args;
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', shell: false });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.error) {
    console.error(`\nCould not start "${label}": ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\nRelease quality failed at "${label}" after ${seconds}s.`);
    process.exit(result.status || 1);
  }
  console.log(`== ${label} passed in ${seconds}s ==`);
}

steps.forEach(runStep);
console.log('\nRelease quality gate passed.');
