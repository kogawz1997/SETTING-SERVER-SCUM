function createWorkspaceHealthService(deps) {
  const {
    fs,
    ITEM_ICON_DIR,
    CORE_FILES,
    nowIso,
    buildHealthNextActions,
    loadConfig,
    resolvedPaths,
    inspectConfigFolder,
    inspectCommand,
    listBackups,
    safeScanLootWorkspace,
    analyzeLootObject,
    analyzeOverview,
    buildStartupDoctorReport,
    readActivity,
    buildItemCatalog,
    detectLootSchemaKinds,
    LOOT_SCHEMA_VERSION,
    ITEM_CATEGORY_RULES,
    ROOT,
  } = deps;

  function readinessCheck(id, label, status, severity, detail = '', action = '') {
    return { id, label, status, severity, detail, action };
  }

  function buildReadinessReport(config = loadConfig(), paths = resolvedPaths(config)) {
    const inspection = inspectConfigFolder(config.scumConfigDir, config.nodesDir, config.spawnersDir);
    const commandHealth = {
      reload: inspectCommand(config.reloadLootCommand),
      restart: inspectCommand(config.restartServerCommand),
    };
    const checks = [];
    const fileHealth = inspection.fileHealth || {};
    checks.push(readinessCheck(
      'config_root',
      'SCUM config folder',
      inspection.rootExists ? 'ok' : 'bad',
      inspection.rootExists ? 'info' : 'critical',
      inspection.rootPath || 'Not configured',
      'Set the real server config folder in App Settings.',
    ));
    CORE_FILES.forEach((fileName) => {
      checks.push(readinessCheck(
        `core_${fileName}`,
        fileName,
        fileHealth[fileName] ? 'ok' : 'bad',
        fileHealth[fileName] ? 'info' : 'critical',
        fileHealth[fileName] ? 'Found in config root' : `Missing ${fileName}`,
        `Put ${fileName} in the configured SCUM config folder.`,
      ));
    });
    checks.push(readinessCheck(
      'nodes_folder',
      'Nodes folder',
      inspection.nodesExists ? 'ok' : 'bad',
      inspection.nodesExists ? 'info' : 'critical',
      inspection.nodesPath || 'Not configured',
      'Set Nodes folder or leave it blank only if the default SCUM path exists.',
    ));
    checks.push(readinessCheck(
      'spawners_folder',
      'Spawners folder',
      inspection.spawnersExists ? 'ok' : 'bad',
      inspection.spawnersExists ? 'info' : 'critical',
      inspection.spawnersPath || 'Not configured',
      'Set Spawners folder or leave it blank only if the default SCUM path exists.',
    ));
    checks.push(readinessCheck(
      'reload_command',
      'Reload command',
      commandHealth.reload.runnable ? 'ok' : 'warn',
      commandHealth.reload.runnable ? 'info' : 'warning',
      commandHealth.reload.command || commandHealth.reload.reason || 'Not configured',
      'Optional, but needed for Save + Reload.',
    ));
    checks.push(readinessCheck(
      'restart_command',
      'Restart command',
      commandHealth.restart.runnable ? 'ok' : 'warn',
      commandHealth.restart.runnable ? 'info' : 'warning',
      commandHealth.restart.command || commandHealth.restart.reason || 'Not configured',
      'Optional safety command for full server restart.',
    ));

    let backups = [];
    let backupError = '';
    try {
      backups = listBackups(paths);
      checks.push(readinessCheck(
        'backup_folder',
        'Backup folder',
        'ok',
        'info',
        `${paths.backupDir} (${backups.length} backups)`,
        'Backups are available before save/apply.',
      ));
      if (!backups.length) {
        checks.push(readinessCheck(
          'backup_history',
          'Backup history',
          'warn',
          'warning',
          'No backup has been created yet',
          'Create a manual backup before the first real edit.',
        ));
      }
    } catch (error) {
      backupError = error instanceof Error ? error.message : String(error);
      checks.push(readinessCheck(
        'backup_folder',
        'Backup folder',
        'bad',
        'critical',
        backupError,
        'Fix backup folder permission or path.',
      ));
    }

    let scan = { nodes: [], spawners: [], refs: [], refIndex: new Map(), errors: [], listed: { nodes: [], spawners: [] } };
    let overview = null;
    const validationCounts = { critical: 0, warning: 0, info: 0, fixable: 0 };
    const validationFiles = [];
    if (inspection.nodesExists || inspection.spawnersExists) {
      scan = safeScanLootWorkspace(paths);
      for (const error of scan.errors) {
        checks.push(readinessCheck(
          `parse_${error.path}`,
          `Invalid JSON: ${error.path}`,
          'bad',
          'critical',
          error.message,
          'Open the file and fix JSON syntax before saving/applying.',
        ));
      }
      [...scan.nodes, ...scan.spawners].forEach((file) => {
        const result = analyzeLootObject(file.object, file.relPath, scan);
        const counts = result.validation?.counts || {};
        validationCounts.critical += counts.critical || 0;
        validationCounts.warning += counts.warning || 0;
        validationCounts.info += counts.info || 0;
        validationCounts.fixable += result.validation?.fixableCount || 0;
        if ((counts.critical || 0) || (counts.warning || 0)) {
          validationFiles.push({
            path: file.relPath,
            critical: counts.critical || 0,
            warning: counts.warning || 0,
            fixable: result.validation?.fixableCount || 0,
          });
        }
      });
      overview = analyzeOverview(scan);
    }

    const lootFileCount = scan.nodes.length + scan.spawners.length;
    checks.push(readinessCheck(
      'loot_files',
      'Loot files',
      lootFileCount ? 'ok' : 'warn',
      lootFileCount ? 'info' : 'warning',
      `${scan.nodes.length} nodes, ${scan.spawners.length} spawners`,
      'Add or point to real Nodes/Spawners files to use Loot Studio.',
    ));
    if (validationCounts.critical || validationCounts.warning) {
      checks.push(readinessCheck(
        'loot_validation',
        'Loot validation',
        validationCounts.critical ? 'bad' : 'warn',
        validationCounts.critical ? 'critical' : 'warning',
        `${validationCounts.critical} critical, ${validationCounts.warning} warnings, ${validationCounts.fixable} fixable`,
        'Open Loot Studio and use Fix draft/Auto-fix on the listed files.',
      ));
    } else if (lootFileCount) {
      checks.push(readinessCheck('loot_validation', 'Loot validation', 'ok', 'info', 'No blocking validation issues found', ''));
    }
    if (overview?.missingRefs?.length) {
      checks.push(readinessCheck(
        'missing_refs',
        'Missing node refs',
        'bad',
        'critical',
        `${overview.missingRefs.length} spawner refs point to missing node branches`,
        'Fix spawner refs or create the missing node branches.',
      ));
    } else if (lootFileCount) {
      checks.push(readinessCheck('missing_refs', 'Missing node refs', 'ok', 'info', 'No missing spawner refs found', ''));
    }
    if (overview?.unusedNodes?.length) {
      checks.push(readinessCheck(
        'unused_nodes',
        'Unused node files',
        'ok',
        'info',
        `${overview.unusedNodes.length} node files are not referenced by spawners`,
        'Advisory only. Review unused nodes in Analyzer/Search before deleting or wiring them.',
      ));
    }
    const hasItemIcons = fs.existsSync(ITEM_ICON_DIR);
    checks.push(readinessCheck(
      'item_icons',
      'Item icons',
      hasItemIcons ? 'ok' : 'warn',
      hasItemIcons ? 'info' : 'warning',
      hasItemIcons ? ITEM_ICON_DIR : 'Icon folder not found',
      'Put item icon files in scum_items-main to improve Loot Studio autocomplete.',
    ));

    const counts = {
      nodes: scan.nodes.length,
      spawners: scan.spawners.length,
      files: lootFileCount,
      backups: backups.length,
      parseErrors: scan.errors.length,
      critical: checks.filter((check) => check.status === 'bad').length,
      warning: checks.filter((check) => check.status === 'warn').length,
      validationCritical: validationCounts.critical,
      validationWarning: validationCounts.warning,
      validationInfo: validationCounts.info,
      fixable: validationCounts.fixable,
      missingRefs: overview?.missingRefs?.length || 0,
      unusedNodes: overview?.unusedNodes?.length || 0,
    };
    const score = Math.max(0, Math.min(100, 100
      - (counts.critical * 14)
      - (counts.warning * 5)
      - Math.min(25, counts.validationCritical * 4)
      - Math.min(12, counts.validationWarning)
      - Math.min(18, counts.missingRefs * 3)));
    const blockers = checks.filter((check) => check.status === 'bad');
    const ready = blockers.length === 0 && counts.validationCritical === 0 && counts.parseErrors === 0 && counts.missingRefs === 0;
    const reportCore = { ready, score, counts, checks, blockers, latestBackup: backups[0] || null };
    return {
      ready,
      score,
      generatedAt: nowIso(),
      counts,
      checks,
      blockers,
      nextActions: buildHealthNextActions(reportCore),
      validationFiles: validationFiles.sort((a, b) => b.critical - a.critical || b.warning - a.warning || a.path.localeCompare(b.path)).slice(0, 30),
      latestBackup: backups[0] || null,
      backupError,
      overview: overview ? {
        balance: overview.balance,
        warnings: overview.warnings,
        totals: overview.totals,
      } : null,
      paths,
      commandHealth,
    };
  }

  function commandDiagnostic(command = {}) {
    return {
      configured: Boolean(command.configured),
      runnable: Boolean(command.runnable),
      reason: command.reason || '',
    };
  }

  function buildDiagnosticsReport(options = {}) {
    const includePaths = String(options.includePaths ?? 'true') !== 'false';
    const config = loadConfig();
    const paths = resolvedPaths(config);
    const startupDoctor = buildStartupDoctorReport({ config, root: ROOT, inspectCommand });
    const readiness = buildReadinessReport(config, paths);
    const activity = readActivity(80);
    let scan = { nodes: [], spawners: [], errors: [] };
    let itemCatalog = { total: 0, categories: [], overridesCount: 0 };
    try {
      scan = safeScanLootWorkspace(paths);
      itemCatalog = buildItemCatalog(scan, { limit: 1 });
    } catch (error) {
      scan.errors = [{ path: 'workspace', type: 'scan', message: error instanceof Error ? error.message : String(error) }];
    }
    const activityCounts = activity.reduce((acc, entry) => {
      acc[entry.type || 'unknown'] = (acc[entry.type || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    const stripCheckDetail = (check) => ({
      id: check.id,
      label: check.label,
      status: check.status,
      severity: check.severity,
      detail: includePaths ? check.detail : '',
      action: check.action,
    });
    return {
      generatedAt: nowIso(),
      app: {
        name: 'scum-local-control',
        version: '1.0.0',
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: includePaths ? ROOT : '',
      },
      config: {
        hasConfigRoot: Boolean(config.scumConfigDir),
        hasCustomNodesDir: Boolean(config.nodesDir),
        hasCustomSpawnersDir: Boolean(config.spawnersDir),
        hasBackupDir: Boolean(config.backupDir),
        scumConfigDir: includePaths ? paths.scumConfigDir : '',
        nodesDir: includePaths ? paths.nodesDir : '',
        spawnersDir: includePaths ? paths.spawnersDir : '',
        backupDir: includePaths ? paths.backupDir : '',
        reloadCommand: commandDiagnostic(readiness.commandHealth?.reload),
        restartCommand: commandDiagnostic(readiness.commandHealth?.restart),
      },
      readiness: {
        ready: readiness.ready,
        score: readiness.score,
        counts: readiness.counts,
        checks: (readiness.checks || []).map(stripCheckDetail),
        blockers: (readiness.blockers || []).map(stripCheckDetail),
        validationFiles: readiness.validationFiles || [],
        latestBackup: readiness.latestBackup ? {
          name: readiness.latestBackup.name,
          updatedAt: readiness.latestBackup.updatedAt,
          tag: readiness.latestBackup.tag,
          fileCount: readiness.latestBackup.fileCount,
        } : null,
      },
      startupDoctor: {
        ready: startupDoctor.ready,
        counts: startupDoctor.counts,
        checks: (startupDoctor.checks || []).map(stripCheckDetail),
        nextStep: startupDoctor.nextStep,
      },
      loot: {
        nodes: scan.nodes.length,
        spawners: scan.spawners.length,
        parseErrors: scan.errors || [],
        schema: {
          version: LOOT_SCHEMA_VERSION,
          categories: ITEM_CATEGORY_RULES.map((rule) => rule.id).concat('other'),
          detectedKinds: detectLootSchemaKinds(scan),
        },
        itemCatalog: {
          total: itemCatalog.total || 0,
          categories: itemCatalog.categories || [],
          overridesCount: itemCatalog.overridesCount || 0,
        },
        overview: readiness.overview || null,
      },
      activity: {
        sampled: activity.length,
        counts: activityCounts,
        recent: activity.slice(0, 20).map((entry) => ({
          at: entry.at,
          type: entry.type,
          path: includePaths ? (entry.path || '') : '',
          backup: entry.backup || '',
          ok: entry.ok,
        })),
      },
    };
  }

  return {
    readinessCheck,
    commandDiagnostic,
    buildReadinessReport,
    buildDiagnosticsReport,
  };
}

module.exports = {
  createWorkspaceHealthService,
};
