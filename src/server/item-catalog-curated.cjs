const EXACT_ITEMS = {
  '12_Gauge_Buckshot': {
    displayName: '12 Gauge Buckshot',
    displayNameEn: '12 Gauge Buckshot',
    displayNameTh: 'กระสุนลูกปราย 12 เกจ',
    category: 'ammo',
    rarity: 'uncommon',
    tags: ['ammo', 'shotgun', '12gauge', 'buckshot'],
  },
  '12_Gauge_BirdShot': {
    displayName: '12 Gauge BirdShot',
    displayNameEn: '12 Gauge BirdShot',
    displayNameTh: 'กระสุนเบิร์ดช็อต 12 เกจ',
    category: 'ammo',
    rarity: 'common',
    tags: ['ammo', 'shotgun', '12gauge', 'birdshot'],
  },
  '12_Gauge_Slug': {
    displayName: '12 Gauge Slug',
    displayNameEn: '12 Gauge Slug',
    displayNameTh: 'กระสุนสลัก 12 เกจ',
    category: 'ammo',
    rarity: 'uncommon',
    tags: ['ammo', 'shotgun', '12gauge', 'slug'],
  },
  '2H_Katana': {
    displayName: 'Two-handed katana',
    displayNameEn: 'Two-handed katana',
    displayNameTh: 'คาตานะสองมือ',
    category: 'weapon',
    rarity: 'rare',
    tags: ['weapon', 'melee', 'blade', 'rare'],
  },
  Military_Backpack: {
    displayName: 'Military backpack',
    displayNameEn: 'Military backpack',
    displayNameTh: 'กระเป๋าทหาร',
    category: 'clothing',
    rarity: 'rare',
    tags: ['clothing', 'backpack', 'storage', 'military'],
  },
  Tactical_Vest: {
    displayName: 'Tactical vest',
    displayNameEn: 'Tactical vest',
    displayNameTh: 'เสื้อเกราะยุทธวิธี',
    category: 'clothing',
    rarity: 'rare',
    tags: ['clothing', 'armor', 'vest', 'military'],
  },
  Gold_Bar: {
    displayName: 'Gold bar',
    displayNameEn: 'Gold bar',
    displayNameTh: 'ทองแท่ง',
    category: 'currency',
    rarity: 'very_rare',
    tags: ['currency', 'valuable', 'trade'],
  },
  FuelCan: {
    displayName: 'Fuel can',
    displayNameEn: 'Fuel can',
    displayNameTh: 'ถังน้ำมัน',
    category: 'vehicle',
    rarity: 'uncommon',
    tags: ['vehicle', 'fuel', 'garage'],
  },
  Absinthe: {
    displayName: 'Absinthe',
    displayNameEn: 'Absinthe',
    displayNameTh: 'แอ็บซินธ์',
    category: 'food',
    rarity: 'common',
    tags: ['food', 'drink', 'alcohol'],
  },
  Magazine_AK47: {
    displayName: 'AK-47 magazine',
    displayNameEn: 'AK-47 magazine',
    displayNameTh: 'แม็กกาซีน AK-47',
    category: 'ammo',
    rarity: 'uncommon',
    tags: ['ammo', 'magazine', 'ak', 'weapon-support'],
  },
  Magazine_AK15: {
    displayName: 'AK-15 magazine',
    displayNameEn: 'AK-15 magazine',
    displayNameTh: 'แม็กกาซีน AK-15',
    category: 'ammo',
    rarity: 'uncommon',
    tags: ['ammo', 'magazine', 'ak', 'weapon-support'],
  },
  Magazine_M16: {
    displayName: 'M16 magazine',
    displayNameEn: 'M16 magazine',
    displayNameTh: 'แม็กกาซีน M16',
    category: 'ammo',
    rarity: 'uncommon',
    tags: ['ammo', 'magazine', 'rifle', 'weapon-support'],
  },
  Magazine_M82A1: {
    displayName: 'M82A1 magazine',
    displayNameEn: 'M82A1 magazine',
    displayNameTh: 'แม็กกาซีน M82A1',
    category: 'ammo',
    rarity: 'rare',
    tags: ['ammo', 'magazine', 'sniper', 'weapon-support'],
  },
  Magazine_SVD_Dragunov: {
    displayName: 'SVD Dragunov magazine',
    displayNameEn: 'SVD Dragunov magazine',
    displayNameTh: 'แม็กกาซีน SVD Dragunov',
    category: 'ammo',
    rarity: 'rare',
    tags: ['ammo', 'magazine', 'sniper', 'weapon-support'],
  },
  Car_Repair_Kit: {
    displayName: 'Car repair kit',
    displayNameEn: 'Car repair kit',
    displayNameTh: 'ชุดซ่อมรถ',
    category: 'vehicle',
    rarity: 'rare',
    tags: ['vehicle', 'repair', 'tool', 'garage'],
  },
  Aeroplane_Repair_Kit: {
    displayName: 'Aeroplane repair kit',
    displayNameEn: 'Aeroplane repair kit',
    displayNameTh: 'ชุดซ่อมเครื่องบิน',
    category: 'vehicle',
    rarity: 'rare',
    tags: ['vehicle', 'repair', 'aircraft'],
  },
  Tire_Repair_Kit: {
    displayName: 'Tire repair kit',
    displayNameEn: 'Tire repair kit',
    displayNameTh: 'ชุดซ่อมยาง',
    category: 'vehicle',
    rarity: 'uncommon',
    tags: ['vehicle', 'repair', 'tire'],
  },
  Improvised_Tire_Repair_Kit: {
    displayName: 'Improvised tire repair kit',
    displayNameEn: 'Improvised tire repair kit',
    displayNameTh: 'ชุดซ่อมยางทำเอง',
    category: 'vehicle',
    rarity: 'common',
    tags: ['vehicle', 'repair', 'tire', 'improvised'],
  },
  Electrical_Repair_Kit: {
    displayName: 'Electrical repair kit',
    displayNameEn: 'Electrical repair kit',
    displayNameTh: 'ชุดซ่อมไฟฟ้า',
    category: 'tool',
    rarity: 'uncommon',
    tags: ['tool', 'repair', 'electrical'],
  },
  Screwdriver: {
    displayName: 'Screwdriver',
    displayNameEn: 'Screwdriver',
    displayNameTh: 'ไขควง',
    category: 'tool',
    rarity: 'uncommon',
    tags: ['tool', 'raid', 'lockpick'],
  },
  Screwdriver_Small: {
    displayName: 'Small screwdriver',
    displayNameEn: 'Small screwdriver',
    displayNameTh: 'ไขควงเล็ก',
    category: 'tool',
    rarity: 'common',
    tags: ['tool', 'raid', 'lockpick'],
  },
  Bundle_Of_Lockpicks: {
    displayName: 'Bundle of lockpicks',
    displayNameEn: 'Bundle of lockpicks',
    displayNameTh: 'ชุดลูกกุญแจงัดล็อก',
    category: 'tool',
    rarity: 'rare',
    tags: ['tool', 'raid', 'lockpick'],
  },
  Bundle_Of_Improvised_Lockpicks: {
    displayName: 'Bundle of improvised lockpicks',
    displayNameEn: 'Bundle of improvised lockpicks',
    displayNameTh: 'ชุดลูกกุญแจงัดล็อกทำเอง',
    category: 'tool',
    rarity: 'uncommon',
    tags: ['tool', 'raid', 'lockpick', 'improvised'],
  },
  Improvised_Lockpick: {
    displayName: 'Improvised lockpick',
    displayNameEn: 'Improvised lockpick',
    displayNameTh: 'ลูกกุญแจงัดล็อกทำเอง',
    category: 'tool',
    rarity: 'common',
    tags: ['tool', 'raid', 'lockpick', 'improvised'],
  },
  Antibiotics_01: {
    displayName: 'Antibiotics',
    displayNameEn: 'Antibiotics',
    displayNameTh: 'ยาปฏิชีวนะ',
    category: 'medical',
    rarity: 'rare',
    tags: ['medical', 'medicine', 'infection'],
  },
  Antibiotics_02: {
    displayName: 'Antibiotics',
    displayNameEn: 'Antibiotics',
    displayNameTh: 'ยาปฏิชีวนะ',
    category: 'medical',
    rarity: 'rare',
    tags: ['medical', 'medicine', 'infection'],
  },
  Antibiotics_03: {
    displayName: 'Antibiotics',
    displayNameEn: 'Antibiotics',
    displayNameTh: 'ยาปฏิชีวนะ',
    category: 'medical',
    rarity: 'rare',
    tags: ['medical', 'medicine', 'infection'],
  },
  Antibiotic_Pill_Single: {
    displayName: 'Antibiotic pill',
    displayNameEn: 'Antibiotic pill',
    displayNameTh: 'ยาเม็ดปฏิชีวนะ',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'medicine', 'infection'],
  },
  Emergency_bandage: {
    displayName: 'Emergency bandage',
    displayNameEn: 'Emergency bandage',
    displayNameTh: 'ผ้าพันแผลฉุกเฉิน',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'bandage', 'starter'],
  },
  Emergency_bandage_Big: {
    displayName: 'Large emergency bandage',
    displayNameEn: 'Large emergency bandage',
    displayNameTh: 'ผ้าพันแผลฉุกเฉินขนาดใหญ่',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'bandage'],
  },
  Painkillers_01: {
    displayName: 'Painkillers',
    displayNameEn: 'Painkillers',
    displayNameTh: 'ยาแก้ปวด',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'medicine', 'painkiller'],
  },
  Painkillers_02: {
    displayName: 'Painkillers',
    displayNameEn: 'Painkillers',
    displayNameTh: 'ยาแก้ปวด',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'medicine', 'painkiller'],
  },
  PainKillers_03: {
    displayName: 'Painkillers',
    displayNameEn: 'Painkillers',
    displayNameTh: 'ยาแก้ปวด',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'medicine', 'painkiller'],
  },
  Vitamins_01: {
    displayName: 'Vitamins',
    displayNameEn: 'Vitamins',
    displayNameTh: 'วิตามิน',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'vitamin'],
  },
  Vitamins_02: {
    displayName: 'Vitamins',
    displayNameEn: 'Vitamins',
    displayNameTh: 'วิตามิน',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'vitamin'],
  },
  Vitamins_03: {
    displayName: 'Vitamins',
    displayNameEn: 'Vitamins',
    displayNameTh: 'วิตามิน',
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical', 'vitamin'],
  },
  BabyFood: {
    displayName: 'Baby food',
    displayNameEn: 'Baby food',
    displayNameTh: 'อาหารเด็ก',
    category: 'food',
    rarity: 'common',
    tags: ['food', 'survival', 'canned'],
  },
  BakedBeans: {
    displayName: 'Baked beans',
    displayNameEn: 'Baked beans',
    displayNameTh: 'ถั่วอบกระป๋อง',
    category: 'food',
    rarity: 'common',
    tags: ['food', 'canned', 'survival'],
  },
  Canned_Tuna: {
    displayName: 'Canned tuna',
    displayNameEn: 'Canned tuna',
    displayNameTh: 'ทูน่ากระป๋อง',
    category: 'food',
    rarity: 'common',
    tags: ['food', 'canned', 'survival'],
  },
  MRE_Cheeseburger: {
    displayName: 'MRE cheeseburger',
    displayNameEn: 'MRE cheeseburger',
    displayNameTh: 'เสบียงทหาร ชีสเบอร์เกอร์',
    category: 'food',
    rarity: 'uncommon',
    tags: ['food', 'mre', 'military'],
  },
  MRE_Stew: {
    displayName: 'MRE stew',
    displayNameEn: 'MRE stew',
    displayNameTh: 'เสบียงทหาร สตูว์',
    category: 'food',
    rarity: 'uncommon',
    tags: ['food', 'mre', 'military'],
  },
  MRE_TunaSalad: {
    displayName: 'MRE tuna salad',
    displayNameEn: 'MRE tuna salad',
    displayNameTh: 'เสบียงทหาร สลัดทูน่า',
    category: 'food',
    rarity: 'uncommon',
    tags: ['food', 'mre', 'military'],
  },
  Water_05l: {
    displayName: '0.5L water bottle',
    displayNameEn: '0.5L water bottle',
    displayNameTh: 'น้ำดื่ม 0.5 ลิตร',
    category: 'food',
    rarity: 'common',
    tags: ['food', 'water', 'drink', 'survival'],
  },
};

