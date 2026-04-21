const fs = require('node:fs');
const path = require('node:path');

const CORE_FILES = ['ServerSettings.ini', 'GameUserSettings.ini', 'EconomyOverride.json'];

function resolveFromRoot(root, value) {
  return value ? path.resolve(root || process.cwd(), value) : '';
}

function check(id, label, status, detail, action = '') {
  const severity = status === 'bad' ? 'critical' : status === 'warn' ? 'warning' : 'info';
  return { id, label, status, severity, detail, action };
}

function writeProbe(dirPath) {
  try {
    if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return { ok: false, reason: 'missing_directory' };
    }
    const probePath = path.join(dirPath, `.scum-startup-probe-${process.pid}-${Date.now()}.tmp`);
    fs.writeFileSync(probePath, 'ok', 'utf8');
    fs.unlinkSync(probePath);
    return { ok: true, reason: 'writable' };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function nextStepFor(checks) {
  const firstBad = checks.find((item) => item.status === 'bad');
  if (!firstBad) return { action: 'open-dashboard', label: 'Open dashboard and run preflight again.' };
  if (firstBad.id.startsWith('paths.') || firstBad.id.startsWith('core.')) {
    return { action: 'open-settings', label: 'Open App Settings and fix the SCUM config path first.' };
  }
  if (firstBad.id.startsWith('permissions.') || firstBad.id === 'backup.folder') {
    return { action: 'open-settings', label: 'Fix folder permission or choose another backup path.' };
  }
  return { action: 'open-diagnostics', label: 'Open diagnostics and fix the first critical item.' };
}

function buildStartupDoctorReport(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const config = options.config || {};
  const inspectCommand = typeof options.inspectCommand === 'function'
    ? options.inspectCommand
    : () => ({ configured: false, runnable: false, reason: 'missing' });
  const configRoot = resolveFromRoot(root, config.scumConfigDir);
  const nodesDir = resolveFromRoot(root, config.nodesDir) || (configRoot ? path.join(configRoot, 'Loot', 'Nodes', 'Current') : '');
  const spawnersDir = resolveFromRoot(root, config.spawnersDir) || (configRoot ? path.join(configRoot, 'Loot', 'Spawners', 'Presets', 'Override') : '');
  const backupDir = resolveFromRoot(root, config.backupDir || '.control-plane-backups');

  const checks = [];
  const configRootExists = Boolean(configRoot && fs.existsSync(configRoot) && fs.statSync(configRoot).isDirectory());
  checks.push(check(
    'paths.configRoot',
    'SCUM config folder',
    configRootExists ? 'ok' : 'bad',
    configRoot || 'Not configured',
    'Choose the folder that contains ServerSettings.ini.',
  ));

  for (const fileName of CORE_FILES) {
    const filePath = configRoot ? path.join(configRoot, fileName) : '';
    checks.push(check(
      `core.${fileName}`,
      fileName,
      filePath && fs.existsSync(filePath) ? 'ok' : 'bad',
      filePath || `Missing ${fileName}`,
      `Put ${fileName} in the configured SCUM config folder.`,
    ));
  }

  checks.push(check(
    'paths.nodes',
    'Nodes folder',
    nodesDir && fs.existsSync(nodesDir) ? 'ok' : 'bad',
    nodesDir || 'Not configured',
    'Choose the Nodes folder or use the standard SCUM path.',
  ));
  checks.push(check(
    'paths.spawners',
    'Spawners folder',
    spawnersDir && fs.existsSync(spawnersDir) ? 'ok' : 'bad',
    spawnersDir || 'Not configured',
    'Choose the Spawners folder or use the standard SCUM path.',
  ));

  const backupProbe = writeProbe(backupDir);
  checks.push(check(
    'permissions.backup',
    'Backup write permission',
    backupProbe.ok ? 'ok' : 'bad',
    backupProbe.ok ? backupDir : `${backupDir} (${backupProbe.reason})`,
    'Choose a backup folder the app can write to.',
  ));
  const configProbe = writeProbe(configRoot);
  checks.push(check(
    'permissions.configRoot',
    'Config write permission',
    configProbe.ok ? 'ok' : 'bad',
    configProbe.ok ? configRoot : `${configRoot || 'Not configured'} (${configProbe.reason})`,
    'Run the launcher with permission to edit the SCUM config folder.',
  ));

  const reload = inspectCommand(config.reloadLootCommand || '');
  checks.push(check(
    'commands.reload',
    'Reload command',
    reload.runnable ? 'ok' : 'warn',
    reload.runnable ? reload.resolvedPath : (reload.reason || 'Not configured'),
    'Optional: configure this when you want Save + Reload.',
  ));
  const restart = inspectCommand(config.restartServerCommand || '');
  checks.push(check(
    'commands.restart',
    'Restart command',
    restart.runnable ? 'ok' : 'warn',
    restart.runnable ? restart.resolvedPath : (restart.reason || 'Not configured'),
    'Optional: configure this when you want one-click restart.',
  ));

  const counts = {
    ok: checks.filter((item) => item.status === 'ok').length,
    warn: checks.filter((item) => item.status === 'warn').length,
    bad: checks.filter((item) => item.status === 'bad').length,
  };
  return {
    ready: counts.bad === 0,
    generatedAt: new Date().toISOString(),
    paths: { configRoot, nodesDir, spawnersDir, backupDir },
    checks,
    counts,
    nextStep: nextStepFor(checks),
  };
}

module.exports = {
  buildStartupDoctorReport,
  writeProbe,
};
