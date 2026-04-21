const path = require('node:path');

const LOOT_RARITIES = ['Abundant', 'Common', 'Uncommon', 'Rare', 'VeryRare', 'ExtremelyRare'];

function buildValidation(entries = []) {
  const counts = { critical: 0, warning: 0, info: 0 };
  let highestSeverity = 'info';
  let fixableCount = 0;
  const rank = { critical: 3, warning: 2, info: 1 };
  for (const entry of entries) {
    const severity = entry.severity || 'warning';
    counts[severity] = (counts[severity] || 0) + 1;
    if (entry.fixable) fixableCount += 1;
    if (rank[severity] > rank[highestSeverity]) highestSeverity = severity;
  }
  return { entries, counts, highestSeverity, fixableCount };
}

function flattenIni(parsed = {}) {
  const rows = [];
  for (const [section, value] of Object.entries(parsed || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, fieldValue] of Object.entries(value)) {
        rows.push({ section, key, value: fieldValue });
      }
    } else {
      rows.push({ section: 'General', key: section, value });
    }
  }
  return rows;
}

function normalizedKey(key = '') {
  return String(key || '').toLowerCase().replace(/^scum\./, '').replace(/[^a-z0-9]/g, '');
}

function numberOf(parsed, names) {
  const wanted = new Set(names.map(normalizedKey));
  const match = flattenIni(parsed).find((row) => wanted.has(normalizedKey(row.key)));
  if (!match) return { exists: false, value: NaN, key: names[0] };
  return { exists: true, value: Number(match.value), key: match.key };
}

function addRangeCheck(entries, parsed, minNames, maxNames, code, message) {
  const min = numberOf(parsed, minNames);
  const max = numberOf(parsed, maxNames);
  if (!min.exists || !max.exists) return;
  if (Number.isFinite(min.value) && Number.isFinite(max.value) && min.value > max.value) {
    entries.push({
      code,
      severity: 'critical',
      message,
      path: `${min.key}/${max.key}`,
      suggestion: 'ปรับค่า min ให้ไม่มากกว่า max ก่อน save จริง',
      fixable: false,
    });
  }
}

function validateServerSettingsLogic(parsed = {}) {
  const entries = [];
  const maxPlayers = numberOf(parsed, ['scum.MaxPlayers', 'MaxPlayers']);
  if (maxPlayers.exists && (!Number.isFinite(maxPlayers.value) || maxPlayers.value < 1)) {
    entries.push({
      code: 'server.max_players_invalid',
      severity: 'critical',
      message: 'จำนวนผู้เล่นสูงสุดต้องมากกว่า 0',
      path: maxPlayers.key,
      suggestion: 'ใส่จำนวนผู้เล่นจริง เช่น 32, 64 หรือ 90',
      fixable: false,
    });
  }

  addRangeCheck(entries, parsed, ['scum.MinServerTickRate', 'MinServerTickRate'], ['scum.MaxServerTickRate', 'MaxServerTickRate'], 'server.tick_rate_reversed', 'ค่า Tick Rate ขั้นต่ำมากกว่าขั้นสูงสุด');
  addRangeCheck(entries, parsed, ['scum.SunriseTime', 'SunriseTime'], ['scum.SunsetTime', 'SunsetTime'], 'server.daylight_time_reversed', 'เวลา sunrise มากกว่าหรือชน sunset');

  const logoutTimer = numberOf(parsed, ['scum.LogoutTimer', 'LogoutTimer']);
  if (logoutTimer.exists && Number.isFinite(logoutTimer.value) && logoutTimer.value < 0) {
    entries.push({
      code: 'server.logout_timer_negative',
      severity: 'warning',
      message: 'เวลา logout ห้ามติดลบ',
      path: logoutTimer.key,
      suggestion: 'ใช้ 0 หรือค่าบวกเป็นวินาที',
      fixable: true,
      suggestedFix: { action: 'clamp_to_zero', key: logoutTimer.key },
    });
  }

  const maxPing = numberOf(parsed, ['scum.MaxPing', 'MaxPing']);
  if (maxPing.exists && Number.isFinite(maxPing.value) && maxPing.value <= 0) {
    entries.push({
      code: 'server.max_ping_disabled',
      severity: 'info',
      message: 'Max ping เป็น 0 หรือต่ำกว่า เท่ากับแทบไม่จำกัด ping',
      path: maxPing.key,
      suggestion: 'ถ้าต้องการคุม ping ให้ใส่ค่าบวก เช่น 200 หรือ 300',
      fixable: false,
    });
  }

  const maxVehicles = numberOf(parsed, ['scum.MaxAllowedVehicles', 'MaxAllowedVehicles']);
  const functionalVehicles = numberOf(parsed, ['scum.MaxFunctionalVehicles', 'MaxFunctionalVehicles']);
  if (
    maxVehicles.exists
    && functionalVehicles.exists
    && Number.isFinite(maxVehicles.value)
    && Number.isFinite(functionalVehicles.value)
    && functionalVehicles.value > maxVehicles.value
  ) {
    entries.push({
      code: 'server.vehicle_functional_exceeds_total',
      severity: 'critical',
      message: 'จำนวนรถที่ใช้งานได้มากกว่าจำนวนรถทั้งหมด',
      path: `${functionalVehicles.key}/${maxVehicles.key}`,
      suggestion: 'ลดจำนวนรถที่ใช้งานได้ หรือเพิ่มจำนวนรถทั้งหมด',
      fixable: false,
    });
  }

  flattenIni(parsed).forEach((row) => {
    const key = normalizedKey(row.key);
    const value = Number(row.value);
    const shouldBeNonNegative = /(multiplier|amount|count|price|cost|cooldown|timer|damage|health|probability|spawn|respawn|limit|max|min)/.test(key);
    if (shouldBeNonNegative && Number.isFinite(value) && value < 0) {
      entries.push({
        code: 'server.negative_numeric_value',
        severity: 'warning',
        message: `${row.key} เป็นค่าติดลบ`,
        path: `${row.section}.${row.key}`,
        suggestion: 'ตรวจว่าตั้งใจให้ติดลบจริงหรือไม่ ถ้าไม่แน่ใจให้ใช้ 0 หรือค่าบวก',
        fixable: false,
      });
    }
  });

  return buildValidation(entries);
}

