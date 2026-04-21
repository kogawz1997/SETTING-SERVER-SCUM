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

function extractRunnablePath(command) {
  const patterns = [
    /^\s*cmd(?:\.exe)?\s+\/c\s+"([^"]+\.(?:cmd|bat|ps1|exe))"(?:\s.*)?$/i,
    /^\s*powershell(?:\.exe)?(?:\s+[^\r\n]+?)*\s+-file\s+"([^"]+\.(?:ps1))"(?:\s.*)?$/i,
    /^\s*"([^"]+\.(?:cmd|bat|ps1|exe))"(?:\s.*)?$/i,
    /^\s*([^\s]+\.(?:cmd|bat|ps1|exe))(?:\s.*)?$/i,
  ];
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function inspectCommand(command, options = {}) {
  const raw = String(command || '').trim();
  const cwd = path.resolve(options.cwd || process.cwd());
  if (!raw) {
    return {
      configured: false,
      runnable: false,
      sandboxed: true,
      reason: 'missing',
      message: 'ยังไม่ได้ตั้งคำสั่ง',
      command: '',
    };
  }
  if (hasBlockedToken(raw)) {
    return {
      configured: true,
      runnable: false,
      sandboxed: false,
      reason: 'blocked_token',
      message: 'คำสั่งมี token เสี่ยง เช่น chain shell, delete, หรือ powershell -Command',
      command: raw,
    };
  }

  const candidate = extractRunnablePath(raw);
  if (!candidate) {
    return {
      configured: true,
      runnable: false,
      sandboxed: false,
      reason: 'not_explicit_file',
      message: 'ต้องชี้ไปที่ไฟล์ .cmd/.bat/.ps1/.exe แบบชัดเจนเพื่อกันคำสั่ง shell เสี่ยง',
      command: raw,
    };
  }

  const resolvedPath = path.resolve(cwd, candidate);
  if (!fs.existsSync(resolvedPath)) {
    return {
      configured: true,
      runnable: false,
      sandboxed: true,
      reason: 'missing_path',
      message: 'ไม่พบไฟล์คำสั่งที่ตั้งไว้',
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
      message: 'path ที่ตั้งไว้เป็นโฟลเดอร์ ไม่ใช่ไฟล์คำสั่ง',
      command: raw,
      resolvedPath,
    };
  }
  return {
    configured: true,
    runnable: true,
    sandboxed: true,
    reason: 'file',
    message: 'configured file path',
    command: raw,
    resolvedPath,
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
  const result = spawnSync(command, {
    shell: true,
    cwd: path.resolve(options.cwd || process.cwd()),
    encoding: 'utf8',
    timeout: Number(options.timeout || 30000),
    windowsHide: true,
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
};
