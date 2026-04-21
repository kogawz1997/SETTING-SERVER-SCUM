const path = require('node:path');
const commandSandbox = require('../command-sandbox.cjs');

const COMMAND_FIELDS = {
  reload: 'reloadLootCommand',
  restart: 'restartServerCommand',
};

function configuredCommandDirs(config = {}, root = process.cwd()) {
  const roots = new Set([
    path.resolve(root),
    path.resolve(root, 'scripts'),
  ]);
  for (const field of Object.values(COMMAND_FIELDS)) {
    const command = String(config[field] || '').trim();
    if (!command) continue;
    const inspection = commandSandbox.inspectCommand(command, { cwd: root });
    if (inspection.resolvedPath) roots.add(path.dirname(inspection.resolvedPath));
  }
  return [...roots];
}

function commandLogDetail(kind, result) {
  const inspection = result?.inspection || {};
  return {
    kind,
    ok: !!result?.ok,
    status: result?.status ?? null,
    reason: inspection.reason || '',
    command: inspection.command || '',
    resolvedPath: inspection.resolvedPath || '',
    runner: inspection.execution?.runner || '',
    shell: inspection.execution?.shell === true,
    output: String(result?.output || '').slice(0, 1000),
  };
}

function createCommandRunner(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const loadConfig = typeof options.loadConfig === 'function' ? options.loadConfig : () => ({});
  const appendOperationLog = typeof options.appendOperationLog === 'function' ? options.appendOperationLog : null;
  const appendActivity = typeof options.appendActivity === 'function' ? options.appendActivity : null;
  const timeout = Number(options.timeout || 30000);

  function allowedRoots(config = loadConfig()) {
    const extra = Array.isArray(options.allowedRoots) ? options.allowedRoots : [];
    return [...new Set([...configuredCommandDirs(config, root), ...extra.map((entry) => path.resolve(root, entry))])];
  }

  function inspectCommand(command, inspectOptions = {}) {
    const config = inspectOptions.config || loadConfig();
    return commandSandbox.inspectCommand(command, {
      cwd: root,
      allowedRoots: inspectOptions.allowedRoots || allowedRoots(config),
    });
  }

  function runShellCommand(command, runOptions = {}) {
    const config = runOptions.config || loadConfig();
    const result = commandSandbox.runShellCommand(command, {
      cwd: root,
      timeout: Number(runOptions.timeout || timeout),
      allowedRoots: runOptions.allowedRoots || allowedRoots(config),
    });
    const detail = commandLogDetail(runOptions.kind || 'manual', result);
    if (appendOperationLog) appendOperationLog('command_run', detail);
    if (appendActivity) appendActivity('command_run', detail);
    return result;
  }

  function runConfiguredCommand(kind, runOptions = {}) {
    const field = COMMAND_FIELDS[kind];
    if (!field) throw new Error(`Unknown command kind: ${kind}`);
    const config = runOptions.config || loadConfig();
    return runShellCommand(config[field] || '', { ...runOptions, config, kind });
  }

  return {
    allowedRoots,
    inspectCommand,
    runShellCommand,
    runConfiguredCommand,
  };
}

module.exports = {
  createCommandRunner,
  configuredCommandDirs,
};