function detectLootKind(object) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return 'unknown';
  if (Array.isArray(object.Items)) return 'node';
  if (Array.isArray(object.Nodes)) return 'spawner';
  if (Array.isArray(object.Children) || typeof object.Rarity === 'string') return 'node_tree';
  return 'unknown';
}

function itemName(entry = {}) {
  return entry.ClassName || entry.Id || entry.Item || entry.Name || '';
}

function itemProbability(entry = {}) {
  return Number(entry.Probability ?? entry.Chance ?? 0);
}

function validateFlatLoot(object, logicalPath) {
  const entries = [];
  const items = Array.isArray(object.Items) ? object.Items : [];
  if (!Array.isArray(object.Items)) {
    entries.push({ code: 'node.items_not_array', severity: 'critical', message: 'Items ต้องเป็น list', path: 'Items', suggestion: 'สร้าง Items เป็น array ก่อนแก้', fixable: true });
  }
  if (!object.Name && !String(logicalPath || '').startsWith('Spawners/')) {
    entries.push({ code: 'node.missing_name', severity: 'warning', message: 'Node ยังไม่มีชื่อ', path: 'Name', suggestion: `ใช้ชื่อ ${path.basename(logicalPath || 'Node', '.json')} เพื่ออ่านง่าย`, fixable: true });
  }
  const seen = new Set();
  let total = 0;
  items.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      entries.push({ code: 'node.item_not_object', severity: 'critical', message: 'แถว item ไม่ใช่ object', path: `Items[${index}]`, suggestion: 'ลบหรือสร้างแถวใหม่', fixable: true });
      return;
    }
    const name = itemName(entry);
    if (!name) {
      entries.push({ code: 'node.item_missing_name', severity: 'critical', message: 'Item ไม่มี class/name', path: `Items[${index}]`, suggestion: 'เลือก item จาก catalog หรือเอาแถวนี้ออก', fixable: true });
    }
    const duplicateKey = JSON.stringify({ name: String(name).toLowerCase(), min: entry.Min, max: entry.Max });
    if (name && seen.has(duplicateKey)) {
      entries.push({ code: 'node.duplicate_item', severity: 'info', message: 'มี item ซ้ำที่รวมกันได้', path: `Items[${index}]`, suggestion: 'รวม probability ของ item ซ้ำ', fixable: true });
    }
    seen.add(duplicateKey);
    const probability = itemProbability(entry);
    if (!Number.isFinite(probability) || probability < 0) {
      entries.push({ code: 'node.invalid_probability', severity: 'warning', message: 'Probability ต้องเป็นเลข 0 ขึ้นไป', path: `Items[${index}]`, suggestion: 'ใส่ 0 หรือค่าบวก', fixable: true });
    } else {
      total += probability;
    }
    const min = Number(entry.Min ?? entry.QuantityMin);
    const max = Number(entry.Max ?? entry.QuantityMax);
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      entries.push({ code: 'node.quantity_range_reversed', severity: 'warning', message: 'จำนวนขั้นต่ำมากกว่าขั้นสูงสุด', path: `Items[${index}]`, suggestion: 'สลับค่า min/max', fixable: true });
    }
  });
  if (items.length && total <= 0) {
    entries.push({ code: 'node.zero_probability_total', severity: 'critical', message: 'Probability รวมเป็น 0', path: 'Items', suggestion: 'ต้องมีอย่างน้อย 1 item ที่มีโอกาสออก', fixable: true });
  }
  return entries;
}

