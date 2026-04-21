const { AppError } = require('./errors.cjs');
const { sanitizeLogicalPath } = require('./safe-apply.cjs');

const PACKAGE_KIND = 'scum-local-control-package';
const PACKAGE_VERSION = 1;

function normalizePackageFile(file = {}) {
  const logicalPath = sanitizeLogicalPath(file.path || file.logicalPath || file.relPath);
  return {
    path: logicalPath,
    content: String(file.content ?? ''),
  };
}

function createWorkspacePackage(options = {}) {
  const files = Array.isArray(options.files) ? options.files.map(normalizePackageFile) : [];
  return {
    kind: PACKAGE_KIND,
    version: PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    meta: {
      note: String(options.meta?.note || ''),
      source: 'SETTING SERVER SCUM',
    },
    config: options.config && typeof options.config === 'object' ? options.config : {},
    files,
  };
}

function parseWorkspacePackage(input) {
  let data = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (error) {
      throw new AppError('ไฟล์ package ไม่ใช่ JSON ที่ถูกต้อง', { status: 400, code: 'invalid_package_json' });
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AppError('package ไม่ถูกต้อง', { status: 400, code: 'invalid_package' });
  }
  if (data.kind !== PACKAGE_KIND || Number(data.version) !== PACKAGE_VERSION) {
    throw new AppError('package version ไม่รองรับ', {
      status: 400,
      code: 'unsupported_package',
      details: { kind: data.kind, version: data.version },
    });
  }
  const files = Array.isArray(data.files) ? data.files.map(normalizePackageFile) : [];
  return {
    kind: PACKAGE_KIND,
    version: PACKAGE_VERSION,
    exportedAt: data.exportedAt || '',
    meta: data.meta && typeof data.meta === 'object' ? data.meta : {},
    config: data.config && typeof data.config === 'object' ? data.config : {},
    files,
  };
}

module.exports = {
  PACKAGE_KIND,
  PACKAGE_VERSION,
  createWorkspacePackage,
  parseWorkspacePackage,
};
