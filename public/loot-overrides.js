(function () {
  if (typeof state === 'undefined') return;

  state.lootUi.simpleMode = state.lootUi.simpleMode !== false;
  state.lootUi.showAdvancedSpawnerFields = !!state.lootUi.showAdvancedSpawnerFields;
  state.lootUi.spawnerGroupSearch = state.lootUi.spawnerGroupSearch || '';
  state.lootUi.flatRowSearch = state.lootUi.flatRowSearch || '';
  state.lootUi.contextTab = state.lootUi.contextTab || 'overview';
  state.lootUi.selectedFlatRows = Array.isArray(state.lootUi.selectedFlatRows) ? state.lootUi.selectedFlatRows : [];
  state.lootUi.dragFlatRow = Number.isInteger(state.lootUi.dragFlatRow) ? state.lootUi.dragFlatRow : null;
  state.lootUi.kitTemplatesLoaded = !!state.lootUi.kitTemplatesLoaded;
  state.lootUi.catalogEditName = state.lootUi.catalogEditName || '';
  state.lootUi.catalogImportText = state.lootUi.catalogImportText || '';
  state.lootUi.catalogImportMode = state.lootUi.catalogImportMode || 'merge';
  state.kitTemplates = Array.isArray(state.kitTemplates) ? state.kitTemplates : [];
  state.searchUi = state.searchUi || { scope: '__all', match: 'partial', issue: '__all' };
  state.graphUi = state.graphUi || { zoom: 1, panX: 0, panY: 0, kind: '__all', selectedId: '' };
  state.backupUi = state.backupUi || { compareTarget: '', tagFilter: '__all', pathFilter: '' };
  state.activityUi = state.activityUi || { type: '__all', term: '', path: '' };
  state.readiness = state.readiness || null;
  state.quickStart = state.quickStart || {};
  state.diagnostics = state.diagnostics || { includePaths: true, reportText: '' };
  state.itemCatalogLookup = state.itemCatalogLookup instanceof Map ? state.itemCatalogLookup : new Map();

  const baseApplyTranslations = typeof applyTranslations === 'function' ? applyTranslations : null;
  const baseUpdateLootWorkspaceCopy = typeof updateLootWorkspaceCopy === 'function' ? updateLootWorkspaceCopy : null;
  const baseUpdateLootWorkspaceLayout = typeof updateLootWorkspaceLayout === 'function' ? updateLootWorkspaceLayout : null;

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setSelectorText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function setPlaceholder(id, value) {
    const element = $(id);
    if (element) element.placeholder = value;
  }

  function normalizeCatalogItemKey(value = '') {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function rebuildItemCatalogLookup() {
    const lookup = new Map();
    (state.itemCatalog?.items || []).forEach((item) => {
      const key = normalizeCatalogItemKey(item.name);
      if (key && !lookup.has(key)) lookup.set(key, item);
    });
    state.itemCatalogLookup = lookup;
  }

  function getCatalogItemMeta(name = '') {
    const key = normalizeCatalogItemKey(name);
    if (!key) return null;
    if (!(state.itemCatalogLookup instanceof Map) || !state.itemCatalogLookup.size) rebuildItemCatalogLookup();
    return state.itemCatalogLookup.get(key) || null;
  }

  function prettifyCatalogItemName(name = '') {
    const meta = getCatalogItemMeta(name);
    return meta?.displayName || String(name || '').replace(/_/g, ' ');
  }

  function renderCatalogItemIdentity(name = '', subtitle = '', options = {}) {
    const meta = getCatalogItemMeta(name);
    const compact = !!options.compact;
    const title = options.title || prettifyCatalogItemName(name) || name || uiText('ยังไม่ตั้งชื่อ', 'Unnamed');
    const code = meta?.name || name || '';
    const favorite = meta?.favorite ? '★ ' : '';
    const subtitleText = subtitle || (meta ? `${favorite}${meta.category} · ${meta.appearances} ${uiText('ครั้ง', 'hits')}` : '');
    const icon = meta?.iconUrl
      ? `<img src="${escapeHtml(meta.iconUrl)}" alt="${escapeHtml(title)}" class="catalog-item-icon${compact ? ' compact' : ''}" loading="lazy" />`
      : `<span class="catalog-item-fallback${compact ? ' compact' : ''}">${escapeHtml((title || '?').slice(0, 1).toUpperCase())}</span>`;
    return `<div class="catalog-item-identity${compact ? ' compact' : ''}">${icon}<div class="catalog-item-copy"><strong>${escapeHtml(`${favorite}${title}`)}</strong>${code ? `<code>${escapeHtml(code)}</code>` : ''}${subtitleText ? `<div class="muted">${escapeHtml(subtitleText)}</div>` : ''}</div></div>`;
  }

  function scoreCatalogMatch(item, query) {
    const normalizedQuery = normalizeCatalogItemKey(query);
    if (!normalizedQuery) return 0;
    const nameKey = normalizeCatalogItemKey(item?.name || '');
    const displayKey = normalizeCatalogItemKey(item?.displayName || '');
    if (nameKey === normalizedQuery || displayKey === normalizedQuery) return 1000;
    if (nameKey.startsWith(normalizedQuery) || displayKey.startsWith(normalizedQuery)) return 800;
    if (nameKey.includes(normalizedQuery) || displayKey.includes(normalizedQuery)) return 500;
    return 0;
  }

  function matchingCatalogItems(query, limit = 8) {
    const normalizedQuery = normalizeCatalogItemKey(query);
    if (!normalizedQuery) return [];
    return (state.itemCatalog?.items || [])
      .map((item) => ({ item, score: scoreCatalogMatch(item, normalizedQuery) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || (b.item.appearances || 0) - (a.item.appearances || 0) || a.item.name.localeCompare(b.item.name))
      .slice(0, limit)
      .map((entry) => entry.item);
  }

  function renderInlineItemSuggestions(input, context) {
    const host = input?.parentElement?.querySelector('.inline-item-suggestions');
    if (!host) return;
    const query = String(input.value || '').trim();
    const matches = matchingCatalogItems(query, 8);
    host.classList.toggle('open', query.length > 0);
    if (!matches.length) {
      host.innerHTML = query
        ? `<div class="inline-suggestion-empty">${escapeHtml(uiText('ไม่เจอไอเท็มที่คล้ายกัน', 'No similar items found.'))}</div>`
        : '';
      return;
    }
    const contextValue = context.kind === 'tree' ? context.path : String(context.index);
    host.innerHTML = `<div class="inline-suggestion-head">${escapeHtml(uiText('รายการที่คล้ายกัน', 'Similar items'))}</div>${matches.map((item) => `<button type="button" class="inline-item-suggestion" data-suggest-kind="${escapeHtml(context.kind)}" data-suggest-target="${escapeHtml(contextValue)}" data-suggest-name="${escapeHtml(item.name)}">${renderCatalogItemIdentity(item.name, `${item.category} · ${item.appearances} ${uiText('ครั้ง', 'hits')}`, { compact: true })}</button>`).join('')}`;
    host.querySelectorAll('[data-suggest-name]').forEach((button) => {
      button.onmousedown = (event) => event.preventDefault();
      button.onclick = () => applyInlineItemSuggestion(button.dataset.suggestKind, button.dataset.suggestTarget, button.dataset.suggestName);
    });
  }

  function closeInlineItemSuggestions(input) {
    const host = input?.parentElement?.querySelector('.inline-item-suggestions');
    if (!host) return;
    window.setTimeout(() => {
      host.classList.remove('open');
    }, 120);
  }

  function applyInlineItemSuggestion(kind, target, name) {
    const obj = state.currentLootObject || {};
    if (kind === 'tree') {
      const node = getTreeNodeAtPath(obj, target);
      if (node) node.Name = name;
      if (state.treeSearch) state.treeSearch = name;
    } else {
      const index = Number(target);
      if (Array.isArray(obj.Items) && obj.Items[index]) setItemEntryName(obj.Items[index], name);
    }
    renderVisualBuilder();
    markLootDirty(true);
  }

  function bindTreeInlineItemSuggestions(obj) {
    document.querySelectorAll('[data-tree-name]').forEach((el) => {
      el.onfocus = () => {
        state.focusedLootField = { kind: 'tree', path: el.dataset.treeName, role: el.dataset.treeRole || 'leaf' };
        if (el.dataset.treeRole === 'leaf') renderInlineItemSuggestions(el, { kind: 'tree', path: el.dataset.treeName });
      };
      el.oninput = (event) => {
        const node = getTreeNodeAtPath(obj, event.target.dataset.treeName);
        if (node) node.Name = event.target.value;
        if (event.target.dataset.treeRole === 'leaf') renderInlineItemSuggestions(event.target, { kind: 'tree', path: event.target.dataset.treeName });
      };
      el.onblur = () => closeInlineItemSuggestions(el);
    });
  }

  function itemEntryName(entry) {
    return entry?.ClassName || entry?.Id || entry?.Item || entry?.Name || '';
  }

  function setItemEntryName(entry, value) {
    if (!entry || typeof entry !== 'object') return;
    if ('ClassName' in entry) entry.ClassName = value;
    else if ('Id' in entry) entry.Id = value;
    else if ('Item' in entry) entry.Item = value;
    else entry.Name = value;
  }

  function itemEntryProbability(entry) {
    const value = Number(entry?.Probability ?? entry?.Chance ?? 1);
    return Number.isFinite(value) ? value : 1;
  }

  function selectedFlatRowSet() {
    return new Set((state.lootUi.selectedFlatRows || []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0));
  }

  function selectedFlatRows(list) {
    const selected = selectedFlatRowSet();
    return [...selected].filter((index) => index >= 0 && index < list.length).sort((a, b) => a - b);
  }

  function persistSelectedFlatRows(indexes, listLength) {
    state.lootUi.selectedFlatRows = [...new Set(indexes.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0 && value < listLength))].sort((a, b) => a - b);
  }

  function ensureKitTemplatesLoaded() {
    if (state.lootUi.kitTemplatesLoaded || state.lootUi.kitTemplatesLoading) return;
    state.lootUi.kitTemplatesLoading = true;
    api('/api/kits')
      .then((data) => {
        state.kitTemplates = data.kits || [];
        state.lootUi.kitTemplatesLoaded = true;
        if (state.view === 'loot' && state.selectedLootPath) renderVisualBuilder();
      })
      .catch((error) => showToast(error.message || String(error), true))
      .finally(() => {
        state.lootUi.kitTemplatesLoading = false;
      });
  }

  function cloneKitItem(entry) {
    return {
      ClassName: itemEntryName(entry),
      Probability: Number(Math.max(0, itemEntryProbability(entry)).toFixed(4)),
    };
  }

  function kitItemsFromCurrentList(list) {
    const selected = selectedFlatRows(list);
    const indexes = selected.length ? selected : list.map((_, index) => index);
    return indexes
      .map((index) => cloneKitItem(list[index]))
      .filter((entry) => entry.ClassName);
  }

  function renderKitTemplatePanel(list) {
    ensureKitTemplatesLoaded();
    const templates = state.kitTemplates || [];
    const selectedCount = selectedFlatRows(list).length;
    const loading = state.lootUi.kitTemplatesLoading && !state.lootUi.kitTemplatesLoaded;
    const cards = templates.map((kit) => {
      const items = Array.isArray(kit.items) ? kit.items : [];
      const preview = items.slice(0, 4).map((entry) => `<span class="kit-item-chip">${renderCatalogItemIdentity(itemEntryName(entry), `${uiText('ค่า', 'value')} ${itemEntryProbability(entry)}`, { compact: true })}</span>`).join('');
      const overflow = items.length > 4 ? `<span class="tag">+${items.length - 4}</span>` : '';
      return `<article class="kit-template-card"><div><strong>${escapeHtml(kit.name || uiText('ไม่มีชื่อ', 'Unnamed'))}</strong>${kit.notes ? `<p class="muted">${escapeHtml(kit.notes)}</p>` : ''}<div class="kit-item-preview">${preview}${overflow}</div></div><div class="actions tight wrap"><button type="button" class="tiny" data-kit-apply="${escapeHtml(kit.id)}">${escapeHtml(uiText('ใส่ชุดนี้', 'Apply'))}</button><button type="button" class="danger-outline tiny" data-kit-delete="${escapeHtml(kit.id)}">${escapeHtml(uiText('ลบ', 'Delete'))}</button></div></article>`;
    }).join('');
    return `<div class="kit-template-panel"><div class="section-head compact"><div><h4>${escapeHtml(uiText('Kit / Template', 'Kit / Template'))}</h4><p class="muted">${escapeHtml(selectedCount ? uiText(`บันทึกจาก ${selectedCount} แถวที่เลือก หรือกดใช้ template เพื่อเพิ่มเข้า node นี้`, `Save from ${selectedCount} selected rows, or apply a template into this node.`) : uiText('บันทึกชุดไอเท็มจาก node นี้ไว้ใช้ซ้ำ ถ้าเลือกแถวไว้จะบันทึกเฉพาะแถวนั้น', 'Save reusable item sets from this node. Selected rows are saved; otherwise all rows are used.'))}</p></div><span class="tag item">${escapeHtml(`${templates.length} ${uiText('ชุด', 'kits')}`)}</span></div><div class="kit-save-grid"><label><span>${escapeHtml(uiText('ชื่อ template', 'Template name'))}</span><input id="kit-template-name" value="${escapeHtml(state.lootUi.kitTemplateName || '')}" placeholder="${escapeHtml(uiText('เช่น Bunker starter kit', 'Example: Bunker starter kit'))}" /></label><label><span>${escapeHtml(uiText('โน้ต', 'Notes'))}</span><input id="kit-template-notes" value="${escapeHtml(state.lootUi.kitTemplateNotes || '')}" placeholder="${escapeHtml(uiText('ใช้กับโซนไหน / จุดประสงค์', 'Zone or purpose'))}" /></label><button type="button" id="save-kit-template" class="tiny">${escapeHtml(uiText('บันทึก template', 'Save template'))}</button></div><div class="kit-template-list">${loading ? `<div class="muted builder-empty">${escapeHtml(uiText('กำลังโหลด template...', 'Loading templates...'))}</div>` : cards || `<div class="muted builder-empty">${escapeHtml(uiText('ยังไม่มี template บันทึกไว้', 'No saved templates yet.'))}</div>`}</div></div>`;
  }

  async function saveCurrentFlatNodeKit(list) {
    const name = String($('kit-template-name')?.value || '').trim();
    const notes = String($('kit-template-notes')?.value || '').trim();
    const items = kitItemsFromCurrentList(list);
    if (!name) return showToast(uiText('ใส่ชื่อ template ก่อน', 'Enter a template name first.'), true);
    if (!items.length) return showToast(uiText('ไม่มี item ให้บันทึกเป็น template', 'There are no items to save as a template.'), true);
    const data = await api('/api/kits', { method: 'POST', body: JSON.stringify({ name, notes, items }) });
    state.kitTemplates = [data.kit, ...(state.kitTemplates || []).filter((kit) => kit.id !== data.kit.id)];
    state.lootUi.kitTemplatesLoaded = true;
    state.lootUi.kitTemplateName = '';
    state.lootUi.kitTemplateNotes = '';
    showToast(uiText('บันทึก template แล้ว', 'Template saved.'));
    renderVisualBuilder();
  }

  function applyKitTemplateToList(id, list) {
    const kit = (state.kitTemplates || []).find((entry) => entry.id === id);
    if (!kit) return showToast(uiText('ไม่พบ template นี้', 'Template was not found.'), true);
    const items = (kit.items || []).map((entry) => cloneKitItem(entry)).filter((entry) => entry.ClassName);
    if (!items.length) return showToast(uiText('template นี้ไม่มี item', 'This template has no items.'), true);
    const start = list.length;
    list.push(...items);
    persistSelectedFlatRows(items.map((_, index) => start + index), list.length);
    markLootDirty(true);
    showToast(uiText(`เพิ่ม ${items.length} item จาก template แล้ว`, `Added ${items.length} template items.`));
    renderVisualBuilder();
  }

  async function deleteKitTemplate(id) {
    const kit = (state.kitTemplates || []).find((entry) => entry.id === id);
    if (!kit) return;
    if (!confirm(uiText(`ลบ template "${kit.name}"?`, `Delete template "${kit.name}"?`))) return;
    await api(`/api/kits?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    state.kitTemplates = (state.kitTemplates || []).filter((entry) => entry.id !== id);
    showToast(uiText('ลบ template แล้ว', 'Template deleted.'));
    renderVisualBuilder();
  }

  function bindKitTemplateControls(list) {
    if ($('kit-template-name')) $('kit-template-name').oninput = (event) => { state.lootUi.kitTemplateName = event.target.value; };
    if ($('kit-template-notes')) $('kit-template-notes').oninput = (event) => { state.lootUi.kitTemplateNotes = event.target.value; };
    if ($('save-kit-template')) $('save-kit-template').onclick = () => saveCurrentFlatNodeKit(list).catch((error) => showToast(error.message || String(error), true));
    document.querySelectorAll('[data-kit-apply]').forEach((button) => {
      button.onclick = () => applyKitTemplateToList(button.dataset.kitApply, list);
    });
    document.querySelectorAll('[data-kit-delete]').forEach((button) => {
      button.onclick = () => deleteKitTemplate(button.dataset.kitDelete).catch((error) => showToast(error.message || String(error), true));
    });
  }

  function bindFlatRowDragControls(list) {
    document.querySelectorAll('[data-drag-row]').forEach((card) => {
      card.ondragstart = (event) => {
        const index = Number(card.dataset.dragRow);
        state.lootUi.dragFlatRow = index;
        card.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      };
      card.ondragover = (event) => {
        event.preventDefault();
        card.classList.add('drag-over');
      };
      card.ondragleave = () => card.classList.remove('drag-over');
      card.ondrop = (event) => {
        event.preventDefault();
        card.classList.remove('drag-over');
        const from = Number(state.lootUi.dragFlatRow ?? event.dataTransfer.getData('text/plain'));
        const to = Number(card.dataset.dragRow);
        if (!Number.isInteger(from) || !Number.isInteger(to) || from === to || !list[from] || !list[to]) return;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        state.lootUi.dragFlatRow = null;
        persistSelectedFlatRows([], list.length);
        markLootDirty(true);
        renderVisualBuilder();
      };
      card.ondragend = () => {
        state.lootUi.dragFlatRow = null;
        document.querySelectorAll('.loot-row-card.drag-over, .loot-row-card.dragging').forEach((entry) => entry.classList.remove('drag-over', 'dragging'));
      };
    });
  }

  function simulationRate(hits, count) {
    return Number(((Number(hits || 0) / Math.max(1, Number(count || 1))) * 100).toFixed(1));
  }

  function renderSimulationTopList(result, title) {
    const items = (result?.distinctItems || []).slice(0, 10);
    const maxHits = Math.max(1, ...items.map((entry) => entry.hits || 0));
    return `<div class="sim-card"><div class="section-head compact"><div><h4>${escapeHtml(title)}</h4><p class="muted">${escapeHtml(`${result?.count || 0} ${uiText('รอบ', 'runs')} · ${uiText('เฉลี่ย', 'avg')} ${result?.averageItemsPerRun || 0} ${uiText('item/รอบ', 'items/run')}`)}</p></div></div><div class="sim-bar-list">${items.map((entry) => `<div class="sim-bar-row">${renderCatalogItemIdentity(entry.name, `${entry.hits} ${uiText('ครั้ง', 'hits')} · ${simulationRate(entry.hits, result?.count)}%`, { compact: true })}<div class="sim-bar-track"><div class="sim-bar-fill" style="width:${Math.max(4, (entry.hits / maxHits) * 100)}%"></div></div></div>`).join('') || `<div class="muted builder-empty">${escapeHtml(uiText('ไม่มี item จากการจำลอง', 'No simulated items.'))}</div>`}</div></div>`;
  }

  function renderSimulationDeltas(data) {
    const rows = (data.comparison || []).filter((entry) => entry.deltaHits !== 0).slice(0, 14);
    if (!rows.length) return `<div class="success-card">${escapeHtml(uiText('Draft ให้ผลใกล้กับไฟล์ที่ save แล้วในจำนวนรอบนี้', 'The draft is close to the saved file for this run count.'))}</div>`;
    return `<div class="sim-card span-two"><div class="section-head compact"><div><h4>${escapeHtml(uiText('ผลต่าง Draft เทียบกับ Saved', 'Draft vs saved changes'))}</h4><p class="muted">${escapeHtml(uiText('แถวบนสุดคือ item ที่โอกาสเปลี่ยนเยอะสุด ใช้ดูผลก่อนกด Save', 'Top rows changed the most. Use this before saving.'))}</p></div></div><div class="sim-delta-list">${rows.map((entry) => {
      const direction = entry.deltaHits > 0 ? 'up' : 'down';
      const label = `${entry.deltaHits > 0 ? '+' : ''}${entry.deltaHits} · ${entry.deltaRate > 0 ? '+' : ''}${Number(entry.deltaRate * 100).toFixed(1)}%`;
      return `<div class="sim-delta-row ${direction}">${renderCatalogItemIdentity(entry.name, `${uiText('Saved', 'Saved')} ${entry.savedHits} / ${uiText('Draft', 'Draft')} ${entry.draftHits}`, { compact: true })}<strong>${escapeHtml(label)}</strong></div>`;
    }).join('')}</div></div>`;
  }

  function renderSimulationSamples(result) {
    const samples = (result?.sampleRuns || []).slice(0, 6);
    return `<div class="sim-card span-two"><div class="section-head compact"><div><h4>${escapeHtml(uiText('ตัวอย่างรอบจำลองจาก Draft', 'Draft sample runs'))}</h4><p class="muted">${escapeHtml(uiText('ไว้เช็กความรู้สึกว่า 1 รอบจะออกอะไรบ้าง', 'A quick feel for what one run can drop.'))}</p></div></div><div class="sim-sample-list">${samples.map((run, index) => `<div><strong>${index + 1}</strong><span>${escapeHtml(run.join(', ') || uiText('(ว่าง)', '(empty)'))}</span></div>`).join('') || `<div class="muted">${escapeHtml(uiText('ไม่มี sample', 'No samples.'))}</div>`}</div></div>`;
  }

  function renderSimulationCompare(data) {
    const saved = data.saved || {};
    const draft = data.draft || {};
    const averageDelta = Number(((draft.averageItemsPerRun || 0) - (saved.averageItemsPerRun || 0)).toFixed(2));
    const distinctDelta = (draft.distinctItems?.length || 0) - (saved.distinctItems?.length || 0);
    return `<div class="simulator-output"><div class="mini-stat-grid"><div class="mini-stat"><span>${escapeHtml(uiText('รอบที่จำลอง', 'Runs'))}</span><strong>${escapeHtml(draft.count || saved.count || 0)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('Avg item/run', 'Avg items/run'))}</span><strong>${escapeHtml(`${saved.averageItemsPerRun || 0} -> ${draft.averageItemsPerRun || 0}`)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('ผลต่างเฉลี่ย', 'Average delta'))}</span><strong class="${averageDelta >= 0 ? 'positive' : 'negative'}">${escapeHtml(`${averageDelta >= 0 ? '+' : ''}${averageDelta}`)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('ชนิด item', 'Distinct items'))}</span><strong>${escapeHtml(`${saved.distinctItems?.length || 0} -> ${draft.distinctItems?.length || 0} (${distinctDelta >= 0 ? '+' : ''}${distinctDelta})`)}</strong></div></div><div class="sim-grid">${renderSimulationTopList(saved, uiText('ไฟล์ที่ Save แล้ว', 'Saved file'))}${renderSimulationTopList(draft, uiText('Draft ตอนนี้', 'Current draft'))}${renderSimulationDeltas(data)}${renderSimulationSamples(draft)}</div></div>`;
  }

  simulateLoot = async function () {
    if (!state.selectedLootPath) return showToast(uiText('เลือกไฟล์ลูทก่อน', 'Select a loot file first.'), true);
    const output = $('simulate-output');
    const count = Math.max(1, Math.min(10000, Number($('simulate-count')?.value || 1000)));
    if (output) output.innerHTML = `<div class="muted">${escapeHtml(uiText('กำลังจำลอง saved/draft...', 'Simulating saved and draft versions...'))}</div>`;
    try {
      const data = await api('/api/loot/simulate/compare', { method: 'POST', body: JSON.stringify({ path: state.selectedLootPath, count, content: getLootDraftContent() }) });
      if (output) output.innerHTML = renderSimulationCompare(data);
    } catch (error) {
      if (output) output.innerHTML = `<div class="warn-card">${escapeHtml(error.message || String(error))}</div>`;
      showToast(error.message || String(error), true);
    }
  };
  if ($('simulate-btn')) $('simulate-btn').onclick = simulateLoot;

  function mountGlobalSearchControls() {
    const results = $('global-search-results');
    if (!results || $('global-search-filters')) return;
    const actions = results.previousElementSibling;
    const panel = document.createElement('div');
    panel.id = 'global-search-filters';
    panel.className = 'search-filter-panel';
    panel.innerHTML = `<label><span>${escapeHtml(uiText('ขอบเขต', 'Scope'))}</span><select id="global-search-scope"><option value="__all">${escapeHtml(uiText('ทั้งหมด', 'All files'))}</option><option value="core">${escapeHtml(uiText('ไฟล์หลัก', 'Core files'))}</option><option value="nodes">${escapeHtml(uiText('Nodes', 'Nodes'))}</option><option value="spawners">${escapeHtml(uiText('Spawners', 'Spawners'))}</option><option value="json">JSON</option><option value="ini">INI</option></select></label><label><span>${escapeHtml(uiText('รูปแบบค้นหา', 'Match'))}</span><select id="global-search-match"><option value="partial">${escapeHtml(uiText('มีคำนี้', 'Partial'))}</option><option value="exact">${escapeHtml(uiText('ตรงคำเป๊ะ', 'Exact token'))}</option></select></label><label><span>${escapeHtml(uiText('โหมดตรวจปัญหา', 'Issue mode'))}</span><select id="global-search-issue"><option value="__all">${escapeHtml(uiText('ค้นข้อความปกติ', 'Normal text search'))}</option><option value="missing_refs">${escapeHtml(uiText('เฉพาะ missing refs', 'Missing refs only'))}</option><option value="unused_nodes">${escapeHtml(uiText('เฉพาะ unused nodes', 'Unused nodes only'))}</option></select></label><div class="search-filter-hint">${escapeHtml(uiText('ใช้ filter เพื่อลดผลลัพธ์รก แล้วกดเปิดไฟล์จากผลลัพธ์ได้ทันที', 'Use filters to reduce noisy results, then open files directly from results.'))}</div>`;
    if (actions) actions.insertAdjacentElement('afterend', panel);
    bindGlobalSearchFilters();
  }

  function bindGlobalSearchFilters() {
    if ($('global-search-btn')) $('global-search-btn').onclick = globalSearch;
    const sync = () => {
      state.searchUi.scope = $('global-search-scope')?.value || '__all';
      state.searchUi.match = $('global-search-match')?.value || 'partial';
      state.searchUi.issue = $('global-search-issue')?.value || '__all';
    };
    if ($('global-search-scope')) {
      $('global-search-scope').value = state.searchUi.scope || '__all';
      $('global-search-scope').onchange = sync;
    }
    if ($('global-search-match')) {
      $('global-search-match').value = state.searchUi.match || 'partial';
      $('global-search-match').onchange = sync;
    }
    if ($('global-search-issue')) {
      $('global-search-issue').value = state.searchUi.issue || '__all';
      $('global-search-issue').onchange = () => {
        sync();
        const input = $('global-search-term');
        if (input) input.placeholder = state.searchUi.issue === '__all'
          ? t('searchPlaceholder')
          : uiText('เว้นว่างได้เพื่อดูปัญหาทั้งหมด', 'Leave blank to list all issues');
      };
    }
  }

  function searchResultTypeLabel(result) {
    if (result.type === 'missing_ref') return uiText('Ref หาย', 'Missing ref');
    if (result.type === 'unused_node') return uiText('Node ไม่ถูกใช้', 'Unused node');
    if (result.scope === 'nodes') return 'Node';
    if (result.scope === 'spawners') return 'Spawner';
    if (result.scope === 'core') return uiText('ไฟล์หลัก', 'Core');
    return String(result.type || 'file').toUpperCase();
  }

  function bindSearchResultActions() {
    document.querySelectorAll('[data-search-open]').forEach((button) => {
      button.onclick = () => {
        const target = button.dataset.searchOpen || '';
        if (!target) return;
        if (target.startsWith('Nodes/') || target.startsWith('Spawners/')) {
          setView('loot');
          openLootFile(target).catch((error) => showToast(error.message || String(error), true));
          return;
        }
        setView('corefiles');
        state.selectedCorePath = target;
        renderCoreFileList();
        openCoreFile(target).catch((error) => showToast(error.message || String(error), true));
      };
    });
  }

  function renderGlobalSearchResults(results = []) {
    const target = $('global-search-results');
    if (!target) return;
    target.innerHTML = results.length
      ? `<div class="search-result-summary"><strong>${escapeHtml(`${results.length} ${uiText('ผลลัพธ์', 'results')}`)}</strong><span>${escapeHtml(uiText('เรียงจากจำนวน match มากสุดก่อน', 'Sorted by strongest match count first'))}</span></div>${results.map((result) => `<article class="result-card search-result-card"><div class="search-result-head"><div><strong>${escapeHtml(result.path)}</strong><div class="muted">${escapeHtml(searchResultTypeLabel(result))} · ${escapeHtml(`${result.matchCount || result.matches?.length || 0} ${uiText('จุดที่พบ', 'matches')}`)}</div></div><button type="button" class="ghost tiny" data-search-open="${escapeHtml(result.path)}">${escapeHtml(uiText('เปิดไฟล์', 'Open file'))}</button></div><div class="search-match-list">${(result.matches || []).slice(0, 8).map((match) => `<div><code>${escapeHtml(match.path)}</code><span>${escapeHtml(match.preview)}</span></div>`).join('')}</div></article>`).join('')}`
      : `<div class="muted builder-empty">${escapeHtml(uiText('ไม่พบผลลัพธ์ตาม filter นี้', 'No results matched these filters.'))}</div>`;
    bindSearchResultActions();
  }

  globalSearch = async function () {
    mountGlobalSearchControls();
    bindGlobalSearchFilters();
    const term = $('global-search-term')?.value.trim() || '';
    const issue = state.searchUi.issue || '__all';
    if (!term && issue === '__all') return showToast(uiText('ใส่คำค้นก่อน', 'Enter something to search.'), true);
    const params = new URLSearchParams({
      term,
      scope: state.searchUi.scope || '__all',
      match: state.searchUi.match || 'partial',
      issue,
    });
    $('global-search-results').innerHTML = `<div class="muted builder-empty">${escapeHtml(uiText('กำลังค้นหา...', 'Searching...'))}</div>`;
    const data = await api(`/api/search?${params.toString()}`);
    renderGlobalSearchResults(data.results || []);
  };

  function validationEntries(v) {
    if (!v) return [];
    if (Array.isArray(v.entries)) return v.entries;
    return [
      ...(v.errors || []).map((message) => ({ severity: 'critical', message, fixable: false })),
      ...(v.warnings || []).map((message) => ({ severity: 'warning', message, fixable: false })),
      ...(v.info || []).map((message) => ({ severity: 'info', message, fixable: false })),
    ];
  }

  function validationIndexFromPath(pathValue, key = 'Items') {
    const match = String(pathValue || '').match(new RegExp(`${key}\\[(\\d+)\\]`));
    return match ? Number(match[1]) : -1;
  }

  function validationTreePath(pathValue) {
    const value = String(pathValue || 'root').replace(/\.Children$/, '');
    if (value === 'root') return 'root';
    return value.replace(/^root\.?/, '') || 'root';
  }

  function setEntryProbability(entry, value) {
    if (!entry || typeof entry !== 'object') return;
    const clean = Number(Math.max(0, Number(value || 0)).toFixed(4));
    if ('Chance' in entry && !('Probability' in entry)) entry.Chance = clean;
    else entry.Probability = clean;
  }

  function normalizeEntryProbabilities(items) {
    const rows = (Array.isArray(items) ? items : []).filter((entry) => entry && typeof entry === 'object' && itemEntryName(entry));
    if (!rows.length) return;
    const total = rows.reduce((sum, entry) => sum + Math.max(0, itemEntryProbability(entry) || 0), 0);
    if (!total) {
      const even = Number((1 / rows.length).toFixed(4));
      rows.forEach((entry) => setEntryProbability(entry, even));
      return;
    }
    rows.forEach((entry) => setEntryProbability(entry, Math.max(0, itemEntryProbability(entry) || 0) / total));
  }

  function collectSpawnerEntryRefs(entry) {
    if (Array.isArray(entry?.Ids)) return entry.Ids.map((value) => String(value || '').trim());
    return [entry?.Node, entry?.Name, entry?.Ref].map((value) => String(value || '').trim()).filter(Boolean);
  }

  function coerceBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return ['true', '1', 'yes', 'y', 'on'].includes(String(value || '').trim().toLowerCase());
  }

  async function refreshDraftAnalysis() {
    const data = await api('/api/loot/analyze-content', { method: 'POST', body: JSON.stringify({ path: state.selectedLootPath, content: getLootDraftContent() }) });
    state.currentLootAnalysis = data;
    state.currentLootObject = data.object || state.currentLootObject;
    if ($('loot-summary')) $('loot-summary').innerHTML = renderLootSummaryPanel(data.summary);
    if ($('loot-validation')) $('loot-validation').innerHTML = renderValidation(data.validation);
    if ($('loot-deps')) $('loot-deps').innerHTML = renderLootDependencyPanel(data);
    renderVisualBuilder();
    refreshLootDirtyState();
  }

  function applyValidationQuickFix(entry) {
    if (!entry?.fixable || !entry.suggestedFix?.action) return false;
    if ($('loot-editor') && !$('loot-editor').classList.contains('hidden') && typeof syncRawEditorToVisualBuilder === 'function' && !syncRawEditorToVisualBuilder()) return false;
    const obj = state.currentLootObject || {};
    const action = entry.suggestedFix.action;
    const pathValue = entry.path || '';
    if (action === 'create_items_array') obj.Items = [];
    else if (action === 'fill_name_from_file') obj.Name = obj.Name || (state.selectedLootPath || '').split('/').pop().replace(/\.json$/i, '');
    else if (['remove_invalid_row', 'remove_blank_row'].includes(action)) {
      const index = validationIndexFromPath(pathValue, 'Items');
      if (Array.isArray(obj.Items) && index >= 0) obj.Items.splice(index, 1);
    } else if (action === 'coerce_probability') {
      const index = validationIndexFromPath(pathValue, 'Items');
      if (Array.isArray(obj.Items) && obj.Items[index]) setEntryProbability(obj.Items[index], itemEntryProbability(obj.Items[index]) || 0.1);
    } else if (action === 'spread_probability_evenly' || action === 'normalize_probability_total') {
      normalizeEntryProbabilities(obj.Items);
    } else if (action === 'merge_duplicate_item') {
      const index = validationIndexFromPath(pathValue, 'Items');
      const target = Number(entry.suggestedFix.target);
      if (Array.isArray(obj.Items) && obj.Items[index] && obj.Items[target]) {
        setEntryProbability(obj.Items[target], itemEntryProbability(obj.Items[target]) + itemEntryProbability(obj.Items[index]));
        obj.Items.splice(index, 1);
      }
    } else if (action === 'fill_tree_name' || action === 'inherit_or_default_rarity' || action === 'drop_invalid_children') {
      const node = validationTreePath(pathValue) === 'root' ? obj : getTreeNodeAtPath(obj, validationTreePath(pathValue));
      if (!node) return false;
      if (action === 'fill_tree_name') node.Name = node.Name || uiText('รายการใหม่', 'New entry');
      if (action === 'inherit_or_default_rarity') node.Rarity = LOOT_RARITIES.includes(node.Rarity) ? node.Rarity : 'Uncommon';
      if (action === 'drop_invalid_children') node.Children = [];
    } else if (action === 'create_nodes_array') {
      obj.Nodes = [];
    } else if (action === 'swap_quantity_range') {
      const min = obj.QuantityMin;
      obj.QuantityMin = obj.QuantityMax;
      obj.QuantityMax = min;
    } else if (action === 'clamp_spawner_probability') {
      obj.Probability = Math.max(0, Math.min(1, Number(obj.Probability || 0)));
    } else if (action === 'coerce_boolean') {
      const key = String(pathValue || '');
      if (key) obj[key] = coerceBool(obj[key]);
    } else if (['remove_invalid_group', 'remove_empty_group'].includes(action)) {
      const index = validationIndexFromPath(pathValue, 'Nodes');
      if (Array.isArray(obj.Nodes) && index >= 0) obj.Nodes.splice(index, 1);
    } else if (action === 'default_group_rarity') {
      const index = validationIndexFromPath(pathValue, 'Nodes');
      if (Array.isArray(obj.Nodes) && obj.Nodes[index]) obj.Nodes[index].Rarity = 'Uncommon';
    } else if (action === 'remove_empty_ref' || action === 'dedupe_refs') {
      const index = validationIndexFromPath(pathValue, 'Nodes');
      if (Array.isArray(obj.Nodes) && obj.Nodes[index]) obj.Nodes[index].Ids = [...new Set(collectSpawnerEntryRefs(obj.Nodes[index]).filter(Boolean))];
    } else {
      return false;
    }
    markLootDirty(true);
    return true;
  }

  function focusValidationEntry(entry) {
    if (!entry) return;
    const pathValue = String(entry.path || '');
    if (/^Items\[\d+\]/.test(pathValue)) {
      const index = validationIndexFromPath(pathValue, 'Items');
      state.focusedLootField = { kind: 'flat', index };
      renderVisualBuilder();
      focusFieldSoon(`[data-entry-name="${index}"]`);
      return;
    }
    if (/^Nodes\[\d+\]/.test(pathValue)) {
      const index = validationIndexFromPath(pathValue, 'Nodes');
      state.focusedLootField = { kind: 'spawner', index };
      renderVisualBuilder();
      focusFieldSoon(`[data-group-ids="${index}"]`);
      return;
    }
    if (pathValue === 'Probability' || pathValue === 'QuantityMin/QuantityMax' || pathValue.startsWith('Should') || pathValue === 'AllowDuplicates') {
      renderVisualBuilder();
      const selector = pathValue === 'QuantityMin/QuantityMax' ? '[data-spawner-field="QuantityMin"]' : `[data-spawner-field="${pathValue}"]`;
      focusFieldSoon(selector);
      return;
    }
    if (pathValue.startsWith('root')) {
      state.lootUi.treeFocusPath = validationTreePath(pathValue);
      renderVisualBuilder();
      focusFieldSoon(`[data-tree-name="${state.lootUi.treeFocusPath}"]`);
    }
  }

  renderValidation = function (v) {
    if (!v) return `<div class="muted">${escapeHtml(uiText('ยังไม่มีข้อมูล validation', 'No validation data yet.'))}</div>`;
    const entries = validationEntries(v);
    state.currentValidationEntries = entries;
    if (!entries.length) return `<div class="success-card">${escapeHtml(uiText('ไม่พบปัญหา validation', 'No validation issues detected.'))}</div>`;
    const counts = v.counts || { critical: 0, warning: 0, info: 0 };
    const fixableCount = entries.filter((entry) => entry.fixable).length;
    const summary = `<div class="validation-overview pill-row"><span class="tag critical">${counts.critical || 0} ${escapeHtml(uiText('critical', 'critical'))}</span><span class="tag warning">${counts.warning || 0} ${escapeHtml(uiText('warning', 'warning'))}</span><span class="tag info">${counts.info || 0} ${escapeHtml(uiText('info', 'info'))}</span>${fixableCount ? `<span class="tag fixable">${fixableCount} ${escapeHtml(uiText('แก้เร็วได้', 'quick-fixable'))}</span>` : ''}</div>`;
    const sections = [
      { key: 'critical', title: uiText('ต้องแก้ก่อน Save', 'Must fix before saving'), card: 'warn-card validation-card severity-critical' },
      { key: 'warning', title: uiText('ควรเช็ก', 'Warnings'), card: 'warn-card validation-card severity-warning' },
      { key: 'info', title: uiText('ข้อมูลประกอบ', 'Info'), card: 'section-card validation-card severity-info' },
    ];
    const body = sections.map((section) => {
      const items = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.severity === section.key);
      if (!items.length) return '';
      return `<div class="${section.card}"><div class="section-head compact"><div><h4>${escapeHtml(section.title)}</h4></div><span class="tag ${section.key}">${items.length}</span></div><div class="validation-list">${items.map(({ entry, index }) => `<div class="validation-row"><div class="validation-copy"><strong>${escapeHtml(entry.message || '')}</strong>${entry.path ? `<div class="muted small">${escapeHtml(entry.path)}</div>` : ''}${entry.suggestion ? `<div class="muted small">${escapeHtml(entry.suggestion)}</div>` : ''}</div><div class="actions tight wrap"><button type="button" class="ghost tiny" data-validation-action="focus" data-validation-index="${index}">${escapeHtml(uiText('ไปที่จุดนี้', 'Focus'))}</button>${entry.fixable && entry.suggestedFix?.action ? `<button type="button" class="tiny" data-validation-action="fix" data-validation-index="${index}" data-validation-fix="${escapeHtml(entry.suggestedFix.action)}">${escapeHtml(uiText('แก้ใน draft', 'Fix draft'))}</button>` : ''}</div></div>`).join('')}</div></div>`;
    }).join('');
    return `${summary}${body}`;
  };

  document.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-loot-context-tab]');
    if (tab) {
      state.lootUi.contextTab = tab.dataset.lootContextTab || 'overview';
      syncLootContextTabs();
      return;
    }
    const button = event.target.closest('[data-validation-action]');
    if (!button) return;
    const entry = (state.currentValidationEntries || [])[Number(button.dataset.validationIndex)];
    if (!entry) return;
    if (button.dataset.validationAction === 'focus') {
      focusValidationEntry(entry);
      return;
    }
    if (button.dataset.validationAction === 'fix') {
      const ok = applyValidationQuickFix(entry);
      if (!ok) return showToast(uiText('ยังแก้รายการนี้อัตโนมัติไม่ได้', 'This issue cannot be quick-fixed yet.'), true);
      refreshDraftAnalysis()
        .then(() => showToast(uiText('แก้ใน draft แล้ว ตรวจใหม่เรียบร้อย', 'Draft fixed and revalidated.')))
        .catch((error) => showToast(error.message || String(error), true));
    }
  });

  flatRowMatches = function (entry, term) {
    if (!term) return true;
    const hay = `${entry?.ClassName || ''} ${entry?.Id || ''} ${entry?.Item || ''} ${entry?.Name || ''}`.toLowerCase();
    return hay.includes(term);
  };

  function catalogCategoryOptions() {
    const defaults = ['weapon', 'ammo', 'medical', 'food', 'tool', 'clothing', 'vehicle', 'currency', 'other'];
    const fromCatalog = (state.itemCatalog?.categories || []).map((entry) => entry.id).filter(Boolean);
    return [...new Set([...defaults, ...fromCatalog])];
  }

  function catalogCategoryLabel(id) {
    const labels = {
      weapon: uiText('อาวุธ', 'Weapon'),
      ammo: uiText('กระสุน/แม็ก', 'Ammo'),
      medical: uiText('ยา/แพทย์', 'Medical'),
      food: uiText('อาหาร', 'Food'),
      tool: uiText('เครื่องมือ', 'Tool'),
      clothing: uiText('เสื้อผ้า', 'Clothing'),
      vehicle: uiText('ยานพาหนะ', 'Vehicle'),
      currency: uiText('เงิน/ของมีค่า', 'Currency'),
      other: uiText('อื่น ๆ', 'Other'),
    };
    return labels[id] || id;
  }

  filteredItemCatalogItems = function () {
    const query = String(state.itemCatalogSearch || '').trim().toLowerCase();
    const category = state.itemCatalogCategory || '__all';
    return (state.itemCatalog?.items || []).filter((item) => {
      if (category === '__favorites' && !item.favorite) return false;
      if (category !== '__all' && category !== '__favorites' && item.category !== category) return false;
      if (!query) return true;
      const hay = `${item.name} ${item.displayName || ''} ${item.category || ''} ${item.notes || ''} ${(item.sampleSources || []).join(' ')}`.toLowerCase();
      return hay.includes(query);
    });
  };

  loadItemCatalog = async function () {
    try {
      const data = await api('/api/items?limit=5000');
      state.itemCatalog = { items: data.items || [], categories: data.categories || [], total: data.total || 0, overridesCount: data.overridesCount || 0 };
      rebuildItemCatalogLookup();
    } catch (error) {
      state.itemCatalog = { items: [], categories: [], total: 0 };
      state.itemCatalogLookup = new Map();
    }
    refreshLootItemDatalist();
    if (state.view === 'loot' && state.selectedLootPath) renderVisualBuilder();
  };

  function renderCatalogEditor() {
    const name = state.lootUi.catalogEditName;
    if (!name) return '';
    const item = getCatalogItemMeta(name) || { name, displayName: name.replace(/_/g, ' '), category: 'other', inferredCategory: 'other', favorite: false, notes: '' };
    const categories = catalogCategoryOptions();
    return `<div class="catalog-meta-editor"><div class="section-head compact"><div><h4>${escapeHtml(uiText('ตั้งชื่ออ่านง่ายให้ไอเท็ม', 'Item display metadata'))}</h4><p class="muted">${escapeHtml(item.name)}</p></div><button type="button" class="ghost tiny" data-catalog-edit-cancel>${escapeHtml(uiText('ปิด', 'Close'))}</button></div><div class="loot-inline-grid catalog-meta-grid"><label><span>${escapeHtml(uiText('ชื่อที่โชว์', 'Display name'))}</span><input id="catalog-meta-display" value="${escapeHtml(item.displayName || '')}" placeholder="${escapeHtml(item.name)}" /></label><label><span>${escapeHtml(uiText('หมวด', 'Category'))}</span><select id="catalog-meta-category">${categories.map((category) => `<option value="${escapeHtml(category)}"${item.category === category ? ' selected' : ''}>${escapeHtml(catalogCategoryLabel(category))}</option>`).join('')}</select></label><label><span>${escapeHtml(uiText('โน้ต', 'Notes'))}</span><input id="catalog-meta-notes" value="${escapeHtml(item.notes || '')}" placeholder="${escapeHtml(uiText('เช่น ใช้กับ starter kit', 'e.g. starter kit item'))}" /></label><label class="checkline catalog-favorite"><input id="catalog-meta-favorite" type="checkbox" ${item.favorite ? 'checked' : ''} /> <span>${escapeHtml(uiText('ปักเป็นรายการโปรด', 'Mark as favorite'))}</span></label></div><div class="actions tight wrap"><button type="button" id="catalog-meta-save" class="tiny">${escapeHtml(uiText('บันทึกชื่อ/หมวด', 'Save metadata'))}</button><button type="button" id="catalog-meta-reset" class="ghost tiny">${escapeHtml(uiText('รีเซ็ต metadata', 'Reset metadata'))}</button></div></div>`;
  }

  function renderCatalogMetadataTools() {
    return `<details class="catalog-metadata-tools"><summary class="section-head compact"><div><h4>${escapeHtml(uiText('นำเข้า/ส่งออก metadata', 'Import/export metadata'))}</h4><p class="muted">${escapeHtml(uiText('ใช้ย้ายชื่ออ่านง่าย หมวด รายการโปรด และโน้ตไปเครื่องอื่น', 'Move friendly names, categories, favorites, and notes to another machine.'))}</p></div><span class="tag">${escapeHtml(String(state.itemCatalog?.overridesCount || 0))}</span></summary><div class="catalog-metadata-body"><div class="actions tight wrap"><button type="button" class="ghost tiny" id="catalog-metadata-export">${escapeHtml(uiText('Export JSON', 'Export JSON'))}</button><select id="catalog-metadata-mode"><option value="merge"${state.lootUi.catalogImportMode === 'merge' ? ' selected' : ''}>${escapeHtml(uiText('Merge', 'Merge'))}</option><option value="replace"${state.lootUi.catalogImportMode === 'replace' ? ' selected' : ''}>${escapeHtml(uiText('Replace ทั้งหมด', 'Replace all'))}</option></select><button type="button" class="tiny" id="catalog-metadata-import">${escapeHtml(uiText('Import JSON', 'Import JSON'))}</button></div><textarea id="catalog-metadata-json" class="catalog-metadata-json code" placeholder="{\n  &quot;Weapon_AK47&quot;: {\n    &quot;displayName&quot;: &quot;AK-47&quot;,\n    &quot;category&quot;: &quot;weapon&quot;,\n    &quot;favorite&quot;: true,\n    &quot;notes&quot;: &quot;Starter kit&quot;\n  }\n}">${escapeHtml(state.lootUi.catalogImportText || '')}</textarea><div id="catalog-metadata-status" class="muted small"></div></div></details>`;
  }

  function renderCatalogResultCard(item) {
    const subtitle = `${item.favorite ? '★ ' : ''}${catalogCategoryLabel(item.category)} · ${item.appearances} ${uiText('ครั้ง', 'hits')}`;
    return `<div class="result-card catalog-pick-card catalog-editable-card ${item.favorite ? 'favorite' : ''}"><button type="button" class="catalog-pick-main" data-catalog-pick="${escapeHtml(item.name)}">${renderCatalogItemIdentity(item.name, subtitle)}</button><div class="actions tight wrap catalog-card-actions"><button type="button" class="ghost tiny" data-catalog-edit="${escapeHtml(item.name)}">${escapeHtml(uiText('ตั้งชื่อ', 'Edit label'))}</button>${item.hasOverride ? `<span class="tag ok">${escapeHtml(uiText('ปรับแล้ว', 'custom'))}</span>` : ''}</div></div>`;
  }

  renderItemCatalogSection = function (mode) {
    const items = filteredItemCatalogItems();
    const categories = state.itemCatalog?.categories || [];
    return `<div class="builder-section catalog-shell"><details class="catalog-panel" ${state.lootUi.itemCatalogOpen ? 'open' : ''}><summary class="section-head compact"><div><h4>${escapeHtml(mode === 'tree' ? uiText('Item catalog สำหรับ tree', 'Item catalog for tree nodes') : uiText('Item catalog', 'Item catalog'))}</h4><p class="muted">${escapeHtml(mode === 'tree' ? uiText('เลือกไอเท็มจริงให้ leaf ที่กำลังแก้อยู่ หรือกดเพื่อเพิ่ม leaf ใหม่ได้ทันที', 'Pick a real item for the focused leaf, or add it as a new leaf immediately.') : uiText('เลือกชื่อจริงหรือชื่ออ่านง่ายจาก catalog แทนการพิมพ์เดาเอง', 'Pick a real class name or friendly label from the catalog instead of guessing.'))}</p></div><div class="actions tight wrap"><span class="tag item">${escapeHtml(`${items.length}/${state.itemCatalog?.total || 0}`)}</span>${state.itemCatalog?.overridesCount ? `<span class="tag ok">${escapeHtml(`${state.itemCatalog.overridesCount} ${uiText('metadata', 'metadata')}`)}</span>` : ''}<button type="button" class="ghost tiny" data-item-catalog-toggle>${escapeHtml(state.lootUi.itemCatalogOpen ? uiText('ซ่อน catalog', 'Hide catalog') : uiText('เปิด catalog', 'Show catalog'))}</button></div></summary><div class="loot-inline-grid catalog-filter-grid"><label><span>${escapeHtml(uiText('ค้นหาไอเท็ม', 'Search items'))}</span><input id="loot-catalog-search" value="${escapeHtml(state.itemCatalogSearch || '')}" placeholder="${escapeHtml(uiText('พิมพ์ชื่อไอเท็มหรือชื่ออ่านง่าย', 'Type item name or friendly label'))}" /></label><label><span>${escapeHtml(uiText('หมวด', 'Category'))}</span><select id="item-catalog-category"><option value="__all">${escapeHtml(uiText('ทุกหมวด', 'All categories'))}</option><option value="__favorites"${state.itemCatalogCategory === '__favorites' ? ' selected' : ''}>${escapeHtml(uiText('รายการโปรด', 'Favorites'))}</option>${categories.map((entry) => `<option value="${escapeHtml(entry.id)}"${entry.id === state.itemCatalogCategory ? ' selected' : ''}>${escapeHtml(`${catalogCategoryLabel(entry.id)} (${entry.count})`)}</option>`).join('')}</select></label></div>${renderCatalogMetadataTools()}${renderCatalogEditor()}<datalist id="loot-item-options">${(state.itemCatalog?.items || []).slice(0, 1200).map((item) => `<option value="${escapeHtml(item.name)}" label="${escapeHtml(item.displayName || item.name)}"></option>`).join('')}</datalist><div class="catalog-result-grid">${items.slice(0, 80).map((item) => renderCatalogResultCard(item)).join('') || `<div class="muted builder-empty">${escapeHtml(uiText('ไม่พบไอเท็มที่ตรงกับคำค้นนี้', 'No items matched this search.'))}</div>`}</div></details></div>`;
  };

  bindItemCatalogControls = function (mode) {
    const toggle = document.querySelector('[data-item-catalog-toggle]');
    if (toggle) toggle.onclick = () => { state.lootUi.itemCatalogOpen = !state.lootUi.itemCatalogOpen; renderVisualBuilder(); };
    if ($('loot-catalog-search')) $('loot-catalog-search').oninput = (event) => { state.itemCatalogSearch = event.target.value; renderVisualBuilder(); };
    if ($('item-catalog-category')) $('item-catalog-category').onchange = (event) => { state.itemCatalogCategory = event.target.value; renderVisualBuilder(); };
    document.querySelectorAll('[data-catalog-edit]').forEach((button) => {
      button.onclick = () => {
        state.lootUi.catalogEditName = button.dataset.catalogEdit || '';
        state.lootUi.itemCatalogOpen = true;
        renderVisualBuilder();
        focusFieldSoon('#catalog-meta-display');
      };
    });
    const cancelEdit = document.querySelector('[data-catalog-edit-cancel]');
    if (cancelEdit) cancelEdit.onclick = () => { state.lootUi.catalogEditName = ''; renderVisualBuilder(); };
    const saveMeta = $('catalog-meta-save');
    if (saveMeta) saveMeta.onclick = saveCatalogMetadata;
    const resetMeta = $('catalog-meta-reset');
    if (resetMeta) resetMeta.onclick = resetCatalogMetadata;
    const importTextarea = $('catalog-metadata-json');
    if (importTextarea) importTextarea.oninput = (event) => { state.lootUi.catalogImportText = event.target.value; };
    const importMode = $('catalog-metadata-mode');
    if (importMode) importMode.onchange = (event) => { state.lootUi.catalogImportMode = event.target.value; };
    const exportButton = $('catalog-metadata-export');
    if (exportButton) exportButton.onclick = exportCatalogMetadata;
    const importButton = $('catalog-metadata-import');
    if (importButton) importButton.onclick = importCatalogMetadata;
    document.querySelectorAll('[data-catalog-pick]').forEach((button) => {
      button.onclick = () => {
        const name = button.dataset.catalogPick || '';
        if (!name) return;
        const obj = state.currentLootObject || {};
        if (mode === 'tree') {
          if (state.focusedLootField?.kind === 'tree') {
            const node = getTreeNodeAtPath(obj, state.focusedLootField.path);
            if (node) node.Name = name;
          } else {
            obj.Children = Array.isArray(obj.Children) ? obj.Children : [];
            obj.Children.push({ Name: name, Rarity: obj.Rarity || 'Uncommon' });
          }
        } else {
          obj.Items = Array.isArray(obj.Items) ? obj.Items : [];
          if (state.focusedLootField?.kind === 'flat' && Number.isInteger(state.focusedLootField.index) && obj.Items[state.focusedLootField.index]) {
            setItemEntryName(obj.Items[state.focusedLootField.index], name);
          } else {
            obj.Items.push({ ClassName: name, Probability: 1 });
          }
        }
        renderVisualBuilder();
      };
    });
  };

  async function saveCatalogMetadata() {
    const name = state.lootUi.catalogEditName;
    if (!name) return;
    await api('/api/items/override', {
      method: 'PUT',
      body: JSON.stringify({
        name,
        displayName: $('catalog-meta-display')?.value || '',
        category: $('catalog-meta-category')?.value || '',
        favorite: Boolean($('catalog-meta-favorite')?.checked),
        notes: $('catalog-meta-notes')?.value || '',
      }),
    });
    showToast(uiText('บันทึก metadata ไอเท็มแล้ว', 'Item metadata saved'));
    await loadItemCatalog();
  }

  async function exportCatalogMetadata() {
    const data = await api('/api/items/overrides');
    const text = `${JSON.stringify(data.overrides || {}, null, 2)}\n`;
    state.lootUi.catalogImportText = text;
    const textarea = $('catalog-metadata-json');
    if (textarea) {
      textarea.value = text;
      textarea.focus();
      textarea.select();
    }
    const status = $('catalog-metadata-status');
    if (status) status.textContent = uiText(`Export แล้ว ${data.count || 0} รายการ`, `Exported ${data.count || 0} entries`);
  }

  async function importCatalogMetadata() {
    const raw = $('catalog-metadata-json')?.value || state.lootUi.catalogImportText || '';
    let overrides = {};
    try {
      overrides = JSON.parse(raw || '{}');
    } catch {
      return showToast(uiText('JSON metadata ไม่ถูกต้อง', 'Invalid metadata JSON'), true);
    }
    const mode = $('catalog-metadata-mode')?.value || state.lootUi.catalogImportMode || 'merge';
    const data = await api('/api/items/overrides', { method: 'PUT', body: JSON.stringify({ mode, overrides }) });
    state.lootUi.catalogImportText = raw;
    state.lootUi.catalogImportMode = mode;
    const status = $('catalog-metadata-status');
    if (status) status.textContent = uiText(`Import ${data.importedCount || 0} รายการ รวม ${data.totalCount || 0}`, `Imported ${data.importedCount || 0} entries, ${data.totalCount || 0} total`);
    showToast(uiText('นำเข้า metadata แล้ว', 'Metadata imported'));
    await loadItemCatalog();
  }

  async function resetCatalogMetadata() {
    const name = state.lootUi.catalogEditName;
    if (!name) return;
    await api(`/api/items/override?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    state.lootUi.catalogEditName = '';
    showToast(uiText('รีเซ็ต metadata ไอเท็มแล้ว', 'Item metadata reset'));
    await loadItemCatalog();
  }

  function lootContextTabMeta(tab) {
    switch (tab) {
      case 'validation':
        return {
          title: uiText('ตรวจและซ่อม', 'Validation and fixes'),
          hint: uiText('ดูความผิดพลาดก่อน แล้วค่อยใช้ auto-fix เท่าที่จำเป็น', 'Check the problems first, then use auto-fix only where it actually helps.'),
          badge: uiText('การตรวจสอบ', 'Validation')
        };
      case 'deps':
        return {
          title: uiText('ไฟล์นี้ถูกใช้ตรงไหน', 'Where this file is used'),
          hint: uiText('ดูว่ามี spawner หรือ tree ref ไหนชี้กลับมาหาไฟล์นี้บ้างก่อนแก้แรง ๆ', 'See which spawners or tree refs point back here before making aggressive changes.'),
          badge: uiText('ความสัมพันธ์', 'Dependencies')
        };
      case 'simulator':
        return {
          title: uiText('จำลองผลดรอป', 'Drop simulator'),
          hint: uiText('ใช้จำลองคร่าว ๆ ว่าหลังแก้แล้ว item ไหนมีโอกาสออกบ่อยขึ้นหรือลดลง', 'Run a quick simulation to see which items become more or less common after your edits.'),
          badge: uiText('จำลอง', 'Simulator')
        };
      default:
        return {
          title: uiText('ภาพรวมการแก้ไฟล์', 'Editing context'),
          hint: uiText('สรุปโครงไฟล์และทางลัดสั้น ๆ ก่อนลงมือแก้ใน editor', 'See the file shape and quick support actions before you start editing in the main editor.'),
          badge: uiText('ภาพรวม', 'Overview')
        };
    }
  }

  function syncLootContextTabs() {
    const activeTab = state.lootUi.contextTab || 'overview';
    document.querySelectorAll('[data-loot-context-tab]').forEach((button) => {
      const active = button.dataset.lootContextTab === activeTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-loot-context-panel]').forEach((panel) => {
      const active = panel.dataset.lootContextPanel === activeTab;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    const meta = lootContextTabMeta(activeTab);
    setText('loot-context-title', meta.title);
    setText('loot-context-hint', meta.hint);
    const summary = state.currentLootAnalysis?.summary || null;
    const badge = $('loot-context-file-kind');
    if (badge) {
      badge.textContent = summary?.kind ? lootKindLabel(summary.kind) : meta.badge;
      badge.className = `tag ${summary?.kind === 'spawner' ? 'spawner' : summary?.kind === 'node_tree' ? 'node' : summary?.kind === 'node' ? 'item' : ''}`.trim();
    }
  }

  function bindLootContextTabs() {
    document.querySelectorAll('[data-loot-context-tab]').forEach((button) => {
      button.onclick = () => {
        state.lootUi.contextTab = button.dataset.lootContextTab || 'overview';
        syncLootContextTabs();
      };
    });
  }

  function applyLootShellCopy() {
    setText('loot-files-title', t('lootFiles'));
    setText('loot-files-hint', t('lootHint'));
    setPlaceholder('loot-search', uiText('ค้นหาไฟล์ลูท...', 'Search loot files...'));
    setText('loot-inspector-title', uiText('ภาพรวมไฟล์', 'File overview'));
    setText('loot-inspector-hint', uiText('สรุปว่าไฟล์นี้เป็น schema แบบไหนและมีขนาดประมาณไหน', 'Quick summary of the file schema and how large it is.'));
    setText('loot-kit-title', t('kitTemplates'));
    setText('loot-kit-hint', uiText('ใช้เติมชุดของพื้นฐานแบบเร็ว ๆ ตอนเริ่มตั้งค่า', 'Use these for quick starter packs when you need a baseline.'));
    setText('loot-validation-title', t('validation'));
    setText('loot-usedby-title', t('usedBy'));
    setText('loot-usedby-hint', uiText('ดูว่าไฟล์นี้ไปถูกเรียกใช้ต่อจากตรงไหนบ้าง', 'See which other loot files or spawners call into this one.'));
    setText('loot-simulator-title', t('simulator'));
    setText('loot-editor-hint', t('visualSyncHint'));
    setText('loot-context-overview-tab', uiText('ภาพรวม', 'Overview'));
    setText('loot-context-validation-tab', t('validation'));
    setText('loot-context-deps-tab', t('usedBy'));
    setText('loot-context-simulator-tab', t('simulator'));
    document.querySelectorAll('[data-kit="ak"]').forEach((element) => { element.textContent = t('akKit'); });
    document.querySelectorAll('[data-kit="sniper"]').forEach((element) => { element.textContent = t('sniperKit'); });
    document.querySelectorAll('[data-kit="medical"]').forEach((element) => { element.textContent = t('medicalKit'); });
  }

  function applyCoreCopyPolish() {
    setSelectorText('.brand-block p.muted', state.lang === 'th' ? 'ไทย / EN' : 'TH / English');
    setText('lang-toggle', state.lang === 'en' ? 'ไทย' : 'EN');
    setSelectorText('.topbar .eyebrow', uiText('ศูนย์ควบคุมแบบโลคัล', 'LOCAL-FIRST CONTROL PLANE'));
    setText('global-refresh', uiText('รีเฟรช', 'Refresh'));
    setText('global-backup', uiText('แบ็กอัปไฟล์หลัก', 'Backup core'));
    setText('global-reload', uiText('รีโหลดลูท', 'Reload loot'));
    setText('global-restart', uiText('รีสตาร์ตเซิร์ฟเวอร์', 'Restart server'));

    setSelectorText('#view-dashboard .hero .eyebrow', uiText('ตรวจความพร้อม', 'READY CHECK'));
    setSelectorText('#view-dashboard .hero h3', uiText('แก้ค่าตั้งเซิร์ฟเวอร์ ปรับลูท ตรวจ reference และสำรองไฟล์ก่อน apply จริง', 'Edit server settings, tune loot, validate references, and keep backups before applying changes.'));
    setSelectorText('#view-dashboard .hero p.muted', uiText('ใช้ Preflight ด้านล่างเพื่อตรวจ path, validation, backup และคำสั่ง reload ก่อนแตะไฟล์จริง', 'Use the preflight panel below to confirm paths, loot validation, backups, and reload commands before touching live files.'));
    setSelectorText('#view-dashboard .grid.two .card:nth-child(1) h3', uiText('สถานะระบบ', 'System health'));
    setSelectorText('#view-dashboard .grid.two .card:nth-child(1) p.muted', uiText('ดูว่า path, ไฟล์หลัก และคำสั่งที่จำเป็นพร้อมหรือยัง', 'See whether paths, core files, and commands are ready.'));
    setSelectorText('.console-head strong', uiText('ผลลัพธ์คำสั่ง', 'Command output'));
    setText('clear-console', uiText('ล้าง', 'Clear'));
    setSelectorText('#view-dashboard .grid.two .card:nth-child(2) h3', uiText('ค้นหาทั้งระบบ', 'Global Search'));
    setSelectorText('#view-dashboard .grid.two .card:nth-child(2) p.muted', uiText('ค้นหา settings, economy, nodes, spawners และชื่อไอเท็มจากจุดเดียว', 'Search settings, economy, nodes, spawners, and item names from one place.'));
    setPlaceholder('global-search-term', uiText('ค้นหา item, node, spawner หรือ setting...', 'Search item, node, spawner, setting...'));
    setText('global-search-btn', uiText('ค้นหา', 'Search'));

    setText('settings-title', uiText('ตั้งค่าแอป', 'App Settings'));
    setText('settings-hint', uiText('กำหนด path จริงและคำสั่งที่ใช้กับเซิร์ฟเวอร์นี้', 'Configure real paths and server commands.'));
    setText('settings-paths-title', uiText('Workspace Paths', 'Workspace Paths'));
    setText('settings-paths-hint', uiText('ชี้ให้ถูกว่าแต่ละ editor ต้องแก้ไฟล์จากโฟลเดอร์ไหน', 'Point each editor at the real folders it should work against.'));
    setText('label-scum-dir', uiText('โฟลเดอร์คอนฟิก SCUM', 'SCUM config folder'));
    setText('label-backup-dir', uiText('โฟลเดอร์แบ็กอัป', 'Backup folder'));
    setText('label-nodes-dir', uiText('โฟลเดอร์ Nodes', 'Nodes folder'));
    setText('label-spawners-dir', uiText('โฟลเดอร์ Spawners', 'Spawners folder'));
    setText('settings-paths-note', uiText('ปล่อย Nodes และ Spawners ว่างได้ ถ้าต้องการใช้โฟลเดอร์มาตรฐานใต้ SCUM config root', 'Leave Nodes and Spawners blank to use the default subfolders under the SCUM config root.'));
    setText('settings-commands-title', uiText('Commands', 'Commands'));
    setText('settings-commands-hint', uiText('คำสั่งเสริมที่ระบบใช้หลัง save หรือ apply', 'Optional commands the app can run after a save or apply.'));
    setText('label-reload-cmd', uiText('คำสั่งรีโหลดลูท', 'Reload loot command'));
    setText('label-restart-cmd', uiText('คำสั่งรีสตาร์ตเซิร์ฟเวอร์', 'Restart server command'));
    setText('label-autobackup', uiText('แบ็กอัปไฟล์หลักอัตโนมัติเมื่อเปิด', 'Auto backup core files on start'));
    setText('save-config-btn', uiText('บันทึกการตั้งค่าแอป', 'Save App Config'));
    setText('check-config-btn', uiText('ตรวจโฟลเดอร์', 'Check folder'));
    setText('discover-config-btn', uiText('หาโฟลเดอร์ที่น่าจะใช่', 'Find likely folders'));
    setText('settings-status-title', uiText('สถานะการตั้งค่า', 'Setup status'));
    setText('settings-status-hint', uiText('ดูให้ชัดว่า root, loot folders และไฟล์หลักพร้อมจริงหรือยัง', 'See whether the root, loot folders, and required files are actually ready.'));
    setText('settings-discovery-title', uiText('โฟลเดอร์ที่น่าจะใช่', 'Likely folders'));
    setText('settings-discovery-hint', uiText('ตำแหน่งบน Windows ที่มักเจอ dedicated server config', 'Common Windows locations for a dedicated server config.'));

    setSelectorText('#view-analyzer .grid.two .card:nth-child(2) p.muted', uiText('รายการที่ควรตรวจทานก่อน apply การแก้ลูท', 'Issues to review before applying loot changes.'));
    setSelectorText('#view-graph .section-head p.muted', uiText('ความสัมพันธ์ Spawner → Node → Item พร้อม focus และ filter', 'Spawner → Node → Item relationships with focus and filters.'));
    setSelectorText('#view-profiles .card.stack-spaced p.muted', uiText('สลับโปรไฟล์ตามตารางเวลาสำหรับหลายโหมดของเซิร์ฟเวอร์', 'Cycle profiles on a schedule for multiple server modes.'));
    setSelectorText('#view-backups .grid.two .card:nth-child(1) p.muted', uiText('สร้าง tag เปรียบเทียบ และกู้คืน snapshot ได้ปลอดภัย', 'Create, tag, compare, and restore safe snapshots.'));
    setSelectorText('#view-diff p.muted', uiText('ตรวจความต่างก่อน apply การแก้ไฟล์', 'Preview before applying file changes.'));
  }

  if (baseApplyTranslations) {
    applyTranslations = function () {
      baseApplyTranslations();
      mountGlobalSearchControls();
      applyCoreCopyPolish();
      applyLootShellCopy();
      bindLootContextTabs();
      syncLootContextTabs();
    };
  }

  if (baseUpdateLootWorkspaceCopy) {
    updateLootWorkspaceCopy = function () {
      baseUpdateLootWorkspaceCopy();
      applyLootShellCopy();
      setText('loot-workspace-title', uiText('พื้นที่ทำงานลูท', 'Loot workspace'));
      setText('loot-workspace-hint', uiText('แยกหน้าเป็นรายชื่อไฟล์, พื้นที่แก้, และแท็บบริบท เพื่อไม่ให้ข้อมูลกองพร้อมกันทั้งหน้า', 'Split the screen into the file rail, the editor stage, and context tabs so information does not pile up on one long page.'));
      setText('loot-inspector-toggle', !state.lootUi.showInspector || state.lootUi.focusMode ? uiText('เปิดแท็บบริบท', 'Show context') : uiText('ซ่อนแท็บบริบท', 'Hide context'));
      bindLootContextTabs();
      syncLootContextTabs();
    };
  }

  if (baseUpdateLootWorkspaceLayout) {
    updateLootWorkspaceLayout = function () {
      baseUpdateLootWorkspaceLayout();
      bindLootContextTabs();
      syncLootContextTabs();
    };
  }

  if (typeof renderAutoFixNotes === 'function') {
    renderAutoFixNotes = function (data) {
      const changes = data?.changes || data?.warnings || [];
      const validation = data?.validation || null;
      const counts = validation?.counts || { critical: 0, warning: 0, info: 0 };
      const summary = `<div class="validation-overview pill-row"><span class="tag fixable">${changes.length} ${escapeHtml(uiText('รายการที่แก้อัตโนมัติ', 'auto-fix changes'))}</span><span class="tag critical">${counts.critical || 0} ${escapeHtml(uiText('critical คงเหลือ', 'critical left'))}</span><span class="tag warning">${counts.warning || 0} ${escapeHtml(uiText('warning คงเหลือ', 'warning left'))}</span></div>`;
      const list = changes.length
        ? `<div class="section-card autofix-card"><strong>${escapeHtml(uiText('Auto-fix จะปรับอะไรบ้าง', 'What auto-fix will change'))}</strong><ul class="bad-list autofix-list">${changes.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul></div>`
        : `<div class="success-card">${escapeHtml(uiText('ไม่พบจุดที่ต้องแก้อัตโนมัติ', 'No auto-fix changes were needed.'))}</div>`;
      return `${summary}${list}`;
    };
  }

  function setupWizardStatusClass(ok) {
    return ok ? 'good' : 'bad';
  }

  function setupWizardStatusText(ok) {
    return ok ? uiText('พร้อม', 'Ready') : uiText('ยังขาด', 'Missing');
  }

  function setupWizardPathValue(id) {
    return String($(id)?.value || '').trim();
  }

  function renderSetupWizard(inspection = state.configInspection || null, commandHealth = state.commandHealth || {}) {
    const host = $('setup-wizard-panel');
    if (!host) return;
    const fileHealth = inspection?.fileHealth || {};
    const checks = [
      { label: uiText('โฟลเดอร์ SCUM config', 'SCUM config folder'), ok: !!inspection?.rootExists, detail: inspection?.rootPath || setupWizardPathValue('cfg-scum-dir') || '-' },
      { label: 'ServerSettings.ini', ok: !!fileHealth['ServerSettings.ini'], detail: inspection?.rootPath || '-' },
      { label: 'GameUserSettings.ini', ok: !!fileHealth['GameUserSettings.ini'], detail: inspection?.rootPath || '-' },
      { label: 'EconomyOverride.json', ok: !!fileHealth['EconomyOverride.json'], detail: inspection?.rootPath || '-' },
      { label: uiText('Nodes folder', 'Nodes folder'), ok: !!inspection?.nodesExists, detail: inspection?.nodesPath || setupWizardPathValue('cfg-nodes-dir') || '-' },
      { label: uiText('Spawners folder', 'Spawners folder'), ok: !!inspection?.spawnersExists, detail: inspection?.spawnersPath || setupWizardPathValue('cfg-spawners-dir') || '-' },
      { label: uiText('Reload command', 'Reload command'), ok: !!commandHealth.reload?.runnable, detail: commandHealth.reload?.command || setupWizardPathValue('cfg-reload-cmd') || uiText('ไม่บังคับ แต่ควรตั้งถ้าจะกด Save + Reload', 'Optional, but recommended for Save + Reload') },
      { label: uiText('Restart command', 'Restart command'), ok: !!commandHealth.restart?.runnable, detail: commandHealth.restart?.command || setupWizardPathValue('cfg-restart-cmd') || uiText('ไม่บังคับ', 'Optional') },
    ];
    const readyCount = checks.filter((check) => check.ok).length;
    const requiredReady = checks.slice(0, 6).every((check) => check.ok);
    const missing = inspection?.missing || checks.filter((check, index) => index < 6 && !check.ok).map((check) => check.label);
    host.innerHTML = `<div class="setup-wizard-card ${requiredReady ? 'ready' : ''}"><div class="section-head compact"><div><h3>${escapeHtml(uiText('Setup Wizard', 'Setup Wizard'))}</h3><p class="muted">${escapeHtml(uiText('เช็กทีละขั้นว่า path, loot folders, command และไฟล์หลักพร้อมใช้งานจริงหรือยัง', 'Check paths, loot folders, commands, and required files before using the editor.'))}</p></div><span class="tag ${requiredReady ? 'ok' : 'warning'}">${escapeHtml(`${readyCount}/${checks.length}`)}</span></div><div class="wizard-step-grid"><div class="wizard-step ${setupWizardStatusClass(!!inspection?.rootExists)}"><span>1</span><strong>${escapeHtml(uiText('เลือก Config Root', 'Choose config root'))}</strong><p>${escapeHtml(uiText('ต้องเป็นโฟลเดอร์ที่มี ServerSettings.ini และไฟล์หลัก', 'Must contain ServerSettings.ini and core config files.'))}</p></div><div class="wizard-step ${setupWizardStatusClass(!!inspection?.nodesExists && !!inspection?.spawnersExists)}"><span>2</span><strong>${escapeHtml(uiText('ชี้ Nodes / Spawners', 'Point Nodes / Spawners'))}</strong><p>${escapeHtml(uiText('รองรับ path custom หรือปล่อยว่างเพื่อใช้ default ใต้ config root', 'Supports custom paths or defaults under the config root.'))}</p></div><div class="wizard-step ${setupWizardStatusClass(!!commandHealth.reload?.runnable)}"><span>3</span><strong>${escapeHtml(uiText('ตั้งคำสั่งรีโหลด', 'Wire reload command'))}</strong><p>${escapeHtml(uiText('ใช้ตอน Save + Reload หรือ apply profile', 'Used by Save + Reload and profile apply.'))}</p></div></div><div class="wizard-check-list">${checks.map((check) => `<div class="wizard-check ${setupWizardStatusClass(check.ok)}"><div><strong>${escapeHtml(check.label)}</strong><small>${escapeHtml(check.detail)}</small></div><span>${escapeHtml(setupWizardStatusText(check.ok))}</span></div>`).join('')}</div>${missing.length ? `<div class="warn-card wizard-next"><strong>${escapeHtml(uiText('ยังต้องแก้', 'Needs attention'))}</strong><p class="muted">${escapeHtml(missing.join(', '))}</p></div>` : `<div class="success-card wizard-next">${escapeHtml(uiText('Path หลักพร้อมใช้งานแล้ว เปิด Loot Studio/Analyzer/Graph ได้', 'Core paths are ready. Loot Studio, Analyzer, and Graph can run.'))}</div>`}<div class="actions tight wrap"><button id="wizard-check-now" class="ghost tiny">${escapeHtml(uiText('ตรวจตอนนี้', 'Check now'))}</button><button id="wizard-save-config" class="tiny">${escapeHtml(uiText('บันทึกและตรวจใหม่', 'Save and recheck'))}</button><button id="wizard-discover" class="ghost tiny">${escapeHtml(uiText('หาโฟลเดอร์ที่น่าจะใช่', 'Find likely folders'))}</button></div></div>`;
    const checkButton = $('wizard-check-now');
    const saveButton = $('wizard-save-config');
    const discoverButton = $('wizard-discover');
    if (checkButton) checkButton.onclick = () => runSetupWizardCheck();
    if (saveButton) saveButton.onclick = () => runSetupWizardSave();
    if (discoverButton) discoverButton.onclick = () => discoverConfigFolders().then(() => renderSetupWizard(state.configInspection, state.commandHealth)).catch((error) => showToast(error.message, true));
  }

  async function runSetupWizardCheck() {
    const path = setupWizardPathValue('cfg-scum-dir');
    const nodesPath = setupWizardPathValue('cfg-nodes-dir');
    const spawnersPath = setupWizardPathValue('cfg-spawners-dir');
    const [folder, reload, restart] = await Promise.all([
      api(`/api/config/check?path=${encodeURIComponent(path)}&nodesPath=${encodeURIComponent(nodesPath)}&spawnersPath=${encodeURIComponent(spawnersPath)}`),
      api('/api/command/check', { method: 'POST', body: JSON.stringify({ command: setupWizardPathValue('cfg-reload-cmd') }) }),
      api('/api/command/check', { method: 'POST', body: JSON.stringify({ command: setupWizardPathValue('cfg-restart-cmd') }) }),
    ]);
    state.configInspection = folder.inspection;
    state.commandHealth = { ...(state.commandHealth || {}), reload: reload.inspection, restart: restart.inspection };
    renderConfigInspection(folder.inspection);
    renderSetupWizard(folder.inspection, state.commandHealth);
    showToast(uiText('ตรวจ Setup Wizard แล้ว', 'Setup wizard check complete.'));
  }

  async function runSetupWizardSave() {
    if (typeof saveConfig === 'function') {
      await saveConfig();
      await runSetupWizardCheck();
    }
  }

  function mountSetupWizard() {
    const settings = document.querySelector('#view-settings .stack-spaced');
    if (!settings || $('setup-wizard-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'setup-wizard-panel';
    settings.prepend(panel);
    renderSetupWizard(state.configInspection, state.commandHealth);
  }

  function readinessStatusText(status) {
    if (status === 'ok') return uiText('ผ่าน', 'OK');
    if (status === 'bad') return uiText('ต้องแก้', 'Fix');
    return uiText('ควรดู', 'Check');
  }

  function readinessScoreClass(score) {
    if (score >= 85) return 'ready';
    if (score >= 60) return 'warn';
    return 'bad';
  }

  function renderReadinessPanel(report = state.readiness) {
    const host = $('readiness-panel');
    if (!host) return;
    if (!report) {
      host.innerHTML = `<div class="section-head compact"><div><h3>${escapeHtml(uiText('Preflight พร้อมใช้งานจริง', 'Real-use preflight'))}</h3><p class="muted">${escapeHtml(uiText('กำลังตรวจ path, loot, backup และ command', 'Checking paths, loot, backups, and commands.'))}</p></div><span class="tag">...</span></div>`;
      return;
    }
    if (report.error) {
      host.innerHTML = `<div class="section-head compact"><div><h3>${escapeHtml(uiText('Preflight พร้อมใช้งานจริง', 'Real-use preflight'))}</h3><p class="muted">${escapeHtml(report.error)}</p></div><button id="readiness-refresh" class="ghost tiny">${escapeHtml(uiText('ตรวจใหม่', 'Recheck'))}</button></div>`;
      const refresh = $('readiness-refresh');
      if (refresh) refresh.onclick = () => loadReadiness().catch((error) => showToast(error.message, true));
      return;
    }
    const counts = report.counts || {};
    const checks = Array.isArray(report.checks) ? [...report.checks] : [];
    const sortedChecks = checks.sort((a, b) => {
      const rank = { bad: 3, warn: 2, ok: 1 };
      return (rank[b.status] || 0) - (rank[a.status] || 0) || String(a.label || '').localeCompare(String(b.label || ''));
    });
    const visibleChecks = sortedChecks.slice(0, 10);
    const latestBackup = report.latestBackup
      ? `${report.latestBackup.name} · ${new Date(report.latestBackup.updatedAt).toLocaleString()}`
      : uiText('ยังไม่มี backup', 'No backup yet');
    host.innerHTML = `<div class="readiness-top"><div><div class="eyebrow">${escapeHtml(uiText('พร้อมใช้จริง', 'PRODUCTION READY'))}</div><h3>${escapeHtml(uiText('Preflight ก่อนแก้/เซฟ/รีโหลด', 'Preflight before edit/save/reload'))}</h3><p class="muted">${escapeHtml(uiText('รวมผล path, syntax, validation, missing refs, backup และคำสั่ง reload ไว้จุดเดียว', 'One place for paths, syntax, validation, missing refs, backups, and reload command readiness.'))}</p></div><div class="readiness-score ${readinessScoreClass(Number(report.score || 0))}"><strong>${escapeHtml(String(report.score ?? 0))}</strong><span>${escapeHtml(report.ready ? uiText('พร้อมใช้', 'Ready') : uiText('ยังต้องแก้', 'Needs work'))}</span></div></div><div class="readiness-grid"><div><span>${escapeHtml(uiText('ปัญหาหนัก', 'Critical'))}</span><strong>${escapeHtml(String(counts.critical || 0))}</strong></div><div><span>${escapeHtml(uiText('คำเตือน', 'Warnings'))}</span><strong>${escapeHtml(String(counts.warning || 0))}</strong></div><div><span>${escapeHtml(uiText('Missing refs', 'Missing refs'))}</span><strong>${escapeHtml(String(counts.missingRefs || 0))}</strong></div><div><span>${escapeHtml(uiText('ไฟล์ลูท', 'Loot files'))}</span><strong>${escapeHtml(`${counts.nodes || 0}/${counts.spawners || 0}`)}</strong></div><div><span>${escapeHtml(uiText('Backup ล่าสุด', 'Latest backup'))}</span><strong>${escapeHtml(latestBackup)}</strong></div></div><div class="readiness-checks">${visibleChecks.map((check) => `<div class="readiness-check ${escapeHtml(check.status || 'warn')}"><div><strong>${escapeHtml(check.label || '-')}</strong><small>${escapeHtml(check.detail || check.action || '')}</small>${check.action ? `<small>${escapeHtml(check.action)}</small>` : ''}</div><span>${escapeHtml(readinessStatusText(check.status))}</span></div>`).join('')}</div>${report.validationFiles?.length ? `<div class="readiness-files"><strong>${escapeHtml(uiText('ไฟล์ที่ควรเปิดไปแก้ก่อน', 'Files to fix first'))}</strong>${report.validationFiles.slice(0, 5).map((file) => `<button type="button" class="ghost tiny" data-readiness-file="${escapeHtml(file.path)}">${escapeHtml(`${file.path} · C${file.critical}/W${file.warning}`)}</button>`).join('')}</div>` : ''}<div class="actions tight wrap"><button id="readiness-refresh" class="ghost tiny">${escapeHtml(uiText('ตรวจตอนนี้', 'Run preflight'))}</button><button class="ghost tiny" data-readiness-view="settings">${escapeHtml(uiText('ไป Settings', 'Open Settings'))}</button><button class="ghost tiny" data-readiness-view="loot">${escapeHtml(uiText('ไป Loot Studio', 'Open Loot Studio'))}</button><button class="ghost tiny" data-readiness-view="analyzer">${escapeHtml(uiText('ไป Analyzer', 'Open Analyzer'))}</button><button class="ghost tiny" data-readiness-view="backups">${escapeHtml(uiText('ไป Backups', 'Open Backups'))}</button></div>`;
    bindReadinessPanel();
  }

  function mountReadinessPanel() {
    const dashboard = $('view-dashboard');
    if (!dashboard || $('readiness-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'readiness-panel';
    panel.className = 'card readiness-card';
    const setupNotice = $('setup-notice');
    if (setupNotice?.parentElement) {
      setupNotice.insertAdjacentElement('afterend', panel);
    } else {
      dashboard.prepend(panel);
    }
    renderReadinessPanel(state.readiness);
  }

  function quickStepState(ok, warn = false) {
    if (ok) return 'ok';
    return warn ? 'warn' : 'bad';
  }

  function quickStepLabel(status) {
    if (status === 'ok') return uiText('เสร็จ', 'Done');
    if (status === 'warn') return uiText('ไม่บังคับ', 'Optional');
    return uiText('ต้องทำ', 'Required');
  }

  function buildQuickStartSteps(report = state.readiness) {
    const counts = report?.counts || {};
    const pathsReady = Boolean(report?.checks?.find((check) => check.id === 'config_root')?.status === 'ok')
      && Boolean(report?.checks?.find((check) => check.id === 'nodes_folder')?.status === 'ok')
      && Boolean(report?.checks?.find((check) => check.id === 'spawners_folder')?.status === 'ok');
    const reloadReady = Boolean(report?.commandHealth?.reload?.runnable);
    const hasLootFiles = (counts.files || 0) > 0;
    const validationReady = hasLootFiles && !(counts.validationCritical || counts.parseErrors || counts.missingRefs);
    const hasBackups = (counts.backups || 0) > 0;
    return [
      {
        id: 'settings',
        index: '1',
        status: quickStepState(pathsReady),
        title: uiText('ตั้ง path ให้ถูกก่อน', 'Set paths first'),
        body: uiText('เลือก SCUM config folder และ Nodes/Spawners folder ให้ระบบดึงไฟล์จริง', 'Choose the SCUM config folder and Nodes/Spawners folders so the app edits real files.'),
        view: 'settings',
        action: uiText('เปิด Settings', 'Open Settings'),
      },
      {
        id: 'preflight',
        index: '2',
        status: quickStepState(Boolean(report?.ready), Boolean(report && !report.ready)),
        title: uiText('รัน Preflight', 'Run preflight'),
        body: uiText('ตรวจไฟล์หลัก syntax, missing refs, validation และคำสั่ง reload ก่อนแก้ของจริง', 'Check core files, syntax, missing refs, validation, and reload commands before editing.'),
        action: uiText('ตรวจตอนนี้', 'Run check'),
        buttonId: 'quick-start-preflight',
      },
      {
        id: 'backup',
        index: '3',
        status: quickStepState(hasBackups),
        title: uiText('สร้าง backup แรก', 'Create first backup'),
        body: uiText('ก่อน save/apply ควรมี snapshot อย่างน้อยหนึ่งชุด และติด tag สำคัญเช่น keep', 'Before save/apply, keep at least one snapshot and tag important ones as keep.'),
        view: 'backups',
        action: uiText('เปิด Backups', 'Open Backups'),
      },
      {
        id: 'loot',
        index: '4',
        status: quickStepState(hasLootFiles),
        title: uiText('แก้ Loot Studio แบบ visual', 'Edit in Loot Studio'),
        body: uiText('เลือก node/spawner ใช้ autocomplete, icon, bulk edit, kit template และ simulator แทนการไล่ JSON ยาว ๆ', 'Use autocomplete, icons, bulk edit, kit templates, and simulator instead of reading long JSON.'),
        view: 'loot',
        action: uiText('เปิด Loot Studio', 'Open Loot Studio'),
      },
      {
        id: 'validation',
        index: '5',
        status: quickStepState(validationReady, hasLootFiles),
        title: uiText('แก้ validation ให้หมด', 'Clear validation issues'),
        body: uiText('ใช้ Fix draft/Auto-fix กับ critical, missing refs และ probability ก่อนกด save', 'Use Fix draft/Auto-fix for critical issues, missing refs, and probability problems before saving.'),
        view: 'loot',
        action: uiText('ไป Validation', 'Open Validation'),
      },
      {
        id: 'reload',
        index: '6',
        status: quickStepState(reloadReady, true),
        title: uiText('ตั้ง Save + Reload', 'Wire Save + Reload'),
        body: uiText('ถ้ามี script reload ให้ตั้งไว้เพื่อกด save แล้ว reload ได้จากแอป', 'If you have a reload script, configure it so save + reload can run from the app.'),
        view: 'settings',
        action: uiText('ตั้งคำสั่ง', 'Set command'),
      },
      {
        id: 'restore',
        index: '7',
        status: quickStepState(hasBackups),
        title: uiText('รู้วิธีกู้คืน', 'Know how to restore'),
        body: uiText('ถ้าแก้พลาด ให้ไป Backups เลือก snapshot แล้ว restore เฉพาะไฟล์ที่ต้องการ', 'If a change goes wrong, choose a snapshot in Backups and restore only the needed file.'),
        view: 'backups',
        action: uiText('ดู Restore', 'View Restore'),
      },
    ];
  }

  function renderQuickStartPanel(report = state.readiness) {
    const host = $('quick-start-panel');
    if (!host) return;
    const steps = buildQuickStartSteps(report);
    const done = steps.filter((step) => step.status === 'ok').length;
    host.innerHTML = `<div class="section-head compact"><div><div class="eyebrow">${escapeHtml(uiText('เริ่มใช้งานจริง', 'QUICK START'))}</div><h3>${escapeHtml(uiText('ลำดับใช้งานที่ปลอดภัย', 'Safe workflow order'))}</h3><p class="muted">${escapeHtml(uiText('ทำตามนี้จากบนลงล่าง: ตั้ง path, ตรวจ, backup, แก้ loot, validate, save/reload และรู้ทาง restore', 'Follow this from top to bottom: paths, preflight, backup, edit loot, validate, save/reload, and restore.'))}</p></div><span class="tag ${done === steps.length ? 'ok' : 'warning'}">${escapeHtml(`${done}/${steps.length}`)}</span></div><div class="quick-start-grid">${steps.map((step) => `<div class="quick-start-step ${escapeHtml(step.status)}"><div class="quick-start-index">${escapeHtml(step.index)}</div><div class="quick-start-copy"><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.body)}</p><div class="actions tight wrap"><span class="quick-start-status">${escapeHtml(quickStepLabel(step.status))}</span>${step.view ? `<button type="button" class="ghost tiny" data-quick-view="${escapeHtml(step.view)}">${escapeHtml(step.action)}</button>` : `<button type="button" class="ghost tiny" id="${escapeHtml(step.buttonId)}">${escapeHtml(step.action)}</button>`}</div></div></div>`).join('')}</div>`;
    bindQuickStartPanel();
  }

  function mountQuickStartPanel() {
    const dashboard = $('view-dashboard');
    if (!dashboard || $('quick-start-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'quick-start-panel';
    panel.className = 'card quick-start-card';
    const readiness = $('readiness-panel');
    if (readiness?.parentElement) readiness.insertAdjacentElement('afterend', panel);
    else {
      const setupNotice = $('setup-notice');
      if (setupNotice?.parentElement) setupNotice.insertAdjacentElement('afterend', panel);
      else dashboard.prepend(panel);
    }
    renderQuickStartPanel(state.readiness);
  }

  function bindQuickStartPanel() {
    const preflight = $('quick-start-preflight');
    if (preflight) preflight.onclick = () => loadReadiness().catch((error) => showToast(error.message, true));
    document.querySelectorAll('[data-quick-view]').forEach((button) => {
      button.onclick = () => {
        const view = button.dataset.quickView;
        if (typeof setView === 'function') setView(view);
        if (view === 'backups' && typeof loadBackups === 'function') loadBackups().catch((error) => showToast(error.message, true));
      };
    });
  }

  function renderDiagnosticsPanel() {
    const host = $('diagnostics-panel');
    if (!host) return;
    const hasReport = Boolean(state.diagnostics.reportText);
    host.innerHTML = `<div class="section-head compact"><div><div class="eyebrow">${escapeHtml(uiText('ส่งให้คนช่วยดู', 'SUPPORT EXPORT'))}</div><h3>${escapeHtml(uiText('Diagnostics report', 'Diagnostics report'))}</h3><p class="muted">${escapeHtml(uiText('รวมสถานะ path, readiness, validation, backup และ activity โดยไม่แนบเนื้อหาไฟล์ config', 'Exports paths, readiness, validation, backups, and activity status without attaching config file contents.'))}</p></div><span class="tag">${escapeHtml(hasReport ? uiText('พร้อม copy', 'ready') : uiText('ยังไม่สร้าง', 'empty'))}</span></div><label class="checkline diagnostics-privacy"><input id="diagnostics-include-paths" type="checkbox" ${state.diagnostics.includePaths ? 'checked' : ''} /> <span>${escapeHtml(uiText('ใส่ path จริงในรายงาน', 'Include local paths'))}</span></label><div class="actions tight wrap"><button id="generate-diagnostics" class="tiny">${escapeHtml(uiText('สร้างรายงาน', 'Generate report'))}</button><button id="copy-diagnostics" class="ghost tiny" ${hasReport ? '' : 'disabled'}>${escapeHtml(uiText('Copy JSON', 'Copy JSON'))}</button><button id="download-diagnostics" class="ghost tiny" ${hasReport ? '' : 'disabled'}>${escapeHtml(uiText('Download JSON', 'Download JSON'))}</button></div><textarea id="diagnostics-output" class="diagnostics-output code" placeholder="${escapeHtml(uiText('กดสร้างรายงานก่อน', 'Generate a report first.'))}">${escapeHtml(state.diagnostics.reportText || '')}</textarea>`;
    bindDiagnosticsPanel();
  }

  function mountDiagnosticsPanel() {
    const dashboard = $('view-dashboard');
    if (!dashboard || $('diagnostics-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'diagnostics-panel';
    panel.className = 'card diagnostics-card';
    const quickStart = $('quick-start-panel');
    if (quickStart?.parentElement) quickStart.insertAdjacentElement('afterend', panel);
    else {
      const readiness = $('readiness-panel');
      if (readiness?.parentElement) readiness.insertAdjacentElement('afterend', panel);
      else dashboard.prepend(panel);
    }
    renderDiagnosticsPanel();
  }

  async function generateDiagnosticsReport() {
    state.diagnostics.includePaths = Boolean($('diagnostics-include-paths')?.checked);
    const data = await api(`/api/diagnostics?includePaths=${state.diagnostics.includePaths ? 'true' : 'false'}`);
    state.diagnostics.reportText = `${JSON.stringify(data.report || {}, null, 2)}\n`;
    renderDiagnosticsPanel();
    showToast(uiText('สร้าง diagnostics report แล้ว', 'Diagnostics report generated'));
  }

  async function copyDiagnosticsReport() {
    const text = state.diagnostics.reportText || $('diagnostics-output')?.value || '';
    if (!text) return showToast(uiText('ยังไม่มีรายงานให้ copy', 'No report to copy'), true);
    try {
      await navigator.clipboard.writeText(text);
      showToast(uiText('Copy รายงานแล้ว', 'Report copied'));
    } catch {
      const output = $('diagnostics-output');
      if (output) {
        output.focus();
        output.select();
      }
      showToast(uiText('เลือกข้อความไว้ให้แล้ว กด Ctrl+C', 'Selected text. Press Ctrl+C.'), true);
    }
  }

  function downloadDiagnosticsReport() {
    const text = state.diagnostics.reportText || $('diagnostics-output')?.value || '';
    if (!text) return showToast(uiText('ยังไม่มีรายงานให้ download', 'No report to download'), true);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scum-local-control-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function bindDiagnosticsPanel() {
    const includePaths = $('diagnostics-include-paths');
    if (includePaths) includePaths.onchange = (event) => { state.diagnostics.includePaths = event.target.checked; };
    const generate = $('generate-diagnostics');
    if (generate) generate.onclick = () => generateDiagnosticsReport().catch((error) => showToast(error.message, true));
    const copy = $('copy-diagnostics');
    if (copy) copy.onclick = () => copyDiagnosticsReport().catch((error) => showToast(error.message, true));
    const download = $('download-diagnostics');
    if (download) download.onclick = downloadDiagnosticsReport;
  }

  async function loadReadiness() {
    mountReadinessPanel();
    mountQuickStartPanel();
    mountDiagnosticsPanel();
    renderReadinessPanel(state.readiness);
    renderQuickStartPanel(state.readiness);
    renderDiagnosticsPanel();
    const data = await api('/api/readiness');
    state.readiness = data.report;
    renderReadinessPanel(state.readiness);
    renderQuickStartPanel(state.readiness);
    return state.readiness;
  }

  function bindReadinessPanel() {
    const refresh = $('readiness-refresh');
    if (refresh) refresh.onclick = () => loadReadiness().catch((error) => showToast(error.message, true));
    document.querySelectorAll('[data-readiness-view]').forEach((button) => {
      button.onclick = () => {
        const view = button.dataset.readinessView;
        if (typeof setView === 'function') setView(view);
        if (view === 'analyzer' && typeof loadAnalyzer === 'function') loadAnalyzer().catch((error) => showToast(error.message, true));
        if (view === 'backups' && typeof loadBackups === 'function') loadBackups().catch((error) => showToast(error.message, true));
      };
    });
    document.querySelectorAll('[data-readiness-file]').forEach((button) => {
      button.onclick = () => {
        const filePath = button.dataset.readinessFile;
        if (typeof setView === 'function') setView('loot');
        if (filePath && typeof openLootFile === 'function') openLootFile(filePath).catch((error) => showToast(error.message, true));
      };
    });
  }

  const baseLoadBootstrap = typeof loadBootstrap === 'function' ? loadBootstrap : null;
  if (baseLoadBootstrap) {
    loadBootstrap = async function () {
      await baseLoadBootstrap();
      mountSetupWizard();
      renderSetupWizard(state.configInspection, state.commandHealth);
      mountReadinessPanel();
      mountQuickStartPanel();
      mountDiagnosticsPanel();
      loadReadiness().catch((error) => {
        state.readiness = { error: error.message };
        renderReadinessPanel(state.readiness);
        renderQuickStartPanel(state.readiness);
        renderDiagnosticsPanel();
      });
    };
  }

  const baseRenderSettingsStatusSummary = typeof renderSettingsStatusSummary === 'function' ? renderSettingsStatusSummary : null;
  if (baseRenderSettingsStatusSummary) {
    renderSettingsStatusSummary = function (data) {
      baseRenderSettingsStatusSummary(data);
      mountSetupWizard();
      renderSetupWizard(data?.configInspection || state.configInspection, data?.commandHealth || state.commandHealth);
    };
  }

  function mountBackupControls() {
    const backupsCard = $('backups-list')?.closest('.card');
    if (backupsCard && !$('backup-control-panel')) {
      const panel = document.createElement('div');
      panel.id = 'backup-control-panel';
      panel.className = 'backup-control-panel';
      backupsCard.insertBefore(panel, $('backups-list'));
    }
    const filesCard = $('backup-files-list')?.closest('.card');
    if (filesCard && !$('backup-compare-panel')) {
      const panel = document.createElement('div');
      panel.id = 'backup-compare-panel';
      panel.className = 'backup-compare-panel';
      filesCard.insertBefore(panel, $('backup-files-list'));
    }
  }

  function backupTags(backups = state.backups || []) {
    return [...new Set(backups.map((backup) => backup.tag).filter(Boolean))].sort();
  }

  function renderBackupControls(backups = state.backups || []) {
    mountBackupControls();
    const tags = backupTags(backups);
    const control = $('backup-control-panel');
    if (control) {
      control.innerHTML = `<div class="loot-inline-grid backup-create-grid"><label><span>${escapeHtml(uiText('Note ของ backup ใหม่', 'New backup note'))}</span><input id="backup-note-input" value="${escapeHtml(state.backupUi.note || '')}" placeholder="${escapeHtml(uiText('เช่น ก่อนปรับ bunker loot', 'e.g. before bunker loot tuning'))}" /></label><label><span>${escapeHtml(uiText('Tag', 'Tag'))}</span><input id="backup-tag-input" value="${escapeHtml(state.backupUi.tag || '')}" placeholder="safe, pvp, before-edit" /></label></div><div class="actions tight wrap"><button id="create-tagged-backup" class="tiny">${escapeHtml(uiText('สร้าง backup พร้อม note', 'Create tagged backup'))}</button><select id="backup-tag-filter"><option value="__all">${escapeHtml(uiText('ทุก tag', 'All tags'))}</option>${tags.map((tag) => `<option value="${escapeHtml(tag)}" ${state.backupUi.tagFilter === tag ? 'selected' : ''}>${escapeHtml(tag)}</option>`).join('')}</select></div><div class="backup-cleanup-panel"><div class="section-head compact"><div><h4>${escapeHtml(uiText('ล้าง backup เก่า', 'Cleanup old backups'))}</h4><p class="muted">${escapeHtml(uiText('ค่าเริ่มต้นจะเก็บ backup ล่าสุดไว้ และไม่ลบ tag keep/pinned/protected', 'By default this keeps the latest backups and skips keep/pinned/protected tags.'))}</p></div><span class="tag">${escapeHtml(String(backups.length))}</span></div><div class="loot-inline-grid backup-cleanup-grid"><label><span>${escapeHtml(uiText('เก็บล่าสุดไว้กี่ชุด', 'Keep latest'))}</span><input id="backup-cleanup-keep" type="number" min="1" max="500" value="${escapeHtml(String(state.backupUi.cleanupKeepLatest || 10))}" /></label><label><span>${escapeHtml(uiText('ล้างเฉพาะ tag', 'Cleanup tag'))}</span><select id="backup-cleanup-tag"><option value="">${escapeHtml(uiText('ทุก tag', 'All tags'))}</option>${tags.map((tag) => `<option value="${escapeHtml(tag)}" ${state.backupUi.cleanupTag === tag ? 'selected' : ''}>${escapeHtml(tag)}</option>`).join('')}</select></label><label class="checkline backup-cleanup-protected"><input id="backup-cleanup-protected" type="checkbox" ${state.backupUi.cleanupIncludeProtected ? 'checked' : ''} /> <span>${escapeHtml(uiText('รวม tag keep/pinned/protected', 'Include keep/pinned/protected'))}</span></label></div><div class="actions tight wrap"><button id="preview-backup-cleanup" class="ghost tiny">${escapeHtml(uiText('พรีวิวที่จะลบ', 'Preview cleanup'))}</button><button id="apply-backup-cleanup" class="danger-outline tiny" disabled>${escapeHtml(uiText('ลบตามพรีวิว', 'Delete previewed'))}</button></div><div id="backup-cleanup-result" class="backup-cleanup-result muted small"></div></div>`;
      $('backup-note-input').oninput = (event) => { state.backupUi.note = event.target.value; };
      $('backup-tag-input').oninput = (event) => { state.backupUi.tag = event.target.value; };
      $('create-tagged-backup').onclick = createTaggedBackup;
      $('backup-tag-filter').onchange = (event) => { state.backupUi.tagFilter = event.target.value; renderBackupList(); };
      bindBackupCleanupControls();
    }
    renderBackupComparePanel();
  }

  function backupCleanupOptions() {
    return {
      keepLatest: Number($('backup-cleanup-keep')?.value || state.backupUi.cleanupKeepLatest || 10),
      tag: String($('backup-cleanup-tag')?.value || ''),
      includeProtected: Boolean($('backup-cleanup-protected')?.checked),
    };
  }

  function renderBackupCleanupPlan(plan, applied = false) {
    const target = $('backup-cleanup-result');
    const applyButton = $('apply-backup-cleanup');
    if (!target) return;
    const candidates = plan?.candidates || plan?.deleted || [];
    const names = candidates.slice(0, 5).map((backup) => backup.name).join(', ');
    target.innerHTML = candidates.length
      ? `${escapeHtml(applied ? uiText('ลบแล้ว', 'Deleted') : uiText('จะลบ', 'Will delete'))}: <strong>${escapeHtml(String(candidates.length))}</strong> / ${escapeHtml(String(plan.total || 0))}${names ? `<br>${escapeHtml(names)}${candidates.length > 5 ? ' ...' : ''}` : ''}`
      : escapeHtml(uiText('ไม่มี backup ที่เข้าเงื่อนไขลบ', 'No backups match cleanup rules.'));
    if (applyButton) applyButton.disabled = !candidates.length || applied;
  }

  function bindBackupCleanupControls() {
    const keepInput = $('backup-cleanup-keep');
    const tagSelect = $('backup-cleanup-tag');
    const protectedInput = $('backup-cleanup-protected');
    const previewButton = $('preview-backup-cleanup');
    const applyButton = $('apply-backup-cleanup');
    if (keepInput) keepInput.oninput = (event) => { state.backupUi.cleanupKeepLatest = Number(event.target.value || 10); state.backupUi.cleanupPlan = null; if (applyButton) applyButton.disabled = true; };
    if (tagSelect) tagSelect.onchange = (event) => { state.backupUi.cleanupTag = event.target.value; state.backupUi.cleanupPlan = null; if (applyButton) applyButton.disabled = true; };
    if (protectedInput) protectedInput.onchange = (event) => { state.backupUi.cleanupIncludeProtected = event.target.checked; state.backupUi.cleanupPlan = null; if (applyButton) applyButton.disabled = true; };
    if (previewButton) previewButton.onclick = previewBackupCleanup;
    if (applyButton) applyButton.onclick = applyBackupCleanup;
    if (state.backupUi.cleanupResult) renderBackupCleanupPlan(state.backupUi.cleanupResult, true);
    else if (state.backupUi.cleanupPlan) renderBackupCleanupPlan(state.backupUi.cleanupPlan);
  }

  async function previewBackupCleanup() {
    const options = backupCleanupOptions();
    state.backupUi.cleanupKeepLatest = options.keepLatest;
    state.backupUi.cleanupTag = options.tag;
    state.backupUi.cleanupIncludeProtected = options.includeProtected;
    const data = await api('/api/backups/cleanup/preview', { method: 'POST', body: JSON.stringify(options) });
    state.backupUi.cleanupPlan = data.plan;
    renderBackupCleanupPlan(data.plan);
  }

  async function applyBackupCleanup() {
    const plan = state.backupUi.cleanupPlan;
    if (!plan?.candidates?.length) return showToast(uiText('ต้องพรีวิวก่อนลบ', 'Preview cleanup first'), true);
    const ok = window.confirm(uiText(`ลบ backup ${plan.candidates.length} ชุด?`, `Delete ${plan.candidates.length} backups?`));
    if (!ok) return;
    const data = await api('/api/backups/cleanup', { method: 'POST', body: JSON.stringify({ ...backupCleanupOptions(), confirm: true }) });
    state.backupUi.cleanupPlan = null;
    state.backupUi.cleanupResult = data.result;
    renderBackupCleanupPlan(state.backupUi.cleanupResult, true);
    showToast(uiText('ล้าง backup เก่าแล้ว', 'Old backups cleaned up'));
    await loadBackups();
    await loadActivity();
  }

  function renderBackupList() {
    const backups = (state.backups || []).filter((backup) => state.backupUi.tagFilter === '__all' || !state.backupUi.tagFilter || backup.tag === state.backupUi.tagFilter);
    $('backups-list').innerHTML = backups.map((backup) => `<button class="file-item backup-item ${backup.name === state.selectedBackup ? 'active' : ''}" data-backup="${escapeHtml(backup.name)}"><strong>${escapeHtml(backup.name)}</strong><span class="item-sub">${escapeHtml(fmtDate(backup.updatedAt))}</span><span class="item-sub">${escapeHtml(`${backup.fileCount || 0} ${uiText('ไฟล์', 'files')}${backup.tag ? ` · #${backup.tag}` : ''}`)}</span>${backup.note ? `<span class="item-sub">${escapeHtml(backup.note)}</span>` : ''}</button>`).join('') || `<div class="muted">${escapeHtml(uiText('ยังไม่มี backup ที่ตรงกับ filter', 'No backups matched this filter.'))}</div>`;
    document.querySelectorAll('[data-backup]').forEach((button) => button.onclick = () => openBackup(button.dataset.backup));
  }

  function selectedBackupMeta() {
    return (state.backups || []).find((backup) => backup.name === state.selectedBackup) || null;
  }

  function renderBackupComparePanel() {
    mountBackupControls();
    const backups = state.backups || [];
    const selected = selectedBackupMeta();
    const compareOptions = backups.filter((backup) => backup.name !== state.selectedBackup).map((backup) => `<option value="${escapeHtml(backup.name)}" ${state.backupUi.compareTarget === backup.name ? 'selected' : ''}>${escapeHtml(`${backup.name}${backup.tag ? ` #${backup.tag}` : ''}`)}</option>`).join('');
    const panel = $('backup-compare-panel');
    if (!panel) return;
    panel.innerHTML = `<div class="backup-selected-meta">${selected ? `<div><strong>${escapeHtml(selected.name)}</strong><div class="muted">${escapeHtml(`${selected.fileCount || 0} ${uiText('ไฟล์', 'files')} · ${fmtDate(selected.updatedAt)}`)}</div></div>` : `<div class="muted">${escapeHtml(uiText('เลือก backup ก่อน', 'Select a backup first.'))}</div>`}</div><div class="loot-inline-grid backup-meta-grid"><label><span>${escapeHtml(uiText('Tag ของ backup นี้', 'Backup tag'))}</span><input id="selected-backup-tag" value="${escapeHtml(selected?.tag || '')}" ${selected ? '' : 'disabled'} /></label><label><span>${escapeHtml(uiText('Note ของ backup นี้', 'Backup note'))}</span><input id="selected-backup-note" value="${escapeHtml(selected?.note || '')}" ${selected ? '' : 'disabled'} /></label></div><div class="actions tight wrap"><button id="save-backup-meta" class="ghost tiny" ${selected ? '' : 'disabled'}>${escapeHtml(uiText('บันทึก note/tag', 'Save note/tag'))}</button><select id="backup-compare-target" ${selected ? '' : 'disabled'}><option value="">${escapeHtml(uiText('เลือก backup เพื่อเทียบ', 'Choose backup to compare'))}</option>${compareOptions}</select><button id="compare-backup-summary" class="ghost tiny" ${selected ? '' : 'disabled'}>${escapeHtml(uiText('Compare ทั้งชุด', 'Compare snapshot'))}</button><button id="compare-backup-file" class="ghost tiny" ${selected && state.selectedBackupFile ? '' : 'disabled'}>${escapeHtml(uiText('Compare ไฟล์ที่เลือก', 'Compare selected file'))}</button></div>`;
    const tagInput = $('selected-backup-tag');
    const noteInput = $('selected-backup-note');
    const compareSelect = $('backup-compare-target');
    if (compareSelect) compareSelect.onchange = (event) => { state.backupUi.compareTarget = event.target.value; };
    const saveButton = $('save-backup-meta');
    if (saveButton) saveButton.onclick = () => saveSelectedBackupMeta(tagInput?.value || '', noteInput?.value || '');
    const compareSummary = $('compare-backup-summary');
    if (compareSummary) compareSummary.onclick = () => compareSelectedBackup('');
    const compareFile = $('compare-backup-file');
    if (compareFile) compareFile.onclick = () => compareSelectedBackup(state.selectedBackupFile);
  }

  async function createTaggedBackup() {
    const note = $('backup-note-input')?.value || 'manual-backup';
    const tag = $('backup-tag-input')?.value || 'manual';
    const data = await api('/api/backup', { method: 'POST', body: JSON.stringify({ note, tag }) });
    showToast(`${t('backupCreated')}: ${data.backupPath}`);
    state.backupUi.note = '';
    state.backupUi.tag = '';
    await loadBackups();
  }

  async function saveSelectedBackupMeta(tag, note) {
    if (!state.selectedBackup) return showToast(uiText('เลือก backup ก่อน', 'Select a backup first'), true);
    await api('/api/backup/meta', { method: 'PUT', body: JSON.stringify({ backup: state.selectedBackup, tag, note }) });
    showToast(uiText('บันทึก note/tag แล้ว', 'Backup note/tag saved'));
    await loadBackups();
    await openBackup(state.selectedBackup);
  }

  async function compareSelectedBackup(path = '') {
    if (!state.selectedBackup || !state.backupUi.compareTarget) return showToast(uiText('เลือก backup สองชุดก่อน', 'Choose two backups first'), true);
    const query = `base=${encodeURIComponent(state.backupUi.compareTarget)}&target=${encodeURIComponent(state.selectedBackup)}${path ? `&path=${encodeURIComponent(path)}` : ''}`;
    const data = await api(`/api/backup/compare?${query}`);
    if (data.mode === 'file') {
      $('backup-file-preview').textContent = data.patch || '';
      return;
    }
    const changed = (data.files || []).filter((file) => file.status !== 'same');
    $('backup-file-preview').textContent = [
      `${uiText('Compare backup', 'Backup compare')}: ${state.backupUi.compareTarget} -> ${state.selectedBackup}`,
      `added=${data.counts?.added || 0} removed=${data.counts?.removed || 0} changed=${data.counts?.changed || 0} same=${data.counts?.same || 0}`,
      '',
      ...changed.slice(0, 120).map((file) => `${file.status.toUpperCase()} ${file.relPath} (${file.baseSize} -> ${file.targetSize} bytes)`),
    ].join('\n');
  }

  loadBackups = async function () {
    const data = await api('/api/backups');
    state.backups = data.backups || [];
    renderBackupControls(state.backups);
    renderBackupList();
  };

  openBackup = async function (name) {
    state.selectedBackup = name;
    if (!state.backupUi.compareTarget || state.backupUi.compareTarget === name) {
      state.backupUi.compareTarget = (state.backups || []).find((backup) => backup.name !== name)?.name || '';
    }
    const data = await api(`/api/backup/files?backup=${encodeURIComponent(name)}`);
    $('backup-files-list').innerHTML = data.files.map((file) => `<button class="file-item ${file.relPath === state.selectedBackupFile ? 'active' : ''}" data-backup-file="${escapeHtml(file.relPath)}"><strong>${escapeHtml(file.relPath)}</strong><span class="item-sub">${escapeHtml(`${file.size} ${t('bytes')} · ${fmtDate(file.updatedAt)}`)}</span></button>`).join('');
    document.querySelectorAll('[data-backup-file]').forEach((button) => button.onclick = () => openBackupFile(button.dataset.backupFile));
    renderBackupList();
    renderBackupComparePanel();
  };

  openBackupFile = async function (relPath) {
    state.selectedBackupFile = relPath;
    const data = await api(`/api/backup/file?backup=${encodeURIComponent(state.selectedBackup)}&path=${encodeURIComponent(relPath)}`);
    $('backup-file-preview').textContent = data.content;
    document.querySelectorAll('[data-backup-file]').forEach((button) => button.classList.toggle('active', button.dataset.backupFile === relPath));
    renderBackupComparePanel();
  };

  backupCore = async function () {
    const data = await api('/api/backup', { method: 'POST', body: JSON.stringify({ note: 'manual-backup', tag: 'manual' }) });
    showToast(`${t('backupCreated')}: ${data.backupPath}`);
    await loadBackups();
  };

  function mountActivityFilters() {
    const activityCard = $('activity-log')?.closest('.card');
    if (!activityCard || $('activity-filter-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'activity-filter-panel';
    panel.className = 'activity-filter-panel';
    activityCard.insertBefore(panel, $('activity-log'));
  }

  function renderActivityFilters(entries = []) {
    mountActivityFilters();
    const types = [...new Set(entries.map((entry) => entry.type).filter(Boolean))].sort();
    const panel = $('activity-filter-panel');
    if (!panel) return;
    panel.innerHTML = `<div class="loot-inline-grid activity-filter-grid"><label><span>${escapeHtml(uiText('ชนิด event', 'Event type'))}</span><select id="activity-type-filter"><option value="__all">${escapeHtml(uiText('ทั้งหมด', 'All'))}</option>${types.map((type) => `<option value="${escapeHtml(type)}" ${state.activityUi.type === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></label><label><span>${escapeHtml(uiText('ค้นหา', 'Search'))}</span><input id="activity-term-filter" value="${escapeHtml(state.activityUi.term || '')}" placeholder="${escapeHtml(uiText('เช่น backup, loot, profile', 'backup, loot, profile'))}" /></label><label><span>${escapeHtml(uiText('Path / Backup', 'Path / Backup'))}</span><input id="activity-path-filter" value="${escapeHtml(state.activityUi.path || '')}" placeholder="Nodes/Airfield.json" /></label></div><div class="actions tight wrap"><button id="activity-apply-filter" class="tiny">${escapeHtml(uiText('กรอง log', 'Filter log'))}</button><button id="activity-clear-filter" class="ghost tiny">${escapeHtml(uiText('ล้าง filter', 'Clear filter'))}</button></div>`;
    $('activity-type-filter').onchange = (event) => { state.activityUi.type = event.target.value; };
    $('activity-term-filter').oninput = (event) => { state.activityUi.term = event.target.value; };
    $('activity-path-filter').oninput = (event) => { state.activityUi.path = event.target.value; };
    $('activity-apply-filter').onclick = loadActivity;
    $('activity-clear-filter').onclick = () => { state.activityUi = { type: '__all', term: '', path: '' }; loadActivity(); };
  }

  function renderActivityList(entries = []) {
    const target = $('activity-log');
    if (!target) return;
    target.classList.add('activity-list');
    target.innerHTML = entries.length ? entries.map((entry) => `<div class="activity-entry"><div><strong>${escapeHtml(entry.type || 'event')}</strong><span>${escapeHtml(fmtDate(entry.at))}</span></div><code>${escapeHtml(entry.path || entry.backup || entry.id || '')}</code><pre>${escapeHtml(JSON.stringify(entry, null, 2))}</pre></div>`).join('') : `<div class="muted">${escapeHtml(uiText('ไม่พบ activity ที่ตรงกับ filter', 'No activity matched this filter.'))}</div>`;
  }

  loadActivity = async function () {
    const params = new URLSearchParams();
    params.set('limit', '250');
    if (state.activityUi.type && state.activityUi.type !== '__all') params.set('type', state.activityUi.type);
    if (state.activityUi.term) params.set('term', state.activityUi.term);
    if (state.activityUi.path) params.set('path', state.activityUi.path);
    const data = await api(`/api/activity?${params.toString()}`);
    const entries = data.entries || [];
    renderActivityFilters(entries);
    renderActivityList(entries);
  };

  function bindBackupActivityOverrides() {
    mountBackupControls();
    mountActivityFilters();
    if ($('refresh-backups')) $('refresh-backups').onclick = () => loadBackups().catch((error) => showToast(error.message, true));
    if ($('restore-backup-file')) $('restore-backup-file').onclick = restoreBackupFile;
    if ($('refresh-activity')) $('refresh-activity').onclick = () => loadActivity().catch((error) => showToast(error.message, true));
    if ($('global-backup')) $('global-backup').onclick = () => backupCore().catch((error) => showToast(error.message, true));
  }

  function graphKindLabel(kind) {
    const labels = {
      spawner: uiText('Spawner', 'Spawner'),
      node: uiText('Node/Branch', 'Node/Branch'),
      item: uiText('Item', 'Item'),
      missing_ref: uiText('Ref หาย', 'Missing ref'),
    };
    return labels[kind] || kind || '';
  }

  function graphFilteredData() {
    const nodes = state.graph?.nodes || [];
    const edges = state.graph?.edges || [];
    const term = String($('graph-filter')?.value || '').trim().toLowerCase();
    const kind = state.graphUi.kind || '__all';
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const matchedIds = new Set();
    if (term) {
      nodes.forEach((node) => {
        const hay = `${node.label || ''} ${node.path || ''} ${node.kind || ''}`.toLowerCase();
        if (hay.includes(term)) matchedIds.add(node.id);
      });
      edges.forEach((edge) => {
        if (matchedIds.has(edge.from) || matchedIds.has(edge.to)) {
          matchedIds.add(edge.from);
          matchedIds.add(edge.to);
        }
      });
    } else {
      nodes.forEach((node) => matchedIds.add(node.id));
    }
    let visibleNodes = nodes.filter((node) => matchedIds.has(node.id) && (kind === '__all' || node.kind === kind));
    const overflowCount = Math.max(0, visibleNodes.length - 420);
    if (overflowCount) visibleNodes = visibleNodes.slice(0, 420);
    const visibleIds = new Set(visibleNodes.map((node) => node.id));
    const visibleEdges = edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));
    return { nodes: visibleNodes, edges: visibleEdges, nodeMap, overflowCount, term };
  }

  function layoutGraphNodes(nodes) {
    const buckets = { spawner: [], node: [], item: [], missing_ref: [] };
    nodes.forEach((node) => (buckets[node.kind] || buckets.node).push(node));
    Object.values(buckets).forEach((list) => list.sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''))));
    const positions = new Map();
    const columnOf = { spawner: 0, node: 1, item: 2, missing_ref: 2 };
    nodes.forEach((node) => {
      const list = buckets[node.kind] || buckets.node;
      const index = list.findIndex((entry) => entry.id === node.id);
      const column = columnOf[node.kind] ?? 1;
      positions.set(node.id, { x: 34 + column * 330, y: 36 + Math.max(0, index) * 88 });
    });
    const maxRows = Math.max(1, ...Object.values(buckets).map((list) => list.length));
    return { positions, width: 1040, height: Math.max(360, maxRows * 88 + 90) };
  }

  function graphNeighborIds(selectedId, edges) {
    const ids = new Set();
    if (!selectedId) return ids;
    edges.forEach((edge) => {
      if (edge.from === selectedId) ids.add(edge.to);
      if (edge.to === selectedId) ids.add(edge.from);
    });
    return ids;
  }

  function graphFocusNode() {
    const nodeMap = new Map((state.graph?.nodes || []).map((node) => [node.id, node]));
    return nodeMap.get(state.graphUi.selectedId) || null;
  }

  loadGraph = async function () {
    const focus = $('graph-filter')?.value || '';
    const data = await api(`/api/graph?focus=${encodeURIComponent(focus)}`);
    state.graph = { nodes: data.nodes || [], edges: data.edges || [], neighborhood: data.neighborhood || [], focus: data.focus || null, focusIds: data.focusIds || [] };
    if (state.graphUi.selectedId && !state.graph.nodes.some((node) => node.id === state.graphUi.selectedId)) state.graphUi.selectedId = '';
    renderGraph();
  };

  renderGraph = function () {
    const canvas = $('graph-canvas');
    if (!canvas) return;
    const { nodes, edges, overflowCount } = graphFilteredData();
    const { positions, width, height } = layoutGraphNodes(nodes);
    const selectedId = state.graphUi.selectedId || (state.graph?.focusIds || [])[0] || '';
    const neighbors = graphNeighborIds(selectedId, state.graph?.edges || []);
    const edgeMarkup = edges.map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return '';
      const active = selectedId && (edge.from === selectedId || edge.to === selectedId);
      return `<line class="graph-map-edge ${edge.missing ? 'missing' : ''} ${active ? 'active' : ''}" x1="${from.x + 250}" y1="${from.y + 25}" x2="${to.x}" y2="${to.y + 25}" />`;
    }).join('');
    const nodeMarkup = nodes.map((node) => {
      const pos = positions.get(node.id) || { x: 0, y: 0 };
      const active = node.id === selectedId;
      const related = neighbors.has(node.id);
      return `<button type="button" class="graph-map-node ${node.kind} ${active ? 'active' : ''} ${related ? 'related' : ''}" data-graph-node-id="${escapeHtml(node.id)}" style="left:${pos.x}px;top:${pos.y}px"><span class="tag ${node.kind}">${escapeHtml(graphKindLabel(node.kind))}</span><strong>${escapeHtml(node.label || node.id)}</strong><small>${escapeHtml(node.path || '')}</small></button>`;
    }).join('');
    const kindButtons = ['__all', 'spawner', 'node', 'item', 'missing_ref'].map((kind) => `<button type="button" class="ghost tiny ${state.graphUi.kind === kind ? 'active' : ''}" data-graph-kind="${escapeHtml(kind)}">${escapeHtml(kind === '__all' ? uiText('ทั้งหมด', 'All') : graphKindLabel(kind))}</button>`).join('');
    canvas.innerHTML = `<div class="graph-toolbar"><div class="actions tight wrap">${kindButtons}</div><div class="actions tight wrap"><button type="button" class="ghost tiny" id="graph-zoom-out">-</button><span class="tag">${Math.round((state.graphUi.zoom || 1) * 100)}%</span><button type="button" class="ghost tiny" id="graph-zoom-in">+</button><button type="button" class="ghost tiny" id="graph-reset-view">${escapeHtml(uiText('รีเซ็ตมุมมอง', 'Reset view'))}</button></div></div>${overflowCount ? `<div class="warn-card graph-limit-note">${escapeHtml(uiText(`แสดง 420 จุดแรก ซ่อนอีก ${overflowCount} จุด ใช้ช่องค้นหาเพื่อเจาะลงไป`, `Showing first 420 nodes. ${overflowCount} more hidden; use search to narrow the graph.`))}</div>` : ''}<div class="graph-viewport"><div class="graph-map" style="width:${width}px;height:${height}px;transform:translate(${state.graphUi.panX || 0}px, ${state.graphUi.panY || 0}px) scale(${state.graphUi.zoom || 1})"><svg class="graph-map-lines" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${edgeMarkup}</svg>${nodeMarkup}</div></div>`;
    canvas.querySelectorAll('[data-graph-kind]').forEach((button) => {
      button.onclick = () => { state.graphUi.kind = button.dataset.graphKind || '__all'; renderGraph(); };
    });
    canvas.querySelectorAll('[data-graph-node-id]').forEach((button) => {
      button.onclick = () => { state.graphUi.selectedId = button.dataset.graphNodeId || ''; renderGraph(); renderGraphFocus(); };
    });
    const zoomBy = (amount) => {
      state.graphUi.zoom = Math.max(0.45, Math.min(1.8, Number(((state.graphUi.zoom || 1) + amount).toFixed(2))));
      renderGraph();
    };
    const zoomIn = $('graph-zoom-in');
    const zoomOut = $('graph-zoom-out');
    const reset = $('graph-reset-view');
    if (zoomIn) zoomIn.onclick = () => zoomBy(0.12);
    if (zoomOut) zoomOut.onclick = () => zoomBy(-0.12);
    if (reset) reset.onclick = () => { state.graphUi.zoom = 1; state.graphUi.panX = 0; state.graphUi.panY = 0; renderGraph(); };
    const viewport = canvas.querySelector('.graph-viewport');
    if (viewport) {
      let dragStart = null;
      viewport.onwheel = (event) => {
        if (!event.ctrlKey && Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
        event.preventDefault();
        zoomBy(event.deltaY > 0 ? -0.08 : 0.08);
      };
      viewport.onpointerdown = (event) => {
        if (event.target.closest('.graph-map-node')) return;
        dragStart = { x: event.clientX, y: event.clientY, panX: state.graphUi.panX || 0, panY: state.graphUi.panY || 0 };
        viewport.setPointerCapture(event.pointerId);
      };
      viewport.onpointermove = (event) => {
        if (!dragStart) return;
        state.graphUi.panX = dragStart.panX + event.clientX - dragStart.x;
        state.graphUi.panY = dragStart.panY + event.clientY - dragStart.y;
        const map = canvas.querySelector('.graph-map');
        if (map) map.style.transform = `translate(${state.graphUi.panX}px, ${state.graphUi.panY}px) scale(${state.graphUi.zoom || 1})`;
      };
      viewport.onpointerup = () => { dragStart = null; };
      viewport.onpointercancel = () => { dragStart = null; };
    }
    renderGraphFocus();
  };

  renderGraphFocus = function () {
    const target = $('graph-focus-summary');
    if (!target) return;
    const selected = graphFocusNode();
    const nodeMap = new Map((state.graph?.nodes || []).map((node) => [node.id, node]));
    const selectedId = selected?.id || '';
    const relatedEdges = (state.graph?.edges || []).filter((edge) => edge.from === selectedId || edge.to === selectedId);
    const focusList = selected
      ? relatedEdges.map((edge) => nodeMap.get(edge.from === selectedId ? edge.to : edge.from)).filter(Boolean)
      : (state.graph?.neighborhood || []);
    if (!selected && !focusList.length) {
      target.innerHTML = `<div class="muted">${escapeHtml(t('noFocusSelected'))}</div>`;
      return;
    }
    const counts = focusList.reduce((acc, node) => { acc[node.kind] = (acc[node.kind] || 0) + 1; return acc; }, {});
    const title = selected?.label || state.graph.focus || $('graph-filter')?.value || '-';
    target.innerHTML = `<div class="info-pair"><span>${escapeHtml(uiText('โฟกัส', 'Focus'))}</span><strong>${escapeHtml(title)}</strong></div><div class="info-pair"><span>${escapeHtml(uiText('ความสัมพันธ์รอบจุดนี้', 'Connected nodes'))}</span><strong>${focusList.length}</strong></div><div class="muted">${escapeHtml(t('graphCounts'))}: ${Object.entries(counts).map(([key, value]) => `${graphKindLabel(key)}=${value}`).join(' · ') || '-'}</div><div class="graph-focus-list">${focusList.slice(0, 120).map((node) => `<button type="button" class="result-card graph-focus-jump" data-graph-node-id="${escapeHtml(node.id)}"><strong><span class="tag ${node.kind}">${escapeHtml(graphKindLabel(node.kind))}</span> ${escapeHtml(node.label)}</strong><div class="muted">${escapeHtml(node.path || '')}</div></button>`).join('')}</div>`;
    target.querySelectorAll('[data-graph-node-id]').forEach((button) => {
      button.onclick = () => { state.graphUi.selectedId = button.dataset.graphNodeId || ''; renderGraph(); };
    });
  };

  function renderAnalyzerBars(values, total, options = {}) {
    const entries = Object.entries(values || {}).filter(([, value]) => Number(value) > 0);
    if (!entries.length) return `<div class="muted">${escapeHtml(options.empty || uiText('ยังไม่มีข้อมูล', 'No data yet.'))}</div>`;
    const denominator = total || entries.reduce((sum, [, value]) => sum + Number(value || 0), 0) || 1;
    return entries.map(([key, value]) => `<div class="bar-row analyzer-bar-row"><span>${escapeHtml(options.label ? options.label(key) : key)}</span><div class="bar"><div class="fill" style="width:${Math.min(100, (Number(value || 0) / denominator) * 100)}%"></div></div><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  function renderAnalyzerRiskList(items, emptyText, renderItem) {
    return items?.length ? items.slice(0, 60).map(renderItem).join('') : `<div class="success-card">${escapeHtml(emptyText)}</div>`;
  }

  function analyzerAdviceItems(overview = {}) {
    const balance = overview.balance || {};
    const missingRefs = overview.missingRefs || [];
    const unusedNodes = overview.unusedNodes || [];
    const warnings = overview.warnings || [];
    const items = [];
    if (missingRefs.length) {
      items.push({
        tone: 'critical',
        title: uiText('แก้ Missing refs ก่อน', 'Fix missing refs first'),
        body: uiText(
          `มี ref หาย ${missingRefs.length} จุด ถ้ายังไม่แก้ spawner บางตัวจะสุ่มไปหา node ที่ไม่มีอยู่จริง`,
          `${missingRefs.length} refs point to missing nodes. Fix these before tuning drop rates.`
        ),
        view: 'graph',
        action: uiText('ดูกราฟความสัมพันธ์', 'Open graph')
      });
    }
    if (Number(balance.spawnerCoverage || 0) < 90) {
      items.push({
        tone: 'warning',
        title: uiText('เช็ก Spawner coverage', 'Check spawner coverage'),
        body: uiText(
          `coverage ตอนนี้ ${balance.spawnerCoverage ?? 0}% แปลว่าบาง spawner ยังชี้ node ได้ไม่ครบ`,
          `Spawner coverage is ${balance.spawnerCoverage ?? 0}%, so some spawners may not be fully wired.`
        ),
        view: 'loot',
        action: uiText('เปิด Loot Studio', 'Open Loot Studio')
      });
    }
    if (unusedNodes.length) {
      items.push({
        tone: 'info',
        title: uiText('ทบทวน node ที่ไม่ได้ใช้', 'Review unused nodes'),
        body: uiText(
          `มี node ${unusedNodes.length} ไฟล์ที่ยังไม่มี spawner เรียกใช้ ถ้าเป็นของเก่าค่อยลบ ถ้าเป็นของใหม่ให้เอาไปผูกกับ spawner`,
          `${unusedNodes.length} node files are not referenced. Delete old ones or wire new ones into spawners.`
        ),
        view: 'analyzer',
        action: uiText('ดูรายการด้านล่าง', 'Review below')
      });
    }
    if (Number(balance.ammoToWeaponRatio || 0) < 0.75) {
      items.push({
        tone: 'warning',
        title: uiText('กระสุนอาจน้อยกว่าปืน', 'Ammo may be low'),
        body: uiText(
          `Ammo / Weapon อยู่ที่ ${balance.ammoToWeaponRatio ?? 0} ถ้าอยากให้เล่นลื่น ให้เพิ่ม ammo หรือ magazine ใน node ที่มีปืนเยอะ`,
          `Ammo / Weapon is ${balance.ammoToWeaponRatio ?? 0}. Add ammo or magazines to weapon-heavy nodes if players run dry too often.`
        ),
        view: 'loot',
        action: uiText('ไปแก้ loot', 'Edit loot')
      });
    }
    if (Number(balance.medicalShare || 0) < 4) {
      items.push({
        tone: 'info',
        title: uiText('ของแพทย์อาจเบาไป', 'Medical loot may be light'),
        body: uiText(
          `Medical share อยู่ที่ ${balance.medicalShare ?? 0}% ถ้าเป็นเซิร์ฟ survival หนักอาจตั้งใจได้ แต่ถ้าเล่นทั่วไปควรเติมยา/ผ้าพันแผล`,
          `Medical share is ${balance.medicalShare ?? 0}%. That can be intentional for hardcore servers, but normal play usually needs more meds.`
        ),
        view: 'loot',
        action: uiText('เปิด Item catalog', 'Open item catalog')
      });
    }
    if (!items.length && !(warnings || []).length) {
      items.push({
        tone: 'ok',
        title: uiText('ภาพรวมยังไม่เจอปัญหาหนัก', 'No major blocker detected'),
        body: uiText(
          'เริ่มจูนจาก node power score หรือ simulator ได้เลย อย่าเพิ่งลบไฟล์ที่ไม่แน่ใจ',
          'Start tuning from node power score or simulator. Do not delete files you are not sure about.'
        ),
        view: 'loot',
        action: uiText('เปิด Loot Studio', 'Open Loot Studio')
      });
    }
    return items.slice(0, 5);
  }

  function renderAnalyzerAdvice(overview = {}) {
    const stats = $('analyzer-stats');
    if (!stats) return;
    let host = $('analyzer-advice');
    if (!host) {
      host = document.createElement('div');
      host.id = 'analyzer-advice';
      host.className = 'analyzer-advice';
      stats.insertAdjacentElement('afterend', host);
    }
    const actions = analyzerAdviceItems(overview);
    host.innerHTML = `<div class="section-head compact"><div><h4>${escapeHtml(uiText('ควรทำต่อ', 'Next actions'))}</h4><p class="muted">${escapeHtml(uiText('แปลผลตัวเลขให้เป็นงานที่ควรไล่แก้ก่อน ไม่ต้องเดาเองจากกราฟทั้งหมด', 'Turns analyzer numbers into the first few tasks to check.'))}</p></div><span class="tag">${escapeHtml(String(actions.length))}</span></div><div class="analyzer-advice-grid">${actions.map((item) => `<article class="analyzer-advice-card ${escapeHtml(item.tone)}"><div><span class="tag ${escapeHtml(item.tone)}">${escapeHtml(item.tone)}</span><h5>${escapeHtml(item.title)}</h5><p>${escapeHtml(item.body)}</p></div><button type="button" class="ghost tiny" data-analyzer-advice-view="${escapeHtml(item.view)}">${escapeHtml(item.action)}</button></article>`).join('')}</div>`;
    host.querySelectorAll('[data-analyzer-advice-view]').forEach((button) => {
      button.onclick = () => {
        const view = button.dataset.analyzerAdviceView || 'analyzer';
        if (view !== 'analyzer' && typeof setView === 'function') setView(view);
      };
    });
  }

  loadAnalyzer = async function () {
    const data = await api('/api/analyzer/overview');
    state.analyzer = data.overview;
    const overview = data.overview || {};
    const totals = overview.totals || {};
    const balance = overview.balance || {};
    const categoryCounts = overview.categoryCounts || {};
    const categoryTotal = Object.values(categoryCounts).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
    const rarityTotal = Object.values(overview.rarityCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0) || 1;

    $('analyzer-stats').innerHTML = [
      { label: uiText('คะแนนสมดุล', 'Balance score'), value: `${balance.score ?? 0}/100`, tone: (balance.score || 0) < 60 ? 'warning' : 'ok' },
      { label: uiText('Nodes', 'Nodes'), value: totals.nodes || 0 },
      { label: uiText('Spawners', 'Spawners'), value: totals.spawners || 0 },
      { label: uiText('Unique items', 'Unique items'), value: totals.uniqueItems || 0 },
      { label: uiText('Missing refs', 'Missing refs'), value: (overview.missingRefs || []).length, tone: (overview.missingRefs || []).length ? 'critical' : 'ok' },
    ].map((entry) => `<div class="card stat analyzer-stat ${entry.tone || ''}"><span class="stat-label">${escapeHtml(entry.label)}</span><strong>${escapeHtml(entry.value)}</strong></div>`).join('');

    renderAnalyzerAdvice(overview);
    $('analyzer-categories').innerHTML = `<div class="analyzer-deep-grid"><div class="section-card"><h4>${escapeHtml(uiText('สัดส่วนหมวดไอเท็ม', 'Item category mix'))}</h4>${renderAnalyzerBars(categoryCounts, categoryTotal)}</div><div class="section-card"><h4>${escapeHtml(uiText('Rarity ของ leaf nodes', 'Leaf rarity distribution'))}</h4>${renderAnalyzerBars(overview.rarityCounts || {}, rarityTotal)}</div><div class="section-card analyzer-score-card"><h4>${escapeHtml(uiText('อ่านภาพรวมสมดุล', 'Balance readout'))}</h4><div class="mini-stat-grid"><div class="mini-stat"><span>${escapeHtml(uiText('Node coverage', 'Node coverage'))}</span><strong>${escapeHtml(`${balance.nodeCoverage ?? 0}%`)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('Spawner coverage', 'Spawner coverage'))}</span><strong>${escapeHtml(`${balance.spawnerCoverage ?? 0}%`)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('Ammo / Weapon', 'Ammo / Weapon'))}</span><strong>${escapeHtml(balance.ammoToWeaponRatio ?? 0)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('Medical share', 'Medical share'))}</span><strong>${escapeHtml(`${balance.medicalShare ?? 0}%`)}</strong></div></div></div><div class="section-card"><h4>${escapeHtml(uiText('คำเตือนเชิงออกแบบ', 'Design warnings'))}</h4>${(overview.warnings || []).length ? overview.warnings.map((warning) => `<div class="validation-row analyzer-warning ${escapeHtml(warning.severity || 'info')}"><div class="validation-copy"><strong>${escapeHtml(warning.message)}</strong><div class="muted small">${escapeHtml(warning.hint || '')}</div></div><span class="tag ${escapeHtml(warning.severity || 'info')}">${escapeHtml(warning.severity || 'info')}</span></div>`).join('') : `<div class="success-card">${escapeHtml(uiText('ยังไม่เจอคำเตือนสมดุลใหญ่ ๆ', 'No major balance warnings detected.'))}</div>`}</div></div>`;

    $('analyzer-missing').innerHTML = renderAnalyzerRiskList(
      overview.missingRefs || [],
      uiText('ไม่พบ ref ที่หาย', 'No missing node refs.'),
      (item) => `<div class="file-item static"><strong>${escapeHtml(item.nodeName)}</strong><span class="item-sub">${escapeHtml(item.spawner || '')}</span></div>`
    );
    $('analyzer-unused').innerHTML = renderAnalyzerRiskList(
      overview.unusedNodes || [],
      uiText('ไม่พบ node ที่ไม่ได้ใช้', 'No unused nodes.'),
      (item) => `<div class="file-item static"><strong>${escapeHtml(item.nodeName)}</strong><span class="item-sub">${escapeHtml(item.path || '')}</span></div>`
    );
    const topItems = (overview.topItems || []).slice(0, 18).map((item) => `<div class="result-card analyzer-item-card">${renderCatalogItemIdentity(item.name, `${item.category} · ${item.count} ${uiText('ครั้ง', 'hits')}`)}</div>`).join('');
    const powerScores = (overview.nodePowerScores || []).slice(0, 12).map((node) => `<div class="result-card analyzer-node-power"><strong>${escapeHtml(node.name)}</strong><div class="muted">${escapeHtml(`${uiText('score', 'score')} ${node.score} · ${node.itemCount} ${uiText('items', 'items')}`)}</div><div class="pill-row"><span class="tag weapon">${escapeHtml(`W ${node.categoryMix?.weapon || 0}`)}</span><span class="tag ammo">${escapeHtml(`A ${node.categoryMix?.ammo || 0}`)}</span><span class="tag medical">${escapeHtml(`M ${node.categoryMix?.medical || 0}`)}</span></div></div>`).join('');
    const spawnerCoverage = (overview.spawnerCoverage || []).slice(0, 12).map((entry) => `<div class="result-card analyzer-coverage-card"><strong>${escapeHtml(entry.name)}</strong><div class="muted">${escapeHtml(`${entry.validRefs}/${entry.refs} refs · ${entry.coverage}%`)}</div>${entry.missingRefs ? `<span class="tag critical">${escapeHtml(`${entry.missingRefs} missing`)}</span>` : `<span class="tag ok">${escapeHtml(uiText('ครบ', 'clean'))}</span>`}</div>`).join('');
    $('analyzer-top-items').innerHTML = `<div class="analyzer-wide-grid"><div><h4>${escapeHtml(uiText('ไอเท็มที่เจอบ่อย', 'Most repeated items'))}</h4><div class="result-grid">${topItems || `<div class="muted">${escapeHtml(uiText('ยังไม่มีไอเท็ม', 'No items.'))}</div>`}</div></div><div><h4>${escapeHtml(uiText('Node power score', 'Node power score'))}</h4><div class="result-grid">${powerScores || `<div class="muted">${escapeHtml(uiText('ยังไม่มีคะแนน node', 'No node scores.'))}</div>`}</div></div><div><h4>${escapeHtml(uiText('Spawner coverage', 'Spawner coverage'))}</h4><div class="result-grid">${spawnerCoverage || `<div class="muted">${escapeHtml(uiText('ยังไม่มี spawner coverage', 'No spawner coverage.'))}</div>`}</div></div></div>`;
  };

  function focusField(selector) {
    const element = document.querySelector(selector);
    if (!element) return false;
    const details = element.closest('details');
    if (details) details.open = true;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof element.focus === 'function') element.focus();
    if (typeof element.select === 'function' && /^(INPUT|TEXTAREA)$/.test(element.tagName)) element.select();
    return true;
  }

  function focusFieldSoon(selector) {
    requestAnimationFrame(() => {
      setTimeout(() => focusField(selector), 30);
    });
  }

  function spawnerGroupMatches(entry, ids, term) {
    if (!term) return true;
    const hay = `${entry?.Rarity || ''} ${ids.join(' ')}`.toLowerCase();
    return hay.includes(term);
  }

  function flatRowMatches(entry, term) {
    if (!term) return true;
    const hay = `${entry?.ClassName || ''} ${entry?.Item || ''} ${entry?.Name || ''}`.toLowerCase();
    return hay.includes(term);
  }

  function lootChangeGoals(summary) {
    if (!summary) return [];
    if (summary.kind === 'spawner') {
      return [
        {
          title: uiText('อยากให้จุดนี้ออกบ่อยขึ้น', 'Make this preset appear more often'),
          body: uiText('เริ่มจากเพิ่ม Spawner chance ก่อน ถ้ายังไม่ตรงค่อยกลับไปเช็ก Node groups ว่าชี้ไป tree ที่ต้องการหรือยัง', 'Start by raising Spawner chance. Then confirm the Node groups point at the trees you actually want.')
        },
        {
          title: uiText('อยากให้ได้ของมากขึ้นต่อครั้ง', 'Spawn more items per roll'),
          body: uiText('ปรับ Minimum quantity และ Maximum quantity ให้กว้างขึ้น ค่านี้คือจำนวนของต่อรอบ ไม่ใช่โอกาสดรอป', 'Increase Minimum quantity and Maximum quantity. These change how many items can appear in one roll, not the chance to roll.')
        },
        {
          title: uiText('ยังไม่แม่นฟิลด์ขั้นสูง', 'Not sure about advanced fields'),
          body: uiText('ปล่อยฟิลด์ขั้นสูงไว้ก่อนก็ได้ โหมดง่ายจะซ่อนตัวกรองโซนกับตัวคูณสภาพไอเท็มไว้ให้ก่อน', 'Leave the advanced fields alone for now. Simple mode keeps zone filters and item-condition modifiers out of the way.')
        }
      ];
    }
    if (summary.kind === 'node_tree') {
      return [
        {
          title: uiText('อยากเพิ่มหมวดลูทใหม่', 'Add a new loot category'),
          body: uiText('เลือกกิ่งใน Tree focus แล้วกด Add child เพื่อแตกหมวดใหม่ก่อน จากนั้นค่อยใส่ leaf item ที่ปลายกิ่งนั้น', 'Pick a branch in Tree focus, then use Add child to make a new category before adding leaf items at the end.')
        },
        {
          title: uiText('อยากเพิ่มไอเท็มจริง', 'Add a real item'),
          body: uiText('ถ้าเป็นปลายทาง ให้ใส่ชื่อ class จริงของ SCUM ลงในช่อง Node name ไม่ใช่ชื่อเล่นหรือโน้ต', 'For a final leaf, put the real SCUM class name in Node name, not a nickname or note.')
        },
        {
          title: uiText('ไฟล์ใหญ่มากอ่านไม่ไหว', 'This tree is too large to read'),
          body: uiText('ใช้ Tree focus เลือกทีละกิ่งก่อน แล้วค่อยค้นหาในกิ่งนั้น จะง่ายกว่าดูทั้งต้นพร้อมกัน', 'Use Tree focus to work one branch at a time, then search inside that branch instead of reading the whole tree.')
        }
      ];
    }
    return [
      {
        title: uiText('อยากเพิ่มไอเท็ม', 'Add an item'),
        body: uiText('กด Add item แล้วเลือกจาก Item catalog ด้านล่าง ถ้าไม่มั่นใจชื่อ class ไม่ต้องพิมพ์เดาเอง', 'Use Add item, then pick from the Item catalog below. Do not guess class names if you are unsure.')
      },
      {
        title: uiText('อยากให้ไอเท็มหนึ่งออกบ่อยขึ้น', 'Make one item more common'),
        body: uiText('เพิ่ม Weight / Probability ของแถวนั้น ค่ายิ่งสูงยิ่งมีโอกาสถูกเลือกบ่อยกว่าแถวอื่น', 'Raise the Weight / Probability on that row. Higher values make it win more often.')
      },
      {
        title: uiText('อยากบาลานซ์ใหม่เร็ว ๆ', 'Rebalance quickly'),
        body: uiText('หลังแก้หลายแถวแล้วให้กด Normalize เพื่อกระจายน้ำหนักใหม่ทั้งก้อนในครั้งเดียว', 'After editing several rows, use Normalize to rebalance the whole list in one shot.')
      }
    ];
  }

  function renderLootChangeGoals(summary) {
    if (!state.lootUi.simpleMode) return '';
    const cards = lootChangeGoals(summary);
    if (!cards.length) return '';
    return `<div class="goal-card-grid">${cards.map((card) => `<div class="goal-card"><strong>${escapeHtml(card.title)}</strong><p class="muted">${escapeHtml(card.body)}</p></div>`).join('')}</div>`;
  }

  function lootQuickTasks(summary) {
    if (!summary) return [];
    if (summary.kind === 'spawner') {
      return [
        { id: 'spawner-chance', title: uiText('ปรับโอกาสดรอป', 'Adjust drop chance'), body: uiText('พาไปที่ Spawner chance', 'Jump to Spawner chance') },
        { id: 'spawner-quantity', title: uiText('ปรับจำนวนของ', 'Adjust quantity'), body: uiText('แก้ Min / Max ต่อรอบ', 'Edit Min / Max per roll') },
        { id: 'spawner-refs', title: uiText('แก้ Node groups', 'Edit node groups'), body: uiText('ไปที่ชุด ref ที่ preset นี้ใช้', 'Go to the ref groups this preset uses') },
        { id: 'spawner-advanced', title: uiText('เปิดฟิลด์ขั้นสูง', 'Show advanced fields'), body: uiText('ใช้เมื่อจะยุ่งกับ zone filter และ modifier', 'Use this only for zone filters and modifiers') }
      ];
    }
    if (summary.kind === 'node_tree') {
      return [
        { id: 'tree-root', title: uiText('ตั้งรากก่อน', 'Set the root first'), body: uiText('เริ่มจากชื่อ root และ rarity', 'Start with the root name and rarity') },
        { id: 'tree-branch', title: uiText('แก้ทีละกิ่ง', 'Work one branch at a time'), body: uiText('ใช้ Tree focus ลดความยาวของหน้า', 'Use Tree focus to shrink the page') },
        { id: 'tree-search', title: uiText('ค้นหาของที่อยากแก้', 'Search for what you need'), body: uiText('ค้นชื่อ branch, leaf, หรือ rarity', 'Search branch, leaf, or rarity') },
        { id: 'tree-item', title: uiText('เพิ่มไอเท็มจาก catalog', 'Add from catalog'), body: uiText('เปิด Item catalog ให้เลือกแทนการเดา', 'Open the catalog instead of guessing names') }
      ];
    }
    return [
      { id: 'flat-context', title: uiText('ตั้งชื่อ node ก่อน', 'Set the node first'), body: uiText('บอกให้ชัดว่า node นี้ไว้ทำอะไร', 'Make the purpose of this node obvious') },
      { id: 'flat-add', title: uiText('เพิ่มแถวใหม่', 'Add a new row'), body: uiText('เพิ่มไอเท็มแล้วค่อยกรอกชื่อ', 'Create a row, then fill the item name') },
      { id: 'flat-catalog', title: uiText('เลือกจาก catalog', 'Pick from catalog'), body: uiText('เปิดลิสต์ไอเท็มจริงช่วยเติมชื่อ', 'Open the real item list to fill names') },
      { id: 'flat-balance', title: uiText('บาลานซ์ probability', 'Balance probability'), body: uiText('กด Normalize ให้ทั้งรายการ', 'Normalize the whole list') }
    ];
  }

  function renderLootQuickTasks(summary) {
    if (!state.lootUi.simpleMode) return '';
    const tasks = lootQuickTasks(summary);
    if (!tasks.length) return '';
    return `<div class="loot-task-shell"><div class="section-head compact"><div><h4>${escapeHtml(uiText('ทางลัดที่ใช้บ่อย', 'Common tasks'))}</h4><p class="muted">${escapeHtml(uiText('กดปุ่มตามสิ่งที่อยากเปลี่ยนได้เลย ไม่ต้องไล่อ่านทุกช่องก่อน', 'Use these shortcuts based on what you want to change instead of reading every field first.'))}</p></div></div><div class="loot-task-grid">${tasks.map((task) => `<button type="button" class="loot-task-card" data-loot-task="${task.id}"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.body)}</span></button>`).join('')}</div></div>`;
  }

  refreshLootDirtyState = function () {
    const normalize = (text) => {
      const value = String(text || '').trim();
      if (!value) return '';
      try {
        return fmtJson(JSON.parse(value));
      } catch {
        return value;
      }
    };
    const dirty = Boolean(state.selectedLootPath) && normalize(getLootDraftContent()) !== normalize(state.currentLootContent || '');
    state.lootUi.dirty = dirty;
    updateLootWorkspaceCopy();
    return dirty;
  };

  function groupedSpawnerFieldSections(fieldKeys) {
    return groupedSpawnerFields(fieldKeys).map((group, index) => ({
      ...group,
      advanced: index > 0
    }));
  }

  lootUiLabel = function (key) {
    if (key === 'compact') return state.lootUi.compact ? uiText('โหมดสบายตา', 'Comfort view') : uiText('โหมดกระชับ', 'Compact mode');
    if (key === 'guides') return state.lootUi.showGuides ? uiText('ซ่อนคำอธิบาย', 'Hide notes') : uiText('เปิดคำอธิบาย', 'Show notes');
    if (key === 'simple') return state.lootUi.simpleMode ? uiText('โหมดง่าย', 'Simple mode') : uiText('โหมดละเอียด', 'Detailed mode');
    if (key === 'advanced') return state.lootUi.showAdvancedSpawnerFields ? uiText('ซ่อนฟิลด์ขั้นสูง', 'Hide advanced fields') : uiText('เปิดฟิลด์ขั้นสูง', 'Show advanced fields');
    return '';
  };

  function runLootQuickTask(taskId) {
    const obj = state.currentLootObject || {};
    switch (taskId) {
      case 'spawner-chance':
        focusField('[data-spawner-field="Probability"]');
        return;
      case 'spawner-quantity':
        focusField('[data-spawner-field="QuantityMin"]') || focusField('[data-spawner-field="QuantityMax"]');
        return;
      case 'spawner-refs':
        focusField('[data-group-ids]');
        return;
      case 'spawner-advanced':
        if (!state.lootUi.showAdvancedSpawnerFields) {
          state.lootUi.showAdvancedSpawnerFields = true;
          renderVisualBuilder();
          focusFieldSoon('[data-spawner-field="ShouldFilterItemsByZone"]');
          return;
        }
        focusField('[data-spawner-field="ShouldFilterItemsByZone"]');
        return;
      case 'tree-root':
        focusField('#tree-root-name');
        return;
      case 'tree-branch':
        if (document.querySelector('[data-tree-focus]:not([data-tree-focus="root"])')) {
          document.querySelector('[data-tree-focus]:not([data-tree-focus="root"])').click();
          return;
        }
        focusField('[data-tree-name="0"]') || focusField('[data-tree-name="root"]');
        return;
      case 'tree-search':
        focusField('#tree-search-input');
        return;
      case 'tree-item':
        if (!state.lootUi.itemCatalogOpen) {
          state.lootUi.itemCatalogOpen = true;
          renderVisualBuilder();
          focusFieldSoon('#loot-catalog-search');
          return;
        }
        focusField('#loot-catalog-search');
        return;
      case 'flat-context':
        focusField('#visual-name');
        return;
      case 'flat-add':
        obj.Items = Array.isArray(obj.Items) ? obj.Items : [];
        obj.Items.push({ ClassName: '', Probability: 1 });
        renderVisualBuilder();
        focusFieldSoon(`[data-entry-name="${obj.Items.length - 1}"]`);
        return;
      case 'flat-catalog':
        if (!state.lootUi.itemCatalogOpen) {
          state.lootUi.itemCatalogOpen = true;
          renderVisualBuilder();
          focusFieldSoon('#loot-catalog-search');
          return;
        }
        focusField('#loot-catalog-search');
        return;
      case 'flat-balance':
        if ($('normalize-visual')) $('normalize-visual').click();
        return;
      default:
        return;
    }
  }


  bindLootUiControls = function () {
    const compactBtn = $('loot-ui-compact');
    if (compactBtn) compactBtn.onclick = () => { state.lootUi.compact = !state.lootUi.compact; renderVisualBuilder(); };

    const guideBtn = $('loot-ui-guides');
    if (guideBtn) guideBtn.onclick = () => { state.lootUi.showGuides = !state.lootUi.showGuides; renderVisualBuilder(); };

    const simpleBtn = $('loot-ui-simple');
    if (simpleBtn) simpleBtn.onclick = () => { state.lootUi.simpleMode = !state.lootUi.simpleMode; renderVisualBuilder(); };

    document.querySelectorAll('[data-advanced-toggle]').forEach((button) => {
      button.onclick = () => {
        state.lootUi.showAdvancedSpawnerFields = !state.lootUi.showAdvancedSpawnerFields;
        renderVisualBuilder();
      };
    });

    document.querySelectorAll('[data-tree-focus]').forEach((button) => {
      button.onclick = () => {
        state.lootUi.treeFocusPath = button.dataset.treeFocus || 'root';
        renderVisualBuilder();
      };
    });

    document.querySelectorAll('[data-loot-task]').forEach((button) => {
      button.onclick = () => runLootQuickTask(button.dataset.lootTask);
    });
  };

  if (typeof renderTreeNodeBuilder === 'function') {
    const baseRenderTreeNodeBuilder = renderTreeNodeBuilder;
    renderTreeNodeBuilder = function (obj) {
      baseRenderTreeNodeBuilder(obj);
      bindTreeInlineItemSuggestions(obj);
    };
  }

  renderBuilderCoach = function (summary) {
    const coach = lootSchemaCoach(summary);
    const advancedToggle = summary?.kind === 'spawner'
      ? `<button class="ghost tiny" data-advanced-toggle="1">${escapeHtml(lootUiLabel('advanced'))}</button>`
      : '';
    return `<div class="builder-guide-shell"><div class="section-head compact"><div><h4>${escapeHtml(coach.title)}</h4><p class="muted">${escapeHtml(coach.description)}</p></div><div class="actions tight wrap"><button id="loot-ui-simple" class="ghost tiny">${escapeHtml(lootUiLabel('simple'))}</button><button id="loot-ui-guides" class="ghost tiny">${escapeHtml(lootUiLabel('guides'))}</button><button id="loot-ui-compact" class="ghost tiny">${escapeHtml(lootUiLabel('compact'))}</button>${advancedToggle}</div></div><div class="guide-chip-list">${coach.chips.map((chip) => `<span class="guide-chip">${escapeHtml(chip)}</span>`).join('')}</div>${renderLootChangeGoals(summary)}${renderLootQuickTasks(summary)}${state.lootUi.showGuides ? `<div class="builder-guide-grid"><div class="builder-guide-card"><h4>${escapeHtml(uiText('ลำดับที่ควรแก้', 'Recommended order'))}</h4><ol class="guide-step-list">${coach.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol></div><div class="builder-legend-card"><h4>${escapeHtml(uiText('อ่านความหมายของหน้าจอนี้', 'How to read this screen'))}</h4><ul class="guide-step-list">${coach.legend.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div>` : ''}</div>`;
  };

  openLootFile = async function (path) {
    if (path !== state.selectedLootPath && !confirmDiscardLootChanges(path)) {
      renderLootLists();
      return;
    }
    state.selectedLootPath = path;
    state.focusedLootField = null;
    state.treeSearch = '';
    state.itemCatalogSearch = '';
    state.itemCatalogCategory = '__all';
    state.nodeRefSearch = '';
    state.nodeRefNodeFilter = '__all';
    state.lootUi.spawnerGroupSearch = '';
    state.lootUi.flatRowSearch = '';
    state.lootUi.contextTab = 'overview';
    const data = await api(`/api/file?path=${encodeURIComponent(path)}`);
    state.currentLootContent = data.content;
    $('loot-editor').value = data.content;
    $('loot-editor-title').textContent = path;
    const analysis = await api(`/api/loot/analyze?path=${encodeURIComponent(path)}`);
    state.currentLootAnalysis = analysis;
    state.currentLootObject = analysis.object || {};
    state.lootUi.treeFocusPath = 'root';
    state.lootUi.itemCatalogOpen = false;
    state.lootUi.refCatalogOpen = false;
    state.lootUi.showAdvancedSpawnerFields = false;
    state.lootUi.editorMode = 'visual';
    state.lootUi.dirty = false;
    const kind = analysis.summary?.kind || 'unknown';
    const totalNodes = analysis.summary?.totalNodes || 0;
    const groupCount = analysis.summary?.groupCount || 0;
    const itemCount = analysis.summary?.itemCount || 0;
    const nodeRefCount = analysis.summary?.nodeRefCount || 0;
    state.lootUi.compact = kind === 'node_tree' ? totalNodes > 18 : kind === 'spawner' ? (groupCount > 2 || nodeRefCount > 8) : itemCount > 10;
    state.lootUi.showGuides = !state.lootUi.compact && (totalNodes || groupCount || itemCount) <= 18;
    $('loot-summary').innerHTML = renderLootSummaryPanel(analysis.summary);
    $('loot-validation').innerHTML = renderValidation(analysis.validation);
    $('loot-deps').innerHTML = renderLootDependencyPanel(analysis);
    renderVisualBuilder();
    setLootEditorMode('visual');
    renderLootLists();
    updateLootWorkspaceLayout();
    updateLootWorkspaceCopy();
  };

  renderTreeNodeCard = function (node, path = 'root', depth = 0) {
    const term = (state.treeSearch || '').trim().toLowerCase();
    const isRoot = path === 'root';
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return `<div class="tree-node-card invalid"><div class="tree-node-body"><div class="tree-node-caption">${escapeHtml(uiText('พบ child ที่โครงไม่ถูกต้อง ลบออกได้จากตรงนี้', 'This child is invalid. Remove it here.'))}</div><div class="actions tight wrap tree-toolbar">${!isRoot ? `<button data-tree-remove="${path}" class="danger-outline tiny">${escapeHtml(uiText('ลบโหนด', 'Remove node'))}</button>` : ''}</div></div></div>`;
    }
    if (!isRoot && term && !treeNodeMatchesSearch(node, term)) return '';
    const children = Array.isArray(node.Children) ? node.Children : [];
    const visibleChildren = children.map((child, index) => ({ child, index })).filter((entry) => !term || treeNodeMatchesSearch(entry.child, term));
    const hasChildren = children.length > 0;
    const role = isRoot ? uiText('Root', 'Root') : hasChildren ? uiText('Branch', 'Branch') : uiText('Leaf', 'Leaf');
    const open = term ? true : isRoot || (!state.lootUi.compact && depth < 1);
    const titleMarkup = hasChildren
      ? `<strong>${escapeHtml(node.Name || uiText('ยังไม่มีชื่อ', 'Unnamed'))}</strong>`
      : renderCatalogItemIdentity(node.Name || '', node.Rarity || uiText('ยังไม่ตั้ง rarity', 'No rarity'), { compact: true });
    return `<details class="tree-node-card ${hasChildren ? 'branch' : 'leaf'}" ${open ? 'open' : ''}><summary class="tree-node-summary"><div>${state.lootUi.compact ? '' : `<div class="tree-pathline">${escapeHtml(treePathLabel(path))}</div>`}<div class="tree-node-heading"><span class="tag ${hasChildren ? 'node' : 'item'}">${escapeHtml(role)}</span>${titleMarkup}</div></div><div class="tree-node-meta"><span>${escapeHtml(node.Rarity || uiText('ไม่ตั้งค่า', 'Unset'))}</span><span>${escapeHtml(hasChildren ? `${visibleChildren.length}/${children.length} ${uiText('ลูก', 'children')}` : uiText('ปลายทางไอเท็ม', 'item leaf'))}</span></div></summary><div class="tree-node-body">${state.lootUi.compact ? '' : `<div class="tree-role-note">${escapeHtml(treeRoleText(isRoot, hasChildren))}</div>`}<div class="loot-inline-grid tree-fields"><label class="${hasChildren ? '' : 'item-suggest-field'}"><span>${escapeHtml(uiText('ชื่อโหนด', 'Node name'))}</span><input data-tree-name="${path}" data-tree-role="${hasChildren ? 'branch' : 'leaf'}" ${hasChildren ? '' : 'list="loot-item-options" autocomplete="off"'} value="${escapeHtml(node.Name || '')}" />${hasChildren ? '' : `<div class="inline-item-suggestions"></div>`}</label><label><span>${escapeHtml(uiText('Rarity', 'Rarity'))}</span><select data-tree-rarity="${path}">${buildRarityOptions(node.Rarity || '')}</select></label></div><div class="actions tight wrap tree-toolbar"><button data-tree-add="${path}" class="ghost tiny">${escapeHtml(uiText('เพิ่มลูก', 'Add child'))}</button>${!isRoot ? `<button data-tree-dup="${path}" class="ghost tiny">${escapeHtml(t('duplicate'))}</button><button data-tree-up="${path}" class="ghost tiny">${escapeHtml(t('moveUp'))}</button><button data-tree-down="${path}" class="ghost tiny">${escapeHtml(t('moveDown'))}</button><button data-tree-remove="${path}" class="danger-outline tiny">${escapeHtml(uiText('ลบโหนด', 'Remove node'))}</button>` : ''}</div>${visibleChildren.length ? `<div class="tree-children">${visibleChildren.map((entry) => renderTreeNodeCard(entry.child, path === 'root' ? String(entry.index) : `${path}.${entry.index}`, depth + 1)).join('')}</div>` : hasChildren ? `<div class="muted builder-empty">${escapeHtml(uiText('ไม่มี child ที่ตรงกับคำค้นนี้', 'No child matched this search.'))}</div>` : ''}</div></details>`;
  };

  renderFlatNodeBuilder = function (obj) {
    const list = Array.isArray(obj.Items) ? obj.Items : (obj.Items = []);
    const summary = state.currentLootAnalysis?.summary || { kind: 'node', itemCount: list.length, name: obj.Name || '' };
    const getProb = (entry) => Number(entry.Probability ?? entry.Chance ?? 1);
    const setProb = (entry, value) => { if ('Chance' in entry && !('Probability' in entry)) entry.Chance = value; else entry.Probability = value; };
    const totalProbability = Number(list.reduce((sum, entry) => sum + Math.max(0, getProb(entry) || 0), 0).toFixed(4));
    const rowSearch = String(state.lootUi.flatRowSearch || '').trim().toLowerCase();
    const visibleRows = list.map((entry, index) => ({ entry, index })).filter(({ entry }) => flatRowMatches(entry, rowSearch));
    const selectedRows = selectedFlatRows(list);
    const selectedSet = selectedFlatRowSet();
    const bulkPanel = `<div class="bulk-edit-panel"><div><strong>${escapeHtml(uiText('Bulk edit', 'Bulk edit'))}</strong><p class="muted">${escapeHtml(uiText('เลือกหลายแถวแล้วปรับ probability พร้อมกันได้ ไม่ต้องไล่แก้ทีละแถว', 'Select multiple rows and tune probability without editing one row at a time.'))}</p></div><div class="bulk-edit-grid"><div class="mini-stat"><span>${escapeHtml(uiText('เลือกอยู่', 'Selected'))}</span><strong>${escapeHtml(selectedRows.length)}</strong></div><label><span>${escapeHtml(uiText('ค่า probability', 'Probability value'))}</span><input id="bulk-prob-value" type="number" step="0.01" min="0" max="1" value="0.1" /></label><div class="actions tight wrap"><button id="bulk-select-visible" class="ghost tiny">${escapeHtml(uiText('เลือกแถวที่เห็น', 'Select visible'))}</button><button id="bulk-clear-selection" class="ghost tiny">${escapeHtml(uiText('ล้างที่เลือก', 'Clear selection'))}</button><button id="bulk-set-prob" class="tiny">${escapeHtml(uiText('ตั้งค่า', 'Set value'))}</button><button id="bulk-boost-prob" class="ghost tiny">${escapeHtml(uiText('+10%', '+10%'))}</button><button id="bulk-reduce-prob" class="ghost tiny">${escapeHtml(uiText('-10%', '-10%'))}</button><button id="bulk-normalize-selected" class="ghost tiny">${escapeHtml(uiText('Normalize ที่เลือก', 'Normalize selected'))}</button><button id="bulk-delete-selected" class="danger-outline tiny">${escapeHtml(uiText('ลบที่เลือก', 'Delete selected'))}</button></div></div></div>`;
    const kitPanel = renderKitTemplatePanel(list);
    const rows = visibleRows.map(({ entry, index }) => {
      const probability = Number(getProb(entry).toFixed(4));
      const open = index === 0 || (state.focusedLootField?.kind === 'flat' && state.focusedLootField.index === index);
      const itemName = itemEntryName(entry);
      return `<details class="builder-row-card loot-row-card ${selectedSet.has(index) ? 'selected' : ''}" data-drag-row="${index}" draggable="true" ${open ? 'open' : ''}><summary class="row-head row-summary"><span class="drag-handle" title="${escapeHtml(uiText('ลากเพื่อเรียงแถว', 'Drag to reorder'))}">drag</span><label class="row-select-pill" onclick="event.stopPropagation()"><input type="checkbox" data-row-select="${index}" ${selectedSet.has(index) ? 'checked' : ''} />${escapeHtml(uiText('เลือก', 'Select'))}</label><strong>${escapeHtml(uiText(`แถวไอเท็ม ${index + 1}`, `Item row ${index + 1}`))}</strong><div class="row-meta row-meta-rich">${renderCatalogItemIdentity(itemName, `${uiText('ค่า', 'value')} ${probability}`, { compact: true })}<span class="tag">${escapeHtml(`${uiText('ค่า', 'value')} ${probability}`)}</span></div></summary><div class="loot-inline-grid"><label class="item-suggest-field"><span>${escapeHtml(uiText('Class name', 'Class name'))}</span><input data-entry-name="${index}" list="loot-item-options" autocomplete="off" value="${escapeHtml(itemName)}" placeholder="Weapon_AK47" />${state.lootUi.compact ? '' : `<small class="field-help">${escapeHtml(uiText('พิมพ์บางส่วนแล้วเลือกรายการที่คล้ายกันพร้อมไอคอนได้เลย', 'Type a partial name and pick a matching item with an icon.'))}</small>`}<div class="inline-item-suggestions"></div></label><label><span>${escapeHtml(uiText('น้ำหนัก / Probability', 'Weight / Probability'))}</span><input data-entry-prob="${index}" value="${probability}" type="number" step="0.01" min="0" max="1" />${state.lootUi.compact ? '' : `<small class="field-help">${escapeHtml(uiText('ค่าสูงออกบ่อยกว่า', 'Higher values appear more often.'))}</small>`}</label><label><span>${escapeHtml(uiText('ปรับเร็ว', 'Quick slider'))}</span><input data-entry-range="${index}" value="${probability}" type="range" step="0.01" min="0" max="1" /></label></div><div class="actions tight wrap"><button data-dup-row="${index}" class="ghost tiny">${escapeHtml(t('duplicate'))}</button><button data-up-row="${index}" class="ghost tiny">${escapeHtml(t('moveUp'))}</button><button data-down-row="${index}" class="ghost tiny">${escapeHtml(t('moveDown'))}</button><button data-remove-row="${index}" class="danger-outline tiny">${escapeHtml(uiText('ลบแถว', 'Remove row'))}</button></div></details>`;
    }).join('');

    $('visual-builder').innerHTML = `<div class="loot-builder-shell ${state.lootUi.compact ? 'compact' : ''}">${renderBuilderCoach(summary)}<div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('Node info', 'Node info'))}</h4><p class="muted">${escapeHtml(uiText('ตั้งบริบทของ node ก่อน แล้วค่อยแก้ไอเท็มด้านล่าง', 'Set the node context first, then tune the item rows below.'))}</p></div><div class="actions tight wrap"><span class="tag node">${escapeHtml(lootKindLabel('node'))}</span><button id="sync-visual-to-raw" class="tiny">${escapeHtml(uiText('อัปเดต JSON ดิบ', 'Update Raw JSON'))}</button></div></div><div class="loot-inline-grid"><label><span>${escapeHtml(uiText('ชื่อโหนด', 'Node name'))}</span><input id="visual-name" value="${escapeHtml(obj.Name || '')}" /></label><label><span>${escapeHtml(uiText('โน้ต', 'Notes'))}</span><input id="visual-notes" value="${escapeHtml(obj.Notes || '')}" /></label></div></div><div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('รายการไอเท็ม', 'Item rows'))}</h4><p class="muted">${escapeHtml(uiText('แต่ละแถวคือ 1 ไอเท็ม กางเฉพาะแถวที่กำลังแก้ก็พอ ลากคำว่า drag เพื่อเรียงลำดับใหม่ได้', 'Each row is one item. Open only the row you are working on, or drag rows to reorder them.'))}</p></div><div class="actions tight wrap"><span class="tag item">${escapeHtml(`${visibleRows.length}/${list.length} ${uiText('แถวที่เห็น', 'visible rows')}`)}</span><button id="add-visual-row" class="ghost tiny">${escapeHtml(uiText('เพิ่มไอเท็ม', 'Add item'))}</button><button id="normalize-visual" class="ghost tiny">${escapeHtml(t('normalize'))}</button><button id="quick-add-ak" class="ghost tiny">${escapeHtml(uiText('ใส่ชุด AK เร็ว ๆ', 'Quick AK pack'))}</button></div></div><div class="loot-inline-grid catalog-filter-grid"><label><span>${escapeHtml(uiText('ค้นหาแถวไอเท็ม', 'Search item rows'))}</span><input id="flat-row-search" value="${escapeHtml(state.lootUi.flatRowSearch || '')}" placeholder="${escapeHtml(uiText('พิมพ์ชื่อไอเท็มหรือ class', 'Type an item or class name'))}" /></label></div><div class="mini-stat-grid"><div class="mini-stat"><span>${escapeHtml(uiText('จำนวนแถว', 'Rows'))}</span><strong>${escapeHtml(list.length)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('ผลรวม probability', 'Total probability'))}</span><strong>${escapeHtml(totalProbability)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('โหมด', 'Mode'))}</span><strong>${escapeHtml(state.lootUi.compact ? uiText('กระชับ', 'Compact') : uiText('ปกติ', 'Standard'))}</strong></div></div>${bulkPanel}${kitPanel}<div class="visual-table">${rows || `<div class="muted builder-empty">${escapeHtml(rowSearch ? uiText('ไม่เจอแถวไอเท็มที่ตรงกับคำค้นนี้', 'No item rows matched this search.') : uiText('ยังไม่มีรายการไอเท็ม', 'No item rows yet.'))}</div>`}</div></div>${renderItemCatalogSection('flat')}</div>`;

    $('visual-name').oninput = (e) => obj.Name = e.target.value;
    $('visual-notes').oninput = (e) => obj.Notes = e.target.value;
    $('sync-visual-to-raw').onclick = syncVisualBuilderToRaw;
    $('add-visual-row').onclick = () => { obj.Items.push({ ClassName: '', Probability: 1 }); renderVisualBuilder(); };
    $('normalize-visual').onclick = () => {
      const total = list.reduce((sum, entry) => sum + Math.max(0, getProb(entry) || 0), 0);
      if (!total) return showToast(uiText('ยังไม่มี probability ให้ normalize', 'Nothing to normalize.'), true);
      list.forEach((entry) => setProb(entry, Number(((Math.max(0, getProb(entry) || 0)) / total).toFixed(4))));
      renderVisualBuilder();
      showToast(t('normalize'));
    };
    $('quick-add-ak').onclick = () => { obj.Items.push({ ClassName: 'Weapon_AK47', Probability: 0.4 }, { ClassName: 'AK47_Magazine', Probability: 0.3 }, { ClassName: 'Ammo_762x39', Probability: 0.3 }); renderVisualBuilder(); };
    if ($('flat-row-search')) $('flat-row-search').oninput = (e) => { state.lootUi.flatRowSearch = e.target.value; renderVisualBuilder(); };
    document.querySelectorAll('[data-row-select]').forEach((el) => {
      el.onchange = (event) => {
        const selected = selectedFlatRowSet();
        const index = Number(event.target.dataset.rowSelect);
        if (event.target.checked) selected.add(index);
        else selected.delete(index);
        persistSelectedFlatRows([...selected], list.length);
        renderVisualBuilder();
      };
    });
    if ($('bulk-select-visible')) $('bulk-select-visible').onclick = () => { persistSelectedFlatRows(visibleRows.map((entry) => entry.index), list.length); renderVisualBuilder(); };
    if ($('bulk-clear-selection')) $('bulk-clear-selection').onclick = () => { persistSelectedFlatRows([], list.length); renderVisualBuilder(); };
    const applyBulkToSelected = (operation) => {
      const selected = selectedFlatRows(list);
      if (!selected.length) return showToast(uiText('เลือกแถวก่อน', 'Select rows first'), true);
      selected.forEach((index) => operation(list[index], index));
      renderVisualBuilder();
      return true;
    };
    if ($('bulk-set-prob')) $('bulk-set-prob').onclick = () => {
      const value = Math.max(0, Math.min(1, Number($('bulk-prob-value')?.value || 0)));
      applyBulkToSelected((entry) => setProb(entry, value));
    };
    if ($('bulk-boost-prob')) $('bulk-boost-prob').onclick = () => applyBulkToSelected((entry) => setProb(entry, Math.min(1, Number((getProb(entry) * 1.1).toFixed(4)))));
    if ($('bulk-reduce-prob')) $('bulk-reduce-prob').onclick = () => applyBulkToSelected((entry) => setProb(entry, Math.max(0, Number((getProb(entry) * 0.9).toFixed(4)))));
    if ($('bulk-normalize-selected')) $('bulk-normalize-selected').onclick = () => {
      const selected = selectedFlatRows(list);
      if (!selected.length) return showToast(uiText('เลือกแถวก่อน', 'Select rows first'), true);
      const total = selected.reduce((sum, index) => sum + Math.max(0, getProb(list[index]) || 0), 0);
      if (!total) {
        const even = Number((1 / selected.length).toFixed(4));
        selected.forEach((index) => setProb(list[index], even));
      } else {
        selected.forEach((index) => setProb(list[index], Number((Math.max(0, getProb(list[index]) || 0) / total).toFixed(4))));
      }
      renderVisualBuilder();
    };
    if ($('bulk-delete-selected')) $('bulk-delete-selected').onclick = () => {
      const selected = selectedFlatRows(list);
      if (!selected.length) return showToast(uiText('เลือกแถวก่อน', 'Select rows first'), true);
      selected.sort((a, b) => b - a).forEach((index) => list.splice(index, 1));
      persistSelectedFlatRows([], list.length);
      renderVisualBuilder();
    };
    bindKitTemplateControls(list);
    bindFlatRowDragControls(list);
    document.querySelectorAll('[data-entry-name]').forEach((el) => {
      el.onfocus = () => {
        state.focusedLootField = { kind: 'flat', index: Number(el.dataset.entryName) };
        renderInlineItemSuggestions(el, { kind: 'flat', index: Number(el.dataset.entryName) });
      };
      el.oninput = (event) => {
        const index = Number(event.target.dataset.entryName);
        setItemEntryName(obj.Items[index], event.target.value);
        renderInlineItemSuggestions(event.target, { kind: 'flat', index });
      };
      el.onblur = () => closeInlineItemSuggestions(el);
    });
    document.querySelectorAll('[data-entry-prob]').forEach((el) => el.oninput = (e) => { const idx = Number(e.target.dataset.entryProb); const value = Math.max(0, Math.min(1, Number(e.target.value || 0))); setProb(list[idx], value); const range = document.querySelector(`[data-entry-range="${idx}"]`); if (range) range.value = String(value); });
    document.querySelectorAll('[data-entry-range]').forEach((el) => el.oninput = (e) => { const idx = Number(e.target.dataset.entryRange); const value = Number(e.target.value || 0); setProb(list[idx], value); const numberInput = document.querySelector(`[data-entry-prob="${idx}"]`); if (numberInput) numberInput.value = String(value); });
    document.querySelectorAll('[data-remove-row]').forEach((el) => el.onclick = (e) => { list.splice(Number(e.target.dataset.removeRow), 1); renderVisualBuilder(); });
    document.querySelectorAll('[data-dup-row]').forEach((el) => el.onclick = (e) => { const idx = Number(e.target.dataset.dupRow); list.splice(idx + 1, 0, JSON.parse(JSON.stringify(list[idx]))); renderVisualBuilder(); });
    document.querySelectorAll('[data-up-row]').forEach((el) => el.onclick = (e) => { const idx = Number(e.target.dataset.upRow); if (idx <= 0) return; [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; renderVisualBuilder(); });
    document.querySelectorAll('[data-down-row]').forEach((el) => el.onclick = (e) => { const idx = Number(e.target.dataset.downRow); if (idx >= list.length - 1) return; [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; renderVisualBuilder(); });
    bindItemCatalogControls('flat');
    bindLootUiControls();
    updateLootWorkspaceLayout();
    updateLootWorkspaceCopy();
    refreshLootDirtyState();
  };

  renderSpawnerBuilder = function (obj) {
    if (!Array.isArray(obj.Nodes)) obj.Nodes = [];
    const summary = state.currentLootAnalysis?.summary || { kind: 'spawner', groupCount: obj.Nodes.length, nodeRefCount: collectSpawnerRefs(obj).length, quantityMin: obj.QuantityMin ?? 0, quantityMax: obj.QuantityMax ?? 0 };
    const preferredFields = ['Probability', 'QuantityMin', 'QuantityMax', 'AllowDuplicates', 'ShouldFilterItemsByZone', 'ShouldApplyLocationSpecificProbabilityModifier', 'ShouldApplyLocationSpecificDamageModifier', 'InitialDamage', 'RandomDamage', 'InitialUsage', 'RandomUsage'];
    const extraFields = Object.keys(obj).filter((key) => !['Nodes', 'Items', 'Children', 'Name', 'Notes'].includes(key) && !preferredFields.includes(key)).sort();
    const fieldKeys = Array.from(new Set([...preferredFields, ...extraFields]));
    const allSections = groupedSpawnerFieldSections(fieldKeys);
    const hiddenAdvancedCount = state.lootUi.simpleMode && !state.lootUi.showAdvancedSpawnerFields ? allSections.filter((group) => group.advanced).length : 0;
    const visibleSections = hiddenAdvancedCount ? allSections.filter((group) => !group.advanced) : allSections;
    const fieldSections = visibleSections.map((group, index) => {
      const open = group.advanced ? !state.lootUi.simpleMode : index === 0;
      return `<details class="field-group-card ${group.advanced ? 'advanced-shell' : ''}" ${open ? 'open' : ''}><summary class="row-head row-summary"><strong>${escapeHtml(group.title)}</strong></summary><p class="muted">${escapeHtml(group.hint)}</p><div class="field-group-grid">${group.keys.map((key) => buildSpawnerFieldControl(obj, key)).join('')}</div></details>`;
    }).join('') + (hiddenAdvancedCount ? `<div class="field-group-card field-group-callout"><strong>${escapeHtml(uiText('ตอนนี้ซ่อนฟิลด์ขั้นสูงไว้ก่อน', 'Advanced fields are hidden for now'))}</strong><p class="muted">${escapeHtml(uiText('ถ้าตอนนี้แค่อยากเพิ่มโอกาสดรอปหรือจำนวนของ ใช้แค่กลุ่มแรกก็พอ เมื่อพร้อมค่อยเปิดฟิลด์ขั้นสูงเพิ่ม', 'If you only want to change drop chance or quantity, the first group is enough. Reveal advanced fields only when you need them.'))}</p><div class="actions tight"><button class="ghost tiny" data-advanced-toggle="1">${escapeHtml(lootUiLabel('advanced'))}</button></div></div>` : '');

    const groupSearch = String(state.lootUi.spawnerGroupSearch || '').trim().toLowerCase();
    const allEntries = obj.Nodes.map((entry, index) => {
      const ids = Array.isArray(entry.Ids) ? entry.Ids : [entry.Node || entry.Name || entry.Ref].filter(Boolean);
      return { entry, index, ids };
    });
    const visibleEntries = allEntries.filter(({ entry, ids }) => spawnerGroupMatches(entry, ids, groupSearch));
    const groups = visibleEntries.map(({ entry, index, ids }) => {
      const open = index === 0 || (state.focusedLootField?.kind === 'spawner' && state.focusedLootField.index === index);
      return `<details class="builder-row-card spawner-entry" ${open ? 'open' : ''}><summary class="spawner-group-header"><div><strong>${escapeHtml(uiText(`Group ${index + 1}`, `Group ${index + 1}`))}</strong><div class="muted">${escapeHtml(`${ids.length} ${uiText('refs', 'refs')}`)}</div></div><span class="tag">${escapeHtml(entry.Rarity || uiText('ไม่ตั้งค่า', 'Unset'))}</span></summary><div class="loot-inline-grid spawner-entry-grid"><label><span>${escapeHtml(uiText('Group rarity', 'Group rarity'))}</span><select data-group-rarity="${index}">${buildRarityOptions(entry.Rarity || '')}</select></label><label class="span-two"><span>${escapeHtml(uiText('Tree ids', 'Tree ids'))}</span><textarea data-group-ids="${index}" class="ids-editor" placeholder="${escapeHtml(uiText('หนึ่ง ref ต่อหนึ่งบรรทัด', 'One ref per line'))}">${escapeHtml(ids.join('\n'))}</textarea>${state.lootUi.compact ? '' : `<small class="field-help">${escapeHtml(uiText('คลิกในช่องนี้ก่อน แล้วใช้ Node ref catalog ด้านล่างช่วยเติม', 'Focus here first, then use the Node ref catalog below to append refs quickly.'))}</small>`}</label></div><div class="actions tight wrap"><button data-group-dup="${index}" class="ghost tiny">${escapeHtml(t('duplicate'))}</button><button data-group-up="${index}" class="ghost tiny">${escapeHtml(t('moveUp'))}</button><button data-group-down="${index}" class="ghost tiny">${escapeHtml(t('moveDown'))}</button><button data-group-remove="${index}" class="danger-outline tiny">${escapeHtml(uiText('ลบกลุ่ม', 'Remove group'))}</button></div></details>`;
    }).join('');

    $('visual-builder').innerHTML = `<div class="loot-builder-shell ${state.lootUi.compact ? 'compact' : ''}">${renderBuilderCoach(summary)}<div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('Spawner settings', 'Spawner settings'))}</h4><p class="muted">${escapeHtml(uiText('เริ่มจากกลุ่มแรกก่อน ถ้าปรับโอกาสดรอปกับจำนวนได้ตรงแล้ว ค่อยไปแตะตัวกรองขั้นสูง', 'Start with the first group. If drop chance and quantity feel right, then move on to the advanced filters only when needed.'))}</p></div><div class="actions tight wrap"><span class="tag spawner">${escapeHtml(lootKindLabel('spawner'))}</span><button id="sync-visual-to-raw" class="tiny">${escapeHtml(uiText('อัปเดต JSON ดิบ', 'Update Raw JSON'))}</button></div></div><div class="spawner-field-groups">${fieldSections}</div></div><div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('Node groups', 'Node groups'))}</h4><p class="muted">${escapeHtml(uiText('แต่ละกลุ่มคือชุด ref ที่ spawner นี้สุ่มใช้ แก้กลุ่มละอันจะอ่านง่ายสุด', 'Each group is a set of refs this spawner can use. Edit one group at a time to keep the page readable.'))}</p></div><div class="actions tight wrap"><span class="tag item">${escapeHtml(`${visibleEntries.length}/${allEntries.length} ${uiText('กลุ่มที่เห็น', 'visible groups')}`)}</span><button id="spawner-add-group" class="ghost tiny">${escapeHtml(uiText('เพิ่มกลุ่ม', 'Add group'))}</button></div></div><div class="loot-inline-grid catalog-filter-grid"><label><span>${escapeHtml(uiText('ค้นหา Node groups', 'Search node groups'))}</span><input id="spawner-group-search" value="${escapeHtml(state.lootUi.spawnerGroupSearch || '')}" placeholder="${escapeHtml(uiText('พิมพ์ ref, rarity, หรือชื่อกิ่ง', 'Type a ref, rarity, or branch name'))}" /></label></div><div class="visual-table">${groups || `<div class="muted builder-empty">${escapeHtml(groupSearch ? uiText('ไม่เจอ Node group ที่ตรงกับคำค้นนี้', 'No node groups matched this search.') : uiText('ยังไม่มี node group', 'No node groups yet.'))}</div>`}</div></div>${renderNodeRefCatalogSection()}</div>`;

    $('sync-visual-to-raw').onclick = syncVisualBuilderToRaw;
    $('spawner-add-group').onclick = () => { obj.Nodes.push({ Rarity: 'Uncommon', Ids: ['ItemLootTreeNodes.NewGroup'] }); renderVisualBuilder(); };
    if ($('spawner-group-search')) $('spawner-group-search').oninput = (e) => { state.lootUi.spawnerGroupSearch = e.target.value; renderVisualBuilder(); };
    document.querySelectorAll('[data-spawner-field]').forEach((el) => el.oninput = el.onchange = (e) => { const key = e.target.dataset.spawnerField; const kind = e.target.dataset.fieldKind; if (kind === 'boolean') obj[key] = e.target.value === 'true'; else if (kind === 'number') obj[key] = Number(e.target.value || 0); else obj[key] = e.target.value; });
    document.querySelectorAll('[data-group-rarity]').forEach((el) => el.onchange = (e) => { const index = Number(e.target.dataset.groupRarity); obj.Nodes[index].Rarity = e.target.value; });
    document.querySelectorAll('[data-group-ids]').forEach((el) => {
      el.onfocus = () => { state.focusedLootField = { kind: 'spawner', index: Number(el.dataset.groupIds) }; };
      el.oninput = (e) => {
        const index = Number(e.target.dataset.groupIds);
        obj.Nodes[index].Ids = e.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        delete obj.Nodes[index].Node;
        delete obj.Nodes[index].Name;
        delete obj.Nodes[index].Ref;
      };
    });
    document.querySelectorAll('[data-group-remove]').forEach((el) => el.onclick = (e) => { obj.Nodes.splice(Number(e.target.dataset.groupRemove), 1); renderVisualBuilder(); });
    document.querySelectorAll('[data-group-dup]').forEach((el) => el.onclick = (e) => { const index = Number(e.target.dataset.groupDup); obj.Nodes.splice(index + 1, 0, JSON.parse(JSON.stringify(obj.Nodes[index]))); renderVisualBuilder(); });
    document.querySelectorAll('[data-group-up]').forEach((el) => el.onclick = (e) => { const index = Number(e.target.dataset.groupUp); if (index <= 0) return; [obj.Nodes[index - 1], obj.Nodes[index]] = [obj.Nodes[index], obj.Nodes[index - 1]]; renderVisualBuilder(); });
    document.querySelectorAll('[data-group-down]').forEach((el) => el.onclick = (e) => { const index = Number(e.target.dataset.groupDown); if (index >= obj.Nodes.length - 1) return; [obj.Nodes[index + 1], obj.Nodes[index]] = [obj.Nodes[index], obj.Nodes[index + 1]]; renderVisualBuilder(); });
    bindNodeRefCatalogControls();
    bindLootUiControls();
    updateLootWorkspaceLayout();
    updateLootWorkspaceCopy();
    refreshLootDirtyState();
  };

  mountGlobalSearchControls();
  mountReadinessPanel();
  mountQuickStartPanel();
  mountDiagnosticsPanel();
  applyCoreCopyPolish();
  applyLootShellCopy();
  bindLootContextTabs();
  syncLootContextTabs();
  bindBackupActivityOverrides();

  if (state.selectedLootPath && state.view === 'loot') {
    openLootFile(state.selectedLootPath).catch(() => {});
  }
  window.setTimeout(() => {
    bindBackupActivityOverrides();
    loadReadiness().catch((error) => {
      state.readiness = { error: error.message };
      renderReadinessPanel(state.readiness);
      renderQuickStartPanel(state.readiness);
      renderDiagnosticsPanel();
    });
    loadBackups().catch(() => {});
    loadActivity().catch(() => {});
    if ((state.graph?.nodes || []).length && typeof renderGraph === 'function') renderGraph();
    if (state.analyzer && typeof loadAnalyzer === 'function') loadAnalyzer().catch(() => {});
    const analyzerRefresh = $('refresh-analyzer');
    if (analyzerRefresh) analyzerRefresh.onclick = () => loadAnalyzer().catch((error) => showToast(error.message, true));
  }, 1200);
})();