function validateSpawnerLoot(object, options = {}) {
  const entries = [];
  const groups = Array.isArray(object.Nodes) ? object.Nodes : [];
  if (!Array.isArray(object.Nodes)) {
    entries.push({ code: 'spawner.nodes_not_array', severity: 'critical', message: 'Spawner ต้องมี Nodes เป็น list', path: 'Nodes', suggestion: 'สร้าง Nodes array ก่อนแก้', fixable: true });
  }
  const min = Number(object.QuantityMin ?? 0);
  const max = Number(object.QuantityMax ?? 0);
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
    entries.push({ code: 'spawner.quantity_range_reversed', severity: 'warning', message: 'QuantityMin มากกว่า QuantityMax', path: 'QuantityMin/QuantityMax', suggestion: 'สลับค่า min/max', fixable: true });
  }
  const probability = Number(object.Probability ?? 0);
  if (object.Probability != null && (!Number.isFinite(probability) || probability < 0)) {
    entries.push({ code: 'spawner.invalid_probability', severity: 'warning', message: 'Probability ของ spawner ต้องเป็น 0 ขึ้นไป', path: 'Probability', suggestion: 'ใส่ 0 หรือค่าบวก', fixable: true });
  }
  groups.forEach((group, index) => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) {
      entries.push({ code: 'spawner.group_not_object', severity: 'critical', message: 'กลุ่มใน Nodes ไม่ใช่ object', path: `Nodes[${index}]`, suggestion: 'ลบหรือสร้างกลุ่มใหม่', fixable: true });
      return;
    }
    if (!group.Rarity || !LOOT_RARITIES.includes(group.Rarity)) {
      entries.push({ code: 'spawner.invalid_group_rarity', severity: 'warning', message: 'Rarity ของกลุ่มไม่ถูกต้อง', path: `Nodes[${index}].Rarity`, suggestion: `เลือก ${LOOT_RARITIES.join(', ')}`, fixable: true });
    }
    const refs = Array.isArray(group.Ids) ? group.Ids : [group.Node || group.Name || group.Ref].filter(Boolean);
    if (!refs.length) {
      entries.push({ code: 'spawner.group_empty_refs', severity: 'critical', message: 'กลุ่มนี้ไม่มี ref ไปหา node', path: `Nodes[${index}]`, suggestion: 'เพิ่ม ItemLootTreeNodes ref หรือเอากลุ่มออก', fixable: true });
    }
    const seen = new Set();
    refs.forEach((ref, refIndex) => {
      const value = String(ref || '').trim();
      if (!value) return;
      if (seen.has(value)) {
        entries.push({ code: 'spawner.duplicate_ref', severity: 'info', message: 'ref ซ้ำในกลุ่มเดียวกัน', path: `Nodes[${index}].Ids[${refIndex}]`, suggestion: 'ลบตัวซ้ำถ้าไม่ได้ตั้งใจเพิ่มน้ำหนัก', fixable: true });
      }
      seen.add(value);
      if (options.knownRefs instanceof Set && !options.knownRefs.has(value)) {
        entries.push({ code: 'spawner.missing_ref', severity: 'critical', message: 'ref นี้ไม่มีอยู่ใน node ปัจจุบัน', path: `Nodes[${index}].Ids[${refIndex}]`, suggestion: 'เลือก ref จาก catalog หรือสร้าง branch ที่ขาด', fixable: false });
      }
    });
  });
  return entries;
}

function validateLootLogic(object, logicalPath = '', options = {}) {
  const kind = detectLootKind(object);
  let entries = [];
  if (kind === 'spawner') entries = validateSpawnerLoot(object, options);
  else if (kind === 'node') entries = validateFlatLoot(object, logicalPath);
  else if (kind === 'unknown') entries = [{ code: 'loot.unknown_shape', severity: 'warning', message: 'ไฟล์ loot นี้ยังไม่รู้รูปแบบ', path: logicalPath, suggestion: 'ตรวจว่าเป็น Node หรือ Spawner JSON จริง', fixable: false }];
  return buildValidation(entries);
}

module.exports = {
  LOOT_RARITIES,
  buildValidation,
  validateServerSettingsLogic,
  validateLootLogic,
  detectLootKind,
};
