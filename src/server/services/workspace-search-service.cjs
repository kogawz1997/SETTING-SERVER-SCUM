function createWorkspaceSearchService(deps) {
  const {
    resolvedPaths,
    allWorkspaceLogicalPaths,
    resolveLogicalPath,
    readText,
    scanLootWorkspace,
    analyzeOverview,
  } = deps;

  function exactLineMatch(line, term) {
    const escaped = String(term || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escaped) return false;
    return new RegExp(`(^|[^A-Za-z0-9_.-])${escaped}($|[^A-Za-z0-9_.-])`, 'i').test(line);
  }

  function logicalPathSearchScope(logicalPath) {
    if (logicalPath.startsWith('Nodes/')) return 'nodes';
    if (logicalPath.startsWith('Spawners/')) return 'spawners';
    if (logicalPath.endsWith('.ini')) return 'ini';
    return 'core';
  }

  function matchesSearchScope(logicalPath, scope) {
    if (!scope || scope === '__all') return true;
    if (scope === 'json') return logicalPath.endsWith('.json');
    if (scope === 'ini') return logicalPath.endsWith('.ini');
    if (scope === 'core') return !logicalPath.startsWith('Nodes/') && !logicalPath.startsWith('Spawners/');
    return logicalPathSearchScope(logicalPath) === scope;
  }

  function searchIssueResults(issue, term, scan = scanLootWorkspace()) {
    const lowered = String(term || '').trim().toLowerCase();
    const overview = analyzeOverview(scan);
    if (issue === 'missing_refs') {
      return (overview.missingRefs || [])
        .filter((entry) => !lowered || `${entry.nodeName} ${entry.spawner}`.toLowerCase().includes(lowered))
        .map((entry) => {
          const spawnerFile = scan.spawners.find((file) => file.logicalName === entry.spawner);
          return {
            path: spawnerFile?.relPath || entry.spawner,
            type: 'missing_ref',
            scope: 'spawners',
            matchCount: 1,
            matches: [{ path: entry.nodeName, preview: `Missing node ref "${entry.nodeName}" used by ${entry.spawner}` }],
          };
        });
    }
    if (issue === 'unused_nodes') {
      return (overview.unusedNodes || [])
        .filter((entry) => !lowered || `${entry.nodeName} ${entry.path}`.toLowerCase().includes(lowered))
        .map((entry) => ({
          path: entry.path,
          type: 'unused_node',
          scope: 'nodes',
          matchCount: 1,
          matches: [{ path: entry.nodeName, preview: `Node file "${entry.nodeName}" is not referenced by any spawner` }],
        }));
    }
    return [];
  }

  function searchWorkspace(term, paths = resolvedPaths(), options = {}) {
    const lowered = String(term || '').trim().toLowerCase();
    const issue = String(options.issue || '__all');
    if (issue !== '__all') return searchIssueResults(issue, term);
    if (!lowered) return [];
    const scope = String(options.scope || '__all');
    const exact = String(options.match || 'partial') === 'exact';
    const logicalPaths = allWorkspaceLogicalPaths(paths).filter((logicalPath) => matchesSearchScope(logicalPath, scope));
    const results = logicalPaths.map((logicalPath) => {
      const content = readText(resolveLogicalPath(logicalPath, paths));
      const lines = content.split(/\r?\n/);
      const matches = [];
      lines.forEach((line, index) => {
        const isMatch = exact ? exactLineMatch(line, term) : line.toLowerCase().includes(lowered);
        if (isMatch && matches.length < 8) {
          matches.push({ path: `line ${index + 1}`, preview: line.trim().slice(0, 180) });
        }
      });
      return matches.length ? { path: logicalPath, type: logicalPath.endsWith('.json') ? 'json' : 'ini', scope: logicalPathSearchScope(logicalPath), matchCount: matches.length, matches } : null;
    }).filter(Boolean);
    return results.sort((a, b) => b.matchCount - a.matchCount || a.path.localeCompare(b.path));
  }

  return {
    exactLineMatch,
    logicalPathSearchScope,
    matchesSearchScope,
    searchWorkspace,
  };
}

module.exports = {
  createWorkspaceSearchService,
};
