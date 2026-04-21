const fs = require('node:fs');
const path = require('node:path');
const { AppError } = require('./errors.cjs');

function posixify(value) {
  return String(value || '').replace(/\\/g, '/');
}

function sanitizeLogicalPath(logicalPath) {
  const normalized = posixify(logicalPath).replace(/^\/+/, '');
  if (!normalized) {
    throw new AppError('ต้องเลือกไฟล์ก่อน', { status: 400, code: 'missing_logical_path' });
  }
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new AppError('path ไฟล์ไม่ปลอดภัย', { status: 400, code: 'invalid_logical_path', details: { path: logicalPath } });
  }
  const allowed = [
    'ServerSettings.ini',
    'GameUserSettings.ini',
    'EconomyOverride.json',
  ];
  if (!allowed.includes(normalized) && !/^(Nodes|Spawners)\//.test(normalized)) {
    throw new AppError('ไฟล์นี้อยู่นอกพื้นที่ที่แอปอนุญาตให้แก้', { status: 400, code: 'unsupported_logical_path', details: { path: normalized } });
  }
  return normalized;
}

function buildSafeApplyPlan(options = {}) {
  const logicalPath = sanitizeLogicalPath(options.logicalPath);
  const targetPath = options.resolveLogicalPath(logicalPath);
  const beforeText = fs.existsSync(targetPath) ? options.readText(targetPath) : '';
  const afterText = String(options.content ?? '');
  const validation = options.validateContent(logicalPath, afterText);
  const criticalCount = validation?.counts?.critical || 0;
  const changed = beforeText !== afterText;
  const patch = options.createDiff(logicalPath, beforeText, afterText);
  const stat = fs.existsSync(targetPath) ? fs.statSync(targetPath) : null;

  return {
    ok: criticalCount === 0,
    dryRun: true,
    logicalPath,
    targetPath,
    exists: Boolean(stat),
    beforeSize: beforeText.length,
    afterSize: afterText.length,
    changed,
    willWrite: changed && criticalCount === 0,
    backupRequired: changed,
    validation,
    patch,
    blockers: criticalCount ? validation.entries.filter((entry) => entry.severity === 'critical') : [],
  };
}

function restoreFromBackup(backup, logicalPath, targetPath) {
  if (!backup?.backupDir) return false;
  const sourcePath = path.join(backup.backupDir, posixify(logicalPath));
  if (!fs.existsSync(sourcePath)) return false;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function applySafePlan(options = {}) {
  const plan = buildSafeApplyPlan(options);
  if (!plan.ok) {
    throw new AppError('ยัง apply ไม่ได้ เพราะมี validation ระดับ critical', {
      status: 400,
      code: 'safe_apply_blocked',
      details: { blockers: plan.blockers },
    });
  }
  if (!plan.changed) {
    return { ...plan, dryRun: false, written: false, backup: null };
  }
  const backup = options.createBackup(options.paths, [plan.logicalPath], options.backupNote || `safe-apply:${plan.logicalPath}`);
  try {
    options.writeText(plan.targetPath, String(options.content ?? ''));
  } catch (error) {
    const rolledBack = restoreFromBackup(backup, plan.logicalPath, plan.targetPath);
    if (typeof options.appendActivity === 'function') {
      options.appendActivity('safe_apply_rollback', {
        path: plan.logicalPath,
        backup: backup?.backupName || '',
        rolledBack,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (error && typeof error === 'object') {
      error.rollback = { rolledBack, backupName: backup?.backupName || '' };
    }
    throw error;
  }
  if (typeof options.appendActivity === 'function') {
    options.appendActivity('safe_apply', { path: plan.logicalPath, backup: backup?.backupName || '' });
  }
  return { ...plan, dryRun: false, written: true, backup };
}

module.exports = {
  sanitizeLogicalPath,
  buildSafeApplyPlan,
  applySafePlan,
};
