function createItemCatalogService(deps) {
  const {
    fs,
    path,
    ITEM_ICON_DIR,
    ITEM_CATALOG_OVERRIDES_FILE,
    ITEM_CATEGORY_RULES,
    DEFAULT_ITEM_CATALOG_PACK,
    applyCuratedCatalogMetadata,
    walkProjectFiles,
    normalizeKey,
    loadJson,
    saveJson,
    appendActivity,
    scanLootWorkspace,
    detectLootKind,
    itemEntryName,
    collectTreeLeaves,
  } = deps;
  let iconIndexCache = null;
  let iconCatalogCache = null;

  function categoryForItem(name) {
    const value = String(name || '').toLowerCase();
    if (!value) return 'other';
    const match = ITEM_CATEGORY_RULES.find((rule) => rule.pattern.test(value));
    if (match) return match.id;
    return 'other';
  }

  function buildIconIndex() {
    if (iconIndexCache) return iconIndexCache;
    const index = new Map();
    if (fs.existsSync(ITEM_ICON_DIR)) {
      const images = walkProjectFiles(ITEM_ICON_DIR, (filePath) => /\.(png|webp|jpe?g|gif)$/i.test(filePath), ITEM_ICON_DIR);
      for (const image of images) {
        const key = normalizeKey(image.name);
        if (!index.has(key)) {
          index.set(key, `/item-icons/${image.relPath}`);
        }
      }
    }
    iconIndexCache = index;
    return index;
  }

  function getIconUrl(name) {
    const index = buildIconIndex();
    const key = normalizeKey(name);
    return index.get(key) || '';
  }

  function humanizeItemName(name) {
    return String(name || '')
      .replace(/\.[^.]+$/, '')
      .replace(/_/g, ' ')
      .replace(/\bAmmobox\b/gi, 'Ammo Box')
      .replace(/\bGauge\b/g, 'Gauge')
      .replace(/\b(\d+)x(\d+)\b/g, '$1x$2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function inferItemRarity(name, category) {
    const value = String(name || '').toLowerCase();
    if (/(m82|awm|svd|gold|keycard|thermal|nightvision|c4|grenade|rocket|barrett)/.test(value)) return 'very_rare';
    if (/(ak47|akm|m16|vhs|rpk|sks|kar98|mosin|deagle|tactical|military|car_repair|screwdriver|lockpick)/.test(value)) return 'rare';
    if (/(ammo|magazine|buckshot|slug|birdshot|bandage|painkiller|mre|fuel|repair|vest|backpack)/.test(value)) return 'uncommon';
    if (category === 'weapon') return 'rare';
    if (category === 'ammo' || category === 'medical' || category === 'tool') return 'uncommon';
    return 'common';
  }

  function inferItemTags(name, category) {
    const value = String(name || '').toLowerCase();
    const tags = new Set([category || 'other']);
    if (/(ak|ak47|akm|762)/.test(value)) tags.add('ak');
    if (/(556|m16|vhs)/.test(value)) tags.add('rifle');
    if (/(9mm|45acp|pistol|1911|deagle)/.test(value)) tags.add('pistol');
    if (/(mp5|ump|smg)/.test(value)) tags.add('smg');
    if (/(shotgun|gauge|buckshot|slug|birdshot)/.test(value)) tags.add('shotgun');
    if (/(awm|m82|sniper|scope|mosin|kar98|svd)/.test(value)) tags.add('sniper');
    if (/(military|tactical|bunker)/.test(value)) tags.add('military');
    if (/(food|water|mre|drink|meat|fish|can|soda)/.test(value)) tags.add('survival');
    if (/(repair|fuel|vehicle|car|wheel|tire|engine)/.test(value)) tags.add('vehicle');
    if (/(bandage|pain|antibiotic|medical|med)/.test(value)) tags.add('medical');
    return [...tags].filter(Boolean).slice(0, 8);
  }

  function thaiItemName(name, category) {
    const english = humanizeItemName(name);
    const prefixByCategory = {
      weapon: 'อาวุธ',
      ammo: 'กระสุน',
      medical: 'ยา/รักษา',
      food: 'อาหาร/น้ำ',
      tool: 'เครื่องมือ',
      clothing: 'เสื้อผ้า/เกราะ',
      vehicle: 'ยานพาหนะ',
      currency: 'เงิน/ของมีค่า',
      other: 'ไอเท็ม',
    };
    return `${prefixByCategory[category] || prefixByCategory.other} ${english}`;
  }

  function buildCatalogMetadata(name, source = 'generated') {
    const category = categoryForItem(name);
    return applyCuratedCatalogMetadata(name, {
      name,
      displayName: humanizeItemName(name),
      displayNameEn: humanizeItemName(name),
      displayNameTh: thaiItemName(name, category),
      category,
      rarity: inferItemRarity(name, category),
      tags: inferItemTags(name, category),
      source,
    });
  }

  function buildIconCatalogDefaults() {
    if (iconCatalogCache) return iconCatalogCache;
    const catalog = new Map();
    if (fs.existsSync(ITEM_ICON_DIR)) {
      const images = walkProjectFiles(ITEM_ICON_DIR, (filePath) => /\.(png|webp|jpe?g|gif)$/i.test(filePath), ITEM_ICON_DIR);
      for (const image of images) {
        const name = path.basename(image.name, path.extname(image.name));
        if (!catalog.has(name)) catalog.set(name, buildCatalogMetadata(name, 'icon'));
      }
    }
    iconCatalogCache = catalog;
    return catalog;
  }

  function loadItemCatalogOverrides() {
    const data = loadJson(ITEM_CATALOG_OVERRIDES_FILE, {});
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  }

  function saveItemCatalogOverrides(overrides) {
    saveJson(ITEM_CATALOG_OVERRIDES_FILE, overrides && typeof overrides === 'object' ? overrides : {});
  }

  function cleanItemCatalogOverride(value = {}) {
    return {
      displayName: String(value.displayName || '').trim(),
      displayNameEn: String(value.displayNameEn || '').trim(),
      displayNameTh: String(value.displayNameTh || '').trim(),
      category: String(value.category || '').trim(),
      rarity: String(value.rarity || '').trim(),
      tags: Array.isArray(value.tags) ? value.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [],
      favorite: Boolean(value.favorite),
      notes: String(value.notes || '').trim(),
    };
  }

  function sanitizeItemCatalogOverrides(input = {}) {
    const clean = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return clean;
    for (const [name, value] of Object.entries(input)) {
      const cleanName = String(name || '').trim();
      if (!cleanName) continue;
      const next = cleanItemCatalogOverride(value || {});
      if (next.displayName || next.category || next.favorite || next.notes) {
        clean[cleanName] = next;
      }
    }
    return clean;
  }

  function upsertItemCatalogOverride(name, value = {}) {
    const cleanName = String(name || '').trim();
    if (!cleanName) throw new Error('Item name is required');
    const overrides = loadItemCatalogOverrides();
    const next = cleanItemCatalogOverride(value);
    const hasValue = next.displayName || next.category || next.favorite || next.notes;
    if (hasValue) overrides[cleanName] = next;
    else delete overrides[cleanName];
    saveItemCatalogOverrides(overrides);
    appendActivity('item_catalog_override', { name: cleanName, cleared: !hasValue, category: next.category, favorite: next.favorite });
    return overrides[cleanName] || null;
  }

  function deleteItemCatalogOverride(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) throw new Error('Item name is required');
    const overrides = loadItemCatalogOverrides();
    const deleted = overrides[cleanName] || null;
    delete overrides[cleanName];
    saveItemCatalogOverrides(overrides);
    appendActivity('item_catalog_override_delete', { name: cleanName });
    return deleted;
  }

  function importItemCatalogOverrides(input = {}, mode = 'merge') {
    const incoming = sanitizeItemCatalogOverrides(input);
    const next = mode === 'replace' ? incoming : { ...loadItemCatalogOverrides(), ...incoming };
    saveItemCatalogOverrides(next);
    appendActivity('item_catalog_import', { mode: mode === 'replace' ? 'replace' : 'merge', importedCount: Object.keys(incoming).length, totalCount: Object.keys(next).length });
    return { overrides: next, importedCount: Object.keys(incoming).length, totalCount: Object.keys(next).length };
  }

  function buildItemCatalog(scan = scanLootWorkspace(), options = {}) {
    const counts = new Map();
    const sources = new Map();
    const overrides = loadItemCatalogOverrides();
    for (const lootFile of [...scan.nodes, ...scan.spawners]) {
      const kind = detectLootKind(lootFile.object);
      const names = kind === 'node'
        ? (Array.isArray(lootFile.object.Items) ? lootFile.object.Items.map((entry) => itemEntryName(entry)).filter(Boolean) : [])
        : kind === 'node_tree'
          ? collectTreeLeaves(lootFile.object).map((entry) => entry.name).filter(Boolean)
          : [];
      for (const name of names) {
        counts.set(name, (counts.get(name) || 0) + 1);
        if (!sources.has(name)) sources.set(name, new Set());
        sources.get(name).add(lootFile.relPath);
      }
    }
    const defaultCatalog = new Map([...buildIconCatalogDefaults(), ...DEFAULT_ITEM_CATALOG_PACK.map((item) => [item.name, item])]);
    const catalogNames = new Set([...counts.keys(), ...defaultCatalog.keys()]);
    let items = [...catalogNames].map((name) => {
      const appearances = counts.get(name) || 0;
      const sampleSources = [...(sources.get(name) || [])];
      const iconUrl = getIconUrl(name);
      const override = cleanItemCatalogOverride(overrides[name] || {});
      const defaults = { ...buildCatalogMetadata(name), ...(defaultCatalog.get(name) || {}) };
      const inferredCategory = categoryForItem(name);
      const category = override.category || defaults.category || inferredCategory;
      const displayNameEn = override.displayNameEn || override.displayName || defaults.displayNameEn || defaults.displayName || humanizeItemName(name);
      const displayNameTh = override.displayNameTh || defaults.displayNameTh || thaiItemName(name, category);
      const tags = override.tags.length ? override.tags : (Array.isArray(defaults.tags) ? defaults.tags : inferItemTags(name, category));
      return {
        name,
        displayName: override.displayName || defaults.displayName || displayNameEn,
        displayNameEn,
        displayNameTh,
        category,
        inferredCategory,
        favorite: Boolean(override.favorite),
        rarity: override.rarity || defaults.rarity || inferItemRarity(name, category),
        tags,
        notes: override.notes || defaults.notes || '',
        builtIn: Boolean(defaults.name),
        hasOverride: Boolean(overrides[name]),
        appearances,
        sourceCount: sampleSources.length,
        sampleSources: sampleSources.slice(0, 5),
        iconUrl,
        hasIcon: Boolean(iconUrl),
      };
    });
    const query = String(options.q || '').trim().toLowerCase();
    const category = String(options.category || '__all');
    const favoritesOnly = String(options.favorites || '') === 'true' || String(options.favorite || '') === 'true';
    if (category !== '__all') items = items.filter((item) => item.category === category);
    if (favoritesOnly) items = items.filter((item) => item.favorite);
    if (query) {
      items = items.filter((item) => `${item.name} ${item.displayName} ${item.displayNameEn || ''} ${item.displayNameTh || ''} ${item.category} ${item.rarity || ''} ${(item.tags || []).join(' ')} ${item.notes} ${item.sampleSources.join(' ')}`.toLowerCase().includes(query));
    }
    const categoryIds = [...new Set(items.map((item) => item.category || 'other'))].sort((a, b) => a.localeCompare(b));
    const categories = categoryIds.map((id) => ({ id, count: items.filter((item) => item.category === id).length }));
    items.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.appearances - a.appearances || a.displayName.localeCompare(b.displayName));
    const limit = Number(options.limit || 2000);
    return { items: items.slice(0, limit), total: items.length, categories, overridesCount: Object.keys(overrides).length };
  }

  return {
    categoryForItem,
    buildIconCatalogDefaults,
    loadItemCatalogOverrides,
    upsertItemCatalogOverride,
    importItemCatalogOverrides,
    deleteItemCatalogOverride,
    buildItemCatalog,
  };
}

module.exports = {
  createItemCatalogService,
};
