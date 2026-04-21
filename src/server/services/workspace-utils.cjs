function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeKey(value) {
  return String(value || '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function posixify(value) {
  return String(value || '').replace(/\\/g, '/');
}

function sortByName(list, key = 'name') {
  return [...list].sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || '')));
}

function walkFiles(fs, path, dir, filter = () => true, baseDir = dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fs, path, fullPath, filter, baseDir, results);
    } else if (filter(fullPath, entry.name)) {
      results.push({
        fullPath,
        relPath: posixify(path.relative(baseDir, fullPath)),
        name: entry.name,
      });
    }
  }
  return results;
}

module.exports = {
  clone,
  normalizeKey,
  posixify,
  sortByName,
  walkFiles,
};
