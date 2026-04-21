const { test, expect } = require('@playwright/test');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function openLootFileFromRail(page, relPath) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="loot"]').click();
  await expect(page.locator('[data-loot-path]').first()).toBeVisible({ timeout: 60000 });
  await page.locator(`[data-loot-path="${relPath}"]`).click();
}

test('spawner simple mode keeps advanced fields hidden until requested', async ({ page }) => {
  await openLootFileFromRail(page, 'Spawners/Buildings-Airfield_Hangar-Examine_CardBox.json');

  await expect(page.locator('#loot-ui-simple')).toBeVisible();
  await expect(page.locator('.goal-card')).toHaveCount(3);
  await expect(page.locator('.loot-task-card')).toHaveCount(4);
  await expect(page.locator('.field-group-callout')).toBeVisible();
  await page.locator('[data-loot-task="spawner-quantity"]').click();
  await expect(page.locator('[data-spawner-field="QuantityMin"]')).toBeFocused();

  const before = await page.locator('.spawner-field-groups .field-group-card').count();
  await page.locator('[data-advanced-toggle]').first().click();
  await page.waitForTimeout(150);
  const after = await page.locator('.spawner-field-groups .field-group-card').count();

  expect(after).toBeGreaterThan(before);
});

test('tree nodes show beginner guidance without breaking the editor', async ({ page }) => {
  await openLootFileFromRail(page, 'Nodes/Airfield.json');

  await expect(page.locator('.goal-card')).toHaveCount(3);
  await expect(page.locator('.loot-task-card')).toHaveCount(4);
  await expect(page.locator('#tree-search-input')).toBeVisible();
  await page.locator('[data-loot-task="tree-search"]').click();
  await expect(page.locator('#tree-search-input')).toBeFocused();
  await page.locator('[data-loot-task="tree-item"]').click();
  await expect(page.locator('.catalog-pick-card .catalog-item-icon').first()).toBeVisible();
  const focusChips = await page.locator('.tree-focus-chip').count();
  expect(focusChips).toBeGreaterThanOrEqual(1);
});

test('loot context tabs keep support data separated instead of stacking every panel', async ({ page }) => {
  await openLootFileFromRail(page, 'Nodes/Airfield.json');

  await expect(page.locator('[data-loot-context-panel="overview"]')).toBeVisible();
  await expect(page.locator('[data-loot-context-panel="validation"]')).toBeHidden();

  await page.locator('[data-loot-context-tab="validation"]').click();
  await expect(page.locator('[data-loot-context-panel="validation"]')).toBeVisible();
  await expect(page.locator('[data-loot-context-panel="overview"]')).toBeHidden();

  await page.locator('[data-loot-context-tab="simulator"]').click();
  await expect(page.locator('[data-loot-context-panel="simulator"]')).toBeVisible();
  await expect(page.locator('#simulate-output')).toBeVisible();
});

