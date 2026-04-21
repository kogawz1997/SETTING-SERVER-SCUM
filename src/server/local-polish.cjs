const path = require('node:path');

const DEFAULT_ITEM_CATALOG_PACK = [
  { name: 'Weapon_AK47', displayName: 'AK-47 rifle', category: 'weapon', rarity: 'rare', tags: ['weapon', 'rifle', 'pvp', 'bunker'] },
  { name: 'Weapon_AKM', displayName: 'AKM rifle', category: 'weapon', rarity: 'rare', tags: ['weapon', 'rifle', 'pvp'] },
  { name: 'Weapon_M16A4', displayName: 'M16A4 rifle', category: 'weapon', rarity: 'rare', tags: ['weapon', 'rifle', 'military'] },
  { name: 'Weapon_MP5', displayName: 'MP5 SMG', category: 'weapon', rarity: 'uncommon', tags: ['weapon', 'smg', 'bunker'] },
  { name: 'Weapon_AWM', displayName: 'AWM sniper rifle', category: 'weapon', rarity: 'very_rare', tags: ['weapon', 'sniper', 'bunker'] },
  { name: 'Weapon_M82A1', displayName: 'M82A1 rifle', category: 'weapon', rarity: 'very_rare', tags: ['weapon', 'sniper', 'military'] },
  { name: 'Weapon_1911', displayName: '1911 pistol', category: 'weapon', rarity: 'common', tags: ['weapon', 'pistol'] },
  { name: 'Weapon_Deagle', displayName: 'Desert Eagle', category: 'weapon', rarity: 'rare', tags: ['weapon', 'pistol'] },
  { name: 'Ammo_762x39', displayName: '7.62x39 ammo', category: 'ammo', rarity: 'uncommon', tags: ['ammo', 'ak', 'rifle'] },
  { name: 'Ammo_556x45', displayName: '5.56x45 ammo', category: 'ammo', rarity: 'uncommon', tags: ['ammo', 'rifle'] },
  { name: 'Ammo_9mm', displayName: '9mm ammo', category: 'ammo', rarity: 'common', tags: ['ammo', 'pistol', 'smg'] },
  { name: 'Ammo_45ACP', displayName: '.45 ACP ammo', category: 'ammo', rarity: 'common', tags: ['ammo', 'pistol'] },
  { name: 'AK47_Magazine', displayName: 'AK magazine', category: 'ammo', rarity: 'uncommon', tags: ['ammo', 'magazine', 'ak'] },
  { name: 'M16_Magazine', displayName: 'M16 magazine', category: 'ammo', rarity: 'uncommon', tags: ['ammo', 'magazine'] },
  { name: 'MP5_Magazine', displayName: 'MP5 magazine', category: 'ammo', rarity: 'uncommon', tags: ['ammo', 'magazine', 'smg'] },
  { name: 'Bandage', displayName: 'Bandage', category: 'medical', rarity: 'common', tags: ['medical', 'starter'] },
  { name: 'Emergency_Bandage', displayName: 'Emergency bandage', category: 'medical', rarity: 'uncommon', tags: ['medical'] },
  { name: 'Painkillers', displayName: 'Painkillers', category: 'medical', rarity: 'uncommon', tags: ['medical'] },
  { name: 'Antibiotics', displayName: 'Antibiotics', category: 'medical', rarity: 'rare', tags: ['medical'] },
  { name: 'MRE', displayName: 'MRE ration', category: 'food', rarity: 'uncommon', tags: ['food', 'survival'] },
  { name: 'Water_Bottle', displayName: 'Water bottle', category: 'food', rarity: 'common', tags: ['food', 'drink', 'survival'] },
  { name: 'Screwdriver', displayName: 'Screwdriver', category: 'tool', rarity: 'uncommon', tags: ['tool', 'raid'] },
  { name: 'Lockpick', displayName: 'Lockpick', category: 'tool', rarity: 'uncommon', tags: ['tool', 'raid'] },
  { name: 'Duct_Tape', displayName: 'Duct tape', category: 'tool', rarity: 'common', tags: ['tool', 'repair'] },
  { name: 'Military_Backpack', displayName: 'Military backpack', category: 'clothing', rarity: 'rare', tags: ['clothing', 'storage', 'military'] },
  { name: 'Tactical_Vest', displayName: 'Tactical vest', category: 'clothing', rarity: 'rare', tags: ['clothing', 'armor', 'military'] },
  { name: 'Cash', displayName: 'Cash', category: 'currency', rarity: 'common', tags: ['currency', 'trade'] },
  { name: 'Gold_Bar', displayName: 'Gold bar', category: 'currency', rarity: 'very_rare', tags: ['currency', 'valuable'] },
  { name: 'FuelCan', displayName: 'Fuel can', category: 'vehicle', rarity: 'uncommon', tags: ['vehicle', 'fuel'] },
  { name: 'Car_Repair_Kit', displayName: 'Car repair kit', category: 'vehicle', rarity: 'rare', tags: ['vehicle', 'repair'] },
];