const PATTERN_ITEMS = [
  {
    id: 'two-hand-melee',
    pattern: /^2H_/i,
    category: 'weapon',
    rarity: 'uncommon',
    tags: ['weapon', 'melee', 'two-handed'],
    displayNameTh: (name) => `อาวุธสองมือ ${humanPart(name.replace(/^2H_/i, ''))}`,
  },
  {
    id: 'one-hand-melee',
    pattern: /^1H_/i,
    category: 'tool',
    rarity: 'common',
    tags: ['tool', 'melee', 'one-handed'],
    displayNameTh: (name) => `ของถือมือเดียว ${humanPart(name.replace(/^1H_/i, ''))}`,
  },
  {
    id: 'wearable-storage',
    pattern: /(Backpack|Vest|Helmet|Boots|Jacket|Pants|Shirt|Gloves|Holster|Quiver)/i,
    category: 'clothing',
    rarity: 'uncommon',
    tags: ['clothing', 'wearable'],
    displayNameTh: (name) => `เครื่องแต่งกาย ${humanPart(name)}`,
  },
  {
    id: 'drinks',
    pattern: /(Absinthe|Beer|Vodka|Whisky|Wine|Soda|Juice|Water)/i,
    category: 'food',
    rarity: 'common',
    tags: ['food', 'drink'],
    displayNameTh: (name) => `เครื่องดื่ม ${humanPart(name)}`,
  },
  {
    id: 'valuables',
    pattern: /(Gold|Silver|Cash|Money|Coin|Ring|Necklace|Jewelry|Jewel|Watch)/i,
    category: 'currency',
    rarity: 'rare',
    tags: ['currency', 'valuable'],
    displayNameTh: (name) => `ของมีค่า ${humanPart(name)}`,
  },
  {
    id: 'magazines',
    pattern: /^Magazine_/i,
    category: 'ammo',
    rarity: 'uncommon',
    tags: ['ammo', 'magazine', 'weapon-support'],
    displayNameTh: (name) => `แม็กกาซีน ${humanPart(name.replace(/^Magazine_/i, ''))}`,
  },
  {
    id: 'ammo-boxes',
    pattern: /(_Ammobox|^Cal_|^Ammo_|Gauge_|Buckshot|BirdShot|Slug)/i,
    category: 'ammo',
    rarity: 'uncommon',
    tags: ['ammo'],
    displayNameTh: (name) => `กระสุน ${humanPart(name)}`,
  },
  {
    id: 'medical',
    pattern: /(Bandage|Antibiotic|Painkiller|PainKiller|Vitamin|Medkit|Syringe|Tourniquet|Morphine)/i,
    category: 'medical',
    rarity: 'uncommon',
    tags: ['medical'],
    displayNameTh: (name) => `ยา/อุปกรณ์แพทย์ ${humanPart(name)}`,
  },
  {
    id: 'food',
    pattern: /(Food|MRE|Apple|Beans|Tuna|Water|Fillet|Steak|Meat|Carrot|Pineapple|Watermelon|Fish)/i,
    category: 'food',
    rarity: 'common',
    tags: ['food', 'survival'],
    displayNameTh: (name) => `อาหาร/น้ำ ${humanPart(name)}`,
  },
  {
    id: 'vehicle',
    pattern: /(Vehicle|Car_|Tractor_|Wheel|Tire|Tyre|Engine|Alternator|Battery|Repair_Kit|Aeroplane)/i,
    category: 'vehicle',
    rarity: 'uncommon',
    tags: ['vehicle'],
    displayNameTh: (name) => `ของรถ/ยานพาหนะ ${humanPart(name)}`,
  },
  {
    id: 'tools',
    pattern: /(Screwdriver|Lockpick|Saw|Axe|Shovel|Pickaxe|Toolbox|Hammer|Pliers|Knife)/i,
    category: 'tool',
    rarity: 'uncommon',
    tags: ['tool'],
    displayNameTh: (name) => `เครื่องมือ ${humanPart(name)}`,
  },
  {
    id: 'weapon-parts',
    pattern: /(Scope|Rail|WeaponCharm|Bayonet|Rifle|Pistol|SMG|Shotgun|AK47|M16|M82|SVD|Hunter|Kar98)/i,
    category: 'weapon',
    rarity: 'rare',
    tags: ['weapon'],
    displayNameTh: (name) => `อาวุธ/อะไหล่ปืน ${humanPart(name)}`,
  },
];