test('flat item rows show icon identity for item-based loot files', async ({ page }) => {
  await openLootFileFromRail(page, 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json');

  await expect(page.locator('.loot-row-card .catalog-item-icon, .loot-row-card .catalog-item-fallback').first()).toBeVisible();
  await expect(page.locator('[data-entry-name="0"]')).toHaveValue(/Boar_Back_Leg/i);
});

test('typing an item name shows matching suggestions with item art', async ({ page }) => {
  await openLootFileFromRail(page, 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json');

  const itemInput = page.locator('[data-entry-name="0"]');
  await itemInput.fill('ak');
  const firstSuggestion = page.locator('.inline-item-suggestion').first();
  await expect(firstSuggestion).toBeVisible();
  await expect(firstSuggestion.locator('.catalog-item-icon, .catalog-item-fallback')).toBeVisible();

  const suggestedName = await firstSuggestion.getAttribute('data-suggest-name');
  await firstSuggestion.click();
  await expect(itemInput).toHaveValue(suggestedName);
});

test('item catalog metadata overrides friendly names and favorites', async ({ page }) => {
  const itemName = 'Boar_Back_Leg';
  const displayName = `Codex Boar Leg ${Date.now()}`;
  await page.request.put(`${baseUrl}/api/items/override`, {
    data: { name: itemName, displayName, category: 'food', favorite: true, notes: 'regression label' }
  });
  try {
    await openLootFileFromRail(page, 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json');

    await expect(page.locator('.loot-row-card').first()).toContainText(displayName);
    await page.locator('[data-loot-task="flat-catalog"]').click();
    await page.locator('#loot-catalog-search').fill(displayName);
    await expect(page.locator('.catalog-pick-card').first()).toContainText(displayName);
    await expect(page.locator('.catalog-pick-card').first()).toContainText(/Food|อาหาร/);
    await page.locator('#item-catalog-category').selectOption('__favorites');
    await expect(page.locator('.catalog-pick-card').first()).toContainText(displayName);
    await page.locator('summary').filter({ hasText: /Import\/export metadata|นำเข้า/ }).click();
    await page.locator('#catalog-metadata-export').click();
    await expect(page.locator('#catalog-metadata-json')).toHaveValue(new RegExp(displayName));
    const importedName = `Imported Boar Leg ${Date.now()}`;
    await page.locator('#catalog-metadata-json').fill(JSON.stringify({
      [itemName]: { displayName: importedName, category: 'food', favorite: true, notes: 'imported regression' }
    }, null, 2));
    await page.locator('#catalog-metadata-import').click();
    await expect(page.locator('.loot-row-card').first()).toContainText(importedName);
  } finally {
    await page.request.delete(`${baseUrl}/api/items/override?name=${encodeURIComponent(itemName)}`);
  }
});

test('bulk edit can set probability for selected item rows', async ({ page }) => {
  await openLootFileFromRail(page, 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json');

  await expect(page.locator('.bulk-edit-panel')).toBeVisible();
  await page.locator('[data-row-select]').first().check();
  await page.locator('#bulk-prob-value').fill('0.25');
  await page.locator('#bulk-set-prob').click();

  await expect(page.locator('[data-entry-prob="0"]')).toHaveValue('0.25');
});

test('flat item simple mode offers probability presets for selected rows', async ({ page }) => {
  await openLootFileFromRail(page, 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json');

  await expect(page.locator('.loot-field-cheatsheet')).toBeVisible();
  await expect(page.locator('.loot-field-cheatsheet')).toContainText(/Probability|น้ำหนัก/);
  await page.locator('[data-row-select]').first().check();
  await page.locator('[data-prob-preset="rare"]').click();

  await expect(page.locator('[data-entry-prob="0"]')).toHaveValue('0.05');
});

test('loot studio keeps recent and pinned files in quick access', async ({ page }) => {
  const firstPath = 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json';
  const secondPath = 'Nodes/Airfield.json';
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('scum_loot_recent');
    localStorage.removeItem('scum_loot_pinned');
  });

  await openLootFileFromRail(page, firstPath);
  await expect(page.locator('#loot-shortcuts-panel')).toBeVisible();
  await expect(page.locator('#loot-recent-list')).toContainText(firstPath);
  await page.locator('#loot-pin-current').click();
  await expect(page.locator('#loot-pinned-list')).toContainText(firstPath);

  await page.locator(`[data-loot-path="${secondPath}"]`).click();
  await expect(page.locator('#loot-editor-title')).toContainText(secondPath);
  await expect(page.locator('#loot-recent-list')).toContainText(secondPath);

  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="loot"]').click();
  await expect(page.locator('#loot-pinned-list')).toContainText(firstPath);
  await page.locator(`[data-loot-shortcut="${firstPath}"]`).first().click();
  await expect(page.locator('#loot-editor-title')).toContainText(firstPath);
  await expect(page).toHaveURL(/\/loot-studio\?file=/);
});

test('flat item rows can be reordered with drag and drop', async ({ page }) => {
  await openLootFileFromRail(page, 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json');

  await expect(page.locator('[data-drag-row="0"]')).toBeVisible();
  await page.locator('[data-entry-name="0"]').fill('__Drag_A__');
  await page.locator('[data-drag-row="1"] summary').click();
  await page.locator('[data-entry-name="1"]').fill('__Drag_B__');

  await page.evaluate(() => {
    const from = document.querySelector('[data-drag-row="0"]');
    const to = document.querySelector('[data-drag-row="1"]');
    const dataTransfer = new DataTransfer();
    from.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
    to.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    to.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    from.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
  });

  await expect(page.locator('[data-entry-name="0"]')).toHaveValue('__Drag_B__');
  await expect(page.locator('[data-entry-name="1"]')).toHaveValue('__Drag_A__');
});

test('kit templates can be saved and applied to flat item rows', async ({ page }) => {
  await openLootFileFromRail(page, 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json');

  const kitName = `Codex kit ${Date.now()}`;
  let kitId = '';
  try {
    await expect(page.locator('.kit-template-panel')).toBeVisible();
    await page.locator('[data-row-select]').first().check();
    await page.locator('#kit-template-name').fill(kitName);
    await page.locator('#kit-template-notes').fill('regression test');
    const before = await page.locator('[data-entry-name]').count();
    await page.locator('#save-kit-template').click();

    const card = page.locator('.kit-template-card').filter({ hasText: kitName });
    await expect(card).toBeVisible();
    kitId = await card.locator('[data-kit-apply]').getAttribute('data-kit-apply');
    await card.locator('[data-kit-apply]').click();

    await expect(page.locator('[data-entry-name]')).toHaveCount(before + 1);
  } finally {
    if (kitId) {
      await page.request.delete(`${baseUrl}/api/kits?id=${encodeURIComponent(kitId)}`);
    }
  }
});

test('simulator compares saved loot against the current draft', async ({ page }) => {
  await openLootFileFromRail(page, 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json');
  await expect(page.locator('[data-entry-name="0"]')).toBeVisible();

  await page.evaluate(() => {
    state.currentLootObject = { Name: '__Codex_Sim_Draft__', Items: [{ ClassName: 'Weapon_AK47', Probability: 1 }] };
    renderVisualBuilder();
  });
  await expect(page.locator('[data-entry-name="0"]')).toHaveValue('Weapon_AK47');
  await page.waitForTimeout(350);
  await page.locator('[data-loot-context-tab="simulator"]').click();
  await expect(page.locator('[data-loot-context-panel="simulator"]')).toBeVisible();
  await page.locator('#simulate-count').fill('300');
  await page.locator('#simulate-btn').click();

  await expect(page.locator('.simulator-output')).toBeVisible();
  await expect(page.locator('.sim-card').filter({ hasText: /Draft|ตอนนี้/ }).first()).toBeVisible();
  await expect(page.locator('.sim-delta-row').first()).toBeVisible();
  await expect(page.locator('#simulate-output')).toContainText('Weapon_AK47');
});

test('tree leaf inputs use the same icon-backed item suggestions', async ({ page }) => {
  await openLootFileFromRail(page, 'Nodes/Airfield.json');

  await page.locator('#tree-search-input').fill('CombatBoots');
  const leafInput = page.locator('[data-tree-role="leaf"]:visible').first();
  await expect(leafInput).toBeVisible();
  await leafInput.fill('ak');
  const firstSuggestion = page.locator('.inline-item-suggestion').first();
  await expect(firstSuggestion).toBeVisible();
  await expect(firstSuggestion.locator('.catalog-item-icon, .catalog-item-fallback')).toBeVisible();

  const suggestedName = await firstSuggestion.getAttribute('data-suggest-name');
  await firstSuggestion.click();
  await expect(page.locator('[data-tree-role="leaf"]:visible').first()).toHaveValue(suggestedName);
});

test('autofix preview merges duplicate flat items and normalizes safe probabilities', async ({ page }) => {
  const fileName = `__codex_autofix_${Date.now()}.json`;
  const logicalPath = `Nodes/${fileName}`;
  await page.request.post(`${baseUrl}/api/loot/file`, { data: { kind: 'nodes', fileName } });
  try {
    await page.request.put(`${baseUrl}/api/file`, {
      data: {
        path: logicalPath,
        content: JSON.stringify({
          Items: [
            { ClassName: 'Weapon_AK47', Chance: 0.2 },
            { ClassName: 'Weapon_AK47', Probability: 0.3 },
            { ClassName: '', Probability: 1 },
            { ClassName: 'Ammo_762x39', Probability: 0 }
          ]
        }, null, 2)
      }
    });

    const response = await page.request.post(`${baseUrl}/api/loot/autofix`, { data: { path: logicalPath, apply: false } });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.changes).toEqual(expect.arrayContaining([
      expect.stringContaining('Filled missing node name'),
      expect.stringContaining('Removed a blank item row'),
      expect.stringContaining('Converted Chance to Probability'),
      expect.stringContaining('Merged duplicate item row'),
      expect.stringContaining('Normalized item probabilities')
    ]));
    expect(data.validation.counts.critical).toBe(0);
  } finally {
    await page.request.delete(`${baseUrl}/api/loot/file?path=${encodeURIComponent(logicalPath)}`);
  }
});

test('validation quick fix updates the current draft and revalidates it', async ({ page }) => {
  const fileName = `__codex_quickfix_${Date.now()}.json`;
  const logicalPath = `Nodes/${fileName}`;
  await page.request.post(`${baseUrl}/api/loot/file`, { data: { kind: 'nodes', fileName } });
  try {
    await page.request.put(`${baseUrl}/api/file`, {
      data: {
        path: logicalPath,
        content: JSON.stringify({
          Name: 'QuickFixTest',
          Items: [
            { ClassName: 'Weapon_AK47', Probability: 1 },
            { ClassName: '', Probability: 1 }
          ]
        }, null, 2)
      }
    });

    await openLootFileFromRail(page, logicalPath);
    await expect(page.locator('#loot-editor-title')).toContainText(fileName);
    await page.evaluate(() => {
      state.lootUi.contextTab = 'validation';
      document.querySelectorAll('[data-loot-context-tab]').forEach((button) => {
        const active = button.dataset.lootContextTab === 'validation';
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('[data-loot-context-panel]').forEach((panel) => {
        const active = panel.dataset.lootContextPanel === 'validation';
        panel.classList.toggle('active', active);
        panel.hidden = !active;
      });
    });
    await expect(page.locator('[data-loot-context-panel="validation"]')).toBeVisible();
    await expect(page.locator('[data-validation-fix="remove_blank_row"]')).toBeVisible();
    await page.locator('[data-validation-fix="remove_blank_row"]').click();

    await expect(page.locator('[data-validation-fix="remove_blank_row"]')).toHaveCount(0);
    await expect(page.locator('[data-entry-name]')).toHaveCount(1);
    await expect(page.locator('[data-entry-name="0"]')).toHaveValue('Weapon_AK47');
  } finally {
    await page.request.delete(`${baseUrl}/api/loot/file?path=${encodeURIComponent(logicalPath)}`);
  }
});