const DEFAULT_KIT_TEMPLATE_LIBRARY = [
  {
    id: 'preset_solo_starter',
    name: 'Solo starter',
    notes: 'Balanced starter kit for solo survival.',
    locked: true,
    itemCount: 5,
    items: [
      { ClassName: 'Weapon_1911', Probability: 0.25 },
      { ClassName: 'Ammo_9mm', Probability: 0.45 },
      { ClassName: 'Bandage', Probability: 0.55 },
      { ClassName: 'Water_Bottle', Probability: 0.45 },
      { ClassName: 'MRE', Probability: 0.35 },
    ],
  },
  {
    id: 'preset_pvp_fight',
    name: 'PvP fight pack',
    notes: 'Weapon and ammo heavy kit for high-conflict zones.',
    locked: true,
    itemCount: 6,
    items: [
      { ClassName: 'Weapon_AK47', Probability: 0.35 },
      { ClassName: 'AK47_Magazine', Probability: 0.55 },
      { ClassName: 'Ammo_762x39', Probability: 0.7 },
      { ClassName: 'Weapon_MP5', Probability: 0.3 },
      { ClassName: 'MP5_Magazine', Probability: 0.45 },
      { ClassName: 'Bandage', Probability: 0.25 },
    ],
  },
  {
    id: 'preset_hardcore_poor',
    name: 'Hardcore poor loot',
    notes: 'Sparse kit for harsh survival servers.',
    locked: true,
    itemCount: 5,
    items: [
      { ClassName: 'Bandage', Probability: 0.2 },
      { ClassName: 'Water_Bottle', Probability: 0.18 },
      { ClassName: 'MRE', Probability: 0.12 },
      { ClassName: 'Screwdriver', Probability: 0.08 },
      { ClassName: 'Ammo_9mm', Probability: 0.08 },
    ],
  },
  {
    id: 'preset_bunker_rich',
    name: 'Bunker rich',
    notes: 'Military bunker focused kit with rare weapons and tools.',
    locked: true,
    itemCount: 7,
    items: [
      { ClassName: 'Weapon_AWM', Probability: 0.18 },
      { ClassName: 'Weapon_M16A4', Probability: 0.32 },
      { ClassName: 'Ammo_556x45', Probability: 0.65 },
      { ClassName: 'M16_Magazine', Probability: 0.5 },
      { ClassName: 'Tactical_Vest', Probability: 0.22 },
      { ClassName: 'Military_Backpack', Probability: 0.2 },
      { ClassName: 'Emergency_Bandage', Probability: 0.28 },
    ],
  },
  {
    id: 'preset_survival_poor',
    name: 'Survival poor',
    notes: 'Very low-value survival kit for scarce loot maps.',
    locked: true,
    itemCount: 6,
    items: [
      { ClassName: 'Water_Bottle', Probability: 0.16 },
      { ClassName: 'MRE', Probability: 0.1 },
      { ClassName: 'Duct_Tape', Probability: 0.08 },
      { ClassName: 'Bandage', Probability: 0.18 },
      { ClassName: 'Lockpick', Probability: 0.06 },
      { ClassName: 'Ammo_9mm', Probability: 0.05 },
    ],
  },
  {
    id: 'preset_medical_relief',
    name: 'Medical relief',
    notes: 'Clinic or safe-route medical support kit.',
    locked: true,
    itemCount: 6,
    items: [
      { ClassName: 'Bandage', Probability: 0.65 },
      { ClassName: 'Emergency_Bandage', Probability: 0.55 },
      { ClassName: 'Painkillers', Probability: 0.45 },
      { ClassName: 'Antibiotics', Probability: 0.28 },
      { ClassName: 'Water_Bottle', Probability: 0.3 },
      { ClassName: 'MRE', Probability: 0.18 },
    ],
  },
  {
    id: 'preset_police_station',
    name: 'Police station',
    notes: 'Civilian security loot with pistols, ammo, and tools.',
    locked: true,
    itemCount: 7,
    items: [
      { ClassName: 'Weapon_1911', Probability: 0.32 },
      { ClassName: 'Weapon_Deagle', Probability: 0.12 },
      { ClassName: 'Ammo_9mm', Probability: 0.55 },
      { ClassName: 'Ammo_45ACP', Probability: 0.42 },
      { ClassName: 'Screwdriver', Probability: 0.22 },
      { ClassName: 'Lockpick', Probability: 0.2 },
      { ClassName: 'Bandage', Probability: 0.18 },
    ],
  },
  {
    id: 'preset_starter_friendly',
    name: 'Starter friendly',
    notes: 'Beginner-friendly survival basics without flooding weapons.',
    locked: true,
    itemCount: 7,
    items: [
      { ClassName: 'Bandage', Probability: 0.72 },
      { ClassName: 'Water_Bottle', Probability: 0.68 },
      { ClassName: 'MRE', Probability: 0.5 },
      { ClassName: 'Duct_Tape', Probability: 0.28 },
      { ClassName: 'Screwdriver', Probability: 0.22 },
      { ClassName: 'Weapon_1911', Probability: 0.16 },
      { ClassName: 'Ammo_9mm', Probability: 0.24 },
    ],
  },
  {
    id: 'preset_vehicle_support',
    name: 'Vehicle support',
    notes: 'Fuel and repair focused loot for garages or vehicle zones.',
    locked: true,
    itemCount: 5,
    items: [
      { ClassName: 'FuelCan', Probability: 0.45 },
      { ClassName: 'Car_Repair_Kit', Probability: 0.32 },
      { ClassName: 'Duct_Tape', Probability: 0.5 },
      { ClassName: 'Screwdriver', Probability: 0.38 },
      { ClassName: 'Water_Bottle', Probability: 0.18 },
    ],
  },
  {
    id: 'preset_rare_weapons_low',
    name: 'Rare weapons low',
    notes: 'Keeps high-tier weapons possible but clearly rare.',
    locked: true,
    itemCount: 7,
    items: [
      { ClassName: 'Weapon_AWM', Probability: 0.06 },
      { ClassName: 'Weapon_M82A1', Probability: 0.035 },
      { ClassName: 'Weapon_M16A4', Probability: 0.16 },
      { ClassName: 'Weapon_AK47', Probability: 0.18 },
      { ClassName: 'Ammo_556x45', Probability: 0.32 },
      { ClassName: 'Ammo_762x39', Probability: 0.3 },
      { ClassName: 'Emergency_Bandage', Probability: 0.16 },
    ],
  },
];

