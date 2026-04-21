function itemEntryName(entry = {}) {
  return entry?.ClassName || entry?.Id || entry?.Item || entry?.Name || '';
}

function itemEntryProbability(entry = {}) {
  const value = Number(entry?.Probability ?? entry?.Chance ?? 1);
  return Number.isFinite(value) ? value : 1;
}

function sanitizeKitItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((entry) => {
      const name = String(itemEntryName(entry) || '').trim();
      const probability = Number(itemEntryProbability(entry));
      if (!name) return null;
      return {
        ClassName: name,
        Probability: Number.isFinite(probability) && probability >= 0 ? Number(probability.toFixed(4)) : 1,
      };
    })
    .filter(Boolean);
}

function createKitTemplateService(options = {}) {
  const {
    kitTemplatesFile,
    defaultTemplates = [],
    loadJson,
    saveJson,
    appendActivity,
  } = options;
  const nowIso = options.nowIso || (() => new Date().toISOString());
  const randomId = options.randomId || (() => Math.random().toString(36).slice(2, 8));

  function loadUserKitTemplates() {
    const data = loadJson(kitTemplatesFile, []);
    return Array.isArray(data) ? data : [];
  }

  function loadKitTemplates() {
    const userTemplates = loadUserKitTemplates();
    const userIds = new Set(userTemplates.map((entry) => entry.id));
    return [...userTemplates, ...defaultTemplates.filter((entry) => !userIds.has(entry.id))];
  }

  function saveKitTemplates(templates) {
    saveJson(kitTemplatesFile, Array.isArray(templates) ? templates : []);
  }

  function createKitTemplate(name, notes, items) {
    const cleanName = String(name || '').trim();
    const cleanItems = sanitizeKitItems(items);
    if (!cleanName) throw new Error('Kit template name is required');
    if (!cleanItems.length) throw new Error('Kit template needs at least one item');
    const createdAt = nowIso();
    const template = {
      id: `kit_${Date.now()}_${randomId()}`,
      name: cleanName,
      notes: String(notes || '').trim(),
      items: cleanItems,
      itemCount: cleanItems.length,
      createdAt,
      updatedAt: createdAt,
    };
    const templates = loadUserKitTemplates();
    saveKitTemplates([template, ...templates.filter((entry) => entry.id !== template.id)]);
    if (appendActivity) appendActivity('kit_create', { id: template.id, name: template.name, itemCount: template.itemCount });
    return template;
  }

  function deleteKitTemplate(id) {
    const cleanId = String(id || '').trim();
    if (defaultTemplates.some((entry) => entry.id === cleanId)) throw new Error('Built-in kit templates cannot be deleted');
    const templates = loadUserKitTemplates();
    const target = templates.find((entry) => entry.id === cleanId);
    if (!target) throw new Error('Kit template was not found');
    saveKitTemplates(templates.filter((entry) => entry.id !== cleanId));
    if (appendActivity) appendActivity('kit_delete', { id: cleanId, name: target.name });
    return target;
  }

  return {
    loadUserKitTemplates,
    loadKitTemplates,
    saveKitTemplates,
    createKitTemplate,
    deleteKitTemplate,
    sanitizeKitItems,
  };
}

module.exports = {
  createKitTemplateService,
  itemEntryName,
  itemEntryProbability,
  sanitizeKitItems,
};
