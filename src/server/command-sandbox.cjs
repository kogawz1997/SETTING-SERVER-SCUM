const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BLOCKED_PATTERNS = [
  /\s&&\s/,
  /\s\|\|\s/,
  /[<>`]/,
  /\$\(/,
  /\b(remove-item|del|erase|rd|rmdir|format|shutdown|restart-computer|stop-process|taskkill|invoke-expression|iex)\b/i,
  /\bpowershell(?:\.exe)?\b[\s\S]*\s-command\b/i,
];

function hasBlockedToken(command) {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(command));
}

function tokenizeCommand(command) {
  const tokens = [];
  let current = '';
  let quote = '';
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (quote) {
      if (char === quote) {
        quote = '';
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (quote) return null;
  if (current) tokens.push(current);
  return tokens;
}

function normalizeWrapper(tokens) {
  if (!tokens?.length) return null;
  const first = path.basename(tokens[0]).toLowerCase();
  if ((first === 'cmd' || first === 'cmd.exe') && tokens[1]?.toLowerCase() === '/c') {
    return { target: tokens[2] || '', args: tokens.slice(3), wrapper: 'cmd' };
  }
  if (first === 'powershell' || first === 'powershell.exe' || first === 'pwsh' || first === 'pwsh.exe') {
    const fileIndex = tokens.findIndex((token) => token.toLowerCase() === '-file');
    if (fileIndex >= 0) return { target: tokens[fileIndex + 1] || '', args: tokens.slice(fileIndex + 2), wrapper: 'powershell' };
  }
  return { target: tokens[0], args: tokens.slice(1), wrapper: '' };
}

function isInsideAllowedRoot(candidate, allowedRoots = []) {
  if (!allowedRoots.length) return true;
  const resolvedCandidate = path.resolve(candidate);
  return allowedRoots.some((root) => {
    const resolvedRoot = path.resolve(root);
    const relative = path.relative(resolvedRoot, resolvedCandidate);
    return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  });
}

function quoteForCmd(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteArgForCmd(value) {
  const text = String(value);
  return /\s/.test(text) ? quoteForCmd(text) : text;
}

function buildExecutionPlan(resolvedPath, args = []) {
  const extension = path.extname(resolvedPath).toLowerCase();
  if (extension === '.cmd' || extension === '.bat') {
    const runner = process.env.ComSpec || path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
    const command = ['call', quoteForCmd(resolvedPath), ...args.map(quoteArgForCmd)].join(' ');
    return {
      shell: false,
      runner,
      args: ['/d', '/s', '/c', command],
      windowsVerbatimArguments: true,
    };
  }
  if (extension === '.ps1') {
    return {
      shell: false,
      runner: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolvedPath, ...args],
    };
  }
  return {
    shell: false,
    runner: resolvedPath,
    args,
  };
}

function inspectCommand(command, options = {}) {
  const raw = String(command || '').trim();
  const cwd = path.resolve(options.cwd || process.cwd());
  const allowedRoots = Array.isArray(options.allowedRoots)
    ? options.allowedRoots.filter(Boolean).map((root) => path.resolve(cwd, root))
    : [];

  if (!raw) {
    return {
      configured: false,
      runnable: false,
      sandboxed: true,
      reason: 'missing',
      message: 'Command has not been configured.',
      command: '',
    };
  }
  if (hasBlockedToken(raw)) {
    return {
      configured: true,
      runnable: false,
      sandboxed: false,
      reason: 'blocked_token',
      message: 'Command contains risky shell tokens such as chaining, deletion, or powershell -Command.',
      command: raw,
    };
  }

  const tokens = tokenizeCommand(raw);
  const parsed = normalizeWrapper(tokens);
  if (!parsed?.target || !/\.(cmd|bat|ps1|exe)$/i.test(parsed.target)) {
    return {
      configured: true,
      runnable: false,
      sandboxed: false,
      reason: 'not_explicit_file',
      message: 'Command must point to an explicit .cmd/.bat/.ps1/.exe file.',
      command: raw,
    };
  }

  const resolvedPath = path.resolve(cwd, parsed.target);
  if (!isInsideAllowedRoot(resolvedPath, allowedRoots)) {
    return {
      configured: true,
      runnable: false,
      sandboxed: true,
      reason: 'outside_allowlist',
      message: 'Command file is outside the allowed command folders.',
      command: raw,
      resolvedPath,
    };
  }
  if (!fs.existsSync(resolvedPath)) {
    return {
      configured: true,
      runnable: false,
      sandboxed: true,
      reason: 'missing_path',
      message: 'Command file was not found.',
      command: raw,
      resolvedPath,
    };
  }
  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    return {
      configured: true,
      runnable: false,
      sandboxed: true,
      reason: 'directory',
      message: 'Configured command path is a folder, not a file.',
      command: raw,
      resolvedPath,
    };
  }

  return {
    configured: true,
    runnable: true,
    sandboxed: true,
    reason: 'file',
    message: 'Configured command file is runnable.',
    command: raw,
    resolvedPath,
    args: parsed.args,
    wrapper: parsed.wrapper,
    execution: buildExecutionPlan(resolvedPath, parsed.args),
  };
}

function runShellCommand(command, options = {}) {
  const inspection = inspectCommand(command, options);
  if (!inspection.runnable) {
    return {
      ok: false,
      inspection,
      output: inspection.message,
      status: null,
    };
  }
  const result = spawnSync(inspection.execution.runner, inspection.execution.args, {
    shell: false,
    cwd: path.resolve(options.cwd || process.cwd()),
    encoding: 'utf8',
    timeout: Number(options.timeout || 30000),
    windowsHide: true,
    windowsVerbatimArguments: Boolean(inspection.execution.windowsVerbatimArguments),
  });
  const output = [result.stdout || '', result.stderr || ''].filter(Boolean).join('\n').trim();
  return {
    ok: result.status === 0,
    inspection,
    output,
    status: result.status,
  };
}

module.exports = {
  inspectCommand,
  runShellCommand,
  tokenizeCommand,
  buildExecutionPlan,
};
