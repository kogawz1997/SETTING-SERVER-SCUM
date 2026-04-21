const fs = require('node:fs');
const path = require('node:path');
const { atomicWriteText, fingerprintFile } = require('./file-store.cjs');

function readSnapshot(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, content: null, fingerprint: fingerprintFile(filePath) };
  }
  return {
    exists: true,
    content: fs.readFileSync(filePath, 'utf8'),
    fingerprint: fingerprintFile(filePath),
  };
}

function restoreSnapshot(filePath, snapshot) {
  if (!snapshot.exists) {
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  atomicWriteText(filePath, snapshot.content);
}

function applyFileTransaction(options = {}) {
  const operations = Array.isArray(options.operations) ? options.operations.filter(Boolean) : [];
  const writeText = typeof options.writeText === 'function' ? options.writeText : atomicWriteText;
  const appendActivity = typeof options.appendActivity === 'function' ? options.appendActivity : null;
  const snapshots = operations.map((operation) => ({
    logicalPath: operation.logicalPath,
    targetPath: operation.targetPath,
    before: readSnapshot(operation.targetPath),
  }));
  const written = [];
  try {
    for (const operation of operations) {
      writeText(operation.targetPath, String(operation.content ?? ''));
      written.push({
        logicalPath: operation.logicalPath,
        targetPath: operation.targetPath,
        after: fingerprintFile(operation.targetPath),
      });
    }
    const result = {
      ok: true,
      written: written.length,
      files: written,
      rolledBack: false,
      before: snapshots.map((snapshot) => ({
        logicalPath: snapshot.logicalPath,
        targetPath: snapshot.targetPath,
        fingerprint: snapshot.before.fingerprint,
      })),
    };
    if (appendActivity) appendActivity('file_transaction', { written: result.written, rolledBack: false });
    return result;
  } catch (error) {
    const rollbacks = [];
    for (const snapshot of snapshots.slice().reverse()) {
      try {
        restoreSnapshot(snapshot.targetPath, snapshot.before);
        rollbacks.push({ logicalPath: snapshot.logicalPath, targetPath: snapshot.targetPath, ok: true });
      } catch (rollbackError) {
        rollbacks.push({
          logicalPath: snapshot.logicalPath,
          targetPath: snapshot.targetPath,
          ok: false,
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        });
      }
    }
    if (appendActivity) {
      appendActivity('file_transaction_rollback', {
        written: written.length,
        rollbackCount: rollbacks.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (error && typeof error === 'object') {
      error.transaction = { written, rollbacks };
    }
    throw error;
  }
}

module.exports = {
  applyFileTransaction,
};