const LOOT_TUNING_PRESETS = [
  { id: 'solo_balanced', label: 'Solo balanced', weapon: 0.35, ammo: 0.45, medical: 0.45, food: 0.45, tool: 0.25, other: 0.3, quantity: [1, 2], hint: 'อ่านง่ายสำหรับ solo: มีของจำเป็นครบ ไม่แจกปืนหนักเกินไป' },
  { id: 'pvp_hot', label: 'PvP hot zone', weapon: 0.65, ammo: 0.75, medical: 0.25, food: 0.15, tool: 0.35, other: 0.25, quantity: [2, 4], hint: 'เพิ่มปืน/กระสุน เหมาะกับโซนปะทะหรือ military' },
  { id: 'hardcore_sparse', label: 'Hardcore sparse', weapon: 0.14, ammo: 0.18, medical: 0.2, food: 0.25, tool: 0.12, other: 0.1, quantity: [1, 1], hint: 'ลดทุกอย่างให้หายาก เหมาะกับ survival จริงจัง' },
  { id: 'bunker_rich', label: 'Bunker rich', weapon: 0.72, ammo: 0.72, medical: 0.35, food: 0.12, tool: 0.45, other: 0.3, quantity: [2, 5], hint: 'บังเกอร์คุ้มขึ้น ปืน/กระสุน/เครื่องมือออกชัดกว่าโซนทั่วไป' },
  { id: 'medical_relief', label: 'Medical relief', weapon: 0.18, ammo: 0.2, medical: 0.8, food: 0.3, tool: 0.18, other: 0.15, quantity: [1, 3], hint: 'ดันยาและของรักษา เหมาะกับ clinic หรือ safe route' },
  { id: 'survival_poor', label: 'Survival poor', weapon: 0.08, ammo: 0.1, medical: 0.16, food: 0.2, tool: 0.12, other: 0.08, quantity: [1, 1], hint: 'Scarce survival loot with only small chances for basics.' },
  { id: 'police_station', label: 'Police station', weapon: 0.28, ammo: 0.5, medical: 0.2, food: 0.12, tool: 0.28, other: 0.18, quantity: [1, 3], hint: 'Pistols, ammo, and utility tools for police zones.' },
  { id: 'starter_friendly', label: 'Starter friendly', weapon: 0.16, ammo: 0.24, medical: 0.68, food: 0.62, tool: 0.32, other: 0.2, quantity: [1, 2], hint: 'Friendly new-player basics without flooding high-tier weapons.' },
  { id: 'vehicle_support', label: 'Vehicle support', weapon: 0.08, ammo: 0.1, medical: 0.16, food: 0.18, tool: 0.55, vehicle: 0.62, other: 0.2, quantity: [1, 3], hint: 'Garages and vehicle zones: fuel, repair, and tools.' },
  { id: 'rare_weapons_low', label: 'Rare weapons low', weapon: 0.22, ammo: 0.34, medical: 0.18, food: 0.12, tool: 0.18, other: 0.12, quantity: [1, 2], hint: 'High-tier weapons stay possible but intentionally rare.' },
];