function normalizeKey(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function humanPart(value = '') {
  return String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
    .replace(/\bAmmobox\b/gi, 'Ammo Box')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function mergeTags(...groups) {
  const tags = [];
  groups.flat().filter(Boolean).forEach((tag) => {
    const clean = String(tag || '').trim();
    if (clean && !tags.includes(clean)) tags.push(clean);
  });
  return tags.slice(0, 10);
}

function cleanPatch(patch = {}, name = '') {
  if (!patch || typeof patch !== 'object') return null;
  const displayNameTh = typeof patch.displayNameTh === 'function' ? patch.displayNameTh(name) : patch.displayNameTh;
  return {
    displayName: patch.displayName || '',
    displayNameEn: patch.displayNameEn || patch.displayName || '',
    displayNameTh: displayNameTh || '',
    category: patch.category || '',
    rarity: patch.rarity || '',
    tags: Array.isArray(patch.tags) ? patch.tags : [],
    notes: patch.notes || '',
    curatedRule: patch.id || 'exact',
  };
}

function curatedPatchForItem(name = '') {
  const exactKey = Object.keys(EXACT_ITEMS).find((key) => normalizeKey(key) === normalizeKey(name));
  if (exactKey) return cleanPatch(EXACT_ITEMS[exactKey], name);
  const match = PATTERN_ITEMS.find((entry) => entry.pattern.test(String(name || '')));
  return cleanPatch(match, name);
}

function applyCuratedCatalogMetadata(name, base = {}) {
  const patch = curatedPatchForItem(name);
  if (!patch) return { ...base, curated: false };
  return {
    ...base,
    displayName: patch.displayName || base.displayName,
    displayNameEn: patch.displayNameEn || base.displayNameEn,
    displayNameTh: patch.displayNameTh || base.displayNameTh,
    category: patch.category || base.category,
    rarity: patch.rarity || base.rarity,
    tags: mergeTags(patch.tags, base.tags || []),
    notes: patch.notes || base.notes || '',
    curated: true,
    curatedRule: patch.curatedRule,
  };
}

module.exports = {
  EXACT_ITEMS,
  PATTERN_ITEMS,
  curatedPatchForItem,
  applyCuratedCatalogMetadata,
};
