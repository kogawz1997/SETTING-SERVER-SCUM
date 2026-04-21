const assert = require('node:assert/strict');
const { createWorkspacePackage, parseWorkspacePackage, remapPortableConfig } = require('../src/server/package-manager.cjs');

const sampleConfig = {
  scumConfigDir: 'C:\\SCUM\\Saved\\Config\\WindowsServer',
  nodesDir: 'C:\\SCUM\\Saved\\Config\\WindowsServer\\Loot\\Nodes\\Current',
  spawnersDir: 'C:\\SCUM\\Saved\\Config\\WindowsServer\\Loot\\Spawners\\Presets\\Override',
  backupDir: 'D:\\SCUMBackups',
  reloadLootCommand: 'cmd /c "C:\\SCUM\\reload.cmd"',
  restartServerCommand: 'powershell -File C:\\SCUM\\restart.ps1',
  autoBackupCoreOnStart: true,
};

const pkg = createWorkspacePackage({
  portable: true,
  config: sampleConfig,
  files: [
    { path: 'ServerSettings.ini', content: '[General]\nscum.MaxPlayers=32\n' },
    { path: 'Nodes/SampleWeapons.json', content: '{"Name":"SampleWeapons","Items":[]}\n' },
  ],
  meta: { note: 'roundtrip-check' },
});

const serialized = JSON.stringify(pkg);
assert.equal(serialized.includes('C:\\SCUM'), false, 'portable package leaked machine-specific SCUM path');
assert.equal(serialized.includes('D:\\SCUMBackups'), false, 'portable package leaked machine-specific backup path');

const parsed = parseWorkspacePackage(serialized);
assert.equal(parsed.config.scumConfigDir, '');
assert.equal(parsed.config.reloadLootCommand, '');
assert.equal(parsed.files.length, 2);

const remapped = remapPortableConfig(parsed.config, {
  scumConfigDir: 'E:\\Servers\\SCUM\\WindowsServer',
  nodesDir: 'E:\\Servers\\SCUM\\WindowsServer\\Loot\\Nodes\\Current',
  spawnersDir: 'E:\\Servers\\SCUM\\WindowsServer\\Loot\\Spawners\\Presets\\Override',
  backupDir: 'E:\\SCUMBackups',
});

assert.equal(remapped.scumConfigDir, 'E:\\Servers\\SCUM\\WindowsServer');
assert.equal(remapped.backupDir, 'E:\\SCUMBackups');
assert.equal(remapped.reloadLootCommand, '');

console.log('Config roundtrip check passed.');