function normalizeFileName(value) {
  return String(value || 'support-bundle').replace(/[:.]/g, '-');
}

function sanitizeSupportConfig(config = {}) {
  return {
    scumConfigDir: '',
    nodesDir: '',
    spawnersDir: '',
    backupDir: '',
    reloadLootCommand: '',
    restartServerCommand: '',
    autoBackupCoreOnStart: Boolean(config.autoBackupCoreOnStart),
  };
}

function stripPrivatePaths(value) {
  if (Array.isArray(value)) return value.map(stripPrivatePaths);
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && /^[a-z]:\\/i.test(value)) return '[local-path-hidden]';
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => {
    const lower = key.toLowerCase();
    if (/(path|dir|command|resolvedpath|root)$/i.test(lower)) return [key, ''];
    return [key, stripPrivatePaths(nested)];
  }));
}

function countPatchLines(patch = '') {
  return String(patch || '').split(/\r?\n/).filter((line) => /^[+-](?![+-]{2})/.test(line)).length;
}

function summarizeSafeApplyPlan(plan = {}) {
  const counts = plan.validation?.counts || {};
  const blockers = Array.isArray(plan.blockers) ? plan.blockers : [];
  const critical = Number(counts.critical || 0) + blockers.filter((entry) => entry.severity === 'critical').length;
  const warning = Number(counts.warning || 0);
  const changedLines = countPatchLines(plan.patch || '');
  const risk = critical ? 'critical' : warning ? 'warning' : plan.changed ? 'changed' : 'safe';
  const humanAction = critical
    ? 'แก้ critical ก่อน ห้าม save/apply ไฟล์นี้'
    : warning
      ? 'อ่าน warning และ backup ก่อน save'
      : plan.changed
        ? 'ตรวจ diff แล้วค่อยยืนยัน save'
        : 'ไม่มีอะไรเปลี่ยน ไม่จำเป็นต้อง save';
  return {
    path: plan.logicalPath || '',
    changed: Boolean(plan.changed),
    willWrite: Boolean(plan.willWrite),
    risk,
    critical,
    warning,
    changedLines,
    requiresConfirmation: Boolean(plan.changed || critical || warning),
    humanAction,
  };
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = Math.max(1, date.getDate());
  const month = date.getMonth() + 1;
  const year = Math.max(1980, date.getFullYear()) - 1980;
  return { time, date: (year << 9) | (month << 5) | day };
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value & 0xffff, 0);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function makeZipBuffer(files = [], now = new Date()) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = dosDateTime(now);
  for (const file of files) {
    const name = String(file.name || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!name || name.includes('..')) continue;
    const nameBuffer = Buffer.from(name, 'utf8');
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content || ''), 'utf8');
    const checksum = crc32(content);
    const localHeader = Buffer.concat([
      uint32(0x04034b50), uint16(20), uint16(0), uint16(0), uint16(stamp.time), uint16(stamp.date),
      uint32(checksum), uint32(content.length), uint32(content.length), uint16(nameBuffer.length), uint16(0), nameBuffer,
    ]);
    localParts.push(localHeader, content);
    centralParts.push(Buffer.concat([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0), uint16(0), uint16(stamp.time), uint16(stamp.date),
      uint32(checksum), uint32(content.length), uint32(content.length), uint16(nameBuffer.length), uint16(0), uint16(0),
      uint16(0), uint16(0), uint32(0), uint32(offset), nameBuffer,
    ]));
    offset += localHeader.length + content.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    uint32(0x06054b50), uint16(0), uint16(0), uint16(centralParts.length), uint16(centralParts.length),
    uint32(central.length), uint32(offset), uint16(0),
  ]);
  return Buffer.concat([...localParts, central, end]);
}

