const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripBom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : '';
}

function readText(filePath) {
  return stripBom(fs.readFileSync(filePath, 'utf8'));
}

function atomicWriteText(filePath, content) {
  ensureDir(path.dirname(filePath));
  const fileName = path.basename(filePath);
  const tmpPath = path.join(
    path.dirname(filePath),
    `.${fileName}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp-write`,
  );
  let handle = null;
  try {
    handle = fs.openSync(tmpPath, 'w');
    fs.writeFileSync(handle, String(content), 'utf8');
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = null;
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    if (handle !== null) {
      try {
        fs.closeSync(handle);
      } catch {
        // Best effort cleanup only.
      }
    }
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      // The original file is more important than removing a temp file.
    }
    throw error;
  }
}

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return clone(fallback);
    return JSON.parse(readText(filePath));
  } catch {
    return clone(fallback);
  }
}

function saveJson(filePath, value) {
  atomicWriteText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function fingerprintFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, size: 0, sha256: '', mtimeMs: 0 };
  }
  const buffer = fs.readFileSync(filePath);
  const stat = fs.statSync(filePath);
  return {
    exists: true,
    size: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    mtimeMs: stat.mtimeMs,
  };
}

module.exports = {
  ensureDir,
  stripBom,
  readText,
  atomicWriteText,
  writeText: atomicWriteText,
  loadJson,
  saveJson,
  fingerprintFile,
};