function buildSupportBundle(input = {}) {
  const nowFn = typeof input.now === 'function' ? input.now : () => new Date().toISOString();
  const generatedAt = nowFn();
  const safeDiagnostics = stripPrivatePaths(input.diagnostics || {});
  const safeReadiness = stripPrivatePaths(input.readiness || {});
  const files = [
    { name: 'support/README.txt', content: `SCUM local support bundle\nGenerated: ${generatedAt}\nPaths and commands are sanitized by default.\n` },
    { name: 'support/config.sanitized.json', content: `${JSON.stringify(sanitizeSupportConfig(input.config || {}), null, 2)}\n` },
    { name: 'support/diagnostics.json', content: `${JSON.stringify(safeDiagnostics, null, 2)}\n` },
    { name: 'support/readiness.json', content: `${JSON.stringify(safeReadiness, null, 2)}\n` },
    { name: 'support/activity.json', content: `${JSON.stringify(input.activity || [], null, 2)}\n` },
    ...(input.logs || []).map((log) => ({ name: path.posix.join('logs', path.basename(log.name || 'log.txt')), content: String(log.content || '') })),
  ];
  const buffer = makeZipBuffer(files, new Date(generatedAt));
  return {
    fileName: `scum-support-bundle-${normalizeFileName(generatedAt)}.zip`,
    mime: 'application/zip',
    buffer,
    base64: buffer.toString('base64'),
    files: files.map((file) => file.name),
  };
}

function buildHealthNextActions(report = {}) {
  const checks = Array.isArray(report.checks) ? report.checks : [];
  const bad = checks.filter((check) => check.status === 'bad');
  const warn = checks.filter((check) => check.status === 'warn');
  const actions = [];
  if (bad.some((check) => check.id === 'config_root')) actions.push({ priority: 'critical', view: 'settings', title: 'ตั้งค่า SCUM config folder ก่อน', body: 'เลือกโฟลเดอร์ที่มี ServerSettings.ini, GameUserSettings.ini และ EconomyOverride.json' });
  if (bad.some((check) => check.id === 'nodes_folder' || check.id === 'spawners_folder')) actions.push({ priority: 'critical', view: 'settings', title: 'ชี้ Nodes/Spawners folder ให้ถูก', body: 'ถ้าใช้ path custom ให้เลือกโฟลเดอร์จริง ไม่งั้นปล่อยว่างเพื่อใช้ path default ใต้ config root' });
  if (bad.some((check) => String(check.id || '').startsWith('parse_'))) actions.push({ priority: 'critical', view: 'loot', title: 'แก้ JSON ที่ parse ไม่ผ่าน', body: 'เปิดไฟล์ที่ขึ้น Invalid JSON ก่อนปรับ balancing หรือรัน autofix' });
  if (bad.some((check) => check.id === 'missing_refs')) actions.push({ priority: 'critical', view: 'analyzer', title: 'แก้ missing node refs', body: 'Spawner อ้าง node ที่ไม่มี ต้องเปลี่ยน ref หรือสร้าง node ให้ตรงก่อน' });
  if (warn.some((check) => check.id === 'backup_history')) actions.push({ priority: 'warning', view: 'backups', title: 'สร้าง backup แรก', body: 'ก่อนแก้ไฟล์จริงให้มี snapshot อย่างน้อยหนึ่งชุด' });
  if (warn.some((check) => check.id === 'reload_command')) actions.push({ priority: 'info', view: 'settings', title: 'ตั้ง reload command ถ้าจะใช้ Save + Reload', body: 'ไม่บังคับ แต่ทำให้ workflow หลัง save เร็วและชัดขึ้น' });
  return actions.slice(0, 5);
}

module.exports = {
  DEFAULT_ITEM_CATALOG_PACK,
  DEFAULT_KIT_TEMPLATE_LIBRARY,
  LOOT_TUNING_PRESETS,
  sanitizeSupportConfig,
  stripPrivatePaths,
  summarizeSafeApplyPlan,
  makeZipBuffer,
  buildSupportBundle,
  buildHealthNextActions,
};
